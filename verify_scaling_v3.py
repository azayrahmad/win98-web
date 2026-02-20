import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 800, 'height': 600})
        await page.goto('http://localhost:5173/win98-web/')

        # Wait for boot
        print("Waiting for desktop...")
        try:
            await page.wait_for_selector('.desktop', timeout=30000)
        except Exception as e:
            print(f"Failed to find desktop: {e}")
            await page.screenshot(path='/home/jules/verification/failed_boot.png')
            await browser.close()
            return

        await asyncio.sleep(2) # Stabilize

        # Check scale
        scale = await page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--os-scale")')
        print(f"OS Scale: {scale}")

        # Right click to open context menu
        print("Opening context menu...")
        await page.mouse.click(400, 300, button="right")
        await asyncio.sleep(2)
        await page.screenshot(path='/home/jules/verification/context_menu_test.png')

        # Check if context menu exists
        menu = page.locator('.menu-popup-wrapper').last
        if await menu.count() > 0:
            menu_box = await menu.bounding_box()
            print(f"Context menu box: {menu_box}")
        else:
            print("Context menu not found!")

        await browser.close()

asyncio.run(main())
