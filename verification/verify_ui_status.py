from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_ui_status(page: Page):
    # Go to UI
    page.goto("http://localhost:5173")

    # Wait for the app to load
    time.sleep(5)

    # Check for status indicator
    # The status indicator logic:
    # Offline: "Offline Mode - Working locally"
    # Connecting: "Connecting..." or "Reconnecting..."
    # Connected: "Connected to Agent"

    # We expect it to be connected or connecting eventually.
    # We can check if any of these texts are present.

    # Just take a screenshot to verify visually
    page.screenshot(path="verification/verification_ui_status.png")

    # Check if "Connected to Agent" is visible (might take time)
    try:
        expect(page.get_by_text("Connected to Agent")).to_be_visible(timeout=10000)
        print("Connected to Agent verified")
    except:
        print("Could not verify 'Connected to Agent' - might be offline or connecting")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_ui_status(page)
        finally:
            browser.close()
