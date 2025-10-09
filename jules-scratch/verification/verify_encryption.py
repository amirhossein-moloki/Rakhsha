import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_changes(page: Page):
    """
    This script verifies that the conversation list is correctly displayed
    and that conversation names are being decrypted and shown properly.
    """
    # 1. Navigate to the login page
    page.goto("http://localhost:5173/login", timeout=15000)

    # 2. Log in with corrected locators
    # The label for the username field is "Email", not "Username".
    page.get_by_label("Email").fill("user1")
    page.get_by_label("Password").fill("password")
    page.get_by_role("button", name="Login").click()

    # 3. Wait for homepage to load and conversations to appear
    # Expect the main heading to be visible, indicating we're on the right page.
    expect(page.get_by_role("heading", name="Conversations")).to_be_visible(timeout=10000)

    # Wait for at least one conversation item to be rendered.
    # We look for the list item role within the conversation list.
    conversation_list = page.locator("ul")
    # There should be at least one conversation. Let's check for the presence of 'user2' or 'user3'.
    # This is more robust than checking for a specific count.
    expect(page.get_by_text(re.compile("user2|user3"))).to_be_visible(timeout=10000)

    # 4. Take a screenshot for visual confirmation
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_changes(page)
        browser.close()

if __name__ == "__main__":
    main()