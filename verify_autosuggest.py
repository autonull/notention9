import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Navigating to http://localhost:5173...")
        await page.goto('http://localhost:5173')

        print("Waiting for 'New Note' button...")
        await page.click('button:has-text("New Note")', timeout=5000)
        await asyncio.sleep(1)

        # Click settings
        await page.evaluate('''() => {
            const header = document.querySelector('header');
            if (header) {
                const buttons = header.querySelectorAll('button');
                const lastButton = buttons[buttons.length - 1];
                if (lastButton) lastButton.click();
            }
        }''')
        await asyncio.sleep(1)

        print("Switching to Editor tab...")
        await page.click('button:has-text("Editor")', timeout=2000)
        await asyncio.sleep(1)

        print("Selecting Pretext...")
        await page.evaluate('''() => {
            const selects = document.querySelectorAll('select');
            for (const select of selects) {
                if (select.innerHTML.includes('Tiptap') || select.innerHTML.includes('tiptap')) {
                    select.value = 'pretext';
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }''')
        await asyncio.sleep(0.5)

        print("Closing Settings...")
        # Since clicking Escape might not close the modal depending on focus, click the settings gear again to close it
        # Actually in Settings modal, it might be closed by finding a specific close button or clicking the gear again.
        await page.evaluate('''() => {
            const header = document.querySelector('header');
            if (header) {
                const buttons = header.querySelectorAll('button');
                // find the settings button again (often the one with the gear icon)
                const settingsBtn = Array.from(buttons).find(b => b.innerHTML.includes('lucide-settings'));
                if (settingsBtn) settingsBtn.click();
            }
        }''')
        await asyncio.sleep(1)

        print("Typing in Pretext...")
        try:
            # Let's take a screenshot before we type to see why it fails
            await page.screenshot(path='/home/jules/verification/before_type.png')
            await page.click('textarea')
            await page.type('textarea', 'Testing ')
            await page.type('textarea', '[')
            await asyncio.sleep(1)

            await page.screenshot(path='/home/jules/verification/autosuggest_pretext.png')
            print("Saved autosuggest_pretext.png")
        except Exception as e:
            print(f"Failed to type: {e}")

        await browser.close()

asyncio.run(main())
