from playwright.sync_api import sync_playwright, expect

def verify_controls(page):
    print("Navigating to app...")
    page.goto("http://localhost:5173/")

    # Wait for dashboard or ignition prompt
    print("Waiting for Control Toggle...")
    # Check for Manual button
    manual_btn = page.get_by_role("button", name="Manual")
    expect(manual_btn).to_be_visible()

    # Check for Assist button
    assist_btn = page.get_by_role("button", name="Assist")
    expect(assist_btn).to_be_visible()

    # Check for Auto button
    auto_btn = page.get_by_role("button", name="Auto")
    expect(auto_btn).to_be_visible()

    page.screenshot(path="verification/controls_header.png")
    print("Header screenshot taken.")

    # Handle Ignition Flow if present
    if page.get_by_text("fix my life.").is_visible():
        print("In Ignition mode. Completing flow to reach dashboard...")
        page.get_by_role("textbox").nth(1).fill("test")
        page.get_by_role("button", name="Decompose").click()

        # Accept one
        page.get_by_role("button", name="Accept").first.click()

        # Handle potential other skips needed to clear queue
        # Wait until "Sovereignty Claimed" is visible OR we can skip more
        for _ in range(10):
            if page.get_by_text("Sovereignty Claimed").is_visible():
                break
            # Skip button?
            skip_btns = page.get_by_role("button", name="Skip")
            if skip_btns.count() > 0 and skip_btns.first.is_visible():
                skip_btns.first.click()
            page.wait_for_timeout(200)

        page.get_by_role("button", name="Initialize Action").click()
        page.get_by_role("button", name="Enter Manual Mode").click() # This reloads and should show dashboard
        page.wait_for_load_state("networkidle")

    print("Checking Quick Actions for Rec Skill...")
    rec_btn = page.get_by_role("button", name="Rec Skill")
    # It might be in the dashboard, verify it is visible
    expect(rec_btn).to_be_visible()
    rec_btn.click()
    print("Clicked Rec Skill")

    # Check if recorder appeared
    recorder = page.get_by_text("Waiting for actions...")
    expect(recorder).to_be_visible()

    page.screenshot(path="verification/skill_recorder.png")
    print("Skill Recorder screenshot taken.")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_controls(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_controls.png")
            raise e
        finally:
            browser.close()
