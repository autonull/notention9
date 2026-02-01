import os
from playwright.sync_api import sync_playwright, expect

def verify_hybrid_input():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to app
            page.goto("http://localhost:5173/")

            # Wait for app to load
            page.wait_for_timeout(3000)

            # Create a note to bypass "LifeFixPrompt" (Ignition)
            print("Creating first note to unlock dashboard...")
            create_btn = page.get_by_text("Create First Note")
            if create_btn.is_visible():
                create_btn.click()
            else:
                 page.get_by_text("New Note").click()

            # Wait for note creation
            page.wait_for_timeout(2000)

            # Now click Dashboard button
            print("Clicking Dashboard button...")
            dashboard_btn = page.get_by_label("Dashboard").first
            dashboard_btn.click()

            # Wait for transition
            page.wait_for_timeout(2000)

            # Check for Hybrid Input
            print("Checking for Hybrid Input...")
            expect(page.get_by_text("Hybrid Input")).to_be_visible(timeout=10000)

            # Locate the textarea inside Hybrid Input
            print("Locating textarea...")
            textarea = page.get_by_placeholder("Describe a project")
            expect(textarea).to_be_visible()

            # Type something that triggers extraction
            print("Typing text...")
            textarea.fill("Looking for React dev, max $80/hr, remote")

            # Wait for debounce and extraction
            print("Waiting for extraction...")
            page.wait_for_timeout(4000)

            # Expect "Proposed Properties"
            print("Checking for properties...")
            expect(page.get_by_text("Proposed Properties")).to_be_visible(timeout=10000)

            # Check if properties are rendered
            # We saw "price" in the screenshot
            expect(page.get_by_text("price")).to_be_visible()

            # Check for button update
            expect(page.get_by_text("Create Note (+1 props)")).to_be_visible()

            # Take screenshot
            os.makedirs("verification", exist_ok=True)
            page.screenshot(path="verification/hybrid_input.png")
            print("Screenshot saved to verification/hybrid_input.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/failed_verification.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_hybrid_input()
