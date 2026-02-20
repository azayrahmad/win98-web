import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content("""
            <div id="container" style="zoom: 2; width: 400px; height: 300px; border: 1px solid black;">
                <div id="child" style="width: 100px; height: 100px; background: red;"></div>
            </div>
        """)

        # Check container
        container = await page.evaluate('''() => {
            const el = document.getElementById("container");
            const rect = el.getBoundingClientRect();
            return {
                offsetWidth: el.offsetWidth,
                offsetHeight: el.offsetHeight,
                rectWidth: rect.width,
                rectHeight: rect.height
            };
        }''')
        print(f"Container: {container}")

        # Check child
        child = await page.evaluate('''() => {
            const el = document.getElementById("child");
            const rect = el.getBoundingClientRect();
            return {
                offsetWidth: el.offsetWidth,
                offsetHeight: el.offsetHeight,
                rectWidth: rect.width,
                rectHeight: rect.height
            };
        }''')
        print(f"Child: {child}")

        await browser.close()

asyncio.run(main())
