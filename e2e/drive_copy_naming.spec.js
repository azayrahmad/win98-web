import { test, expect } from '@playwright/test';

test.describe('Drive Copy-Paste Naming', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(120000);
        await page.goto('http://localhost:5173/win98-web/');

        // Wait for the "Press any key to continue" boot prompt
        await page.waitForTimeout(5000);
        await page.keyboard.press('Enter');

        // Wait for the desktop to be ready
        const desktop = page.locator('.desktop');
        await expect(desktop).toBeVisible({ timeout: 60000 });

        // Ensure launchApp is available
        await page.waitForFunction(() => typeof window.System?.launchApp === 'function');
    });

    test('Copying A: drive should paste as "3½ Floppy"', async ({ page }) => {
        // Launch ZenExplorer to My Computer (root)
        await page.evaluate(() => {
            window.System.launchApp('explorer', '/');
        });

        const explorerWin = page.locator('.window[data-app-id="explorer"]').first();
        await expect(explorerWin).toBeVisible();

        // Find A: icon
        const aDriveIcon = explorerWin.locator('.explorer-icon[data-path="/A:"]');
        await expect(aDriveIcon).toBeVisible();

        // Copy A: drive
        await aDriveIcon.click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Copy', exact: true }).click();

        // Navigate to C:/WINDOWS/Desktop (easier to verify)
        await page.evaluate(() => {
            const app = Object.values(window.System.appManager.runningApps).find(a => a.config.id === 'explorer');
            app.navigateTo('/C:/WINDOWS/Desktop');
        });

        // Wait for navigation
        await expect(explorerWin.locator('.sidebar-title')).toHaveText('Desktop');

        // Paste
        await explorerWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Paste', exact: true }).click();

        // Wait for paste to complete (it might take a while because it tries to copy recursively,
        // but we only care about the folder being created with the right name initially)
        // Actually, pasteItems in file-operations.js waits for copyRecursive to finish.
        // Copying C: might be slow.

        // Let's check for the icon. It should appear once the folder is created.
        await page.waitForFunction((winSelector) => {
            const icons = document.querySelectorAll(`${winSelector} .explorer-icon`);
            const names = Array.from(icons).map(i => i.getAttribute('data-name'));
            return names.includes('3½ Floppy');
        }, '.window[data-app-id="explorer"]', { timeout: 30000 });

        const floppyFolder = explorerWin.locator('.explorer-icon[data-name="3½ Floppy"]');
        await expect(floppyFolder).toBeVisible();

        // Copy A: drive again
        await page.evaluate(() => {
            const app = Object.values(window.System.appManager.runningApps).find(a => a.config.id === 'explorer');
            app.navigateTo('/');
        });
        await expect(explorerWin.locator('.sidebar-title')).toHaveText('My Computer');
        const aDriveIcon2 = explorerWin.locator('.explorer-icon[data-path="/A:"]');
        await aDriveIcon2.click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Copy', exact: true }).click();

        // Navigate back to Desktop
        await page.evaluate(() => {
            const app = Object.values(window.System.appManager.runningApps).find(a => a.config.id === 'explorer');
            app.navigateTo('/C:/WINDOWS/Desktop');
        });
        await expect(explorerWin.locator('.sidebar-title')).toHaveText('Desktop');

        // Paste again
        await explorerWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Paste', exact: true }).click();

        // Check for "Copy of 3½ Floppy"
        await page.waitForFunction((winSelector) => {
            const icons = document.querySelectorAll(`${winSelector} .explorer-icon`);
            const names = Array.from(icons).map(i => i.getAttribute('data-name'));
            return names.includes('Copy of 3½ Floppy');
        }, '.window[data-app-id="explorer"]', { timeout: 30000 });

        const copyOfFloppyFolder = explorerWin.locator('.explorer-icon[data-name="Copy of 3½ Floppy"]');
        await expect(copyOfFloppyFolder).toBeVisible();

        // Paste Shortcut
        await explorerWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Paste Shortcut', exact: true }).click();

        // Check for "Shortcut to A:.lnk.json" (or "Shortcut to A:")
        await page.waitForFunction((winSelector) => {
            const icons = document.querySelectorAll(`${winSelector} .explorer-icon`);
            const names = Array.from(icons).map(i => i.getAttribute('data-name'));
            return names.includes('Shortcut to A:.lnk.json');
        }, '.window[data-app-id="explorer"]', { timeout: 30000 });

        const shortcutToA = explorerWin.locator('.explorer-icon[data-name="Shortcut to A:.lnk.json"]');
        await expect(shortcutToA).toBeVisible();
    });
});
