import { test, expect } from '@playwright/test';

test('ZenExplorer inline rename mechanism', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Press a key to skip the "Press any key to continue" boot prompt
    await page.waitForTimeout(5000);
    await page.keyboard.press('Enter');

    // Wait for the taskbar and start button to appear
    const startButton = page.locator('button:has-text("Start")');
    await expect(startButton).toBeVisible({ timeout: 60000 });

    // Open ZenExplorer
    await startButton.click();
    await page.click('text=Programs');
    await page.click('text=File Manager (ZenFS)');

    const zenWin = page.locator('#zenexplorer');
    await expect(zenWin).toBeVisible();
    await page.screenshot({ path: '1_zen_opened.png' });

    // Navigate to C:
    await zenWin.locator('.explorer-icon').filter({ hasText: '(C:)' }).dblclick();
    await page.screenshot({ path: '2_c_drive.png' });

    // 1. Test New Folder (inline)
    await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
    await page.locator('.menu-item:has-text("New")').click();
    await page.locator('.menu-popup .menu-item:has-text("Folder")').click();

    // Should see an input instead of a dialog
    const renameInput = zenWin.locator('.icon-label-input');
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toHaveValue('New Folder');
    await page.screenshot({ path: '3_new_folder_input.png' });

    // Rename to "TestFolder"
    await renameInput.fill('TestFolder');
    await renameInput.press('Enter');

    // Should be saved
    await expect(renameInput).not.toBeVisible();
    const folder = zenWin.locator('.explorer-icon[data-name="TestFolder"]');
    await expect(folder).toBeVisible();
    await page.screenshot({ path: '4_folder_created.png' });

    // 2. Test click-to-rename
    // First click to select
    await folder.click();

    // Wait for the delay (500ms in code)
    await page.waitForTimeout(1000);

    // Click again to trigger rename
    await folder.click();

    // Should see input again
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toHaveValue('TestFolder');
    await page.screenshot({ path: '5_click_to_rename.png' });

    // Cancel with Escape
    await renameInput.fill('ChangedName');
    await renameInput.press('Escape');

    // Should revert
    await expect(renameInput).not.toBeVisible();
    await page.screenshot({ path: '6_after_cancel.png' });
    await expect(zenWin.locator('.explorer-icon').filter({ hasText: /^TestFolder$/ })).toBeVisible();

    // 3. Test Blur to save
    const folder2 = zenWin.locator('.explorer-icon[data-name="TestFolder"]');
    await folder2.click();
    await page.waitForTimeout(1000);
    await folder2.click();
    await expect(renameInput).toBeVisible();
    await renameInput.fill('BlurredName');

    // Click background to blur
    await renameInput.blur();

    // Should save
    await expect(renameInput).not.toBeVisible();
    await expect(zenWin.locator('.explorer-icon[data-name="BlurredName"]')).toBeVisible();
    await page.screenshot({ path: '7_final.png' });
});
