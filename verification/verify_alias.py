
from playwright.sync_api import sync_playwright, expect

def test_alias_validation(page):
    print("Navigating to app...")
    page.goto("http://localhost:5173/")

    # Wait for app to load
    page.wait_for_selector("text=Ontology", timeout=10000)
    print("App loaded.")

    # Create Note
    page.locator('button[title="New Note"]').first.click()
    print("Created Note.")

    # Wait for editor
    editor = page.wait_for_selector(".ProseMirror")

    # Type property with alias: [job:is:Engineer] (job is alias for role)
    # Assuming 'job' alias exists for 'role' as per default ontology memory.
    print("Typing aliased property...")
    editor.fill("Note 3: Test Alias\n[job:is:Engineer]")

    # Wait for rendering. The image showed text but not the chip yet?
    # Maybe parsing takes time or "job" is NOT an alias in default ontology?
    # Let's try "role" first to see if chips work at all.
    # editor.fill("Note 3: Test Alias\n[role:is:Engineer]")

    # Wait for rendering
    page.wait_for_timeout(2000)

    # Check for the chip
    # The chip should have text "job" and also "(role)"
    # And it should NOT be red (invalid) if we fixed it.

    # Finding the chip
    # Class "node-property"
    # We can search for text "job" inside .node-property

    chip = page.locator(".node-property").filter(has_text="job")

    # Verify it exists
    # If not visible, it might be because Tiptap hasn't converted it to a node yet.
    # Check if text is still plain text.
    expect(chip).to_be_visible(timeout=5000)
    print("Chip found.")

    # Verify it has valid class (blue)
    # validClasses = "bg-blue-900/30"
    # invalidClasses = "bg-red-900/30"

    # Check if it has blue class
    expect(chip).to_have_class(lambda c: "bg-blue-900/30" in c)
    print("Chip is valid (blue).")

    # Verify it shows alias info
    expect(chip).to_contain_text("(role)")
    print("Chip shows alias info.")

    # Take screenshot
    page.screenshot(path="verification/alias_verification.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_alias_validation(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/alias_error.png")
        finally:
            browser.close()
