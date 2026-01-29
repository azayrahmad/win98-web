import { test, expect } from '@playwright/test';

test('ZenExplorer folder management', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');
    await page.click('button:has-text("Start")');
    await page.click('text=Programs');
    await page.click('text=File Manager (ZenFS)');
    const zenWin = page.locator('#zenexplorer');
    await expect(zenWin).toBeVisible();

    // Navigate to C:
    await zenWin.locator('.explorer-icon').filter({ hasText: '(C:)' }).dblclick();

    // Create a folder
    await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
    await page.locator('.menu-item:has-text("New")').click();
    await page.locator('.menu-popup .menu-item:has-text("Folder")').click();

    const renameInput = zenWin.locator('.icon-label-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill('VerificationFolder');
    await renameInput.press('Enter');
    await expect(renameInput).not.toBeVisible();

    // Select it
    const icon = zenWin.locator('.explorer-icon').filter({ hasText: 'VerificationFolder' });
    await icon.click();

    // Open Edit menu
    await zenWin.locator('.menu-button').filter({ hasText: 'Edit' }).click();

    await page.screenshot({ path: '/home/jules/verification/verification.png' });
});
