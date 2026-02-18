import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content("""
            <body style="zoom: 2; margin: 0; padding: 0;">
                <div id="target" style="width: 100px; height: 100px; background: red;"></div>
            </body>
        """)

        await page.evaluate('''() => {
            window.clickData = null;
            document.onclick = (e) => {
                window.clickData = {
                    clientX: e.clientX,
                    clientY: e.clientY
                };
            };
        }''')

        await page.mouse.click(100, 100)

        pos = await page.evaluate('window.clickData')
        print(f"Click at physical 100, 100 results in: {pos}")

        await browser.close()

asyncio.run(main())
