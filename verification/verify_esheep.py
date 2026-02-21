from playwright.sync_api import sync_playwright, expect
import time

def test_esheep(page):
    page.goto("http://localhost:5173/win98-web/")
    page.wait_for_timeout(2000)
    page.keyboard.press("Enter")
    page.wait_for_selector(".start-button", timeout=30000)

    # Launch ESheep from desktop icon
    # It has text "sheep"
    page.dblclick("text=sheep")

    # ESheep doesn't have a window, but it should have a tray icon if configured
    # Or we can check if the sheep images appear on the screen.
    # In esheep.js it adds sheep to the body.
    page.wait_for_selector(".esheep", timeout=10000)

    page.screenshot(path="/home/jules/verification/esheep_test.png")
    print("ESheep launched successfully!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_esheep(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/esheep_error.png")
        finally:
            browser.close()
