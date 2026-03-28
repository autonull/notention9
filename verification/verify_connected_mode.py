
from playwright.sync_api import sync_playwright
import time
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to app...")
            # 1. Start App
            page.goto('http://localhost:5173')

            print("Waiting for connection indicator...")
            # 2. Wait for "Connected to Agent" indicator
            # The AgentService connects automatically.
            # We look for the green banner.
            page.wait_for_selector('text=Connected to Agent', timeout=10000)

            print("Connected! Taking screenshot...")
            time.sleep(2) # Give it a moment to stabilize

            page.screenshot(path='verification/dashboard_connected.png')
            print('Connected screenshot taken: verification/dashboard_connected.png')

        except Exception as e:
            print(f'Error: {e}')
            page.screenshot(path='verification/connected_error.png')
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    run()
