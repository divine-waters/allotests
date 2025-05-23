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

test.describe('Signup Navigation Flow', () => {
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

  test('should navigate to signup page from modal', async ({ page }, testInfo) => {
    test.setTimeout(120000); // 2 minutes total timeout
    
    for (const [index, linkData] of selectedLinks.entries()) {
      await test.step(`navigate to signup for ${linkData.text}`, async () => {
        // Go back to home page
        await page.goto('https://www.allocommunications.com/');
        
        console.log(`Testing navigation ${index + 1}/3: ${linkData.text}`);
        
        try {
          // Open modal and click link
          await page.evaluate(() => {
            const $ = window.jQuery;
            $('#service-locations').modal('show');
          });
          
          const modal = page.locator('#service-locations');
          await modal.waitFor({ state: 'visible', timeout: 5000 });
          
          const link = page.locator(linkData.selector);
          await link.waitFor({ state: 'visible', timeout: 5000 });
          
          // Click the link and wait for URL change
          await link.click();
          await page.waitForURL(/get-allo/, { timeout: 15000 });
          
          // Wait for loading to complete
          await page.locator('progressbar[aria-label="Loading"]').waitFor({ state: 'hidden', timeout: 10000 });
          
          // Verify we're on the signup page
          await expect(page).toHaveURL(/get-allo/);
          await expect(page.getByRole('heading', { name: 'Sign Up For ALLO' })).toBeVisible();
          
          console.log(`✓ Successfully navigated to ${linkData.text} signup page`);
          
        } catch (error) {
          console.error(`✗ Failed to navigate to ${linkData.text}:`, error);
          logTestError(error, `${testInfo.title} - ${linkData.text}`);
          
          try {
            await page.screenshot({ 
              path: `error-nav-${linkData.text.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
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