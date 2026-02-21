from playwright.sync_api import sync_playwright, expect
import time

def test_os_boot_and_notepad(page):
    # Go to the OS URL
    page.goto("http://localhost:5173/win98-web/")

    # Wait for the boot screen or the "Enter" prompt if any
    # Based on memory, we might need to press Enter to bypass BIOS
    page.wait_for_timeout(2000)
    page.keyboard.press("Enter")

    # Wait for the desktop to be ready
    # We look for the start button
    page.wait_for_selector(".start-button", timeout=30000)

    # Capture screenshot of the desktop
    page.screenshot(path="/home/jules/verification/desktop.png")

    # Try to launch Notepad
    # Click start button
    page.click(".start-button")

    # Click Programs -> Accessories -> Notepad (or just find Notepad in Start Menu)
    # Actually, let's try to launch it via System.launchApp if possible,
    # but we want to test the UI too.

    # Let's try searching for Notepad text in start menu
    page.click("text=Programs")
    page.click("text=Accessories")
    page.click("text=Notepad")

    # Wait for Notepad window
    page.wait_for_selector(".window[data-app-id='notepad']", timeout=10000)

    # Type something in Notepad
    page.click(".notepad-container")
    page.keyboard.type("OOP and SOLID Refactoring Successful!")

    # Capture screenshot of Notepad
    page.screenshot(path="/home/jules/verification/notepad_test.png")
    print("Verification successful!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_os_boot_and_notepad(page)
        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
