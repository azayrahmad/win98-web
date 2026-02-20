import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1024, 'height': 768})
        await page.goto('http://localhost:5173/win98-web/')

        print("Waiting for desktop...")
        await page.wait_for_selector('.desktop', timeout=30000)
        await asyncio.sleep(5) # Wait for all boot processes

        # Check scale
        scale = await page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--os-scale")')
        print(f"OS Scale: {scale}")

        # Take a screenshot of the whole screen
        await page.screenshot(path='/home/jules/verification/full_desktop.png')

        # Try to right click on the desktop background
        # Desktop should be visible. We click at a safe spot.
        print("Right-clicking desktop background...")
        await page.locator('.desktop').click(button='right', position={'x': 300, 'y': 200})
        await asyncio.sleep(2)

        # List all elements with menu-popup-wrapper
        menus = await page.evaluate('''() => {
            const els = Array.from(document.querySelectorAll('.menu-popup-wrapper'));
            return els.map(el => ({
                className: el.className,
                isVisible: el.offsetWidth > 0,
                rect: el.getBoundingClientRect(),
                zIndex: el.style.zIndex,
                parent: el.parentElement.id
            }));
        }''')
        print(f"Menus found: {menus}")

        await page.screenshot(path='/home/jules/verification/after_right_click.png')

        # Double click My Computer to open a window
        print("Opening My Computer...")
        await page.locator('text="My Computer"').first.dblclick()
        await asyncio.sleep(2)

        # Check window position
        windows = await page.evaluate('''() => {
            const els = Array.from(document.querySelectorAll('.window'));
            return els.map(el => ({
                title: el.querySelector('.window-title')?.textContent,
                rect: el.getBoundingClientRect(),
                style: {
                    left: el.style.left,
                    top: el.style.top
                }
            }));
        }''')
        print(f"Windows found: {windows}")

        await page.screenshot(path='/home/jules/verification/with_window.png')

        await browser.close()

asyncio.run(main())
