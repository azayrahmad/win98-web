import { test, expect } from '@playwright/test';

test('ZenExplorer directory-based singleton behavior', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Handle startup prompt if it exists (press Enter)
    await page.keyboard.press('Enter');

    // Wait for splash screen to disappear if it exists
    const splash = page.locator('#splash-screen');
    if (await splash.count() > 0) {
        await expect(splash).not.toBeVisible({ timeout: 30000 });
    }

    // Close any startup windows if they appear
    const tipWindow = page.locator('.window:has-text("Welcome")');
    try {
        await expect(tipWindow).toBeVisible({ timeout: 5000 });
        await tipWindow.locator('button:has-text("Close")').click();
    } catch (e) {
        // Welcome window might not appear
    }

    // Function to launch ZenExplorer
    const launchZenExplorer = async (stepName) => {
        await page.click('button:has-text("Start")');
        const programs = page.locator('.start-menu-item:has-text("Programs")');
        await expect(programs).toBeVisible({ timeout: 10000 });
        await programs.dispatchEvent('pointerenter');
        await page.click('text=File Manager (ZenFS)', { timeout: 10000 });
    };

    // 1. Launch first instance (defaults to / aka My Computer)
    await launchZenExplorer('first');
    await expect(page.locator('.window-title:has-text("My Computer")')).toBeVisible({ timeout: 10000 });

    // Count windows
    let windows = await page.locator('.window-title:has-text("My Computer")').count();
    expect(windows).toBe(1);

    // 2. Launch second instance (should focus existing one, not create new)
    await launchZenExplorer('second');
    await page.waitForTimeout(2000);
    windows = await page.locator('.window-title:has-text("My Computer")').count();
    expect(windows).toBe(1);

    // 3. Navigate first instance to C:
    let zenWin1 = page.locator('.window').filter({ has: page.locator('.window-title:has-text("My Computer")') });
    const cDriveIcon = zenWin1.locator('.explorer-icon').filter({ hasText: '(C:)' });
    await cDriveIcon.dblclick();

    // The title changes, so re-locate
    zenWin1 = page.locator('.window').filter({ has: page.locator('.window-title:has-text("(C:)")') });
    await expect(zenWin1).toBeVisible({ timeout: 10000 });

    // 4. Launch again (should create new instance at / because first one moved to /C:)
    await launchZenExplorer('third');

    // Wait for two windows to exist
    await expect(page.locator('.window[data-app-id="zenexplorer"]')).toHaveCount(2, { timeout: 10000 });

    // Now wait for the title to update to My Computer
    // We use a regex to ensure we are matching the whole title and avoid partial matches if any
    await expect(page.locator('.window-title').filter({ hasText: /^My Computer$/ })).toBeVisible({ timeout: 15000 });

    const myCompWins = await page.locator('.window-title').filter({ hasText: /^My Computer$/ }).count();
    const cDriveWins = await page.locator('.window-title').filter({ hasText: /^\(C:\)$/ }).count();

    expect(myCompWins).toBe(1);
    expect(cDriveWins).toBe(1);

    // 5. Navigate second instance (the one at My Computer) to C: (should be allowed per requirement 2)
    const zenWin2 = page.locator('.window').filter({ has: page.locator('.window-title').filter({ hasText: /^My Computer$/ }) });
    const cDriveIcon2 = zenWin2.locator('.explorer-icon').filter({ hasText: '(C:)' });
    await cDriveIcon2.dblclick();

    // Now we should have two windows with title "(C:)"
    await expect(page.locator('.window-title').filter({ hasText: /^\(C:\)$/ })).toHaveCount(2, { timeout: 15000 });

    await page.screenshot({ path: testInfo.outputPath('zen_instances_final.png') });
});
