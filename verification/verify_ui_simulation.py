import time
from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Assuming the UI runs on port 4173 (preview) or 5173 (dev)
        # We will try preview port first
        url = "http://localhost:4173"
        print(f"Navigating to {url}")

        try:
            page.goto(url, timeout=10000)
        except Exception as e:
            print(f"Failed to load {url}, trying dev port 5173")
            url = "http://localhost:5173"
            page.goto(url, timeout=10000)

        # Wait for dashboard to load (look for specific text or element)
        # Dashboard usually has "Quick Capture" or similar
        print("Waiting for Dashboard...")
        try:
            page.wait_for_selector("text=Quick Capture", timeout=10000)
        except:
            print("Could not find Quick Capture, taking screenshot anyway")

        # Take screenshot of Dashboard
        print("Capturing Dashboard screenshot...")
        page.screenshot(path="verification/dashboard.png")

        # Navigate to Notes (Sidebar link)
        # Assuming there is a sidebar link with "Notes" or similar icon
        # If not, we might be on dashboard.

        # Let's try to find a link to "Notes" or "All Notes"
        try:
            # Try to click on sidebar item
            # Use a selector that targets the sidebar item for notes
            # Based on memory, sidebar has items. Let's try text "Notes"
            print("Navigating to Notes...")
            page.click("text=Notes", timeout=5000)
            time.sleep(1) # Wait for transition
            page.screenshot(path="verification/notes_view.png")
        except Exception as e:
            print(f"Could not navigate to Notes view: {e}")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_ui()
