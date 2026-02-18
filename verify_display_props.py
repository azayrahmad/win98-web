import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1024, 'height': 768})
        await page.goto('http://localhost:5173/win98-web/')

        await page.wait_for_selector('.desktop', timeout=30000)
        await asyncio.sleep(2)

        # Open Display Properties (Settings tab)
        # Right click desktop -> Properties
        await page.locator('.desktop').click(button='right', position={'x': 100, 'y': 100})
        await page.locator('text="Properties"').click()

        # Wait for window
        await page.wait_for_selector('.window-title:has-text("Display Properties")')

        # Go to Settings tab
        await page.locator('.tabs .tab:has-text("Settings")').click()

        await asyncio.sleep(1)
        await page.screenshot(path='/home/jules/verification/display_properties_settings.png')

        # Check if slider exists
        slider = page.locator('input[type="range"]')
        if await slider.count() > 0:
            val = await slider.get_attribute('value')
            print(f"Scale slider value: {val}")
        else:
            print("Scale slider not found!")

        await browser.close()

asyncio.run(main())
