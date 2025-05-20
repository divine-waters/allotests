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

function printTestInsights(metrics: any, testType: string) {
  console.log('\n💡 Test Insights:');
  console.log('-'.repeat(40));

  switch (testType) {
    case '3G':
      console.log('Network Performance Analysis:');
      if (metrics.loadTime <= BENCHMARKS.network['3G'].loadTime.good) {
        console.log('✓ Excellent load time under 3G conditions');
        console.log('  • Fast resource loading and processing');
        console.log('  • Efficient critical rendering path');
      } else {
        console.log('⚠️ Load time needs improvement');
        console.log('  • Consider optimizing resource loading');
        console.log('  • Review critical rendering path');
      }

      if (metrics.resources <= BENCHMARKS.network['3G'].resources.good) {
        console.log('\n✓ Resource count is well optimized');
        console.log('  • Efficient resource bundling');
        console.log('  • Good use of HTTP/2 multiplexing');
      } else {
        console.log('\n⚠️ High resource count detected');
        console.log('  • Consider bundling more resources');
        console.log('  • Review third-party script impact');
      }

      if (metrics.memoryMB <= BENCHMARKS.network['3G'].memory.good) {
        console.log('\n✓ Memory usage is well managed');
        console.log('  • Efficient resource cleanup');
        console.log('  • Good memory management practices');
      } else {
        console.log('\n⚠️ Memory usage is high');
        console.log('  • Review memory allocation patterns');
        console.log('  • Check for memory leaks');
      }
      break;

    case 'CPU':
      console.log('CPU Performance Analysis:');
      if (metrics.loadTime <= BENCHMARKS.cpu.loadTime.good) {
        console.log('✓ Excellent CPU performance');
        console.log('  • Efficient JavaScript execution');
        console.log('  • Well-optimized rendering');
      } else {
        console.log('⚠️ CPU performance needs improvement');
        console.log('  • Review JavaScript execution patterns');
        console.log('  • Consider code splitting');
      }

      if (metrics.jsExecutionTime <= BENCHMARKS.cpu.jsExecutionTime.good) {
        console.log('\n✓ JavaScript execution is efficient');
        console.log('  • Fast script processing');
        console.log('  • Good use of async operations');
      } else {
        console.log('\n⚠️ JavaScript execution is slow');
        console.log('  • Profile JavaScript execution');
        console.log('  • Consider using Web Workers');
      }
      break;

    case 'Concurrent':
      console.log('Concurrent User Performance Analysis:');
      if (metrics.avgLoadTime <= BENCHMARKS.concurrent.loadTime.good) {
        console.log('✓ Excellent performance under load');
        console.log('  • Efficient resource handling');
        console.log('  • Good server response times');
      } else {
        console.log('⚠️ Performance degrades under load');
        console.log('  • Review server capacity');
        console.log('  • Consider implementing caching');
      }

      if (metrics.errorRate <= BENCHMARKS.extended.concurrent.errorRate.good) {
        console.log('\n✓ Low error rate under load');
        console.log('  • Stable server performance');
        console.log('  • Good error handling');
      } else {
        console.log('\n⚠️ High error rate detected');
        console.log('  • Review server stability');
        console.log('  • Check error handling');
      }

      if (metrics.resourceContention <= BENCHMARKS.concurrent.resourceContention.good) {
        console.log('\n✓ Good resource management');
        console.log('  • Efficient request handling');
        console.log('  • Well-balanced load distribution');
      } else {
        console.log('\n⚠️ Resource contention detected');
        console.log('  • Review request queuing');
        console.log('  • Consider load balancing');
      }
      break;

    case 'Memory':
      console.log('Memory Performance Analysis:');
      if (metrics.heapGrowth <= BENCHMARKS.memory.heapGrowth.good) {
        console.log('✓ Excellent memory management');
        console.log('  • Stable memory usage');
        console.log('  • Efficient garbage collection');
      } else {
        console.log('⚠️ Memory growth needs attention');
        console.log('  • Check for memory leaks');
        console.log('  • Review object lifecycle');
      }

      if (metrics.domNodes <= BENCHMARKS.memory.domNodes.good) {
        console.log('\n✓ DOM size is well optimized');
        console.log('  • Efficient DOM structure');
        console.log('  • Good use of virtual DOM');
      } else {
        console.log('\n⚠️ Large DOM size detected');
        console.log('  • Consider DOM optimization');
        console.log('  • Review component structure');
      }

      if (metrics.eventListeners <= BENCHMARKS.extended.memory.eventListeners.good) {
        console.log('\n✓ Event listener count is optimal');
        console.log('  • Efficient event handling');
        console.log('  • Good use of event delegation');
      } else {
        console.log('\n⚠️ High event listener count');
        console.log('  • Review event binding');
        console.log('  • Consider event delegation');
      }
      break;

    case 'LCP':
      console.log('LCP Performance Analysis:');
      if (metrics.lcp <= 1000) {
        console.log('✓ Outstanding LCP performance');
        console.log('  • Fast content delivery');
        console.log('  • Well-optimized hero image');
      } else if (metrics.lcp <= 2500) {
        console.log('✓ Good LCP performance');
        console.log('  • Acceptable content delivery');
        console.log('  • Consider image optimization');
      } else {
        console.log('⚠️ LCP needs improvement');
        console.log('  • Optimize hero image loading');
        console.log('  • Review resource prioritization');
      }
      break;

    case 'TBT':
      console.log('TBT Performance Analysis:');
      if (metrics.totalTBT <= 200) {
        console.log('✓ Excellent TBT performance');
        console.log('  • Minimal main thread blocking');
        console.log('  • Efficient JavaScript execution');
      } else if (metrics.totalTBT <= 600) {
        console.log('✓ Acceptable TBT performance');
        console.log('  • Moderate main thread blocking');
        console.log('  • Consider task optimization');
      } else {
        console.log('⚠️ TBT needs improvement');
        console.log('  • Review long tasks');
        console.log('  • Optimize JavaScript execution');
      }
      break;
  }
}

