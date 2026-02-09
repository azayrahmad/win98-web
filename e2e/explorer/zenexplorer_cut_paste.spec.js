import { test, expect } from '@playwright/test';

test.describe('ZenExplorer File Operations', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        await page.goto('http://localhost:5173/win98-web/');

        // Wait for the "Press any key to continue" boot prompt (if any)
        await page.waitForTimeout(5000);
        await page.keyboard.press('Enter');

        // Wait for the desktop to be ready
        const desktop = page.locator('.desktop');
        await expect(desktop).toBeVisible({ timeout: 60000 });

        // Ensure launchApp is available
        await page.waitForFunction(() => typeof window.System?.launchApp === 'function');
    });

    test('Cut and Paste to same directory should NOT rename', async ({ page }) => {
        // Launch ZenExplorer directly to C:
        await page.evaluate(() => {
            window.System.launchApp('explorer', '/C:');
        });

        const zenWin = page.locator('.window[data-app-id="explorer"]').first();
        await expect(zenWin).toBeVisible();

        // Create a new file
        await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'New' }).click();
        await page.getByRole('menuitem', { name: 'Text Document' }).click();

        // Name it "CutTest.txt"
        const renameInput = zenWin.locator('.icon-label-input');
        await expect(renameInput).toBeVisible();
        await renameInput.fill('CutTest.txt');
        await renameInput.press('Enter');

        const fileIcon = zenWin.locator('.explorer-icon[data-name="CutTest.txt"]');
        await expect(fileIcon).toBeVisible();

        // Cut the file
        await fileIcon.click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Cut', exact: true }).click();

        // Paste in the same directory (C:)
        await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Paste', exact: true }).click();

        // Wait for potential refresh/animation
        await page.waitForTimeout(2000);

        // Assert the file name is still "CutTest.txt" and NOT "CutTest (1).txt"
        const fileNames = await zenWin.locator('.explorer-icon').evaluateAll(icons => icons.map(i => i.getAttribute('data-name')));
        console.log('File names after same-dir cut-paste:', fileNames);

        expect(fileNames).toContain('CutTest.txt');
        expect(fileNames).not.toContain('CutTest (1).txt');
    });

    test('Copy and Paste to same directory should create "Copy of ..."', async ({ page }) => {
        // Launch ZenExplorer directly to C:
        await page.evaluate(() => {
            window.System.launchApp('explorer', '/C:');
        });

        const zenWin = page.locator('.window[data-app-id="explorer"]').first();
        await expect(zenWin).toBeVisible();

        // Create a new file
        await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'New' }).click();
        await page.getByRole('menuitem', { name: 'Text Document' }).click();

        // Name it "CopyTest.txt"
        const renameInput = zenWin.locator('.icon-label-input');
        await expect(renameInput).toBeVisible();
        await renameInput.fill('CopyTest.txt');
        await renameInput.press('Enter');

        const fileIcon = zenWin.locator('.explorer-icon[data-name="CopyTest.txt"]');
        await expect(fileIcon).toBeVisible();

        // Copy the file
        await fileIcon.click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Copy', exact: true }).click();

        // Paste in the same directory (C:)
        await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Paste', exact: true }).click();

        // Wait for potential refresh/animation
        await page.waitForTimeout(2000);

        // Assert that "Copy of CopyTest.txt" exists
        const fileNames = await zenWin.locator('.explorer-icon').evaluateAll(icons => icons.map(i => i.getAttribute('data-name')));
        console.log('File names after same-dir copy-paste:', fileNames);

        expect(fileNames).toContain('CopyTest.txt');
        expect(fileNames).toContain('Copy of CopyTest.txt');
    });

    test('Cut and Paste to DIFFERENT directory with conflict should rename', async ({ page }) => {
        // Launch ZenExplorer directly to C:
        await page.evaluate(() => {
            window.System.launchApp('explorer', '/C:');
        });

        const zenWin = page.locator('.window[data-app-id="explorer"]').first();
        await expect(zenWin).toBeVisible();

        // Create "Conflict.txt" in C:
        await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'New' }).click();
        await page.getByRole('menuitem', { name: 'Text Document' }).click();
        let renameInput = zenWin.locator('.icon-label-input');
        await expect(renameInput).toBeVisible();
        await renameInput.fill('Conflict.txt');
        await renameInput.press('Enter');

        // Create "Conflict.txt" in C:/WINDOWS
        await zenWin.locator('.explorer-icon').filter({ hasText: /^WINDOWS$/ }).dblclick();
        await page.waitForTimeout(1000);
        await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'New' }).click();
        await page.getByRole('menuitem', { name: 'Text Document' }).click();
        renameInput = zenWin.locator('.icon-label-input');
        await expect(renameInput).toBeVisible();
        await renameInput.fill('Conflict.txt');
        await renameInput.press('Enter');

        // Go back to C:
        await zenWin.getByRole('button', { name: 'Up' }).click();
        await page.waitForTimeout(1000);

        // Cut Conflict.txt from C:
        const fileIcon = zenWin.locator('.explorer-icon[data-name="Conflict.txt"]');
        await fileIcon.click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Cut', exact: true }).click();

        // Paste into C:/WINDOWS
        await zenWin.locator('.explorer-icon').filter({ hasText: /^WINDOWS$/ }).click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Paste', exact: true }).click();

        // Navigate into C:/WINDOWS to verify
        await zenWin.locator('.explorer-icon').filter({ hasText: /^WINDOWS$/ }).dblclick();
        await page.waitForTimeout(2000);

        // Assert that "Conflict (1).txt" exists
        const fileNames = await zenWin.locator('.explorer-icon').evaluateAll(icons => icons.map(i => i.getAttribute('data-name')));
        console.log('File names in WINDOWS after cross-dir conflict cut-paste:', fileNames);

        expect(fileNames).toContain('Conflict.txt');
        expect(fileNames).toContain('Conflict (1).txt');
    });
});
