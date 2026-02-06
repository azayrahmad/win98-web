import { test, expect } from '@playwright/test';

test('ZenExplorer address bar enhancement', async ({ page }, testInfo) => {
  await page.goto('./'); // Uses baseURL from config

  // Wait for boot
  await page.waitForFunction(() => window.System && typeof window.System.launchApp === 'function');

  // Launch ZenExplorer
  await page.evaluate(() => window.System.launchApp('explorer'));
  await page.locator('.window[data-app-id="explorer"]').waitFor();

  // Check address bar structure
  const addressBar = page.locator('.address-bar');
  await expect(addressBar).toBeVisible();

  const combo = addressBar.locator('.address-bar-combo');
  await expect(combo).toBeVisible();

  const icon = combo.locator('.address-bar-icon-img');
  await expect(icon).toBeVisible();

  const input = combo.locator('input.address-bar-input');
  await expect(input).toBeVisible();
  // It might be 'My Computer' or something else depending on initial path

  const button = combo.locator('.address-bar-dropdown-button');
  await expect(button).toBeVisible();

  // Open dropdown
  await button.click();

  const dropdown = page.locator('.address-bar-dropdown');
  await expect(dropdown).toBeVisible();
  await expect(dropdown).toHaveClass(/show/);

  // Check dropdown items
  const items = dropdown.locator('.address-bar-tree-item');
  const count = await items.count();
  console.log('Dropdown item count:', count);
  expect(count).toBeGreaterThan(0);

  // Take a screenshot
  await page.screenshot({ path: testInfo.outputPath('address-bar.png') });
});
