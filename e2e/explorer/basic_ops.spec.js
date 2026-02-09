import { test, expect } from '@playwright/test';

test('Explorer Basic Operations', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');

    // Handle "Press any key to continue" boot prompt if it appears
    const bootScreen = page.locator('#boot-screen');
    if (await bootScreen.isVisible()) {
        const prompt = page.locator('text=Press any key to continue');
        try {
            await prompt.waitFor({ state: 'visible', timeout: 5000 });
            await page.keyboard.press('Enter');
        } catch (e) {}
    }
    await expect(page.locator('#splash-screen')).toBeHidden({ timeout: 60000 });

    // Wait for the System API to be fully available
    await page.waitForFunction(() => window.System && typeof window.System.launchApp === 'function', { timeout: 30000 });

    // Close Welcome window if it appears
    const welcomeWindow = page.locator('.window:has-text("Welcome")');
    if (await welcomeWindow.isVisible()) {
        await welcomeWindow.locator('button:has-text("Close")').click();
    }

    // 1. Launch Explorer at C:\My Documents
    await page.evaluate(() => window.System.launchApp('explorer', { filePath: '/C:/My Documents' }));
    const explorerWin = page.locator('.window[data-app-id="explorer"]');
    await expect(explorerWin).toBeVisible();

    // 2. Create a new folder
    const iconView = explorerWin.locator('.explorer-icon-view');
    await iconView.click({ button: 'right' });
    await page.locator('.menu-item:has-text("New")').filter({ visible: true }).click();
    await page.locator('.menu-item:has-text("Folder")').filter({ visible: true }).click();

    // It should create "New Folder" and enter rename mode.
    // For the test, we just check if it appeared.
    const newFolder = iconView.locator('.explorer-icon[data-name="New Folder"]');
    await expect(newFolder).toBeVisible({ timeout: 10000 });

    // Press Escape to exit rename mode if it's active
    await page.keyboard.press('Escape');

    // 3. Create a new text document
    await iconView.click({ button: 'right' });
    await page.locator('.menu-item:has-text("New")').filter({ visible: true }).click();
    await page.locator('.menu-item:has-text("Text Document")').filter({ visible: true }).click();

    const newFile = iconView.locator('.explorer-icon[data-name="New Text Document.txt"]');
    await expect(newFile).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');

    // 4. Change View Modes
    const viewButton = explorerWin.locator('.menu-button:has-text("View")');

    // Details View
    await viewButton.click();
    await page.locator('.menu-item:has-text("Details")').filter({ visible: true }).click();
    await expect(iconView).toHaveClass(/details-icons/);
    await expect(iconView.locator('table')).toBeVisible();

    // List View
    await viewButton.click();
    await page.locator('.menu-item:has-text("List")').filter({ visible: true }).click();
    await expect(iconView).toHaveClass(/list-icons/);

    // Large Icons
    await viewButton.click();
    await page.locator('.menu-item:has-text("Large Icons")').filter({ visible: true }).click();
    await expect(iconView).toHaveClass(/large-icons/);

    // 5. Sorting (via Menu)
    await viewButton.click();
    const arrangeSubmenu = page.locator('.menu-item:has-text("Arrange Icons")').filter({ visible: true });
    await arrangeSubmenu.hover();
    await page.locator('.menu-item:has-text("by Name")').filter({ visible: true }).click();
    // (Visual verification of sort is harder, but we check the action works)

    // 6. Delete items
    await newFolder.click({ button: 'right' });
    await page.locator('.menu-item:has-text("Delete")').filter({ visible: true }).click();

    const deleteDialog = page.locator('.window:has-text("Confirm File Delete")');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.locator('button:has-text("Yes")').click();
    await expect(newFolder).toBeHidden();

    await newFile.click({ button: 'right' });
    await page.locator('.menu-item:has-text("Delete")').filter({ visible: true }).click();
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.locator('button:has-text("Yes")').click();
    await expect(newFile).toBeHidden();
});
