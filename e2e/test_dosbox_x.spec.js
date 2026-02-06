import { test, expect } from '@playwright/test';

test('Launch SimCity 2000 via DOSBox-X runner', async ({ page }) => {
  test.setTimeout(120000);

  page.on('console', msg => {
    console.log(`PAGE ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  await page.goto('http://localhost:5173/');

  console.log("Waiting for system boot...");
  await page.waitForFunction(() => window.System && typeof window.System.launchApp === 'function', { timeout: 60000 });
  console.log("System booted");

  // Launch Command Prompt
  await page.evaluate(() => window.System.launchApp('command-prompt'));
  await page.waitForSelector('#command-prompt');

  // Navigate and run
  await page.keyboard.type('cd /C:/Games/SimCity2000');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.keyboard.type('SC2000.EXE');
  await page.keyboard.press('Enter');

  // Wait for DOSBox-X window
  console.log("Waiting for DOSBox-X window...");
  const dosboxSelector = '.os-window[data-app-id="dosbox"]';
  await page.waitForSelector(dosboxSelector, { timeout: 30000 });

  // Wait for iframe
  const iframeElement = await page.waitForSelector(`${dosboxSelector} iframe`);
  const frame = await iframeElement.contentFrame();

  console.log("Waiting for emulator to initialize in frame...");
  await page.waitForTimeout(30000);

  // Take screenshot
  await page.screenshot({ path: 'test-results/dosbox-x-sc2k.png' });

  // Check if canvas is being drawn to
  const canvasExists = await frame.$('#dos-canvas');
  expect(canvasExists).not.toBeNull();

  console.log("Test finished");
});
