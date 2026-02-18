import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Use a larger viewport to avoid edge issues
        page = await browser.new_page(viewport={'width': 1024, 'height': 768})
        await page.goto('http://localhost:5173/win98-web/')

        # Wait for boot
        print("Waiting for desktop...")
        try:
            await page.wait_for_selector('.desktop', timeout=30000)
        except Exception as e:
            print(f"Failed to find desktop: {e}")
            await browser.close()
            return

        await asyncio.sleep(2) # Stabilize

        # Check scale
        scale = await page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--os-scale")')
        print(f"OS Scale: {scale}")

        # Check Screen styles
        styles = await page.evaluate('''() => {
            const el = document.getElementById("screen");
            return {
                zoom: el.style.zoom,
                transform: el.style.transform,
                width: el.style.width,
                height: el.style.height
            };
        }''')
        print(f"Screen styles: {styles}")

        # Click in the middle of the OS screen
        # Viewport is 1024x768. OS at scale 2 is 512x384.
        # Middle of OS is 256x192 OS pixels -> 512x384 physical pixels.
        print("Opening context menu...")
        await page.mouse.click(512, 384, button="right")
        await asyncio.sleep(1)
        await page.screenshot(path='/home/jules/verification/context_menu_test_v2.png')

        # Check if context menu exists
        menu = page.locator('.menu-popup-wrapper').last
        if await menu.count() > 0:
            menu_box = await menu.bounding_box()
            print(f"Context menu box: {menu_box}")
        else:
            print("Context menu not found!")

        await browser.close()

asyncio.run(main())
