from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Navigate to the application.
    page.goto("http://localhost:5173/")

    # 2. Assert that the main application container is visible.
    # This confirms the application has loaded without crashing.
    app_container = page.locator("#root")
    expect(app_container).to_be_visible(timeout=10000)

    # 3. Take a screenshot for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)