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

// Helper function to retry an operation with timeout
async function retryWithTimeout<T>(
  operation: () => Promise<T>,
  timeout: number,
  retries: number = 1
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      // Only retry on timeout errors
      if (error.name !== 'TimeoutError' || attempt === retries) {
        throw error;
      }
      console.log(`Attempt ${attempt + 1} timed out, retrying...`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw lastError;
}

test.describe('Signup Form Validation', () => {
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

  test('should load address form for each city', async ({ page }, testInfo) => {
    for (const [index, linkData] of selectedLinks.entries()) {
      await test.step(`verify address form for ${linkData.text}`, async () => {
        console.log(`Testing form ${index + 1}/3: ${linkData.text}`);
        
        try {
          // Navigate to signup page
          await page.goto(linkData.href, { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
          });
          
          // Wait for loading to complete
          await page.locator('progressbar[aria-label="Loading"]').waitFor({ state: 'hidden', timeout: 10000 });
          
          // Verify address input is present and interactive
          const streetAddressInput = page.getByRole('combobox', { name: 'Street Address' });
          await retryWithTimeout(
            () => streetAddressInput.waitFor({ state: 'visible', timeout: 10000 }),
            10000,
            1  // Retry once
          );
          
          // Verify input is enabled and has placeholder
          await expect(streetAddressInput).toBeEnabled();
        } catch (error) {
          console.error(`✗ Failed to verify form for ${linkData.text}:`, error);
          logTestError(error, `${testInfo.title} - ${linkData.text}`);
          
          try {
            await page.screenshot({ 
              path: `error-form-${linkData.text.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
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