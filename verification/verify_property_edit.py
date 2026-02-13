import os
import time
from playwright.sync_api import sync_playwright

def test_property_edit(page):
    # Capture console logs
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    print("Navigating to app...")
    page.goto("http://localhost:5173")
    page.wait_for_timeout(3000)

    print("Creating a test note...")
    create_btn = page.locator("button:has-text('Create Note')").first
    if create_btn.is_visible():
        create_btn.click()
    else:
        page.locator("button[title='New Note (Ctrl+N)']").click()

    page.wait_for_timeout(1000)

    # Insert a property via text
    print("Typing property [myprop:is:testval]...")
    editor = page.locator(".ProseMirror")
    editor.click()
    page.keyboard.type("Test Note Content. [myprop:is:testval]")
    page.wait_for_timeout(1000)

    # Open Assistant (Inspector)
    print("Opening Assistant...")

    toggle_btn = page.get_by_label("Toggle Assistant")

    assistant_panel = page.locator("div.w-80").filter(has_text="Assistant")

    if not assistant_panel.is_visible():
        print("Assistant not visible, toggling...")
        if toggle_btn.is_visible():
            toggle_btn.click()
            page.wait_for_timeout(500)
        else:
             print("Toggle button not found via aria-label.")
             page.screenshot(path="verification/error_toggle_missing.png")

    if not assistant_panel.is_visible():
         print("Failed to open Assistant.")
         page.screenshot(path="verification/error_assistant_toggle.png")
         return

    print("Assistant visible.")

    # Check if property is listed
    print("Checking for property 'myprop'...")

    status_text = assistant_panel.get_by_text("myprop", exact=True)

    if not status_text.is_visible():
         status_text = assistant_panel.locator("div", has_text="myprop").first

    if status_text.is_visible():
        print("Property 'myprop' found in Assistant.")
    else:
        print("Property 'myprop' NOT found in Assistant.")
        page.screenshot(path="verification/error_prop_missing.png")
        return

    # Edit the property
    print("Editing property...")

    value_pill = assistant_panel.get_by_text("testval", exact=True)

    if value_pill.is_visible():
        value_pill.click()
        print("Clicked value 'testval'.")
    else:
        print("Value 'testval' not found in Assistant.")
        page.screenshot(path="verification/error_value_missing.png")
        return

    page.wait_for_timeout(500)

    # Check if input appears
    # Use a more generic selector for the active input
    input_field = assistant_panel.locator("input[type='text']").first

    # Verify it has the correct value initially
    if input_field.is_visible() and input_field.input_value() == "testval":
        print("Edit mode active.")
        input_field.fill("updatedval")
        input_field.press("Enter")
    else:
        print(f"Could not enter edit mode or input not found. Found inputs: {assistant_panel.locator('input').count()}")
        page.screenshot(path="verification/error_edit_mode.png")
        return

    page.wait_for_timeout(1000)

    # Check editor content
    content = editor.inner_text()
    print(f"Editor content: {content}")

    if "[myprop:is:updatedval]" in content and "[myprop:is:testval]" not in content:
        print("Property updated correctly (replaced).")
    elif "[myprop:is:updatedval]" in content and "[myprop:is:testval]" in content:
        print("Property duplicated (appended).")
    else:
        print("Property update failed.")

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})
        try:
            test_property_edit(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_exception.png")
        finally:
            browser.close()
