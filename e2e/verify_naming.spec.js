import { test, expect } from '@playwright/test';

test('ZenExplorer copy naming logic', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('http://localhost:5173/win98-web/');

    // Open ZenExplorer
    await page.click('button:has-text("Start")');
    await page.click('text=Programs');
    await page.click('text=File Manager (ZenFS)');

    const zenWin = page.locator('#zenexplorer');
    await expect(zenWin).toBeVisible();

    // Navigate to C:
    await zenWin.locator('.explorer-icon').filter({ hasText: '(C:)' }).dblclick();

    // Helper to create a folder
    const createFolder = async (name) => {
        await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
        await page.locator('.menu-item:has-text("New")').click();
        await page.locator('.menu-popup .menu-item:has-text("Folder")').click();

        const renameInput = zenWin.locator('.icon-label-input');
        await expect(renameInput).toBeVisible();
        await renameInput.fill(name);
        await renameInput.press('Enter');
        await expect(renameInput).not.toBeVisible();
    };

    // 1. Create TestFolder
    await createFolder('X');
    const folderX = zenWin.locator('.explorer-icon').filter({ hasText: /^X$/ });
    await expect(folderX).toBeVisible();

    // 2. Copy X -> Copy of X
    await folderX.click({ button: 'right' });
    await page.locator('.menu-item:has-text("Copy")').filter({ visible: true }).first().click();
    await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
    await page.locator('.menu-item:has-text("Paste")').filter({ visible: true }).first().click();
    const folderCopyOfX = zenWin.locator('.explorer-icon').filter({ hasText: /^Copy of X$/ });
    await expect(folderCopyOfX).toBeVisible();

    // 3. Copy X again -> Copy (2) of X
    await folderX.click({ button: 'right' });
    await page.locator('.menu-item:has-text("Copy")').filter({ visible: true }).first().click();
    await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
    await page.locator('.menu-item:has-text("Paste")').filter({ visible: true }).first().click();
    const folderCopy2OfX = zenWin.locator('.explorer-icon').filter({ hasText: /^Copy \(2\) of X$/ });
    await expect(folderCopy2OfX).toBeVisible();

    // 4. Copy Copy (2) of X -> Copy (3) of X
    await folderCopy2OfX.click({ button: 'right' });
    await page.locator('.menu-item:has-text("Copy")').filter({ visible: true }).first().click();
    await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
    await page.locator('.menu-item:has-text("Paste")').filter({ visible: true }).first().click();
    const folderCopy3OfX = zenWin.locator('.explorer-icon').filter({ hasText: /^Copy \(3\) of X$/ });
    await expect(folderCopy3OfX).toBeVisible();

    // 5. Copy Copy of X -> Copy (4) of X
    await folderCopyOfX.click({ button: 'right' });
    await page.locator('.menu-item:has-text("Copy")').filter({ visible: true }).first().click();
    await zenWin.locator('.explorer-icon-view').click({ button: 'right' });
    await page.locator('.menu-item:has-text("Paste")').filter({ visible: true }).first().click();
    const folderCopy4OfX = zenWin.locator('.explorer-icon').filter({ hasText: /^Copy \(4\) of X$/ });
    await expect(folderCopy4OfX).toBeVisible();

    await page.screenshot({ path: 'naming-verification.png' });
});
