import { test, expect } from '@playwright/test';

test.describe('Touch Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the desktop
    await page.goto('http://localhost:5173/win98-web/');
    // Wait for the OS to initialize (azOS Ready!)
    await page.waitForSelector('text=azOS Ready!', { timeout: 30000 });
    // Wait for splash screen to hide
    await page.waitForSelector('#splash-screen', { state: 'hidden' });
    // Wait for boot mode to be removed from screen
    await page.waitForSelector('#screen:not(.boot-mode)');
  });

  test('should dismiss context menu and start dragging on touch move', async ({ page }) => {
    const icon = page.locator('.desktop .explorer-icon[data-name="My Computer"]');
    await expect(icon).toBeVisible();

    // 1. Trigger context menu on the icon
    // Using dispatchEvent to simulate touch-hold behavior that triggers contextmenu
    await icon.dispatchEvent('contextmenu', { clientX: 100, clientY: 100 });
    // Use first() to avoid strict mode violation if there are submenus
    await expect(page.locator('.menu-popup-wrapper').first()).toBeVisible();

    const iconRect = await icon.boundingBox();
    const startX = iconRect.x + iconRect.width / 2;
    const startY = iconRect.y + iconRect.height / 2;

    // 2. Start touch sequence
    await icon.dispatchEvent('touchstart', {
      touches: [{ identifier: 0, clientX: startX, clientY: startY }]
    });

    // 3. Move beyond threshold (10px)
    // We move 20px to be sure
    const moveX = startX + 20;
    const moveY = startY + 20;
    await icon.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: moveX, clientY: moveY }]
    });

    // 4. Context menu should be gone
    await expect(page.locator('.menu-popup-wrapper')).not.toBeVisible();

    // 5. Drag ghost should be present and move
    // Dispatch another move to ensure DragDropManager's listener (on document) picks it up
    await page.dispatchEvent('body', 'touchmove', {
      touches: [{ identifier: 0, clientX: moveX + 10, clientY: moveY + 10 }]
    });

    const ghost = page.locator('.drag-ghost');
    await expect(ghost).toBeAttached();

    // Check that ghost position is updated (approximately)
    const ghostRect = await ghost.boundingBox();
    // ghost.style.left = `${x - this.offsetX}px`;
    // where offsetX = x - rect.left. So ghost left should be icon rect.left + movement.
    // Here movement is 20px.
    expect(ghostRect.x).toBeGreaterThan(iconRect.x);
    expect(ghostRect.y).toBeGreaterThan(iconRect.y);

    // 6. Complete drag
    const endX = startX + 100;
    const endY = startY + 100;

    await icon.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: endX, clientY: endY }]
    });

    await page.dispatchEvent('body', 'touchend', {
      changedTouches: [{ identifier: 0, clientX: endX, clientY: endY }]
    });

    // 7. Ghost should be gone
    await expect(page.locator('.drag-ghost')).not.toBeVisible();
  });
});
