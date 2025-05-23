import { test, expect } from '@playwright/test';

// Declare jQuery type for TypeScript
declare global {
  interface Window {
    jQuery: any;
  }
}

// Helper function to get random items from an array
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Define interface for link data
interface LinkData {
  href: string;
  text: string;
  selector: string;
}

// Store the selected links data at the module level
let selectedLinks: LinkData[] = [];

test.describe('Signup Links Verification', () => {
  // Configure browser context with proper permissions
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // Get all links once before any tests run
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Navigate and wait for initial load
    await page.goto('https://www.allocommunications.com/');
    await expect(page).toHaveTitle(/ALLO Fiber/);
    
    // Wait for jQuery to be available
    await page.waitForFunction(() => typeof window.jQuery !== 'undefined');
    
    // Get all city links from the modal first
    const modal = page.locator('#service-locations');
    const allLinks = await modal.locator('a[href*="get-allo"]').all();
    console.log(`Found ${allLinks.length} total city links`);
    
    // Get link data before closing context
    const allLinkData: LinkData[] = [];
    for (const link of allLinks) {
      const href = await link.getAttribute('href') || '';
      const text = await link.textContent() || '';
      const selector = `a[href="${href}"]`;
      allLinkData.push({ href, text, selector });
    }
    
    // Select only 3 random links for CI testing
    selectedLinks = getRandomItems(allLinkData, 3);
    console.log(`Selected 3 random links for testing:`, selectedLinks.map(l => l.text));
    
    await context.close();
  });

  test('should verify signup links', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes total timeout
    
    // Verify each link in a separate step
    for (const [index, linkData] of selectedLinks.entries()) {
      await test.step(`verify signup link for ${linkData.text}`, async () => {
        // Go back to home page
        await page.goto('https://www.allocommunications.com/');
        
        console.log(`Testing link ${index + 1}/3: ${linkData.text}`);
        
        try {
          // Click the Sign Up For Service button to open modal using jQuery
          const signUpButton = page.getByRole('link', { name: 'Sign Up For Service' }).first();
          await signUpButton.waitFor({ state: 'visible' });
          await page.evaluate(() => {
            const $ = window.jQuery;
            $('#service-locations').modal('show');
          });
          
          // Wait for modal and animation
          const modal = page.locator('#service-locations');
          await modal.waitFor({ state: 'visible', timeout: 5000 });
          
          // Click the specific city link using the stored selector
          const link = page.locator(linkData.selector);
          await link.waitFor({ state: 'visible', timeout: 5000 });
          
          // Get the href before clicking
          const href = await link.getAttribute('href');
          if (!href) {
            throw new Error(`No href found for ${linkData.text}`);
          }

          // Navigate to the URL with reasonable timeout
          await page.goto(href, { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
          });
          
          // Quick verification of URL and parameters
          const currentUrl = new URL(page.url());
          const expectedUrl = new URL(href);
          
          // Verify base URL and pathname match
          expect(currentUrl.origin + currentUrl.pathname).toBe(expectedUrl.origin + expectedUrl.pathname);
          
          // Verify required query parameters are present
          const requiredParams = ['market', 'serviceAddressType', 'locale'];
          for (const param of requiredParams) {
            expect(currentUrl.searchParams.has(param)).toBeTruthy();
          }
          
          // Wait for loading to complete
          await page.locator('progressbar[aria-label="Loading"]').waitFor({ state: 'hidden', timeout: 10000 });
          
          // Quick check for the street address input
          const streetAddressInput = page.getByRole('combobox', { name: 'Street Address' });
          await streetAddressInput.waitFor({ state: 'visible', timeout: 10000 });
          
          console.log(`✓ Successfully verified ${linkData.text} signup link`);
          
        } catch (error) {
          console.error(`✗ Failed to test ${linkData.text}:`, error);
          await page.screenshot({ 
            path: `error-${linkData.text.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
            fullPage: false
          });
          throw error;
        }
      });
    }
  });
});