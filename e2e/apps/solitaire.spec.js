import { test, expect } from '@playwright/test';

test('Solitaire E2E - Launch and Basic Interaction', async ({ page }) => {
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

    // 1. Launch Solitaire
    await page.evaluate(() => window.System.launchApp('solitaire'));

    const solitaireWin = page.locator('.window[data-app-id="solitaire"]');
    await expect(solitaireWin).toBeVisible({ timeout: 20000 });
    await expect(solitaireWin.locator('.window-title')).toContainText('Solitaire');

    // 2. Interaction: Click on the stock pile to deal cards
    const stockPile = solitaireWin.locator('.stock-pile');
    await expect(stockPile).toBeVisible();

    // Check initially drawn cards (should be 0 or some initial state)
    const drawnCards = solitaireWin.locator('.drawn-card-pile .card');
    const initialCount = await drawnCards.count();

    // Click stock pile
    // We need to click a card in the stock pile or the pile itself
    const stockCard = stockPile.locator('.card').last();
    if (await stockCard.isVisible()) {
        await stockCard.click();
    } else {
        await stockPile.click();
    }

    // 3. Verify that cards were dealt (drawn-card-pile should have more cards)
    // Dealing usually adds 1 or 3 cards depending on options.
    await expect(async () => {
        const newCount = await drawnCards.count();
        expect(newCount).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 5000 });

    // 4. Interaction: Double click a card in tableau to see if it moves (might not move if not valid, but we can try)
    // At least we verify we can click them.
    const tableauCard = solitaireWin.locator('.tableau-pile .card.face-up').first();
    if (await tableauCard.isVisible()) {
        await tableauCard.dblclick();
    }

    // 5. Close Solitaire
    await solitaireWin.locator('.window-close-button').click();
    await expect(solitaireWin).toBeHidden();
});
