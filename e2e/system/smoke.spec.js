import { test, expect } from '@playwright/test';

test('System Smoke Test - Boot and Load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });
    page.on('pageerror', err => {
        errors.push(err.message);
    });

    await page.goto('/');

    // Handle "Press any key to continue" boot prompt if it appears
    const bootScreen = page.locator('#boot-screen');
    if (await bootScreen.isVisible()) {
        const prompt = page.locator('text=Press any key to continue');
        try {
            await prompt.waitFor({ state: 'visible', timeout: 5000 });
            await page.keyboard.press('Enter');
        } catch (e) {
            // Prompt might not have appeared, continue
        }
    }

    // Wait for the OS to be ready (Splash screen should be hidden)
    await expect(page.locator('#splash-screen')).toBeHidden({ timeout: 60000 });

    // Check if the Desktop is visible
    const desktop = page.locator('.desktop');
    await expect(desktop).toBeVisible();

    // Check for Taskbar and Start Button
    const taskbar = page.locator('.taskbar');
    await expect(taskbar).toBeVisible();
    const startButton = page.locator('button:has-text("Start")');
    await expect(startButton).toBeVisible();

    // Handle Welcome / Tip of the Day dialog if it appears
    const welcomeWindow = page.locator('.window:has-text("Welcome")');
    if (await welcomeWindow.isVisible()) {
        await welcomeWindow.locator('button:has-text("Close")').click();
        await expect(welcomeWindow).toBeHidden();
    }

    // Verify Start Menu can be opened
    await startButton.click();
    const startMenu = page.locator('.start-menu');
    await expect(startMenu).toBeVisible();

    // Click outside to close start menu
    await page.mouse.click(0, 0);
    await expect(startMenu).toBeHidden();

    // Report peculiarities (errors)
    if (errors.length > 0) {
        console.error('Peculiarities (Errors) found during boot:', errors);
        // We might not want to fail the test immediately if some non-critical errors occur,
        // but for a smoke test, any error is usually a bad sign.
        // For now, let's just log them and maybe fail if there are too many or specific ones.
        // Actually, the user said "report any peculiarities", so failing is a good way to report.
        expect(errors, 'Console errors were detected during boot').toHaveLength(0);
    }
});
