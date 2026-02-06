import { test, expect } from '@playwright/test';

test('Verify Recycle Bin Icons and Properties', async ({ page }, testInfo) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto('/');
    await page.waitForSelector('text=azOS Ready!', { timeout: 60000 });
    await page.waitForSelector('#splash-screen', { state: 'hidden' });

    // Create a text file and move it to recycle bin
    await page.evaluate(async () => {
        const fs = window.fs;
        const RecycleBinManager = window.RecycleBinManager;
        const testPath = '/C:/WINDOWS/Desktop/test_icon.txt';
        await fs.promises.writeFile(testPath, 'test icon');
        await RecycleBinManager.moveToRecycleBin(testPath);
        window.dispatchEvent(new CustomEvent('desktop-refresh'));
    });

    // Open Recycle Bin
    await page.evaluate(() => {
        window.System.launchApp('explorer', { filePath: '/Recycle Bin' });
    });

    await page.waitForSelector('.window[data-app-id="explorer"]');

    // Wait for the item to appear
    const itemSelector = '.icon-label:has-text("test_icon.txt")';
    await page.waitForSelector(itemSelector, { timeout: 10000 });

    // Take screenshot of the icon
    await page.screenshot({ path: testInfo.outputPath('bin_item_icon_v2.png') });

    // Open properties
    const icon = page.locator(itemSelector).first();
    await icon.click({ button: 'right' });
    await page.click('.menu-item:has-text("Properties")');

    // Wait for properties window
    await page.waitForSelector('.window:has-text("Properties")');

    // Small delay for rendering
    await page.waitForTimeout(2000);

    // Take screenshot of properties
    await page.screenshot({ path: testInfo.outputPath('bin_item_properties_v2.png') });

    // Verify properties content
    const title = await page.textContent('.properties-dialog label');
    expect(title).toBe('test_icon.txt');

    // Use exact text match to avoid parent container issues
    const originLabel = page.locator('.properties-dialog div').filter({ hasText: /^Origin:$/ });
    await expect(originLabel).toBeVisible();

    const originValue = await page.textContent('.properties-dialog div:has-text("Origin:") + div');
    expect(originValue).toContain('C:\\WINDOWS\\Desktop\\test_icon.txt');
});
