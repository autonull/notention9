from playwright.sync_api import Page, expect, sync_playwright
import os

def test_settings_and_dashboard(page: Page):
    print("Navigating to App...")
    page.goto("http://localhost:5173/")
    page.wait_for_timeout(2000)

    # 1. Dashboard Verification
    os.makedirs("/home/jules/verification", exist_ok=True)
    page.screenshot(path="/home/jules/verification/dashboard_refactor.png")
    print("Screenshot dashboard_refactor.png taken")

    # Check for widgets (rendered via config)
    expect(page.get_by_text("Daily Prompt")).to_be_visible()
    expect(page.get_by_text("Quick Actions")).to_be_visible()
    expect(page.get_by_text("Start from Template")).to_be_visible()

    # 2. Settings Verification
    print("Navigating to Settings...")
    # Click settings cog
    page.locator("button[title='Settings']").click()
    page.wait_for_timeout(1000)

    page.screenshot(path="/home/jules/verification/settings_refactor.png")
    print("Screenshot settings_refactor.png taken")

    # Verify Tabs are present (rendered via Tabs component)
    expect(page.get_by_text("🤖 AI Assistant")).to_be_visible()
    expect(page.get_by_text("🔑 Network & Keys")).to_be_visible()
    expect(page.get_by_text("📦 Data Management")).to_be_visible()

    # Verify AI Tab content (default)
    expect(page.get_by_text("AI Provider")).to_be_visible()

    # Switch to Network tab
    page.get_by_text("🔑 Network & Keys").click()
    page.wait_for_timeout(500)

    # Verify Network Tab content
    expect(page.get_by_text("Nostr Identity")).to_be_visible()

    # Check if we are logged out (Generate New Keys button) or logged in (About field)
    # Since it's a fresh session, we likely need to generate keys.
    if page.get_by_text("Generate New Keys").is_visible():
        print("Verified: Generate New Keys button is visible")
        # Click it to see the profile form?
        page.get_by_text("Generate New Keys").click()
        page.wait_for_timeout(500)
        # Now the profile form should be visible
        expect(page.get_by_placeholder("I'm a developer building cool things.")).to_be_visible()
    else:
        # Already logged in
        expect(page.get_by_placeholder("I'm a developer building cool things.")).to_be_visible()

    print("Verified Network Tab content")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            test_settings_and_dashboard(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
