import { test, expect } from '@playwright/test';

test('should load the home page and have the correct title', async ({ page }) => {
  await page.goto('https://www.allocommunications.com/');
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/ALLO Fiber/);
  console.log("Simple Assertion Example Test")
}); 