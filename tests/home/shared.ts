import { Browser, Page } from '@playwright/test';

// Declare jQuery type for TypeScript
declare global {
  interface Window {
    jQuery: any;
  }
}

// Define interface for link data
export interface LinkData {
  href: string;
  text: string;
  selector: string;
}

// Helper function to get random items from an array
export function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Helper function to retry an operation with timeout
export async function retryWithTimeout<T>(
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

// Helper function to get city links from the modal
export async function getCityLinks(browser: Browser, testTitle: string): Promise<LinkData[]> {
  const context = await browser.newContext({
    permissions: ['geolocation'],
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  try {
    // Navigate and wait for initial load
    await page.goto('https://www.allocommunications.com/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for jQuery to be available
    await page.waitForFunction(() => typeof window.jQuery !== 'undefined');
    
    // Get all city links from the modal
    const modal = page.locator('#service-locations');
    const allLinks = await modal.locator('a[href*="get-allo"]').all();
    console.log(`Found ${allLinks.length} total city links`);
    
    // Get link data
    const allLinkData: LinkData[] = [];
    for (const link of allLinks) {
      const href = await link.getAttribute('href') || '';
      const text = await link.textContent() || '';
      const selector = `a[href="${href}"]`;
      allLinkData.push({ href, text, selector });
    }
    
    return allLinkData;
  } finally {
    await context.close();
  }
}

// Helper function to open the service locations modal
export async function openServiceLocationsModal(page: Page): Promise<void> {
  // Click the Sign Up For Service button
  const signUpButton = page.getByRole('link', { name: 'Sign Up For Service' }).first();
  await signUpButton.waitFor({ state: 'visible' });
  
  // Open modal using jQuery
  await page.evaluate(() => {
    const $ = window.jQuery;
    $('#service-locations').modal('show');
  });
  
  // Wait for modal to be visible
  const modal = page.locator('#service-locations');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
}

// Helper function to take error screenshot
export async function takeErrorScreenshot(page: Page, prefix: string, cityName: string): Promise<void> {
  try {
    await page.screenshot({ 
      path: `error-${prefix}-${cityName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`,
      fullPage: false
    });
  } catch (screenshotError) {
    console.log(`Could not take screenshot: ${screenshotError.message}`);
  }
} 