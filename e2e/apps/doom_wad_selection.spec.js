import { test, expect } from '@playwright/test';

test.describe('Doom WAD Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/win98-web/');
    // Wait for the OS to initialize
    await page.waitForSelector('text=azOS Ready!', { timeout: 60000 });
    // Wait for splash screen to hide
    await page.waitForSelector('#splash-screen', { state: 'hidden' });
  });

  test('should launch Doom with default WAD when only one is available', async ({ page }) => {
    // Launch Doom via System API
    await page.evaluate(() => window.System.launchApp('doom'));

    // Verify Doom window is open
    await page.waitForSelector('.window[data-app-id="doom"]');

    // Verify no WAD selection dialog appeared (it should start immediately)
    const dialog = page.locator('.window:has-text("Doom WAD Selection")');
    await expect(dialog).not.toBeVisible();
  });

  test('should show WAD selection dialog when multiple WADs are available', async ({ page }) => {
    // Create a dummy WAD file in C:\Program Files\Doom
    await page.evaluate(async () => {
        const fs = window.fs;
        const path = '/C:/Program Files/Doom/doom2.wad';
        await fs.promises.writeFile(path, new Uint8Array([0, 0, 0, 0])); // Dummy content
        // Trigger a refresh event if needed, though DoomApp scans on launch
    });

    // Launch Doom
    await page.evaluate(() => window.System.launchApp('doom'));

    // Verify WAD selection dialog appeared
    const dialog = page.locator('.window:has-text("Doom WAD Selection")');
    await expect(dialog).toBeVisible();

    // Verify the options in the select
    const select = dialog.locator('select');
    await expect(select).toBeVisible();

    const options = select.locator('option');
    await expect(options).toHaveCount(2);

    // Check texts
    const text1 = await options.nth(0).innerText();
    const text2 = await options.nth(1).innerText();

    expect([text1, text2]).toContain('Doom Shareware');
    expect([text1, text2]).toContain('Doom II: Hell on Earth');

    // Select Doom II and click OK
    await select.selectOption({ label: 'Doom II: Hell on Earth' });
    await dialog.locator('button:has-text("OK")').click();

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
  });
});
