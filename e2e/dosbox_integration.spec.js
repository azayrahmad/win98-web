import { test, expect } from '@playwright/test';

test.describe('DOSBox Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for slow boot
    test.setTimeout(180000);

    await page.goto('http://localhost:5173/win98-web/');

    // Wait for the boot screen to finish
    console.log('Waiting for desktop...');
    // Press Enter to bypass boot screen prompt
    await page.keyboard.press('Enter');

    // Wait until boot-mode is gone
    await page.waitForSelector('#screen:not(.boot-mode)', { timeout: 60000 });

    // Wait for a desktop icon to be visible
    console.log('Waiting for My Computer icon...');
    await page.waitForSelector('.explorer-icon:has-text("My Computer")', { timeout: 30000 });

    // Close Tip of the Day if it appears
    const tipClose = page.locator('.window:has-text("Tip of the Day") button[aria-label="Close window"]');
    if (await tipClose.isVisible()) {
      await tipClose.click();
    }
  });

  test('Run Wolf3D from Desktop Shortcut', async ({ page }) => {
    console.log('Opening "Games" folder...');
    const gamesShortcut = page.locator('.explorer-icon:has-text("Games")');
    await expect(gamesShortcut).toBeVisible();
    await gamesShortcut.dblclick();

    console.log('Launching Wolfenstein 3D...');
    const wolfIcon = page.locator('.explorer-icon:has-text("Wolfenstein 3D")');
    await expect(wolfIcon).toBeVisible();
    await wolfIcon.dblclick();

    console.log('Waiting for DOSBox window...');
    const dosboxWindow = page.locator('.window:has-text("DOSBox - WOLF3D.EXE")');
    await expect(dosboxWindow).toBeVisible({ timeout: 60000 });

    // Check if the canvas is rendering (inside iframe)
    const iframe = dosboxWindow.frameLocator('iframe');
    await expect(iframe.locator('canvas')).toBeVisible();

    console.log('Closing DOSBox...');
    await dosboxWindow.locator('button[aria-label="Close window"]').click({ force: true });
    await expect(dosboxWindow).not.toBeVisible();
  });

  test('Run from Command Prompt', async ({ page }) => {
    console.log('Opening Command Prompt via Start Menu...');
    await page.locator('.start-button').click();

    // Click Programs
    await page.locator('text="Programs"').click();

    // Click MS-DOS Prompt
    console.log('Clicking MS-DOS Prompt...');
    await page.locator('text="MS-DOS Prompt"').click();

    console.log('Waiting for Command Prompt window...');
    const cmdWindow = page.locator('.window:has-text("MS-DOS Prompt")');
    await expect(cmdWindow).toBeVisible();

    // Type command to run Wolf3D
    console.log('Typing command...');
    await page.keyboard.type('dosbox C:\\Games\\WOLF3D\\WOLF3D.EXE');
    await page.keyboard.press('Enter');

    console.log('Waiting for DOSBox window...');
    const dosboxWindow = page.locator('.window:has-text("DOSBox - WOLF3D.EXE")');
    await expect(dosboxWindow).toBeVisible({ timeout: 60000 });

    // Close both
    await dosboxWindow.locator('button[aria-label="Close window"]').click({ force: true });
    await cmdWindow.locator('button[aria-label="Close window"]').click({ force: true });
  });

  test('Persistence Check', async ({ page }) => {
    // 1. Launch Wolf3D
    await page.evaluate(() => window.System.launchApp('wolf3d'));
    const dosboxWindow = page.locator('.window:has-text("DOSBox - WOLF3D.EXE")');
    await expect(dosboxWindow).toBeVisible({ timeout: 60000 });

    // 2. Wait a bit
    await page.waitForTimeout(5000);

    // 3. Close it
    console.log('Closing DOSBox for persistence check...');
    await dosboxWindow.locator('button[aria-label="Close window"]').click({ force: true });
    await expect(dosboxWindow).not.toBeVisible();

    // 4. Check ZenFS via window.fs
    const files = await page.evaluate(async () => {
       try {
         const dir = '/C:/Games/WOLF3D';
         return await window.fs.promises.readdir(dir);
       } catch (e) {
         return [e.message];
       }
    });

    console.log('Files in WOLF3D directory after close:', files);
    expect(files).toContain('WOLF3D.EXE');
  });
});
