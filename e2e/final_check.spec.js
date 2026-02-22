
import { test, expect } from '@playwright/test';

test('final verification after build', async ({ page }) => {
  await page.goto('http://localhost:5173/win98-web/');

  // Wait for desktop to be visible (azOS uses .desktop class)
  await page.waitForSelector('.desktop', { timeout: 30000 });

  // Launch Minesweeper
  await page.evaluate(() => {
    window.System.launchApp('minesweeper');
  });

  // Verify Minesweeper window is visible
  const minesweeper = page.locator('.os-window:has-text("Minesweeper")');
  await expect(minesweeper).toBeVisible();

  // Click Game menu
  await minesweeper.locator('.menu-button:has-text("Game")').click();

  // Verify menu popup
  await expect(page.locator('.menu-popup-wrapper.open')).toBeVisible();

  // Take a final screenshot
  await page.screenshot({ path: '/home/jules/verification/final-check.png' });
});
