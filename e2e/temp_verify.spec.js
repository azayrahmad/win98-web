import { test, expect } from '@playwright/test';

test('verify downloader installation logic', async ({ page }) => {
  test.setTimeout(120000);

  console.log("Navigating to app...");
  await page.goto("http://localhost:5173/win98-web/");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".start-button", { timeout: 60000 });
  await page.waitForFunction(() => window.System && typeof window.System.launchApp === 'function');

  console.log("Launching DOS Games Downloader...");
  await page.evaluate(() => window.System.launchApp('dos-games-downloader'));
  await page.waitForSelector(".window:has-text('DOS Games Downloader')");

  console.log("Searching for Tetris...");
  await page.fill(".search-input", "tetris");
  await page.click(".search-button");

  console.log("Waiting for results...");
  await page.waitForSelector(".game-card", { timeout: 30000 });

  // Find a tetris entry and click install
  // We'll try the first one that looks like a legitimate game
  const installBtn = page.locator(".game-card >> text=Install").first();
  const title = await page.locator(".game-card .game-title").first().innerText();
  const identifier = await page.locator(".game-card .game-id").first().innerText();

  console.log(`Installing ${title} (${identifier})...`);
  await installBtn.click();

  console.log("Waiting for success message...");
  // We expect "Successfully installed" text to appear in the status-overlay
  await expect(page.locator(".status-message")).toHaveText(/Successfully installed|Error:/, { timeout: 60000 });

  const statusText = await page.locator(".status-message").innerText();
  console.log("Final status:", statusText);

  if (statusText.includes("Successfully installed")) {
      console.log("Installation successful!");
      // Check if shortcut exists on desktop
      const shortcut = page.locator(`.explorer-icon:has-text("${title}")`);
      await expect(shortcut).toBeVisible();
  } else {
      console.error("Installation failed with status:", statusText);
      throw new Error(statusText);
  }

  await page.screenshot({ path: "/home/jules/verification/downloader_install_result.png" });
});
