import { test, expect } from '@playwright/test';

// Declare jQuery type for TypeScript
declare global {
  interface Window {
    jQuery: any;
  }
}

test('should verify all signup links in the modal', async ({ page }) => {
  // Navigate and wait for initial load
  await page.goto('https://www.allocommunications.com/');
  await expect(page).toHaveTitle(/ALLO Fiber/);
  
  // Wait for jQuery to be available
  await page.waitForFunction(() => typeof window.jQuery !== 'undefined');
  
  // Get all city links from the modal first
  const modal = page.locator('#service-locations');
  const cityLinks = await modal.locator('a[href*="get-allo"]').all();
  console.log(`Found ${cityLinks.length} city links to test`);
  
  // Test each link
  for (const [index, link] of cityLinks.entries()) {
    // Go back to home page for each iteration
    await page.goto('https://www.allocommunications.com/');
    
    // Get link details before clicking
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    console.log(`Testing link ${index + 1}/${cityLinks.length}: ${text} (${href})`);
    
    try {
      // Open modal
      const signUpButton = page.getByRole('link', { name: 'Sign Up For Service' }).first();
      await signUpButton.waitFor({ state: 'visible' });
      await page.evaluate(() => {
        const $ = window.jQuery;
        $('#service-locations').modal('show');
      });
      
      // Wait for modal and animation
      await modal.waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Click the specific link
      await link.waitFor({ state: 'visible', timeout: 10000 });
      await link.click({ timeout: 10000 });
      
      // Wait for navigation and verify URL
      await page.waitForURL(url => url.toString().startsWith('https://customer.allofiber.com/get-allo/step1'), { timeout: 10000 });
      const currentUrl = new URL(page.url());
      const expectedUrl = new URL(href!);
      
      // Verify base URL and pathname match
      expect(currentUrl.origin + currentUrl.pathname).toBe(expectedUrl.origin + expectedUrl.pathname);
      
      // Verify required query parameters are present
      const requiredParams = ['market', 'serviceAddressType', 'locale'];
      for (const param of requiredParams) {
        expect(currentUrl.searchParams.has(param)).toBeTruthy();
      }
      
      // Verify the street address combobox is present and visible
      const streetAddressInput = page.getByRole('combobox', { name: 'Street Address' });
      await streetAddressInput.waitFor({ state: 'visible', timeout: 10000 });
      console.log(`✓ Successfully navigated to ${text} and found address input`);
      
    } catch (error) {
      console.error(`✗ Failed to test ${text}:`, error);
      // Take screenshot on failure
      await page.screenshot({ 
        path: `error-${text?.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
        fullPage: true 
      });
    }
  }
});