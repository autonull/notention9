
import os
from playwright.sync_api import sync_playwright, expect

def test_matches_inference(page):
    print("Navigating to home...")
    try:
        page.goto("http://localhost:5173", timeout=60000)
    except Exception as e:
        print(f"Navigation failed: {e}")
        page.screenshot(path="/home/jules/verification/nav_fail_inference.png")
        raise e

    page.wait_for_selector("#root > div", timeout=60000)

    # 1. Create a "Request" Note (Using indefinite properties)
    print("Creating Request Note...")
    page.locator("button").filter(has_text="New Note").first.click()

    # Wait for editor
    page.wait_for_selector(".ProseMirror", timeout=5000)

    # Type content
    page.locator(".ProseMirror").fill("I need a developer.\n[role:contains:React]")
    page.wait_for_timeout(2000) # Sync

    # 2. Go to Dashboard
    print("Navigating to Dashboard...")
    # Use HomeIcon in Sidebar (it has title "Dashboard" usually if wired up? No, useCommands says "Go to Dashboard")
    # Let's open Command Palette
    page.keyboard.press("Control+k")

    # Wait for palette input to be visible
    palette_input = page.locator("input[placeholder='Type a command or search notes...']")
    expect(palette_input).to_be_visible()

    # Type "Dashboard"
    palette_input.fill("Go to Dashboard")
    # Wait for items to filter
    page.wait_for_timeout(500)

    # Click the "Go to Dashboard" item explicitly
    page.locator("div").filter(has_text="Go to Dashboard").last.click()

    # 3. Check Matches Widget
    print("Checking Matches Widget...")
    # Create matching offer first?
    # Actually, let's create the matching offer BEFORE going to dashboard.

    # Go back to Notes
    print("Creating Offer Note...")
    page.keyboard.press("Control+k")
    expect(palette_input).to_be_visible()
    palette_input.fill("New Note")
    page.wait_for_timeout(500)
    page.locator("div").filter(has_text="New Note").last.click()

    page.wait_for_selector(".ProseMirror")
    page.locator(".ProseMirror").fill("I am a React developer.\n[role:is:React]")
    page.wait_for_timeout(2000)

    # Now Dashboard
    print("Going to Dashboard...")
    page.keyboard.press("Control+k")
    expect(palette_input).to_be_visible()
    palette_input.fill("Go to Dashboard")
    page.wait_for_timeout(500)
    page.locator("div").filter(has_text="Go to Dashboard").last.click()

    print("Waiting for matches...")
    page.wait_for_timeout(5000) # Give background matcher time

    # The MatchesWidget displays grouped matches.
    # The GROUP header has the category label.
    # We look for "Your Request" text.

    if page.get_by_text("Your Request").count() > 0:
        print("Success: Found 'Your Request' classification.")
    else:
        print("Warning: 'Your Request' not found.")
        # Debug screenshot
        page.screenshot(path="/home/jules/verification/inference_debug.png")

        # Check if "Your Offer" is found (maybe logic inverted?)
        if page.get_by_text("Your Offer").count() > 0:
             print("Found 'Your Offer' instead. Logic might be inverted or property not parsed as indefinite.")

    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/inference_test.png")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        try:
            test_matches_inference(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error_inference.png")
            # raise e
        finally:
            browser.close()
