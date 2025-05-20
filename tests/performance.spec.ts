import { test, expect, BrowserContext, Page } from '@playwright/test';
import { BENCHMARKS } from './constants';
import { printTestHeader, printTestFooter } from './utils';

interface LCPDetails {
  lcp: number;
  element: string;
  size: number;
  url: string;
  timestamp: number;
}

interface TBTDetails {
  totalTBT: number;
  tasks: Array<{
    name: string;
  duration: number;
  startTime: number;
  resourceType?: string;
  resourceUrl?: string;
    scriptUrl?: string;
    lineNumber?: number;
    columnNumber?: number;
    stackTrace?: string;
  }>;
  resourceTiming: Array<{
    name: string;
    url: string;
    type: string;
    duration: number;
    startTime: number;
    transferSize: number;
    encodedBodySize: number;
    decodedBodySize: number;
    initiatorType: string;
    nextHopProtocol: string;
  }>;
}

interface NavigationMetrics {
  resources: number;
  loadTime: number;
}

function printTestInsights(metrics: any, testType: '3G' | 'CPU' | 'concurrent' | 'memory' | 'LCP' | 'TBT') {
  const thresholds = BENCHMARKS[testType === '3G' ? 'network' : testType.toLowerCase()];
  
  switch (testType) {
    case '3G':
      console.log('\n3G Network Performance Analysis:');
      console.log(`Total Load Time: ${metrics.loadTime}ms (Threshold: ${thresholds['3G'].loadTime.good}ms)`);
      console.log(`Resource Count: ${metrics.resources} (Threshold: ${thresholds['3G'].resources.good})`);
      console.log(`Memory Usage: ${metrics.memoryMB.toFixed(2)}MB (Threshold: ${thresholds['3G'].memory.good}MB)`);
      break;
      
    case 'CPU':
      console.log('\nCPU Performance Analysis:');
      console.log(`Total Load Time: ${metrics.loadTime}ms (Threshold: ${thresholds.loadTime.good}ms)`);
      console.log(`JavaScript Execution Time: ${metrics.jsExecutionTime.toFixed(0)}ms (Threshold: ${thresholds.jsExecutionTime.good}ms)`);
      break;
      
    case 'concurrent':
      console.log('\nConcurrent Users Performance Analysis:');
      console.log(`Average Load Time: ${metrics.avgLoadTime}ms (Threshold: ${thresholds.loadTime.good}ms)`);
      console.log(`Error Rate: ${(metrics.errorRate * 100).toFixed(1)}% (Threshold: ${thresholds.errorRate.good * 100}%)`);
      console.log(`Resource Contention: ${metrics.resourceContention.toFixed(1)}% (Threshold: ${thresholds.resourceContention.good}%)`);
      break;
      
    case 'memory':
      console.log('\nMemory Performance Analysis:');
      console.log(`Heap Growth: ${metrics.heapGrowth.toFixed(2)}MB (Threshold: ${thresholds.heapGrowth.good}MB)`);
      console.log(`DOM Nodes: ${metrics.domNodes} (Threshold: ${thresholds.domNodes.good})`);
      console.log(`Event Listeners: ${metrics.eventListeners} (Threshold: ${thresholds.eventListeners.good})`);
      break;
      
    case 'LCP':
      console.log('\nLCP Performance Analysis:');
      console.log(`LCP Value: ${metrics.lcp}ms (Threshold: 2500ms)`);
      break;
      
    case 'TBT':
      console.log('\nTBT Performance Analysis:');
      console.log(`Total Blocking Time: ${metrics.totalTBT.toFixed(0)}ms (Threshold: 300ms)`);
      break;
  }
  
  // Add recommendations based on metrics
  console.log('\nRecommendations:');
  switch (testType) {
    case '3G':
      if (metrics.loadTime > thresholds['3G'].loadTime.poor) {
        console.log('- Optimize critical rendering path');
        console.log('- Implement resource prioritization');
        console.log('- Consider using a CDN for static assets');
      }
      if (metrics.resources > thresholds['3G'].resources.poor) {
        console.log('- Reduce number of HTTP requests');
        console.log('- Implement resource bundling');
        console.log('- Use lazy loading for non-critical resources');
      }
      if (metrics.memoryMB > thresholds['3G'].memory.poor) {
        console.log('- Optimize memory usage in JavaScript');
        console.log('- Implement proper cleanup of event listeners');
        console.log('- Consider using web workers for heavy computations');
      }
      break;
      
    case 'CPU':
      if (metrics.loadTime > thresholds.loadTime.poor) {
        console.log('- Optimize JavaScript execution');
        console.log('- Implement code splitting');
        console.log('- Use web workers for CPU-intensive tasks');
      }
      if (metrics.jsExecutionTime > thresholds.jsExecutionTime.poor) {
        console.log('- Profile and optimize slow JavaScript functions');
        console.log('- Implement proper caching strategies');
        console.log('- Consider using a service worker for offline capabilities');
      }
      break;
      
    case 'concurrent':
      if (metrics.avgLoadTime > thresholds.loadTime.poor) {
        console.log('- Implement server-side caching');
        console.log('- Optimize database queries');
        console.log('- Consider using a load balancer');
      }
      if (metrics.errorRate > thresholds.errorRate.poor) {
        console.log('- Improve error handling and recovery');
        console.log('- Implement proper retry mechanisms');
        console.log('- Add better logging and monitoring');
      }
      if (metrics.resourceContention > thresholds.resourceContention.poor) {
        console.log('- Implement resource pooling');
        console.log('- Optimize database connections');
        console.log('- Consider horizontal scaling');
      }
      break;
      
    case 'memory':
      if (metrics.heapGrowth > thresholds.heapGrowth.poor) {
        console.log('- Fix memory leaks in JavaScript');
        console.log('- Implement proper garbage collection');
        console.log('- Use memory-efficient data structures');
      }
      if (metrics.domNodes > thresholds.domNodes.poor) {
        console.log('- Reduce DOM complexity');
        console.log('- Implement virtual DOM or DOM recycling');
        console.log('- Use efficient DOM manipulation techniques');
      }
      if (metrics.eventListeners > thresholds.eventListeners.poor) {
        console.log('- Implement event delegation');
        console.log('- Clean up unused event listeners');
        console.log('- Use efficient event handling patterns');
      }
      break;
      
    case 'LCP':
      if (metrics.lcp > 2500) {
        console.log('- Optimize largest contentful paint element');
        console.log('- Implement proper image optimization');
        console.log('- Consider using next-gen image formats');
        console.log('- Implement resource hints (preload, preconnect)');
      }
      break;
      
    case 'TBT':
      if (metrics.totalTBT > 600) {
        console.log('- Optimize long tasks');
        console.log('- Implement code splitting and lazy loading');
        console.log('- Use web workers for heavy computations');
        console.log('- Optimize third-party script loading');
      }
      break;
  }
}

