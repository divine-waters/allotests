import { test, expect } from '@playwright/test';
import { setupConsoleLogging, flushLogs, clearLogs, logTestError } from '../utils/console-logger';

// Declare jQuery type for TypeScript
declare global {
  interface Window {
    jQuery: any;
  }
}

// Define interface for link data
interface LinkData {
  href: string;
  text: string;
  selector: string;
}

// Store the selected links data at the module level
let selectedLinks: LinkData[] = [];

test.describe('Signup URL Validation', () => {
  // Clear logs at the start of the test run
  test.beforeAll(async () => {
    clearLogs();
  });

  // Configure browser context with proper permissions
  test.beforeEach(async ({ page }, testInfo) => {
    await page.context().grantPermissions(['geolocation']);
    await page.setViewportSize({ width: 1280, height: 720 });
    await setupConsoleLogging(page, testInfo.title);
  });

  // Get links from modal.spec.ts
  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    await setupConsoleLogging(page, `${testInfo.title} - Setup`);
    
    // Navigate and wait for initial load
    await page.goto('https://www.allocommunications.com/');
    await expect(page).toHaveTitle(/ALLO Fiber/);
    
    // Wait for jQuery to be available
    await page.waitForFunction(() => typeof window.jQuery !== 'undefined');
    
    // Get all city links from the modal
    const modal = page.locator('#service-locations');
    const allLinks = await modal.locator('a[href*="get-allo"]').all();
    
    // Get link data before closing context
    const allLinkData: LinkData[] = [];
    for (const link of allLinks) {
      const href = await link.getAttribute('href') || '';
      const text = await link.textContent() || '';
      const selector = `a[href="${href}"]`;
      allLinkData.push({ href, text, selector });
    }
    
    // Select only 3 random links for CI testing
    selectedLinks = allLinkData.slice(0, 3);
    console.log(`Selected 3 links for testing:`, selectedLinks.map(l => l.text));
    
    await context.close();
  });

  test('should have correct URL parameters for each city', async ({ page }, testInfo) => {
    for (const [index, linkData] of selectedLinks.entries()) {
      await test.step(`validate URL parameters for ${linkData.text}`, async () => {
        console.log(`Testing URL validation ${index + 1}/3: ${linkData.text}`);
        
        try {
          // Navigate directly to the signup URL
          await page.goto(linkData.href, { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
          });
          
          // Get current URL and parse it
          const currentUrl = new URL(page.url());
          const expectedUrl = new URL(linkData.href);
          
          // Verify base URL and pathname match
          expect(currentUrl.origin + currentUrl.pathname).toBe(expectedUrl.origin + expectedUrl.pathname);
          
          // Verify required query parameters
          const requiredParams = ['market', 'serviceAddressType', 'locale'];
          for (const param of requiredParams) {
            expect(currentUrl.searchParams.has(param)).toBeTruthy();
            expect(currentUrl.searchParams.get(param)).toBeTruthy();
          }
          
          // Verify market parameter matches city
          const marketParam = currentUrl.searchParams.get('market');
          expect(marketParam).toBeTruthy();
          expect(linkData.text.toLowerCase()).toContain(marketParam!.toLowerCase());
          
          // Verify serviceAddressType is valid
          const addressType = currentUrl.searchParams.get('serviceAddressType');
          expect(['residential', 'business']).toContain(addressType);
          
          // Verify locale is valid
          const locale = currentUrl.searchParams.get('locale');
          expect(['en-US', 'es-US']).toContain(locale);
          
          console.log(`✓ Successfully validated URL for ${linkData.text}`);
          
        } catch (error) {
          console.error(`✗ Failed to validate URL for ${linkData.text}:`, error);
          logTestError(error, `${testInfo.title} - ${linkData.text}`);
          
          try {
            await page.screenshot({ 
              path: `error-url-${linkData.text.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
              fullPage: false
            });
          } catch (screenshotError) {
            console.log(`Could not take screenshot: ${screenshotError.message}`);
          }
          
          throw error;
        }
      });
    }
  });

  // Write logs at the end of all tests
  test.afterAll(async () => {
    await flushLogs();
  });
}); 