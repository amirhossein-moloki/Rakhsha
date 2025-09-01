from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to register page
        page.goto("http://localhost:5173/register")

        # Register a new user
        username = f"testuser{int(time.time())}"
        email = f"{username}@test.com"
        page.locator('input[id="username"]').fill(username)
        page.locator('input[id="email"]').fill(email)
        page.locator('input[id="password"]').fill("password123")
        page.get_by_role("button", name="Register").click()

        # Wait for navigation to login page
        expect(page).to_have_url("http://localhost:5173/login", timeout=10000)

        # Log in
        page.locator('input[id="email"]').fill(email)
        page.locator('input[id="password"]').fill("password123")
        page.get_by_role("button", name="Login").click()

        # Wait for navigation to home page
        expect(page).to_have_url("http://localhost:5173/")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run()
