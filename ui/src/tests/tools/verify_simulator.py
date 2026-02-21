from playwright.sync_api import sync_playwright, expect
import time

def verify_simulator():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        print("Navigating to app...")
        page.goto("http://localhost:5173")

        print("Opening Settings...")
        try:
             # Try class selector for lucide-settings icon if button fails
             page.locator(".lucide-settings").first.click()
        except:
             print("Fallback to getting by title Settings")
             page.get_by_title("Settings").click()

        print("Enabling Developer Mode...")
        try:
             toggle_btn = page.get_by_label("Toggle Developer Mode")
             expect(toggle_btn).to_be_visible()
             class_attr = toggle_btn.get_attribute("class")
             if "bg-blue-600" not in class_attr:
                 print("Clicking toggle...")
                 toggle_btn.click()
             else:
                 print("Already enabled.")
        except Exception as e:
             print(f"Failed to enable developer mode: {e}")


        print("Switching to Simulator Tab...")
        page.get_by_role("button", name="🧪 Simulator").click()

        print("Starting Simulation...")
        start_btn = page.get_by_role("button", name="START")
        start_btn.click()

        print("Waiting for simulation loop...")
        # Wait for "Thinking..." in the UI
        try:
             expect(page.get_by_text("Thinking...")).to_be_visible(timeout=10000)
             print("Agent is thinking.")
        except Exception as e:
             print(f"Agent did not start thinking: {e}")


        print("Waiting for publishing and matching...")
        # This might take 10-15 seconds in the simulator loop
        # We wait for the log "published a note"
        try:
            # We look for the text in the "System Events" log area
            # Text: "Alice (Client) published a note"
            expect(page.locator("text=published a note")).to_be_visible(timeout=30000)
            print("Note published!")
        except Exception as e:
            print(f"Timed out waiting for publish log: {e}")

        time.sleep(5) # Let animations settle

        print("Taking screenshot...")
        page.screenshot(path="/home/jules/verification/simulator_compact.png")

        print("Verification script finished.")
        browser.close()

if __name__ == "__main__":
    verify_simulator()
