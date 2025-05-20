import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('Homepage Performance', async ({ page, context }) => {
    const url = 'https://www.allocommunications.com/';

    // Enable tracing for performance metrics
    await context.tracing.start({ screenshots: true, snapshots: true });

    // Navigate to the page and measure performance
    await page.goto(url);

    // Stop tracing and save the trace
    await context.tracing.stop({ path: 'trace.zip' });

    // Assert that the page loaded successfully (you might need to adjust this)
    expect(page.url()).toBe(url);

    // Largest Contentful Paint (LCP) with enhanced diagnostics
    const lcpDetails = await page.evaluate(() => {
      return new Promise<{lcp: number, element: string, size: number, url: string, timestamp: number}>((resolve) => {
        let largestContentfulPaint: PerformanceEntry & { element?: Element } | undefined;
        let observer: PerformanceObserver | null = null;

        if (window.PerformanceObserver) {
          observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
              if (entry.entryType === 'largest-contentful-paint') {
                largestContentfulPaint = entry as PerformanceEntry & { element?: Element };
                // Get the element that caused LCP
                const element = entry.element;
                resolve({
                  lcp: entry.startTime,
                  element: element ? element.tagName + (element.id ? `#${element.id}` : '') + (element.className ? `.${element.className}` : '') : 'unknown',
                  size: element ? element.getBoundingClientRect().width * element.getBoundingClientRect().height : 0,
                  url: element instanceof HTMLImageElement ? element.src : 'N/A',
                  timestamp: entry.startTime
                });
              }
            });
            if (largestContentfulPaint) {
              observer?.disconnect();
            }
          });

          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } else {
          resolve({ lcp: 0, element: 'unknown', size: 0, url: 'N/A', timestamp: 0 });
        }

        setTimeout(() => {
          observer?.disconnect();
          if (!largestContentfulPaint) {
            resolve({ lcp: 0, element: 'unknown', size: 0, url: 'N/A', timestamp: 0 });
          }
        }, 10000);
      });
    });

    console.log('LCP Diagnostic Report:');
    console.log(`LCP Value: ${lcpDetails.lcp}ms (Threshold: 2500ms)`);
    console.log(`LCP Element: ${lcpDetails.element}`);
    console.log(`Element Size: ${Math.round(lcpDetails.size)}px²`);
    console.log(`Resource URL: ${lcpDetails.url}`);
    console.log(`Timestamp: ${lcpDetails.timestamp}ms`);

    // Add more detailed assertion message
    expect(lcpDetails.lcp, `LCP of ${lcpDetails.lcp}ms exceeds threshold of 2500ms. Element: ${lcpDetails.element}, Size: ${Math.round(lcpDetails.size)}px², URL: ${lcpDetails.url}`).toBeLessThan(2500);

    // Total Blocking Time (TBT)
    const tbt = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        if (!window.PerformanceObserver) {
          resolve(0);
          return;
        }
        let totalBlockingTime = 0;

        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'longtask') {
              totalBlockingTime += entry.duration - 50;
            }
          });
        });
        observer.observe({ type: 'longtask', buffered: true });

        // In case TBT is not observed, resolve after a timeout (adjust as needed)
        setTimeout(() => {
          observer.disconnect();
          resolve(totalBlockingTime);
        }, 10000);  // wait up to 10 seconds
      });
    });

    expect(tbt).toBeLessThan(200); // Example threshold for TBT
  });
});
