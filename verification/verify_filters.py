import os
import time
from playwright.sync_api import sync_playwright

def test_filters(page):
    # Capture console logs
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    print("Navigating to app...")
    page.goto("http://localhost:5173")
    page.wait_for_timeout(3000) # Wait for app to load

    # Check for Filter Bar
    print("Checking for Filter Bar...")

    # Try finding by role and name "All"
    all_btn = page.get_by_role("button", name="All", exact=True)

    if not all_btn.is_visible():
        print("Filter Bar (All button) not visible via 'All'. Trying title...")
        all_btn = page.locator("button[title='All Notes']")
        if not all_btn.is_visible():
             print("Filter Bar not found.")
             page.screenshot(path="verification/error_filter_missing.png")
             return

    print("Filter Bar found.")

    # Create a dummy Task note first (so filtering has effect)
    print("Creating a task note via Dashboard...")

    # Find the Quick Capture section to be specific
    # The dashboard has a section with "Quick Capture" text
    # We look for the container having this text, then the button inside it.
    quick_capture_section = page.locator(".mb-8", has_text="Quick Capture")

    # Find the Task button inside it
    # Note: text might be " Task" or "Task" depending on icon spacing
    task_btn = quick_capture_section.locator("button").filter(has_text="Task").first

    if task_btn.is_visible():
        task_btn.click()
        print("Clicked Task template button.")
    else:
        print("Dashboard Task button not found.")
        page.screenshot(path="verification/error_dashboard_task.png")
        return

    page.wait_for_timeout(2000)

    # Click "Tasks" filter in sidebar
    print("Clicking Tasks filter in sidebar...")

    # Explicitly target sidebar filter bar
    filter_bar = page.locator(".flex.items-center.gap-1.overflow-x-auto")
    tasks_filter = filter_bar.get_by_role("button", name="Tasks")

    if not tasks_filter.is_visible():
        print("Tasks filter button not visible in sidebar.")
        page.screenshot(path="verification/error_tasks_filter.png")
        return

    tasks_filter.click()

    page.wait_for_timeout(1000)

    # Check search input value
    # Use ID for explicit targeting
    search_input = page.locator("#sidebar-search-input")
    value = search_input.input_value()
    print(f"Search input value: {value}")

    # The query for Tasks is [status:is:todo]
    expected_query = "[status:is:todo]"

    if expected_query in value:
        print("Filter applied correctly")
    else:
        print(f"Filter FAILED. Expected to contain {expected_query}, got {value}")
        page.screenshot(path="verification/error_filter_value.png")

    # Click All to clear
    print("Clicking All to clear...")
    all_btn.click()
    page.wait_for_timeout(1000)

    value = search_input.input_value()
    if value == "":
        print("Filter cleared correctly")
    else:
        print(f"Filter clear FAILED. Got {value}")

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})
        try:
            test_filters(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_exception.png")
        finally:
            browser.close()
