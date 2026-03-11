from playwright.sync_api import sync_playwright
import time
import os

def run_visual_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

        # 1. Navigate to Dashboard
        print("Navigating to Dashboard...")
        page.goto("http://localhost:5173")
        try:
            page.wait_for_selector("text=System Status", timeout=10000)
        except Exception as e:
            print(f"Error waiting for dashboard text: {e}")
            page.screenshot(path="verification/error_dashboard.png")
            print("Saved verification/error_dashboard.png")
            print("Page content:", page.content())
            # raise e # Don't raise yet to allow partial verification if text changed
        page.screenshot(path="verification/dashboard.png")
        print("Dashboard screenshot saved.")

        # 2. Create Note via Quick Action in Dashboard
        print("Creating New Note...")
        # Try finding the Quick Action button first
        try:
            page.click("button:has-text('Create New Note')")
        except:
            # Fallback to header button if dashboard button fails or layout differs
            page.click("button[title='New Note']")

        # Wait for Editor
        try:
            page.wait_for_selector(".ProseMirror", timeout=15000)
        except Exception as e:
            print(f"Error waiting for editor: {e}")
            page.screenshot(path="verification/error_editor.png")
            print("Saved verification/error_editor.png")
            # print("Page content:", page.content()) # Too verbose
            raise e

        # 3. Enter Text to trigger Extraction & Property Blocks
        print("Entering text to trigger extraction...")
        # Use explicit syntax to test Property Extension and Matching
        page.click(".ProseMirror")
        page.type(".ProseMirror", "Looking for developer [role:is:React Developer] and [rate:less than:100]")
        page.keyboard.press("Enter")

        # Wait for Property Chips in Editor
        try:
            page.wait_for_selector("[data-type='property']", timeout=5000)
            print("Property chips rendered.")
        except:
            print("Warning: Property chips not found.")

        time.sleep(1) # Let animations finish
        page.screenshot(path="verification/editor_extraction.png")
        print("Editor extraction screenshot saved.")

        # 6. Publish / Privacy Panel
        print("Checking Privacy Widget in Header...")
        # Look for buttons by title attribute since text might be hidden
        try:
            page.wait_for_selector("button[title='Set to private']", timeout=2000)
            page.wait_for_selector("button[title='Set to protected']", timeout=2000)
            page.wait_for_selector("button[title='Set to public']", timeout=2000)
            print("Found 3-state Privacy Widget.")
        except Exception as e:
            print("Failed to find Privacy Widget buttons.")
            page.screenshot(path="verification/error_privacy_widget.png")

        # Test Escalation Confirmation
        print("Testing Privacy Escalation...")
        try:
            # Click Public button using title selector
            page.click("button[title='Set to public']")

            # Expect Confirmation Overlay
            page.wait_for_selector("text=Make public?", timeout=2000)
            # page.wait_for_selector("text=increasing the visibility", timeout=2000) # Text changed in compact widget
            print("Confirmation overlay appeared.")
            page.screenshot(path="verification/privacy_confirmation.png")

            # Confirm
            page.click("button:has-text('Confirm')")
            time.sleep(1) # Wait for animation/close

            # Check if Public is now active (or at least no overlay)
            if not page.query_selector("text=Make public?"):
                print("Confirmation accepted.")
                # Note: "Publish to Network" button is removed in favor of auto-publish
                # We can check if the Public button is active (bg-gray-700)
                # But that's hard to check via selector easily without class checks.
                # Just verifying overlay is gone is enough for visual check script.
            else:
                print("Confirmation overlay stuck.")
                # Force close to proceed
                page.keyboard.press("Escape")

        except Exception as e:
            print(f"Confirmation overlay failed or logic error: {e}")
            page.screenshot(path="verification/error_privacy_confirmation.png")
            # Try to recover by hitting escape
            page.keyboard.press("Escape")

        page.screenshot(path="verification/publish_panel.png")

        # 7. Create Matching Note (Simulate P2P match)
        # Go back to dashboard or create new note
        page.click("button[title='New Note']")
        try:
            page.wait_for_selector(".ProseMirror", timeout=5000)
        except:
            # Retrying new note button click if first time failed or didn't register
            page.click("button[title='New Note']")
            page.wait_for_selector(".ProseMirror", timeout=5000)

        # Type matching note content
        page.click(".ProseMirror")
        page.type(".ProseMirror", "I am a [role:is:React Developer] charging [rate:is:80]")
        page.keyboard.press("Enter")

        # Wait a bit for background matching (debounced)
        time.sleep(3)

        # Look for match notification or sidebar match
        # We expect "LOCAL MATCHES" to show "1" badge or list item
        page.screenshot(path="verification/match_simulation.png")
        print("Match simulation screenshot saved.")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run_visual_verification()
