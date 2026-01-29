import { test, expect } from '@playwright/test';

test('ZenExplorer C: formatting', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Close any startup windows if they appear (sometimes Tip of the Day appears)
    const tipWindow = page.locator('.window:has-text("Welcome")');
    if (await tipWindow.isVisible()) {
        await tipWindow.locator('button:has-text("Close")').click();
    }

    await page.click('button:has-text("Start")');
    await page.click('text=Programs');
    await page.click('text=File Manager (ZenFS)');
    const zenWin = page.locator('#zenexplorer');
    await expect(zenWin).toBeVisible();

    const cDriveIcon = zenWin.locator('.explorer-icon').filter({ hasText: '(C:)' });
    await cDriveIcon.dblclick();

    const addressBar = zenWin.locator('.address-bar input');
    await expect(addressBar).toHaveValue('C:\\');
    await expect(zenWin.locator('.window-title')).toHaveText('(C:)');

    await page.screenshot({ path: 'c_drive.png' });
});
