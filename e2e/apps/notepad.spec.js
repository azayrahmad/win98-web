import { test, expect } from '@playwright/test';

test('Notepad E2E - Create, Save, and Reopen', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');

    // Handle "Press any key to continue" boot prompt if it appears
    const bootScreen = page.locator('#boot-screen');
    if (await bootScreen.isVisible()) {
        const prompt = page.locator('text=Press any key to continue');
        try {
            await prompt.waitFor({ state: 'visible', timeout: 5000 });
            await page.keyboard.press('Enter');
        } catch (e) {}
    }
    await expect(page.locator('#splash-screen')).toBeHidden({ timeout: 30000 });

    // Wait for the System API to be fully available
    await page.waitForFunction(() => window.System && typeof window.System.launchApp === 'function', { timeout: 30000 });

    // Close Welcome window if it appears
    const welcomeWindow = page.locator('.window:has-text("Welcome")');
    if (await welcomeWindow.isVisible()) {
        await welcomeWindow.locator('button:has-text("Close")').click();
    }

    // 1. Launch Notepad
    await page.evaluate(() => window.System.launchApp('notepad'));

    const notepadWin = page.locator('.window[data-app-id="notepad"]');
    await expect(notepadWin).toBeVisible({ timeout: 20000 });

    // 2. Type sample text
    // Notepad editor is a textarea with class .codeInput inside .notepad-container
    const editor = notepadWin.locator('.codeInput');
    await editor.click();
    const testContent = 'Hello World from E2E Test!';
    await page.keyboard.type(testContent);

    // 3. Save the file
    await notepadWin.locator('.menu-button:has-text("File")').click();
    await page.locator('.menu-item:has-text("Save As")').filter({ visible: true }).click();

    // File Picker should appear
    const filePicker = page.locator('.window:has-text("Save As")');
    await expect(filePicker).toBeVisible();

    // Set filename - use a more specific selector to avoid address bar
    const fileNameInput = filePicker.locator('.file-picker-row:has-text("File name:") input');
    await fileNameInput.fill('e2e-test.txt');

    // Click Save
    await filePicker.locator('button:has-text("Save")').click();
    await expect(filePicker).toBeHidden();

    // 4. Verify file saved (Check title change)
    await expect(notepadWin.locator('.window-title')).toContainText('e2e-test.txt');

    // 5. Close Notepad
    // Ensure menu is closed
    await page.mouse.click(500, 10);

    const closeBtn = notepadWin.locator('.window-close-button');
    await closeBtn.click();
    await expect(notepadWin).toBeHidden();

    // 6. Re-open Notepad and open the file
    await page.evaluate(() => window.System.launchApp('notepad'));

    const newNotepadWin = page.locator('.window[data-app-id="notepad"]');
    await newNotepadWin.locator('.menu-button:has-text("File")').click();
    await page.locator('.menu-item:has-text("Open")').filter({ visible: true }).click();

    const openPicker = page.locator('.window:has-text("Open")');
    await expect(openPicker).toBeVisible();

    // Find our file in the list
    await openPicker.locator('.icon-label:has-text("e2e-test.txt")').dblclick();
    await expect(openPicker).toBeHidden();

    // 7. Verify content
    const openedEditor = newNotepadWin.locator('.codeInput');
    await expect(openedEditor).toHaveValue(testContent);
});
