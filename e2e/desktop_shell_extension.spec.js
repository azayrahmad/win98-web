import { test, expect } from '@playwright/test';

test('ZenExplorer Desktop Shell Extension and Shortcuts', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Wait for boot screen to be ready for Enter
    await page.waitForSelector('#boot-screen-content', { state: 'visible' });

    // Wait for the "Press any key to continue" prompt
    await page.waitForSelector('text=Press any key to continue', { timeout: 30000 });

    // Skip boot prompt
    await page.keyboard.press('Enter');

    // Wait for splash screen to hide
    await page.waitForSelector('#splash-screen', { state: 'hidden' });

    // Close any startup windows if they appear
    const tipWindow = page.locator('.window:has-text("Welcome")');
    try {
        if (await tipWindow.isVisible({ timeout: 5000 })) {
            await tipWindow.locator('button:has-text("Close")').click();
        }
    } catch (e) {}

    // 1. Check if "My Computer" is on the desktop (virtual item from shell extension)
    const myComputerIcon = page.locator('.desktop .explorer-icon').filter({ hasText: 'My Computer' });
    await expect(myComputerIcon).toBeVisible();

    // 2. Check if a migrated shortcut is on the desktop (e.g., Winamp)
    const winampIcon = page.locator('.desktop .explorer-icon').filter({ hasText: 'Winamp' });
    await expect(winampIcon).toBeVisible();

    // Check for shortcut overlay
    const overlay = winampIcon.locator('.shortcut-overlay.icon-32');
    await expect(overlay).toBeVisible();

    // 3. Double click "My Computer" on desktop should launch ZenExplorer
    await myComputerIcon.dblclick();
    await page.waitForTimeout(2000);

    const zenWin = page.locator('.window[data-app-id="zenexplorer"]');
    await expect(zenWin).toBeVisible({ timeout: 10000 });

    // 4. Test navigating to the Desktop folder in ZenExplorer
    const addressBar = zenWin.locator('.address-bar input');
    await addressBar.fill('C:\\WINDOWS\\Desktop');
    await addressBar.press('Enter');

    // Verify it shows "My Computer" (virtual) and real files in the directory view
    await expect(zenWin.locator('.explorer-icon').filter({ hasText: 'My Computer' })).toBeVisible();
    await expect(zenWin.locator('.explorer-icon').filter({ hasText: 'Winamp' })).toBeVisible();
});