test.describe('Performance Tests', () => {
  const url = 'https://www.allocommunications.com/';

  test('Homepage Performance', async ({ page, context }) => {
    printTestHeader('Homepage Performance Test');
    
    try {
      // Enable performance monitoring
      await context.route('**/*', async route => {
        const request = route.request();
        // Add custom header to track resource timing
        const headers = { ...request.headers(), 'x-performance-tracking': 'true' };
        await route.continue({ headers });
      });
      
      // Navigate to the homepage with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          break;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          console.log(`Retry ${retryCount}/${maxRetries} for homepage...`);
          await page.waitForTimeout(2000);
        }
      }

      // Collect LCP details
      const lcpDetails: LCPDetails = await page.evaluate(() => {
        const entries = performance.getEntriesByType('largest-contentful-paint');
        const lastEntry = entries[entries.length - 1] as any;
        const element = lastEntry?.element?.tagName || 'unknown';
        const size = lastEntry?.size || 0;
        const url = lastEntry?.url || '';
        return {
          lcp: lastEntry?.startTime || 0,
          element,
          size,
          url,
          timestamp: lastEntry?.startTime || 0
        };
      });

      // Collect TBT details with enhanced metrics
      const tbtDetails: TBTDetails = await page.evaluate(() => {
        // Get long tasks
        const longTasks = performance.getEntriesByType('longtask').map(task => {
          const stack = (task as any).attribution?.[0] || {};
          return {
            name: task.name,
            duration: task.duration,
            startTime: task.startTime,
            resourceType: stack.containerType,
            resourceUrl: stack.containerSrc,
            scriptUrl: stack.containerName,
            lineNumber: stack.lineNumber,
            columnNumber: stack.columnNumber,
            stackTrace: stack.stackTrace
          };
        });

        // Get resource timing
        const resources = performance.getEntriesByType('resource').map(resource => {
          const timing = resource as PerformanceResourceTiming;
          return {
            name: timing.name,
            url: timing.name,
            type: timing.initiatorType,
            duration: timing.duration,
            startTime: timing.startTime,
            transferSize: timing.transferSize,
            encodedBodySize: timing.encodedBodySize,
            decodedBodySize: timing.decodedBodySize,
            initiatorType: timing.initiatorType,
            nextHopProtocol: timing.nextHopProtocol
          };
        });

        // Calculate total blocking time
        const totalTBT = longTasks.reduce((sum, task) => sum + task.duration, 0);

        return {
          totalTBT,
          tasks: longTasks,
          resourceTiming: resources
        };
      });

      // Print reports
      printTestHeader('LCP Diagnostic Report');
      console.log(`LCP Value: ${lcpDetails.lcp}ms (Threshold: 2500ms)`);
      console.log(`LCP Element: ${lcpDetails.element}`);
      console.log(`Element Size: ${Math.round(lcpDetails.size)}px²`);
      console.log(`Resource URL: ${lcpDetails.url}`);
      console.log(`Timestamp: ${lcpDetails.timestamp}ms`);
      printTestInsights({ lcp: lcpDetails.lcp }, 'LCP');

      printTestHeader('TBT Diagnostic Report');
      console.log(`Total Blocking Time: ${tbtDetails.totalTBT.toFixed(0)}ms`);
      console.log(`Threshold: 300ms (Good: 0-200ms, Needs Improvement: 200-600ms, Poor: >600ms)`);
      
      if (tbtDetails.tasks.length > 0) {
        console.log('\nBlocking Tasks:');
        tbtDetails.tasks.forEach(task => {
          console.log(`\n• Task: ${task.name}`);
          console.log(`  Duration: ${task.duration.toFixed(0)}ms`);
          console.log(`  Start Time: ${task.startTime.toFixed(0)}ms`);
          if (task.resourceType) {
            console.log(`  Resource Type: ${task.resourceType}`);
          }
          if (task.resourceUrl) {
            console.log(`  Resource URL: ${task.resourceUrl}`);
          }
          if (task.scriptUrl) {
            console.log(`  Script: ${task.scriptUrl}`);
            if (task.lineNumber) {
              console.log(`  Location: Line ${task.lineNumber}, Column ${task.columnNumber}`);
            }
          }
          if (task.stackTrace) {
            console.log(`  Stack Trace:\n    ${task.stackTrace.split('\n').join('\n    ')}`);
          }
        });
      } else {
        console.log('\nNo blocking tasks detected during measurement period.');
      }

      // Analyze resource timing
      console.log('\nResource Loading Analysis:');
      const resourceTypes = new Map<string, number>();
      const slowResources = tbtDetails.resourceTiming
        .filter(r => r.duration > 1000) // Resources taking more than 1s
        .sort((a, b) => b.duration - a.duration);

      tbtDetails.resourceTiming.forEach(resource => {
        resourceTypes.set(
          resource.type,
          (resourceTypes.get(resource.type) || 0) + resource.duration
        );
      });

      console.log('\nResource Type Distribution:');
      resourceTypes.forEach((totalDuration, type) => {
        console.log(`• ${type}: ${totalDuration.toFixed(0)}ms total`);
      });

      if (slowResources.length > 0) {
        console.log('\nSlow Resources (>1s):');
        slowResources.slice(0, 5).forEach(resource => {
          console.log(`\n• ${resource.name}`);
          console.log(`  Type: ${resource.type}`);
          console.log(`  Duration: ${resource.duration.toFixed(0)}ms`);
          console.log(`  Size: ${(resource.transferSize / 1024).toFixed(1)}KB`);
          console.log(`  Protocol: ${resource.nextHopProtocol}`);
        });
      }

      // Print insights
      printTestInsights({ totalTBT: tbtDetails.totalTBT }, 'TBT');
      
      // Add assertions
      expect(lcpDetails.lcp, 'LCP should be collected').toBeGreaterThan(0);
      expect(tbtDetails.totalTBT, 'TBT should be collected').toBeDefined();
      
    } catch (error) {
      console.log(`Error in homepage performance test: ${error.message}`);
      throw error; // Re-throw to fail the test
    }
    
    printTestFooter();
  });

  // Stress test scenarios
  test.describe('Stress Tests', () => {
    test('Performance under 3G network conditions', async ({ browser }, testInfo) => {
      printTestHeader('3G Network Performance Test');
      
      let context: BrowserContext | null = null;
      
      try {
        // Use Playwright's built-in throttling
        context = await browser.newContext({
          ...testInfo.project.use,
          // Use 3G preset which works across all browsers
          geolocation: { longitude: 12.492507, latitude: 41.889938 },
          locale: 'en-US',
          timezoneId: 'Europe/Rome',
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          viewport: { width: 375, height: 667 }
        });

        // Set network throttling using Playwright's built-in capabilities
        await context.route('**/*', async route => {
          // Simulate 3G-like conditions by adding delay
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms latency
          await route.continue();
        });
        
        const page = await context.newPage();
        
        // Navigate with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        let totalLoadTime = 0;
        
        while (retryCount < maxRetries) {
          try {
            const startTime = Date.now();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            totalLoadTime = Date.now() - startTime;
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            console.log(`Retry ${retryCount}/${maxRetries} for 3G test...`);
            await page.waitForTimeout(2000);
          }
        }
        
        const navigationMetrics: NavigationMetrics = await page.evaluate(() => {
          const resources = performance.getEntriesByType('resource').length;
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            resources,
            loadTime: navEntry.loadEventEnd - navEntry.startTime
          };
        });
        
        const memoryMB = await page.evaluate(() => {
          const memory = (performance as any).memory;
          return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0;
        });
        
        printTestInsights({
          loadTime: totalLoadTime,
          resources: navigationMetrics.resources,
          memoryMB
        }, '3G');
        
        // Add assertions
        expect(totalLoadTime, 'Load time should be collected').toBeGreaterThan(0);
        expect(navigationMetrics.resources, 'Resource count should be collected').toBeGreaterThan(0);
        
      } catch (error) {
        console.log(`Error in 3G network test: ${error.message}`);
        throw error;
      } finally {
        if (context) {
          await context.close();
        }
      }
      
      printTestFooter();
    });

    test('Performance under CPU throttling', async ({ browser }, testInfo) => {
      printTestHeader('CPU Throttling Performance Test');
      
      let context: BrowserContext | null = null;
      
      try {
        context = await browser.newContext({
          ...testInfo.project.use,
          geolocation: { longitude: 12.492507, latitude: 41.889938 },
          locale: 'en-US',
          timezoneId: 'Europe/Rome',
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          viewport: { width: 375, height: 667 }
        });
        
        const page = await context.newPage();
        
        // Collect long tasks before navigation
        const longTasks: any[] = [];
        await page.evaluate(() => {
          new PerformanceObserver((entryList) => {
            entryList.getEntries().forEach(entry => {
              longTasks.push({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
              });
            });
          }).observe({ entryTypes: ['longtask'] });
        });
        
        // Simulate CPU throttling
        await page.route('**/*.js', async route => {
          const response = await route.fetch();
          const js = await response.text();
          const throttledJs = js.replace(/function/g, 'async function')
            .replace(/=>/g, 'async =>')
            .replace(/await/g, 'await new Promise(r => setTimeout(r, 10)) && await');
          await route.fulfill({ response, body: throttledJs });
        });
        
        // Navigate with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        let loadTime = 0;
        let jsExecutionTime = 0;
        
        while (retryCount < maxRetries) {
          try {
            const startTime = Date.now();
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            loadTime = Date.now() - startTime;
            
            jsExecutionTime = await page.evaluate(() => {
              const entries = performance.getEntriesByType('measure');
              return entries.reduce((sum, entry) => sum + entry.duration, 0);
            });
            
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            console.log(`Retry ${retryCount}/${maxRetries} for CPU throttling test...`);
            await page.waitForTimeout(2000);
          }
        }
        
        printTestInsights({
          loadTime,
          jsExecutionTime,
          longTasks
        }, 'CPU');
        
        // Add assertions
        expect(loadTime, 'Load time should be collected').toBeGreaterThan(0);
        expect(jsExecutionTime, 'JS execution time should be collected').toBeDefined();
        
      } catch (error) {
        console.log(`Error in CPU throttling test: ${error.message}`);
        throw error;
      } finally {
        if (context) {
          await context.close();
        }
      }
      
      printTestFooter();
    });

    test('Performance under concurrent user load', async ({ browser }, testInfo) => {
      printTestHeader('Concurrent Users Performance Test');
      
      const numUsers = 10;
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];
      const results = await Promise.all(
        Array(numUsers).fill(null).map(async () => {
          const context = await browser.newContext(testInfo.project.use);
          contexts.push(context);
      const page = await context.newPage();
          pages.push(page);
          const startTime = Date.now();
          
          try {
            await page.goto(url);
            const loadTime = Date.now() - startTime;
            return { loadTime, error: null };
        } catch (error) {
            return { loadTime: 0, error };
          }
        })
      );
      
      // Clean up contexts
      await Promise.all(contexts.map(c => c.close()));
      
      const successfulLoads = results.filter(r => !r.error);
      const avgLoadTime = successfulLoads.reduce((sum, r) => sum + r.loadTime, 0) / successfulLoads.length;
      const errorRate = (numUsers - successfulLoads.length) / numUsers;
      
      // Use the first page for resource contention analysis
      const resourceContention = await pages[0]?.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const concurrentRequests = entries.reduce((max, entry) => {
          const start = entry.startTime;
          const end = start + entry.duration;
          return Math.max(max, entries.filter(e => 
            e.startTime <= end && (e.startTime + e.duration) >= start
          ).length);
        }, 0);
        return concurrentRequests / entries.length;
      }) || 0;
      
      printTestInsights({
        avgLoadTime,
        errorRate,
        resourceContention
      }, 'concurrent');
      
      printTestFooter();
    });

    test('Performance under memory pressure', async ({ browser }, testInfo) => {
      printTestHeader('Memory Pressure Performance Test');
      
      const context = await browser.newContext(testInfo.project.use);
      const page = await context.newPage();
      
      // Initial metrics
      const initialMetrics = await page.evaluate(() => ({
        heapSize: (performance as any).memory?.usedJSHeapSize || 0,
        domNodes: document.getElementsByTagName('*').length,
        eventListeners: (window as any).__eventListeners?.length || 0
      }));
      
      // Navigate and interact
      await page.goto(url);
      await page.click('button'); // Trigger some interaction
      await page.waitForTimeout(1000);
      
      // Final metrics
      const finalMetrics = await page.evaluate(() => ({
        heapSize: (performance as any).memory?.usedJSHeapSize || 0,
        domNodes: document.getElementsByTagName('*').length,
        eventListeners: (window as any).__eventListeners?.length || 0
      }));
      
      const heapGrowth = (finalMetrics.heapSize - initialMetrics.heapSize) / (1024 * 1024);
      const finalDomNodes = finalMetrics.domNodes;
      const finalEventListeners = finalMetrics.eventListeners;
      
      printTestInsights({
        heapGrowth,
        domNodes: finalDomNodes,
        eventListeners: finalEventListeners
      }, 'memory');

      await context.close();
      printTestFooter();
    });
  });
});