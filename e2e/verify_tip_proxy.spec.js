import { test, expect } from '@playwright/test';

test('launch tip-of-the-day proxy', async ({ page }) => {
  await page.goto('/win98-web/');

  // Wait for system to boot and Clippy to be available
  await page.waitForSelector('.start-button');

  // Launch Tip of the Day via console to trigger proxy
  // Use a try-catch and wait for System.launchApp to be available if needed
  await page.evaluate(async () => {
    const waitForSystem = () => new Promise(resolve => {
        if (window.System && typeof window.System.launchApp === 'function') {
            resolve();
        } else {
            const interval = setInterval(() => {
                if (window.System && typeof window.System.launchApp === 'function') {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        }
    });
    await waitForSystem();
    await window.System.launchApp('tip-of-the-day');
  });

  // Verify Assistant (Clippy) appears with a tip
  // Clippy takes a moment to load and show the balloon
  const balloon = page.locator('.clippy-balloon');
  await expect(balloon).toBeVisible({ timeout: 15000 });

  const tipText = await balloon.innerText();
  console.log('Tip shown by Assistant:', tipText);
  expect(tipText.length).toBeGreaterThan(0);
});
