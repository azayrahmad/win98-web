from playwright.sync_api import sync_playwright, expect

def verify_fullscreen(page):
    page.goto("http://localhost:5173/")

    # Bypass boot screen
    page.wait_for_selector("#boot-screen")
    page.keyboard.press("Enter")

    # Wait for System
    page.wait_for_function("() => window.System && window.System.launchApp")

    # 1. Launch Doom (Fullscreen)
    print("Launching Doom...")
    page.evaluate("window.System.launchApp('doom')")
    page.wait_for_timeout(2000)

    is_doom_fullscreen = page.evaluate("!!document.fullscreenElement")
    print(f"Is Doom fullscreen? {is_doom_fullscreen}")

    page.screenshot(path="/home/jules/verification/doom_fullscreen.png")

    # 2. Launch Pinball (Windowed)
    print("Launching Pinball...")
    page.evaluate("window.System.launchApp('pinball')")
    page.wait_for_timeout(2000)

    # Check if Pinball is fullscreen (should be false)
    is_pinball_fullscreen = page.evaluate("""() => {
        const win = Array.from(document.querySelectorAll('.window')).find(w => w.querySelector('.window-title').textContent.includes('Pinball'));
        return document.fullscreenElement === win;
    }""")
    print(f"Is Pinball fullscreen? {is_pinball_fullscreen}")

    page.screenshot(path="/home/jules/verification/pinball_windowed.png")

    # 3. Open Dialog in Doom (if still fullscreen)
    if is_doom_fullscreen:
        print("Opening About dialog in Doom...")
        # Focus Doom window first if needed, but it should be focused
        page.evaluate("window.ShowDialogWindow({ title: 'About Doom', text: 'This should exit fullscreen' })")
        page.wait_for_timeout(1000)
        is_fullscreen_after = page.evaluate("!!document.fullscreenElement")
        print(f"Is fullscreen after dialog? {is_fullscreen_after}")
        page.screenshot(path="/home/jules/verification/after_dialog.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_fullscreen(page)
        finally:
            browser.close()
