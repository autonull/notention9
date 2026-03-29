from playwright.sync_api import sync_playwright
import subprocess
import time
import os
import signal

def run_p2p_verification():
    # Start Relay
    print("Starting Relay...")
    relay_log = open("verification/relay.log", "w")
    relay_process = subprocess.Popen(["node", "verification/relay.js"], stdout=relay_log, stderr=subprocess.STDOUT)
    time.sleep(1) # Wait for startup

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            # --- ALICE ---
            print("Setting up Alice...")
            context_a = browser.new_context(viewport={'width': 1280, 'height': 800})
            page_a = context_a.new_page()
            page_a.on("console", lambda msg: print(f"Alice Console: {msg.text}"))
            page_a.goto("http://localhost:5173")

            # Go to Settings (via URL to avoid overlay issues)
            page_a.goto("http://localhost:5173/#settings")

            # Wait for Settings View
            try:
                page_a.wait_for_selector("h2:has-text('Settings')", timeout=10000)
            except:
                print("Alice failed to reach Settings. URL:", page_a.url)
                page_a.screenshot(path="verification/error_alice_settings.png")
                raise

            # Click Nostr Tab (Network & Keys)
            try:
                page_a.click("button:has-text('Network & Keys')")
                page_a.wait_for_selector("text=Network Relays", timeout=2000)
            except Exception as e:
                print(f"Failed to switch to Network tab: {e}")
                # Try partial match or index?
                page_a.click("button:has-text('Network')")

            # Generate Keys
            if page_a.query_selector("button:has-text('Generate New Keys')"):
                 print("Alice generating keys...")
                 page_a.click("button:has-text('Generate New Keys')")
                 page_a.wait_for_selector("text=Private Key (nsec)")

            # Add Relay
            # Look for input
            page_a.fill("input[placeholder*='wss://']", "ws://localhost:8080")
            page_a.keyboard.press("Enter")
            time.sleep(0.5)

            # Verify added
            if not page_a.query_selector("text=ws://localhost:8080"):
                print("Alice failed to add relay")

            # Create Note
            # Go back to notes
            page_a.click("button[aria-label='Notes']")
            page_a.click("button[title='New Note']")
            page_a.wait_for_selector(".ProseMirror")
            # Clear it first just in case
            page_a.fill(".ProseMirror", "")
            # Type slowly to ensure Tiptap picks it up
            page_a.type(".ProseMirror", "I need a plumber [role:is:plumber]", delay=50)
            # Wait for save/extraction
            time.sleep(2)

            # Make Public
            try:
                print("Waiting for Make Public button...")
                page_a.wait_for_selector("button:has-text('Make Public')", timeout=5000)
                print("Found Make Public button. Clicking...")
                page_a.click("button:has-text('Make Public')")
                # Wait for state change
                page_a.wait_for_selector("button:has-text('Make Private')", timeout=5000)
                print("Note is now public.")
            except Exception as e:
                print(f"Failed to toggle public: {e}")
                page_a.screenshot(path="verification/error_alice_public.png")
                # Check if already public
                if page_a.query_selector("button:has-text('Make Private')"):
                     print("Button says Make Private, proceeding.")
                else:
                     raise e

            # Click "Publish to Network"
            try:
                page_a.wait_for_selector("button:has-text('Publish to Network')", timeout=5000)
                page_a.click("button:has-text('Publish to Network')", force=True)
            except:
                print("Alice failed to find Publish button.")
                page_a.screenshot(path="verification/error_alice_publish.png")
                raise

            # Wait for success
            try:
                page_a.wait_for_selector("div:has-text('Published:')", timeout=5000)
                print("Alice published note.")
            except:
                print("Alice publish timeout/failure")
                # Try to read error message
                err_el = page_a.query_selector(".text-red-400")
                if err_el:
                    print(f"Alice UI Error: {err_el.inner_text()}")
                page_a.screenshot(path="verification/error_alice_publish_fail.png")

            page_a.screenshot(path="verification/p2p_alice_published.png")

            # --- BOB ---
            print("Setting up Bob...")
            context_b = browser.new_context(viewport={'width': 1280, 'height': 800})
            page_b = context_b.new_page()
            page_b.on("console", lambda msg: print(f"Bob Console: {msg.text}"))
            page_b.goto("http://localhost:5173")

            # Go to Settings
            page_b.goto("http://localhost:5173/#settings")

            # Wait for Settings View
            page_b.wait_for_selector("h2:has-text('Settings')")

            # Click Nostr Tab
            page_b.click("button:has-text('Network & Keys')")

            # Generate Keys
            if page_b.query_selector("button:has-text('Generate New Keys')"):
                 print("Bob generating keys...")
                 page_b.click("button:has-text('Generate New Keys')")
                 page_b.wait_for_selector("text=Private Key (nsec)")

            # Remove existing relays to avoid noise
            print("Bob removing default relays...")
            while True:
                trash_btns = page_b.query_selector_all("button[title='Remove Relay']")
                if not trash_btns:
                    break
                trash_btns[0].click()
                page_b.click("button:has-text('Remove')") # Confirm modal
                time.sleep(0.2)

            # Add Relay
            page_b.fill("input[placeholder*='wss://']", "ws://localhost:8080")
            page_b.keyboard.press("Enter")
            time.sleep(0.5)

            # Go to Network View
            # 'Network' in sidebar
            page_b.click("button[aria-label='Network']")

            print("Bob waiting for events...")
            # Wait longer for polling/subscription
            time.sleep(8)

            # Check for Alice's note
            # Look for "I need a plumber"
            if page_b.query_selector("text=I need a plumber"):
                print("SUCCESS: Bob sees Alice's note!")
            else:
                print("FAILURE: Bob does not see the note.")
                with open("verification/bob.html", "w") as f:
                    f.write(page_b.content())

            page_b.screenshot(path="verification/p2p_bob_view.png")

            browser.close()

    finally:
        print("Stopping Relay...")
        relay_process.terminate()
        relay_log.close()
        # Print relay log
        print("--- Relay Log ---")
        try:
            with open("verification/relay.log", "r") as f:
                print(f.read())
        except:
            print("No relay log found")
        print("-----------------")

if __name__ == "__main__":
    run_p2p_verification()
