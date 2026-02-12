from playwright.sync_api import Page, expect, sync_playwright
import time

def test_desktop_themes_zenfs(page: Page):
    page.goto("http://localhost:5173/win98-web/")
    page.wait_for_function('window.System && typeof window.System.launchApp === "function"', timeout=60000)
    page.evaluate('window.System.launchApp("desktop-themes")')
    window = page.locator(".os-window").filter(has_text="Desktop Themes").first
    expect(window).to_be_visible(timeout=30000)
    page.evaluate('const el = document.querySelector("#theme-selector"); el.value = "load-custom"; el.dispatchEvent(new Event("change"));')
    open_win = page.locator(".os-window").filter(has_text="Open Theme").first
    expect(open_win).to_be_visible(timeout=10000)
    time.sleep(2)
    page.screenshot(path="verification/final_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_desktop_themes_zenfs(page)
        finally:
            browser.close()
