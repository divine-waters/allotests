import { test, expect } from '@playwright/test';
import { setupConsoleLogging, flushLogs, clearLogs, logTestError } from './utils/console-logger';

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

// Helper to filter out common third-party warnings
function shouldLogConsoleMessage(msg: any): boolean {
  const text = msg.text();
  const type = msg.type();
  
  // Always log errors that aren't from third-party scripts
  if (type === 'error') {
    const ignoredErrors = [
      'This document requires \'TrustedScript\' assignment',
      'Failed to load resource: the server responded with a status of 404',
      'Failed to load resource: the server responded with a status of 401',
      'The connection to https://clientstream.launchdarkly.com was interrupted',
      'Content-Security-Policy: Couldn\'t process unknown directive',
      'Content-Security-Policy: Ignoring',
      'Content-Security-Policy: The page\'s settings would block'
    ];
    return !ignoredErrors.some(error => text.includes(error));
  }
  
  // Filter out common third-party warnings and info messages
  const ignoredMessages = [
    'unreachable code after return statement',
    'WEBGL_debug_renderer_info is deprecated',
    'CheckMediaAccessPermission: Not supported',
    'Automatic fallback to software WebGL has been deprecated',
    'JQMIGRATE: Migrate is installed',
    'NO squeeze cookie',
    'GA4 - Set Market tag waiting for app',
    'market ',
    'Images loaded lazily and replaced with placeholders',
    'Use of navigator.sendBeacon instead of synchronous XMLHttpRequest',
    'The value of the attribute "expires" for the cookie',
    'This page is in Quirks Mode',
    'InstallTrigger is deprecated',
    'Loading failed for the <script>',
    'Ignoring unsupported entryTypes: longtask',
    '[olark][info] gtag() did not exist',
    '[olark][warn] Google Analytics Integration',
    '[LaunchDarkly] LaunchDarkly client initialized',
    '[LaunchDarkly] Opening stream connection',
    '[LaunchDarkly] Closing stream connection',
    '[LaunchDarkly] Error on stream connection',
    '-ms-high-contrast is in the process of being deprecated',
    '-ms-high-contrast-adjust is in the process of being deprecated'
  ];
  
  return !ignoredMessages.some(message => text.includes(message));
}

// Helper to format console messages
function formatConsoleMessage(msg: any): string {
  const type = msg.type().toUpperCase();
  const text = msg.text();
  const location = msg.location();
  
  // For errors, include location if available
  if (type === 'ERROR' && location) {
    return `[Browser ${type}] ${text} (${location.url}:${location.lineNumber})`;
  }
  
  return `[Browser ${type}] ${text}`;
}

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

test.describe('Signup Links Verification', () => {
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

  // Get all links once before any tests run
  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Setup console logging for the beforeAll page
    await setupConsoleLogging(page, `${testInfo.title} - Setup`);
    
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

  test('should verify signup links', async ({ page }, testInfo) => {
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
          
          // Quick check for the street address input with retry
          const streetAddressInput = page.getByRole('combobox', { name: 'Street Address' });
          await retryWithTimeout(
            () => streetAddressInput.waitFor({ state: 'visible', timeout: 10000 }),
            10000,
            1  // Retry once
          );
          
          console.log(`✓ Successfully verified ${linkData.text} signup link`);
          
        } catch (error) {
          console.error(`✗ Failed to test ${linkData.text}:`, error);
          
          // Log the test error
          logTestError(error, `${testInfo.title} - ${linkData.text}`);
          
          // Try to take screenshot, but don't fail if it doesn't work
          try {
            await page.screenshot({ 
              path: `error-${linkData.text.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
              fullPage: false
            });
          } catch (screenshotError) {
            console.log(`Could not take screenshot: ${screenshotError.message}`);
          }
          
          // Re-throw the error to fail the test
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