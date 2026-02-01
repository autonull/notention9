from playwright.sync_api import sync_playwright, expect

def verify_ignition(page):
    # 1. Arrange
    print("Navigating to app...")
    page.goto("http://localhost:5173/")

    # 2. Act & Assert: Check if "Fix my life" prompt is visible
    print("Waiting for prompt...")
    prompt = page.get_by_text("fix my life.")
    expect(prompt).to_be_visible(timeout=15000)

    # Take initial screenshot
    page.screenshot(path="verification/ignition_initial.png")
    print("Initial screenshot taken.")

    # 3. Act: Type in the textarea
    print("Typing intent...")
    # Use nth(1) because sidebar has search input
    textarea = page.get_by_role("textbox").nth(1)
    textarea.fill("I want to fix my health and career")

    # 4. Act: Click Decompose
    print("Clicking Decompose...")
    decompose_btn = page.get_by_role("button", name="Decompose")
    decompose_btn.click()

    # 5. Assert: Check for results
    print("Waiting for results...")
    # Wait for "Decomposing Chaos..."
    heading = page.get_by_text("Decomposing Chaos...")
    expect(heading).to_be_visible()

    # Check for specific proposed thoughts
    # e.g. "What time did you actually fall asleep last night?" (health)
    health_q = page.get_by_text("What time did you actually fall asleep last night?")
    expect(health_q).to_be_visible()

    # 6. Screenshot results
    page.screenshot(path="verification/ignition_results.png")
    print("Results screenshot taken.")

    # 7. Act: Accept one
    print("Accepting a thought...")
    page.get_by_role("button", name="Accept").first.click()

    # Skip the rest to clear the queue
    print("Skipping remaining thoughts...")
    for _ in range(10):
        if page.get_by_text("Sovereignty Claimed").is_visible():
            break
        # Check if skip button exists
        skip_btns = page.get_by_role("button", name="Skip")
        if skip_btns.count() > 0:
            skip_btns.first.click()
            page.wait_for_timeout(200)
        else:
            # Maybe animation delay or already done
            page.wait_for_timeout(200)

    # 8. Assert: "Sovereignty Claimed"
    claimed = page.get_by_text("Sovereignty Claimed")
    expect(claimed).to_be_visible()

    # 9. Screenshot claimed
    page.screenshot(path="verification/ignition_claimed.png")
    print("Claimed screenshot taken.")

    # 10. Click Initialize Action
    print("Clicking Initialize Action...")
    init_btn = page.get_by_role("button", name="Initialize Action")
    init_btn.click()

    # 11. Assert Demo Stage
    print("Waiting for Demo stage...")
    demo_ready = page.get_by_text("VoltAgent is Ready.")
    expect(demo_ready).to_be_visible()

    page.screenshot(path="verification/ignition_demo.png")
    print("Demo screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_ignition(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
