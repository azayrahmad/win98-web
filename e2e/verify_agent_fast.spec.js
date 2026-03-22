import { test, expect } from '@playwright/test';

test('launch agent via console and take screenshot', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('http://localhost:3000/win98-web/');

  // Wait for boot and desktop
  await page.waitForSelector('.desktop', { timeout: 90000 });

  // Launch agent using the global launchApp function
  await page.evaluate(async () => {
    const launchApp = window.System.launchApp;
    await launchApp('agent');
  });

  // Wait for the agent container to be created
  await page.waitForSelector('#ms-agent-container', { timeout: 15000 });

  // Wait a bit for the agent to load and speak intro
  await page.waitForTimeout(8000);

  // Take a screenshot of the agent on the desktop
  await page.screenshot({ path: 'verification/agent_launched_final.png' });

  // Trigger a manual speak to see the balloon clearly
  await page.evaluate(async () => {
    if (window.msAgentInstance) {
        await window.msAgentInstance.speak("I am working perfectly in Windows 98!");
    }
  });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'verification/agent_speaking_manual.png' });
});
