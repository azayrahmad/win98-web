import { test, expect } from '@playwright/test';

test.describe('Desktop Shell Extension', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/win98-web/');
    // Wait for the OS to initialize (azOS Ready!)
    await page.waitForSelector('text=azOS Ready!', { timeout: 30000 });
    // Wait for splash screen to hide
    await page.waitForSelector('#splash-screen', { state: 'hidden' });
  });

  test('should show My Computer in /Desktop and navigate to root', async ({ page }) => {
    // Launch ZenExplorer
    await page.evaluate(() => window.System.launchApp('zenexplorer'));
    await page.waitForSelector('.window[data-app-id="zenexplorer"]');

    // Navigate to /Desktop
    const addressBar = page.locator('.window[data-app-id="zenexplorer"] .address-bar input');
    await addressBar.fill('Desktop');
    await addressBar.press('Enter');

    // Wait for directory contents to render
    await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="My Computer"]');

    // Verify "My Computer" icon exists and has the computer icon
    const myComputerIcon = page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="My Computer"]');
    await expect(myComputerIcon).toBeVisible();
    await expect(myComputerIcon).toHaveAttribute('data-is-virtual', 'true');

    // Double click My Computer
    await myComputerIcon.dblclick();

    // Verify we navigated to root (My Computer)
    await expect(addressBar).toHaveValue('My Computer');
    await expect(page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="C:"]')).toBeVisible();
  });

  test('should NOT show My Computer in C:\\WINDOWS\\Desktop', async ({ page }) => {
    // Launch ZenExplorer
    await page.evaluate(() => window.System.launchApp('zenexplorer'));
    await page.waitForSelector('.window[data-app-id="zenexplorer"]');

    // Navigate to C:\WINDOWS\Desktop
    const addressBar = page.locator('.window[data-app-id="zenexplorer"] .address-bar input');
    await addressBar.fill('C:\\WINDOWS\\Desktop');
    await addressBar.press('Enter');

    // Wait for navigation and ensure the view is updated
    await expect(addressBar).toHaveValue('C:\\WINDOWS\\Desktop');

    // Check that "My Computer" icon DOES NOT exist
    const myComputerIcon = page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="My Computer"]');
    await expect(myComputerIcon).not.toBeVisible();
  });

  test('should allow file operations and rename in /Desktop and reflect in C:\\WINDOWS\\Desktop', async ({ page }) => {
    // Launch ZenExplorer and go to /Desktop
    await page.evaluate(() => window.System.launchApp('zenexplorer'));
    await page.waitForSelector('.window[data-app-id="zenexplorer"]');
    const addressBar = page.locator('.window[data-app-id="zenexplorer"] .address-bar input');
    await addressBar.fill('Desktop');
    await addressBar.press('Enter');

    // Wait for view
    await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon-view');

    // Create a new folder via context menu
    await page.click('.window[data-app-id="zenexplorer"] .explorer-icon-view', { button: 'right' });
    await page.click('.menu-item:has-text("New")');
    await page.click('.menu-item:has-text("Folder")');

    // Wait for the new folder to appear in /Desktop
    await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="New Folder"]');

    // Verify it exists in real filesystem
    let existsInRealFS = await page.evaluate(async () => {
      try {
        const stats = await window.fs.promises.stat('/C:/WINDOWS/Desktop/New Folder');
        return stats.isDirectory();
      } catch (e) {
        return false;
      }
    });
    expect(existsInRealFS).toBe(true);

    // Rename the folder via UI (testing the fix)
    const newFolderIcon = page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="New Folder"]');
    await newFolderIcon.click({ button: 'right' });

    // Ensure Rename is enabled in the context menu
    const renameMenuItem = page.locator('.menu-popup .menu-item:has-text("Rename")').first();
    await expect(renameMenuItem).not.toHaveAttribute('disabled', '');
    await renameMenuItem.click();

    // Fill the rename textarea
    const renameInput = page.locator('.icon-label-input');
    await renameInput.fill('RenamedViaUI');
    await renameInput.press('Enter');

    // Wait for UI to update
    await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="RenamedViaUI"]');
    await expect(page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="New Folder"]')).not.toBeVisible();

    // Verify rename reflected in real filesystem
    existsInRealFS = await page.evaluate(async () => {
      try {
        const stats = await window.fs.promises.stat('/C:/WINDOWS/Desktop/RenamedViaUI');
        return stats.isDirectory();
      } catch (e) {
        return false;
      }
    });
    expect(existsInRealFS).toBe(true);

    // Delete it
    const renamedFolder = page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="RenamedViaUI"]');
    await renamedFolder.click({ button: 'right' });
    await page.locator('.menu-popup .menu-item:has-text("Delete")').first().click();
    const dialog = page.locator('.window:has-text("Confirm File Delete")');
    await expect(dialog).toBeVisible();
    await dialog.locator('button:has-text("Yes")').click();
    await expect(renamedFolder).not.toBeVisible({ timeout: 10000 });
  });

  test('should allow rename in C:\\WINDOWS\\Desktop', async ({ page }) => {
    // Create a real file
    await page.evaluate(async () => {
      await window.fs.promises.writeFile('/C:/WINDOWS/Desktop/RealFile.txt', 'Hello world');
    });

    // Launch ZenExplorer and go to C:\WINDOWS\Desktop
    await page.evaluate(() => window.System.launchApp('zenexplorer'));
    await page.waitForSelector('.window[data-app-id="zenexplorer"]');
    const addressBar = page.locator('.window[data-app-id="zenexplorer"] .address-bar input');
    await addressBar.fill('C:\\WINDOWS\\Desktop');
    await addressBar.press('Enter');

    // Wait for view
    await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="RealFile.txt"]');

    // Rename via UI
    const fileIcon = page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="RealFile.txt"]');
    await fileIcon.click({ button: 'right' });
    await page.locator('.menu-popup .menu-item:has-text("Rename")').first().click();

    const renameInput = page.locator('.icon-label-input');
    await renameInput.fill('RenamedRealFile.txt');
    await renameInput.press('Enter');

    // Wait for UI to update
    await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="RenamedRealFile.txt"]');

    // Verify in real FS
    const existsInRealFS = await page.evaluate(async () => {
      try {
        await window.fs.promises.stat('/C:/WINDOWS/Desktop/RenamedRealFile.txt');
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(existsInRealFS).toBe(true);
  });

  test('should show Desktop folder with correct icon in C:\\WINDOWS', async ({ page }) => {
    // Launch ZenExplorer
    await page.evaluate(() => window.System.launchApp('zenexplorer'));
    await page.waitForSelector('.window[data-app-id="zenexplorer"]');

    // Navigate to C:\WINDOWS
    const addressBar = page.locator('.window[data-app-id="zenexplorer"] .address-bar input');
    await addressBar.fill('C:\\WINDOWS');
    await addressBar.press('Enter');

    // Wait for directory contents
    await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="Desktop"]');
    const desktopFolder = page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="Desktop"]');

    // Verify it's a directory
    await expect(desktopFolder).toHaveAttribute('data-type', 'directory');

    // Verify it's not virtual (the folder itself is a real directory)
    await expect(desktopFolder).toHaveAttribute('data-is-virtual', 'false');
  });

  test('should NOT allow renaming virtual My Computer in /Desktop', async ({ page }) => {
     // Launch ZenExplorer and go to /Desktop
     await page.evaluate(() => window.System.launchApp('zenexplorer'));
     await page.waitForSelector('.window[data-app-id="zenexplorer"]');
     const addressBar = page.locator('.window[data-app-id="zenexplorer"] .address-bar input');
     await addressBar.fill('Desktop');
     await addressBar.press('Enter');

     await page.waitForSelector('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="My Computer"]');
     const myComputerIcon = page.locator('.window[data-app-id="zenexplorer"] .explorer-icon[data-name="My Computer"]');

     // Right click to open context menu
     await myComputerIcon.click({ button: 'right' });

     // Verify Rename is disabled
     const renameItem = page.locator('.menu-popup .menu-item:has-text("Rename")').first();
     await expect(renameItem).toHaveAttribute('disabled', '');
  });
});
