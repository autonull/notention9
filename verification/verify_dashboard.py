
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Ensure we can reach the app
        try:
            page.goto('http://localhost:5173')
            page.wait_for_selector('text=Welcome back, Agent', timeout=5000)
            page.screenshot(path='verification/dashboard.png')
            print('Screenshot taken successfully')
        except Exception as e:
            print(f'Error: {e}')
        finally:
            browser.close()

if __name__ == '__main__':
    run()
