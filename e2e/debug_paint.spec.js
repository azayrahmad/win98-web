import { test, expect } from '@playwright/test';

test('debug paint DOM', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('http://localhost:3000/win98-web/');
    await page.waitForTimeout(5000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    // Launch Paint
    await page.evaluate(() => window.System.launchApp('paint'));
    await page.waitForTimeout(5000);

    const paintWindow = page.locator('#paint');
    await paintWindow.screenshot({ path: '/home/jules/verification/paint_shared_lib.png' });
});