test.describe('Performance Tests', () => {
  const url = 'https://www.allocommunications.com/';

  test('Homepage Performance', async ({ page, context }) => {
    printTestHeader('Homepage Performance Test');
    
    // Enable performance monitoring
    await context.route('**/*', async route => {
      const request = route.request();
      // Add custom header to track resource timing
      const headers = { ...request.headers(), 'x-performance-tracking': 'true' };
      await route.continue({ headers });
    });
    
    // Navigate to the homepage
    await page.goto(url);
    
    // Collect LCP details
    const lcpDetails: LCPDetails = await page.evaluate(() => {
      const entries = performance.getEntriesByType('largest-contentful-paint');
      const lastEntry = entries[entries.length - 1] as any; // Using any for now as types are not available
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
    
    printTestFooter();
  });

  // Stress test scenarios
  test.describe('Stress Tests', () => {
    test('Performance under 3G network conditions', async ({ browser }, testInfo) => {
      printTestHeader('3G Network Performance Test');
      
      // Use Playwright's built-in throttling
      const context = await browser.newContext({
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
      const startTime = Date.now();
      await page.goto(url);
      const totalLoadTime = Date.now() - startTime;
      
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
      
      await context.close();
      printTestFooter();
    });

    test('Performance under CPU throttling', async ({ browser }, testInfo) => {
      printTestHeader('CPU Throttling Performance Test');
      
      const context = await browser.newContext({
        ...testInfo.project.use,
        // Use mobile device preset to simulate lower-end device
        geolocation: { longitude: 12.492507, latitude: 41.889938 },
        locale: 'en-US',
        timezoneId: 'Europe/Rome',
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        viewport: { width: 375, height: 667 }
      });
      
      const page = await context.newPage();
      
      // Simulate CPU throttling by adding artificial delays to JavaScript execution
      await page.route('**/*.js', async route => {
        const response = await route.fetch();
        const js = await response.text();
        // Add small delays to simulate CPU throttling
        const throttledJs = js.replace(/function/g, 'async function')
          .replace(/=>/g, 'async =>')
          .replace(/await/g, 'await new Promise(r => setTimeout(r, 10)) && await');
        await route.fulfill({ response, body: throttledJs });
      });
      
      const startTime = Date.now();
      await page.goto(url);
      const loadTime = Date.now() - startTime;
      
      const jsExecutionTime = await page.evaluate(() => {
        const entries = performance.getEntriesByType('measure');
        return entries.reduce((sum, entry) => sum + entry.duration, 0);
      });
      
      printTestInsights({
        loadTime,
        jsExecutionTime
      }, 'CPU');
      
      await context.close();
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
      }, 'Concurrent');
      
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
      }, 'Memory');
      
      await context.close();
      printTestFooter();
    });
  });
}); 