import { test, expect } from '@playwright/test';
import { setupConsoleLogging, flushLogs, clearLogs } from '../utils/console-logger';

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

test.describe('Service Locations Modal', () => {
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
    
    await setupConsoleLogging(page, `${testInfo.title} - Setup`);
    
    // Navigate and wait for initial load
    await page.goto('https://www.allocommunications.com/');
    await expect(page).toHaveTitle(/ALLO Fiber/);
    
    // Wait for jQuery to be available
    await page.waitForFunction(() => typeof window.jQuery !== 'undefined');
    
    // Get all city links from the modal
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

  test('should open modal and display city links', async ({ page }) => {
    // Go to home page
    await page.goto('https://www.allocommunications.com/');
    
    // Click the Sign Up For Service button
    const signUpButton = page.getByRole('link', { name: 'Sign Up For Service' }).first();
    await signUpButton.waitFor({ state: 'visible' });
    
    // Open modal using jQuery
    await page.evaluate(() => {
      const $ = window.jQuery;
      $('#service-locations').modal('show');
    });
    
    // Verify modal is visible
    const modal = page.locator('#service-locations');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Verify all selected links are visible
    for (const linkData of selectedLinks) {
      const link = page.locator(linkData.selector);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', linkData.href);
      await expect(link).toHaveText(linkData.text);
    }
  });

  test('should have valid links in modal', async ({ page }) => {
    await page.goto('https://www.allocommunications.com/');
    
    // Open modal
    await page.evaluate(() => {
      const $ = window.jQuery;
      $('#service-locations').modal('show');
    });
    
    const modal = page.locator('#service-locations');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    
    // Verify each link has required attributes and valid URL
    for (const linkData of selectedLinks) {
      const link = page.locator(linkData.selector);
      await expect(link).toBeVisible();
      
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
      
      // Verify URL structure
      const url = new URL(href!);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toContain('customer.allofiber.com');
      expect(url.pathname).toContain('get-allo');
    }
  });

  // Write logs at the end of all tests
  test.afterAll(async () => {
    await flushLogs();
  });
}); 