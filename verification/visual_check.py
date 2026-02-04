from playwright.sync_api import sync_playwright
import time
import os

def run_visual_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Navigate to Dashboard
        print("Navigating to Dashboard...")
        page.goto("http://localhost:5173")
        try:
            page.wait_for_selector("text=Welcome back, Agent", timeout=10000)
        except Exception as e:
            print(f"Error waiting for dashboard text: {e}")
            page.screenshot(path="verification/error_dashboard.png")
            print("Saved verification/error_dashboard.png")
            print("Page content:", page.content())
            raise e
        page.screenshot(path="verification/dashboard.png")
        print("Dashboard screenshot saved.")

        # 2. Create Note via Quick Action in Dashboard
        print("Creating New Note...")
        # Try finding the Quick Action button first
        try:
            page.click("text=Create New Note")
        except:
            # Fallback to header button if dashboard button fails or layout differs
            page.click("button[title='New Note']")

        # Wait for Editor
        try:
            page.wait_for_selector(".ProseMirror", timeout=5000)
        except Exception as e:
            print(f"Error waiting for editor: {e}")
            page.screenshot(path="verification/error_editor.png")
            print("Saved verification/error_editor.png")
            print("Page content:", page.content())
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
        print("Checking Publish Panel...")
        # Look for "Private - Only you can see this" or similar
        try:
            page.wait_for_selector("text=Private", timeout=2000)
        except:
            pass

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
