import { test, expect } from '@playwright/test';

test('Command Prompt ZenFS integration', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Close any startup windows
    const tipWindow = page.locator('.window:has-text("Welcome")');
    if (await tipWindow.isVisible()) {
        await tipWindow.locator('button:has-text("Close")').click();
    }

    // Open Command Prompt
    await page.click('button:has-text("Start")');
    await page.click('text=Programs');
    await page.click('text=MS-DOS Prompt');

    const cmdWin = page.locator('.window:has-text("MS-DOS Prompt")');
    await expect(cmdWin).toBeVisible();

    const terminal = cmdWin.locator('.xterm-helper-textarea');
    await terminal.focus();

    // Verify initial prompt
    await expect(cmdWin).toContainText('C:\\WINDOWS>');

    // Go to root for easier testing of original logic
    await page.keyboard.type('CD \\');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('C:\\>');

    // Test DIR
    await page.keyboard.type('DIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    // We expect to see some files from C: drive.
    await expect(cmdWin).toContainText('WINDOWS');

    // Test MKDIR
    await page.keyboard.type('MD TESTDIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.keyboard.type('DIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('TESTDIR');

    // Test CD
    await page.keyboard.type('CD TESTDIR');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('C:\\TESTDIR>');

    // Test CD .. from drive root
    await page.keyboard.type('CD \\');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('C:\\>');
    await page.keyboard.type('CD ..');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('Invalid directory');

    // Test drive change
    await page.keyboard.type('A:');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    // A: is likely not mounted in the E2E environment
    await expect(cmdWin).toContainText('General failure reading drive A:');

    // Test going back to C:
    await page.keyboard.type('C:');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expect(cmdWin).toContainText('C:\\>');

    await page.screenshot({ path: testInfo.outputPath('command_prompt_test.png') });
});
