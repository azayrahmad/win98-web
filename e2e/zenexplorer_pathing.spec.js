import { test, expect } from '@playwright/test';

test('ZenExplorer pathing and root immutability', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Close any startup windows if they appear (sometimes Tip of the Day appears)
    const tipWindow = page.locator('.window:has-text("Welcome")');
    if (await tipWindow.isVisible()) {
        await tipWindow.locator('button:has-text("Close")').click();
    }

    await page.click('button:has-text("Start")');
    await page.click('text=Programs');
    await page.screenshot({ path: 'before_click_zenfs.png' });
    await page.click('text=File Manager (ZenFS)');

    // Wait for a bit
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'after_click_zenfs.png' });

    const zenWin = page.locator('#zenexplorer');
    await expect(zenWin).toBeVisible();

    // 1. Verify root display name and address bar
    const addressBar = zenWin.locator('.address-bar input');
    await expect(addressBar).toHaveValue('My Computer');
    await expect(zenWin.locator('.window-title')).toHaveText('My Computer');

    // 2. Verify C: icon and label in root
    const cDriveIcon = zenWin.locator('.explorer-icon').filter({ hasText: '(C:)' });
    await expect(cDriveIcon).toBeVisible();

    // 3. Navigate to C: and verify formatting
    await cDriveIcon.dblclick();
    await expect(addressBar).toHaveValue('C:\\');
    await expect(zenWin.locator('.window-title')).toHaveText('(C:)');

    // 4. Navigate back to root and check immutability
    await zenWin.locator('.menu-button').filter({ hasText: 'Go' }).click();
    await page.locator('.menu-item:has-text("Up One Level")').filter({ visible: true }).click();
    await expect(addressBar).toHaveValue('My Computer');

    // Select (C:) and check Edit menu (Cut should be disabled)
    await cDriveIcon.click();
    await zenWin.locator('.menu-button').filter({ hasText: 'Edit' }).click();
    const cutMenuItem = page.locator('.menu-popup .menu-item:has-text("Cut")').filter({ visible: true });
    await expect(cutMenuItem).toHaveAttribute('aria-disabled', 'true');

    // Close menu
    await page.mouse.click(0, 0);

    // Right click background and check New menu
    await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
    const newMenuItem = page.locator('.menu-popup .menu-item:has-text("New")').filter({ visible: true });
    await expect(newMenuItem).toHaveAttribute('aria-disabled', 'true');

    await page.screenshot({ path: 'zen_pathing.png' });
});
