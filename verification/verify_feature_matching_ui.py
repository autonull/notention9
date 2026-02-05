from playwright.sync_api import Page, expect, sync_playwright

def test_developer_matching_ui(page: Page):
    # 1. Arrange: Go to the app
    page.goto("http://localhost:5173")

    # Wait for app to load
    page.wait_for_selector("header")

    # 2. Act: Navigate to Settings
    settings_btn = page.get_by_role("button", name="Settings")
    settings_btn.click()

    # 3. Enable Developer Mode
    dev_toggle = page.get_by_label("Toggle Developer Mode")
    if not dev_toggle.is_checked():
        dev_toggle.check()

    # 4. Navigate to Ontology Graph tab
    page.get_by_text("Ontology Graph").click()

    # 5. Access Matcher Tool
    page.get_by_role("button", name="Matcher").click()

    # 6. Fill Request and Offer Notes
    # We need to fill valid JSON to satisfy JSON.parse in the handler
    request_json = '{"title": "Request", "properties": [{"key": "skill", "operator": "is", "values": ["react"]}]}'
    offer_json = '{"title": "Offer", "properties": [{"key": "skill", "operator": "is", "values": ["react"]}]}'

    # The textareas are identified by previous heading or placeholder?
    # "Request Note (Constraints)" heading is above first textarea
    # "Offer Note (Facts)" heading is above second textarea

    # Let's use placeholders as selectors if unique enough
    # Or navigate by hierarchy

    page.get_by_placeholder('{"title": "Need Developer"').fill(request_json)
    page.get_by_placeholder('{"title": "Available Developer"').fill(offer_json)

    # 7. Run a test match
    page.get_by_role("button", name="Test Match").click()

    # 8. Assert: Match Result appears
    expect(page.get_by_text("Match Result:")).to_be_visible()

    # 9. Screenshot
    page.screenshot(path="verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_developer_matching_ui(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
