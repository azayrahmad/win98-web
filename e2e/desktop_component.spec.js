import { test, expect } from '@playwright/test';

test.describe('Desktop Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/win98-web/');
    // Wait for the OS to initialize (azOS Ready!)
    await page.waitForSelector('text=azOS Ready!', { timeout: 30000 });
    // Wait for splash screen to hide
    await page.waitForSelector('#splash-screen', { state: 'hidden' });
  });

  test('should show My Computer on the desktop', async ({ page }) => {
    const myComputerIcon = page.locator('.desktop .explorer-icon[data-name="My Computer"]');
    await expect(myComputerIcon).toBeVisible();
    await expect(myComputerIcon).toHaveAttribute('data-is-virtual', 'true');
  });

  test('should open My Computer from the desktop', async ({ page }) => {
    const myComputerIcon = page.locator('.desktop .explorer-icon[data-name="My Computer"]');
    await myComputerIcon.dblclick();

    // It should launch Explorer at /
    await page.waitForSelector('.window[data-app-id="explorer"]');
    const addressBar = page.locator('.window[data-app-id="explorer"] .address-bar input');
    await expect(addressBar).toHaveValue('My Computer');
  });

  test('should show background context menu with system items', async ({ page }) => {
    await page.click('.desktop', { button: 'right' });

    // Verify system items in context menu
    await expect(page.locator('.menu-item:has-text("Wallpaper")').first()).toBeVisible();
    await expect(page.locator('.menu-item:has-text("Theme")').first()).toBeVisible();
    await expect(page.locator('.menu-item:has-text("Monitor Type")').first()).toBeVisible();
    await expect(page.locator('.menu-item:has-text("Properties")').last()).toBeVisible();
  });

  test('should allow creating and renaming a folder on the desktop', async ({ page }) => {
    // Right click desktop and create folder
    await page.click('.desktop', { button: 'right' });

    const newMenuItem = page.locator('.menu-item:has-text("New")');
    await newMenuItem.dispatchEvent('pointerenter');
    await page.locator('.menu-item:has-text("Folder")').click();

    // Wait for icon
    const folderIcon = page.locator('.desktop .explorer-icon[data-name="New Folder"]');
    await expect(folderIcon).toBeVisible();

    // Rename
    await folderIcon.click({ button: 'right' });
    await page.locator('.menu-item:has-text("Rename")').last().click();

    const renameInput = page.locator('.icon-label-input');
    await renameInput.fill('DesktopFolder');
    await renameInput.press('Enter');

    await expect(page.locator('.desktop .explorer-icon[data-name="DesktopFolder"]')).toBeVisible();

    // Cleanup
    await page.locator('.desktop .explorer-icon[data-name="DesktopFolder"]').click({ button: 'right' });
    await page.locator('.menu-item:has-text("Delete")').last().click();

    const dialog = page.locator('.window:has-text("Confirm File Delete")');
    await expect(dialog).toBeVisible();
    await dialog.locator('button:has-text("Yes")').click();

    await expect(page.locator('.desktop .explorer-icon[data-name="DesktopFolder"]')).not.toBeVisible({ timeout: 15000 });
  });
});
