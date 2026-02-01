
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # 1. Start App
            page.goto('http://localhost:5173')
            page.wait_for_selector('text=Total Notes', timeout=10000)

            # 2. Seed Data (Interactions)

            # Profile Note
            page.click('button[title*="New Note"]')
            time.sleep(0.5)
            # Find input by placeholder or class if placeholder fails
            page.locator('input#note-title-input').fill('John Doe - Profile')
            page.locator('.ProseMirror').fill('Profile for John Doe.\n[role:is:Senior Developer]\n[email:is:john@example.com]')
            page.keyboard.press('Control+s')
            time.sleep(1)

            # Task Note
            page.click('button[title*="New Note"]')
            time.sleep(0.5)
            page.locator('input#note-title-input').fill('Task: Refactor Auth')
            page.locator('.ProseMirror').fill('We need to switch to OAuth2.\n[priority:is:high]\n[status:is:todo]\n[project:is:Auth]')
            page.keyboard.press('Control+s')
            time.sleep(1)

            # Meeting Note
            page.click('button[title*="New Note"]')
            time.sleep(0.5)
            page.locator('input#note-title-input').fill('Team Sync')
            page.locator('.ProseMirror').fill('Weekly sync.\n[date:is:today]\n[time:is:10am]\n[attendees:contains:Alice]')
            page.keyboard.press('Control+s')
            time.sleep(1)

            # Private Shopping Note
            page.click('button[title*="New Note"]')
            time.sleep(0.5)
            page.locator('input#note-title-input').fill('Buy Surprise Gift')
            page.locator('.ProseMirror').fill('Don\'t tell anyone.\n[intent:is:shopping]\n[status:is:private]')
            page.keyboard.press('Control+s')
            time.sleep(1)

            # 3. Reload to Dashboard to see stats
            page.goto('http://localhost:5173')
            page.wait_for_selector('text=Total Notes')
            time.sleep(2) # Allow stats to update

            page.screenshot(path='verification/dashboard_populated.png')
            print('Dashboard screenshot taken')

            # 4. View a specific note (Task)
            # Click 'Task: Refactor Auth' from Recent Activity or Search
            # Assuming it's in Recent Activity
            page.click('text=Task: Refactor Auth')
            time.sleep(1)
            page.screenshot(path='verification/note_detail.png')
            print('Note detail screenshot taken')

        except Exception as e:
            print(f'Error: {e}')
            page.screenshot(path='verification/error.png')
        finally:
            browser.close()

if __name__ == '__main__':
    run()
