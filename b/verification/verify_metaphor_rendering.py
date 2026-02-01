import time
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Navigate to the app
    page.goto('http://localhost:5173')

    # Wait for the "Create First Note" button since the notebook is empty
    # Use .first to resolve strict mode violation (duplicate buttons in responsive layout)
    create_note_button = page.get_by_role("button", name="Create First Note").first
    create_note_button.wait_for()
    create_note_button.click()

    # 2. Wait for editor
    page.wait_for_selector('.ProseMirror')

    # 3. Create a new note with intent-heavy text
    page.click('.ProseMirror')
    page.keyboard.press('Control+A')
    page.keyboard.press('Backspace')

    # Type text that triggers conditional automation
    page.keyboard.type('If verification is done, then submit the changes.')

    # Wait for metaphor processing
    time.sleep(2)

    # 4. Verify Metaphor Component appears
    # Look for "Conditional Automation" text
    expect(page.locator('text=Conditional Automation')).to_be_visible()

    # 5. Take screenshot
    page.screenshot(path='b/verification/metaphor_rendering.png')

    browser.close()

if __name__ == '__main__':
    with sync_playwright() as playwright:
        run(playwright)
