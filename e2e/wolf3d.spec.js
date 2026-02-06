import { test, expect } from '@playwright/test';

test.describe('Wolfenstein 3D', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/win98-web/');
    await page.waitForSelector('text=azOS Ready!', { timeout: 60000 });
    await page.waitForSelector('#splash-screen', { state: 'hidden' });
  });

  test('should show Wolfenstein 3D on the desktop', async ({ page }) => {
    // It should be in the Games folder on the desktop
    const gamesFolder = page.locator('.desktop .explorer-icon[data-name="Games"]');
    await gamesFolder.dblclick();

    const wolfIcon = page.locator('.window[data-app-id="explorer"] .explorer-icon:has-text("Wolfenstein 3D")');
    await expect(wolfIcon).toBeVisible({ timeout: 10000 });
  });

  test('should launch Wolfenstein 3D', async ({ page }) => {
    const gamesFolder = page.locator('.desktop .explorer-icon:has-text("Games")');
    await gamesFolder.dblclick();

    const wolfIcon = page.locator('.window[data-app-id="explorer"] .explorer-icon:has-text("Wolfenstein 3D")');
    await wolfIcon.dblclick();

    // It should launch DOSBox
    await page.waitForSelector('.window[data-app-id="wolf-3d"]');
    const iframe = page.locator('.window[data-app-id="wolf-3d"] iframe');
    await expect(iframe).toBeVisible();

    // Check if iframe src contains Wolf3D
    const src = await iframe.getAttribute('src');
    expect(src).toContain('executable=WOLF3D.EXE');
    expect(src).toContain('directory=%2FC%3A%2FGames%2FWolf3D');
  });
});
