from playwright.sync_api import sync_playwright, expect
import time

def verify_agent_connection(page):
    print("Navigating to http://localhost:3000")
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    print("Waiting for UI to stabilize...")
    time.sleep(5)
    print("Taking screenshot...")
    page.screenshot(path="verification/agent_connection.png")
    print(f"Page title: {page.title()}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        try:
            verify_agent_connection(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
