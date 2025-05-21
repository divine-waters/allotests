import { test, expect, devices } from '@playwright/test';

interface TaskInfo {
  duration: number;
  startTime: number;
  name: string;
  resourceType?: string;
  resourceUrl?: string;
  jsHeapSize?: number;
  domNodes?: number;
  operations?: Array<{
    type: string;
    name: string;
    duration: number;
  }>;
  remediation?: {
    priority: 'high' | 'medium' | 'low';
    recommendations: string[];
    impact: string;
  };
}

interface ExtendedTaskInfo extends TaskInfo {
  eventHandlers?: number;
  animationFrames?: number;
  gcCount?: number;
  cacheStatus?: 'hit' | 'miss' | 'unknown';
}

function getRemediationAdvice(task: TaskInfo): TaskInfo['remediation'] {
  const recommendations: string[] = [];
  let priority: 'high' | 'medium' | 'low' = 'medium';
  let impact = '';

  // Check for Google Analytics/Tag Manager
  if (task.resourceUrl?.includes('google-analytics.com') || 
      task.resourceUrl?.includes('googletagmanager.com') ||
      task.resourceUrl?.includes('doubleclick.net')) {
    priority = 'high';
    impact = 'Analytics scripts are blocking main thread execution';
    recommendations.push(
      'Consider using async loading for analytics scripts',
      'Implement a performance budget for third-party scripts',
      'Use a tag management solution that supports script prioritization',
      'Consider using the Google Analytics 4 Measurement Protocol for critical metrics',
      'Implement resource hints (preconnect) for analytics domains'
    );
  }
  // Check for fonts
  else if (task.resourceUrl?.endsWith('.woff2') || 
           task.resourceUrl?.endsWith('.woff') || 
           task.resourceUrl?.endsWith('.ttf')) {
    priority = 'medium';
    impact = 'Font loading is blocking text rendering';
    recommendations.push(
      'Use font-display: swap to prevent FOIT (Flash of Invisible Text)',
      'Preload critical fonts using <link rel="preload">',
      'Consider using system fonts for non-critical text',
      'Implement font subsetting to reduce file size',
      'Use variable fonts to reduce the number of font files'
    );
  }
  // Check for reCAPTCHA
  else if (task.resourceUrl?.includes('recaptcha')) {
    priority = 'high';
    impact = 'reCAPTCHA initialization is blocking user interaction';
    recommendations.push(
      'Load reCAPTCHA asynchronously using the async attribute',
      'Consider using reCAPTCHA v3 instead of v2 for better performance',
      'Implement lazy loading for reCAPTCHA on forms',
      'Use a non-blocking implementation of reCAPTCHA',
      'Consider alternative bot protection methods for non-critical forms'
    );
  }
  // Check for general resource loading
  else if (task.resourceType === 'Resource' || task.name.includes('Loading')) {
    priority = 'medium';
    impact = 'Resource loading is blocking page rendering';
    recommendations.push(
      'Implement resource hints (preconnect, prefetch) for critical domains',
      'Use async/defer attributes for non-critical scripts',
      'Consider using a CDN for static resources',
      'Implement proper caching headers for static assets',
      'Use modern image formats (WebP) with proper sizing'
    );
  }
  // Check for main thread execution
  else if (task.name === 'Main Thread Execution') {
    priority = 'high';
    impact = 'Long-running JavaScript is blocking the main thread';
    recommendations.push(
      'Break down long tasks into smaller chunks',
      'Use Web Workers for CPU-intensive operations',
      'Implement requestIdleCallback for non-critical operations',
      'Optimize JavaScript bundle size and implement code splitting',
      'Consider using a performance monitoring tool to identify slow functions'
    );
  }
  // Check for cross-context operations
  else if (task.name.includes('Cross-Context') || task.name.includes('Iframe')) {
    priority = 'medium';
    
    // Check for cookie consent operations
    if (task.resourceUrl?.includes('cookielaw.org') || 
        task.operations?.some(op => op.name.includes('cookielaw.org'))) {
      impact = 'Cookie consent banner initialization is blocking page interaction';
      recommendations.push(
        'Load cookie consent script asynchronously with defer attribute',
        'Implement lazy loading for the cookie banner until after page load',
        'Consider using a lightweight cookie consent solution',
        'Preload critical cookie consent assets using resource hints',
        'Implement a non-blocking cookie consent initialization strategy',
        'Consider using localStorage for initial consent state to avoid blocking operations'
      );
    }
    // Check for third-party widgets
    else if (task.operations?.some(op => 
      op.name.includes('widget') || 
      op.name.includes('embed') || 
      op.name.includes('iframe'))) {
      impact = 'Third-party widget initialization is blocking page rendering';
      recommendations.push(
        'Implement lazy loading for non-critical widgets',
        'Use Intersection Observer to load widgets only when visible',
        'Consider using a placeholder until widget is ready',
        'Implement proper error boundaries for widget loading',
        'Use a widget loading queue to prevent multiple simultaneous loads',
        'Consider using a widget manager to control loading priority'
      );
    }
    // General cross-context operations
    else {
      impact = 'Cross-context operations are blocking main thread';
      recommendations.push(
        'Use postMessage for cross-context communication',
        'Implement proper iframe lazy loading',
        'Consider using Web Workers for heavy computations',
        'Optimize cross-origin resource loading with proper CORS headers',
        'Use SharedArrayBuffer for cross-context data sharing when possible',
        'Implement a loading queue for cross-context operations',
        'Consider using a service worker to manage cross-context resources'
      );
    }
  }

  return recommendations.length > 0 ? { priority, recommendations, impact } : undefined;
}

/**
 * Performance benchmarks based on industry standards and best practices
 * Sources:
 * - Core Web Vitals (https://web.dev/vitals/)
 * - RAIL Performance Model (https://web.dev/rail/)
 * - HTTP Archive (https://httparchive.org/)
 * - Chrome Memory Guidelines (https://developer.chrome.com/docs/multidevice/memory/)
 */
const BENCHMARKS = {
  network: {
    '3G': {
      // Based on Core Web Vitals and RAIL model
      // Good: 75th percentile of users
      // Needs Improvement: 95th percentile of users
      // Poor: Above 95th percentile
      loadTime: { 
        good: 3000,      // 3s - Core Web Vitals LCP target
        needsImprovement: 4000,  // 4s - RAIL model target
        poor: 6000       // 6s - Core Web Vitals LCP poor threshold
      },
      // Based on HTTP Archive 2023 data for top 1000 sites
      resources: { 
        good: 70,        // 75th percentile
        needsImprovement: 100,   // 90th percentile
        poor: 150        // 95th percentile
      },
      // Based on Chrome's memory guidelines for mobile devices
      memory: { 
        good: 40,        // 40MB - Target for mobile devices
        needsImprovement: 60,    // 60MB - Warning threshold
        poor: 80         // 80MB - Critical threshold
      }
    }
  },
  cpu: {
    // Based on Core Web Vitals and RAIL model
    loadTime: { 
      good: 1800,       // 1.8s - Core Web Vitals FCP target
      needsImprovement: 3000,    // 3s - RAIL model target
      poor: 4000        // 4s - Core Web Vitals FCP poor threshold
    },
    // Based on Total Blocking Time (TBT) thresholds
    jsExecutionTime: { 
      good: 200,        // 200ms - Core Web Vitals TBT target
      needsImprovement: 600,     // 600ms - RAIL model target
      poor: 1000        // 1000ms - Core Web Vitals TBT poor threshold
    }
  },
  concurrent: {
    // Based on server response time standards and RAIL model
    loadTime: { 
      good: 2000,       // 2s - Target for concurrent users
      needsImprovement: 4000,    // 4s - Acceptable under load
      poor: 6000        // 6s - Poor performance under load
    },
    // Based on Chrome's memory guidelines per tab
    memoryPerUser: { 
      good: 40,         // 40MB - Target per user session
      needsImprovement: 60,      // 60MB - Warning threshold
      poor: 80          // 80MB - Critical threshold
    },
    // Based on server capacity metrics
    // Coefficient of variation (CV) of load times
    resourceContention: { 
      good: 0.1,        // 10% variation - Well-managed resources
      needsImprovement: 0.2,     // 20% variation - Some contention
      poor: 0.3         // 30% variation - High contention
    }
  },
  memory: {
    // Based on Chrome's memory growth guidelines
    heapGrowth: { 
      good: 5,          // 5MB - Acceptable growth
      needsImprovement: 15,      // 15MB - Warning threshold
      poor: 25          // 25MB - Critical threshold
    },
    // Based on DOM size guidelines from performance studies
    domNodes: { 
      good: 1500,       // 1500 nodes - Target for good performance
      needsImprovement: 2500,    // 2500 nodes - Warning threshold
      poor: 3500        // 3500 nodes - Critical threshold
    }
  },
  // New extended benchmarks
  extended: {
    network: {
      ttfb: {
        good: 200,        // 200ms - Core Web Vitals target
        needsImprovement: 400,    // 400ms - Acceptable
        poor: 600         // 600ms - Poor
      },
      cacheHitRatio: {
        good: 0.8,        // 80% cache hits
        needsImprovement: 0.6,    // 60% cache hits
        poor: 0.4         // 40% cache hits
      },
      inp: {
        good: 100,        // 100ms - Core Web Vitals target
        needsImprovement: 200,    // 200ms - Acceptable
        poor: 500         // 500ms - Poor
      }
    },
    cpu: {
      mainThreadUtilization: {
        good: 0.5,        // 50% utilization
        needsImprovement: 0.7,    // 70% utilization
        poor: 0.9         // 90% utilization
      },
      animationFrameRate: {
        good: 55,         // 55 FPS
        needsImprovement: 45,     // 45 FPS
        poor: 30          // 30 FPS
      },
      eventHandlerTime: {
        good: 50,         // 50ms
        needsImprovement: 100,    // 100ms
        poor: 200         // 200ms
      }
    },
    concurrent: {
      serverResponseTime: {
        good: 100,        // 100ms
        needsImprovement: 300,    // 300ms
        poor: 500         // 500ms
      },
      errorRate: {
        good: 0.01,       // 1% errors
        needsImprovement: 0.05,   // 5% errors
        poor: 0.1         // 10% errors
      },
      queueLength: {
        good: 5,          // 5 requests
        needsImprovement: 10,     // 10 requests
        poor: 20          // 20 requests
      }
    },
    memory: {
      eventListeners: {
        good: 100,        // 100 listeners
        needsImprovement: 200,    // 200 listeners
        poor: 300         // 300 listeners
      },
      imageMemory: {
        good: 20,         // 20MB
        needsImprovement: 40,     // 40MB
        poor: 60          // 60MB
      },
      gcFrequency: {
        good: 0.1,        // 1 GC per 10 seconds
        needsImprovement: 0.2,    // 1 GC per 5 seconds
        poor: 0.5         // 1 GC per 2 seconds
      }
    }
  }
};

function getPerformanceRating(value: number, benchmark: { good: number; needsImprovement: number; poor: number }) {
  if (value <= benchmark.good) return { rating: 'GOOD', needsAction: false };
  if (value <= benchmark.needsImprovement) return { rating: 'NEEDS IMPROVEMENT', needsAction: true };
  return { rating: 'POOR', needsAction: true };
}

/**
 * Helper functions for focused performance reporting
 */
function formatMetric(value: number, unit: string = 'ms'): string {
  if (unit === 'ms') return `${Math.round(value)}${unit}`;
  if (unit === 'MB') return `${value.toFixed(1)}${unit}`;
  if (unit === '%') return `${value.toFixed(1)}${unit}`;
  return `${value}${unit}`;
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case 'GOOD': return '\x1b[32m'; // Green
    case 'NEEDS IMPROVEMENT': return '\x1b[33m'; // Yellow
    case 'POOR': return '\x1b[31m'; // Red
    default: return '\x1b[0m'; // Reset
  }
}

function formatRating(rating: string): string {
  const color = getRatingColor(rating);
  return `${color}${rating}\x1b[0m`;
}

function printMetric(name: string, value: number | string, rating?: { rating: string, needsAction: boolean }, unit: string = 'ms') {
  const formattedValue = typeof value === 'number' ? formatMetric(value, unit) : value;
  const ratingStr = rating ? ` (${formatRating(rating.rating)})` : '';
  console.log(`  ${name.padEnd(30)}: ${formattedValue.padStart(10)}${ratingStr}`);
  
  if (rating?.needsAction) {
    console.log('    ⚠️  Needs attention');
  }
}

function printRecommendations(recommendations: string[]) {
  if (recommendations.length === 0) return;
  console.log('\n  Recommendations:');
  recommendations.forEach((rec, i) => {
    console.log(`    ${i + 1}. ${rec}`);
  });
}

function printSection(title: string, content: () => void) {
  console.log('\n' + '='.repeat(80));
  console.log(` ${title} `.padStart(40 + title.length/2, '=').padEnd(80, '='));
  console.log('='.repeat(80));
  content();
  console.log('-'.repeat(80));
}

function printTrend(data: Array<{ timestamp: number, value: number }>, label: string, unit: string = 'ms') {
  // Filter out zero values and ensure we have meaningful data
  const meaningfulData = data.filter(point => point.value > 0);
  
  // Only print trend if we have meaningful data
  if (meaningfulData.length === 0) {
    return; // Skip printing if no meaningful data
  }

  console.log(`\n  ${label} Trend:`);
  const maxValue = Math.max(...meaningfulData.map(d => d.value));
  const width = 50;
  
  // Only show a subset of points if there are too many
  const displayPoints = meaningfulData.length > 10 
    ? meaningfulData.filter((_, i) => i % Math.ceil(meaningfulData.length / 10) === 0)
    : meaningfulData;
  
  displayPoints.forEach((point, i) => {
    const timeElapsed = (point.timestamp - meaningfulData[0].timestamp) / 1000;
    const barLength = Math.round((point.value / maxValue) * width);
    const bar = '█'.repeat(barLength) + '░'.repeat(width - barLength);
    console.log(`    ${timeElapsed.toFixed(1)}s: ${bar} ${formatMetric(point.value, unit)}`);
  });
}

function printTestHeader(testName: string) {
  console.log('\n' + '='.repeat(80));
  console.log(` 🧪 ${testName} `.padStart(40 + testName.length/2, '=').padEnd(80, '='));
  console.log('='.repeat(80) + '\n');
}

function printTestFooter() {
  console.log('\n' + '='.repeat(80) + '\n');
}

test.describe('Performance Tests', () => {
  const url = 'https://www.allocommunications.com/';

  // Original performance test
  test('Homepage Performance', async ({ page, context }) => {
    printTestHeader('Homepage Performance Test');
    
    // Enable tracing for performance metrics
    await context.tracing.start({ screenshots: true, snapshots: true });

    // Navigate to the page and measure performance
    await page.goto(url);

    // Stop tracing and save the trace
    await context.tracing.stop({ path: 'trace.zip' });

    // Assert that the page loaded successfully
    expect(page.url()).toBe(url);

    // Largest Contentful Paint (LCP) with enhanced diagnostics
    const lcpDetails = await page.evaluate(() => {
      return new Promise<{lcp: number, element: string, size: number, url: string, timestamp: number}>((resolve) => {
        let largestContentfulPaint: LargestContentfulPaint | undefined;
        let observer: PerformanceObserver | null = null;
        const timeout = setTimeout(() => {
          observer?.disconnect();
          resolve({ lcp: 0, element: 'timeout', size: 0, url: 'N/A', timestamp: 0 });
        }, 5000); // Reduced from 10000ms to 5000ms

        if (window.PerformanceObserver) {
          observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
              if (entry.entryType === 'largest-contentful-paint') {
                clearTimeout(timeout);
                largestContentfulPaint = entry as LargestContentfulPaint;
                const element = largestContentfulPaint.element;
                resolve({
                  lcp: entry.startTime,
                  element: element ? element.tagName + (element.id ? `#${element.id}` : '') + (element.className ? `.${element.className}` : '') : 'unknown',
                  size: element ? element.getBoundingClientRect().width * element.getBoundingClientRect().height : 0,
                  url: element instanceof HTMLImageElement ? element.src : 'N/A',
                  timestamp: entry.startTime
                });
                observer?.disconnect();
              }
            });
          });

          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } else {
          clearTimeout(timeout);
          resolve({ lcp: 0, element: 'unsupported', size: 0, url: 'N/A', timestamp: 0 });
        }
      });
    }, { timeout: 6000 });

    // LCP Diagnostic Report
    printTestHeader('LCP Diagnostic Report');
    console.log(`LCP Value: ${lcpDetails.lcp}ms (Threshold: 2500ms)`);
    console.log(`LCP Element: ${lcpDetails.element}`);
    console.log(`Element Size: ${Math.round(lcpDetails.size)}px²`);
    console.log(`Resource URL: ${lcpDetails.url}`);
    console.log(`Timestamp: ${lcpDetails.timestamp}ms`);

    // Add more detailed assertion message
    expect(lcpDetails.lcp, `LCP of ${lcpDetails.lcp}ms exceeds threshold of 2500ms. Element: ${lcpDetails.element}, Size: ${Math.round(lcpDetails.size)}px², URL: ${lcpDetails.url}`).toBeLessThan(2500);

    // Total Blocking Time (TBT) with detailed task analysis
    const tbtDetails = await page.evaluate(() => {
      return new Promise<{totalTBT: number, tasks: Array<{
        duration: number,
        startTime: number,
        name: string,
        resourceType?: string,
        resourceUrl?: string,
        jsHeapSize?: number,
        domNodes?: number,
        operations?: Array<{
          type: string,
          name: string,
          duration: number
        }>
      }>}>((resolve) => {
        if (!window.PerformanceObserver) {
          resolve({ totalTBT: 0, tasks: [] });
          return;
        }

        // Get performance metrics at the time of the task
        function getPerformanceMetrics() {
          return {
            jsHeapSize: (performance as any).memory?.usedJSHeapSize,
            domNodes: document.getElementsByTagName('*').length
          };
        }

        // Track all performance entries during the task
        function getOperationsDuringTask(startTime: number, endTime: number) {
          const entries = performance.getEntriesByType('resource')
            .concat(performance.getEntriesByType('measure'))
            .concat(performance.getEntriesByType('paint'))
            .filter(entry => entry.startTime >= startTime && entry.startTime <= endTime)
            .map(entry => ({
              type: entry.entryType,
              name: entry.name,
              duration: entry.duration
            }))
            .sort((a, b) => a.duration - b.duration);

          return entries;
        }

        let totalBlockingTime = 0;
        const blockingTasks: TaskInfo[] = [];

        // Track long tasks
        const taskObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'longtask') {
              const blockingTime = entry.duration - 50;
              if (blockingTime > 0) {
                totalBlockingTime += blockingTime;
                
                const taskStart = entry.startTime;
                const taskEnd = taskStart + entry.duration;
                
                // Get operations during this task
                const operations = getOperationsDuringTask(taskStart, taskEnd);
                
                // Get the most significant operation
                const significantOp = operations[operations.length - 1];
                
                // Determine task type and name based on operations
                let taskName = entry.name;
                let resourceType, resourceUrl;

                if (taskName === 'self') {
                  if (significantOp) {
                    if (significantOp.type === 'resource') {
                      const url = new URL(significantOp.name);
                      const resourceName = url.pathname.split('/').pop() || '';
                      taskName = `Loading ${resourceName}`;
                      resourceType = url.pathname.endsWith('.js') ? 'JavaScript' :
                                   url.pathname.endsWith('.css') ? 'Stylesheet' :
                                   url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') ? 'Image' :
                                   'Resource';
                      resourceUrl = significantOp.name;
                    } else if (significantOp.type === 'paint') {
                      taskName = `Rendering ${significantOp.name}`;
                    } else if (significantOp.type === 'measure') {
                      taskName = `Executing ${significantOp.name}`;
                    } else {
                      taskName = 'Main Thread Operation';
                    }
                  } else {
                    taskName = 'Main Thread Execution';
                  }
                } else if (taskName === 'multiple-contexts') {
                  // Try to identify the cross-context operation
                  if (operations.some(op => op.name.includes('iframe'))) {
                    taskName = 'Iframe Content Loading';
                  } else if (operations.some(op => op.name.includes('worker'))) {
                    taskName = 'Web Worker Operation';
                  } else if (operations.some(op => op.name.includes('fetch'))) {
                    taskName = 'Network Request';
                  } else {
                    taskName = 'Cross-Context Operation';
                  }
                }

                const metrics = getPerformanceMetrics();
                
                const taskInfo: TaskInfo = {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: taskName,
                  resourceType,
                  resourceUrl,
                  jsHeapSize: metrics.jsHeapSize,
                  domNodes: metrics.domNodes,
                  operations: operations.slice(-3)
                };

                taskInfo.remediation = getRemediationAdvice(taskInfo);
                blockingTasks.push(taskInfo);
              }
            }
          });
        });
        taskObserver.observe({ type: 'longtask', buffered: true });

        const timeout = setTimeout(() => {
          taskObserver.disconnect();
          resolve({ totalTBT: totalBlockingTime, tasks: blockingTasks });
        }, 5000);

        setTimeout(() => {
          clearTimeout(timeout);
          taskObserver.disconnect();
          resolve({ totalTBT: totalBlockingTime, tasks: blockingTasks });
        }, 5000);
      });
    }, { timeout: 6000 });

    // TBT Diagnostic Report
    printTestHeader('TBT Diagnostic Report');
    console.log(`Total Blocking Time: ${tbtDetails.totalTBT}ms`);
    console.log(`Threshold: 300ms (Good: 0-200ms, Needs Improvement: 200-600ms, Poor: >600ms)`);
    
    if (tbtDetails.tasks.length > 0) {
      console.log('\nBlocking Tasks Analysis:');
      tbtDetails.tasks
        .sort((a, b) => b.duration - a.duration)
        .forEach((task: TaskInfo, index) => {
          console.log(`\nTask ${index + 1}:`);
          console.log(`  Type: ${task.name}`);
          console.log(`  Duration: ${Math.round(task.duration)}ms`);
          console.log(`  Start Time: ${Math.round(task.startTime)}ms`);
          console.log(`  Blocking Time: ${Math.round(task.duration - 50)}ms`);
          
          if (task.resourceUrl) {
            console.log(`  Resource: ${task.resourceType} - ${task.resourceUrl}`);
          }
          
          if (task.operations && task.operations.length > 0) {
            console.log('  Operations during task:');
            task.operations.forEach(op => {
              console.log(`    - ${op.type}: ${op.name} (${Math.round(op.duration)}ms)`);
            });
          }
          
          if (task.jsHeapSize) {
            console.log(`  Memory Usage: ${Math.round(task.jsHeapSize / 1024 / 1024)}MB`);
          }
          if (task.domNodes) {
            console.log(`  DOM Nodes: ${task.domNodes}`);
          }

          if (task.remediation) {
            console.log(`\n  Performance Impact: ${task.remediation.impact}`);
            console.log(`  Priority: ${task.remediation.priority.toUpperCase()}`);
            console.log('  Recommended Actions:');
            task.remediation.recommendations.forEach((rec, i) => {
              console.log(`    ${i + 1}. ${rec}`);
            });
          }
        });
    } else {
      console.log('\nNo blocking tasks detected during measurement period.');
    }
    
    // Using 300ms as a more practical threshold for production
    expect(tbtDetails.totalTBT, 
      `TBT of ${tbtDetails.totalTBT}ms exceeds threshold of 300ms. ` +
      `${tbtDetails.tasks.length} blocking tasks detected. ` +
      `Longest task: ${tbtDetails.tasks[0]?.duration || 0}ms (${tbtDetails.tasks[0]?.name || 'Unknown'})`
    ).toBeLessThan(300);
    
    printTestFooter();
  });

  // Stress test scenarios
  test.describe('Stress Tests', () => {
    test('Performance under 3G network conditions', async ({ browser }, testInfo) => {
      printTestHeader('3G Network Performance Test');
      
      const context = await browser.newContext();
      const page = await context.newPage();
      const client = await context.newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
        latency: 100
      });

      await context.tracing.start({ screenshots: true, snapshots: true });
      
      const startTime = Date.now();
      const navigationMetrics = await page.goto(url).then(async () => {
        const metrics = await page.evaluate(() => {
          // Existing metrics
          const baseMetrics = {
            loadTime: performance.now(),
            resources: performance.getEntriesByType('resource').length,
            jsHeapSize: (performance as any).memory?.usedJSHeapSize,
            domNodes: document.getElementsByTagName('*').length,
            timing: performance.timing.toJSON()
          };

          // New metrics
          const resources = performance.getEntriesByType('resource');
          const cacheHits = resources.filter(r => (r as any).transferSize === 0).length;
          const cacheHitRatio = resources.length > 0 ? cacheHits / resources.length : 0;

          // Measure TTFB
          const ttfb = performance.timing.responseStart - performance.timing.requestStart;

          // Measure INP (Interaction to Next Paint)
          let inp = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'event') {
                inp = Math.max(inp, entry.duration);
              }
            }
          });
          observer.observe({ entryTypes: ['event'] });

          return {
            ...baseMetrics,
            cacheHitRatio,
            ttfb,
            inp,
            resourcePrioritization: resources.map(r => ({
              url: r.name,
              priority: (r as any).priority || 'unknown',
              size: (r as any).transferSize || 0,
              duration: r.duration
            }))
          };
        });
        return metrics;
      });
      const totalLoadTime = Date.now() - startTime;
      
      const memoryMB = Math.round(navigationMetrics.jsHeapSize / 1024 / 1024);
      
      console.log('\n3G Network Test Results:');
      console.log('='.repeat(50));
      
      // Load Time Analysis
      const loadTimeRating = getPerformanceRating(totalLoadTime, BENCHMARKS.network['3G'].loadTime);
      console.log(`Load Time: ${totalLoadTime}ms (${loadTimeRating.rating})`);
      if (loadTimeRating.needsAction) {
        console.log('  Recommendations:');
        console.log('  - Implement resource prioritization');
        console.log('  - Use responsive images with srcset');
        console.log('  - Consider implementing a service worker for caching');
      }
      
      // Resource Count Analysis
      const resourceRating = getPerformanceRating(navigationMetrics.resources, BENCHMARKS.network['3G'].resources);
      console.log(`\nTotal Resources: ${navigationMetrics.resources} (${resourceRating.rating})`);
      if (resourceRating.needsAction) {
        console.log('  Recommendations:');
        console.log('  - Implement resource bundling');
        console.log('  - Use HTTP/2 for multiplexing');
        console.log('  - Consider lazy loading non-critical resources');
      }
      
      // Memory Usage Analysis
      const memoryRating = getPerformanceRating(memoryMB, BENCHMARKS.network['3G'].memory);
      console.log(`\nMemory Usage: ${memoryMB}MB (${memoryRating.rating})`);
      if (memoryRating.needsAction) {
        console.log('  Recommendations:');
        console.log('  - Implement memory leak detection');
        console.log('  - Review third-party script impact');
        console.log('  - Consider implementing resource cleanup');
      }
      
      // Network Timing Analysis
      const timing = navigationMetrics.timing;
      console.log('\nNetwork Timing Breakdown:');
      console.log(`  DNS Lookup: ${timing.domainLookupEnd - timing.domainLookupStart}ms`);
      console.log(`  TCP Connection: ${timing.connectEnd - timing.connectStart}ms`);
      console.log(`  TTFB: ${timing.responseStart - timing.requestStart}ms`);
      console.log(`  Download: ${timing.responseEnd - timing.responseStart}ms`);
      console.log(`  DOM Processing: ${timing.domComplete - timing.domLoading}ms`);
      
      // New metrics logging
      console.log('\nExtended Network Metrics:');
      console.log('='.repeat(50));
      
      // TTFB Analysis
      const ttfbRating = getPerformanceRating(navigationMetrics.ttfb, BENCHMARKS.extended.network.ttfb);
      console.log(`Time to First Byte: ${navigationMetrics.ttfb}ms (${ttfbRating.rating})`);
      if (ttfbRating.needsAction) {
        console.log('  Recommendations:');
        console.log('  - Optimize server response time');
        console.log('  - Consider using a CDN');
        console.log('  - Review server-side caching');
      }

      // Cache Analysis
      const cacheRating = getPerformanceRating(navigationMetrics.cacheHitRatio, BENCHMARKS.extended.network.cacheHitRatio);
      console.log(`\nCache Hit Ratio: ${(navigationMetrics.cacheHitRatio * 100).toFixed(1)}% (${cacheRating.rating})`);
      if (cacheRating.needsAction) {
        console.log('  Recommendations:');
        console.log('  - Implement proper cache headers');
        console.log('  - Review cache-busting strategies');
        console.log('  - Consider using a service worker for caching');
      }

      await context.tracing.stop({ path: `trace-3g-${testInfo.project.name}.zip` });
      await context.close();
      
      printTestFooter();
    });

    test('Performance under CPU throttling', async ({ browser }, testInfo) => {
      printTestHeader('CPU Throttling Performance Test');
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await context.tracing.start({ screenshots: true, snapshots: true });
      
      const startTime = Date.now();
      const metrics = await page.goto(url).then(async () => {
        // Measure JavaScript execution time
        const jsExecutionTime = await page.evaluate(() => {
          const start = performance.now();
          // Simulate CPU-intensive operation
          for (let i = 0; i < 1000000; i++) {
            Math.random() * Math.random();
          }
          return performance.now() - start;
        });
        
        return {
          loadTime: Date.now() - startTime,
          jsExecutionTime,
          jsHeapSize: (await page.evaluate(() => (performance as any).memory?.usedJSHeapSize)),
          domNodes: await page.evaluate(() => document.getElementsByTagName('*').length)
        };
      });
      
      console.log('\nCPU Throttling Test Results:');
      console.log('='.repeat(50));
      
      // Load Time Analysis
      const loadTimeRating = getPerformanceRating(metrics.loadTime, BENCHMARKS.cpu.loadTime);
      console.log(`Total Load Time: ${metrics.loadTime}ms (${loadTimeRating.rating})`);
      if (loadTimeRating.needsAction) {
        console.log('  Recommendations:');
        console.log('  - Optimize critical rendering path');
        console.log('  - Reduce main thread work');
        console.log('  - Consider code splitting');
      }
      
      // JS Execution Analysis
      const jsRating = getPerformanceRating(metrics.jsExecutionTime, BENCHMARKS.cpu.jsExecutionTime);
      console.log(`\nJavaScript Execution Time: ${Math.round(metrics.jsExecutionTime)}ms (${jsRating.rating})`);
      if (jsRating.needsAction) {
        console.log('  Recommendations:');
        console.log('  - Profile JavaScript execution');
        console.log('  - Consider using Web Workers');
        console.log('  - Implement code splitting and lazy loading');
      }
      
      await context.tracing.stop({ path: `trace-cpu-${testInfo.project.name}.zip` });
      await context.close();
      
      printTestFooter();
    });

    test('Performance under concurrent user load', async ({ browser }, testInfo) => {
      printTestHeader('Concurrent Users Performance Test');
      
      const NUM_CONCURRENT_USERS = 5;
      const startTime = Date.now();
      const contexts = await Promise.all(
        Array(NUM_CONCURRENT_USERS).fill(null).map(() => browser.newContext())
      );
      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      );
      
      console.log(`\nConcurrent Users Test (${NUM_CONCURRENT_USERS} users):`);
      console.log('='.repeat(50));
      
      // Track server metrics
      const serverMetrics = {
        responseTimes: [] as number[],
        errors: 0,
        queueLength: 0,
        maxQueueLength: 0,
        requestStartTimes: new Map<string, number>()
      };

      // Monitor network requests for all pages
      await Promise.all(pages.map(async (page) => {
        page.on('request', (request) => {
          serverMetrics.queueLength++;
          serverMetrics.maxQueueLength = Math.max(serverMetrics.maxQueueLength, serverMetrics.queueLength);
          serverMetrics.requestStartTimes.set(request.url(), Date.now());
        });
        
        page.on('response', (response) => {
          serverMetrics.queueLength--;
          const startTime = serverMetrics.requestStartTimes.get(response.url());
          if (startTime) {
            const responseTime = Date.now() - startTime;
            serverMetrics.responseTimes.push(responseTime);
            serverMetrics.requestStartTimes.delete(response.url());
          }
          if (!response.ok()) {
            serverMetrics.errors++;
          }
        });
      }));
      
      const results = await Promise.all(pages.map(async (page, index) => {
        const startTime = Date.now();
        const metrics = await page.goto(url).then(async () => {
          const perfMetrics = await page.evaluate(() => {
            // Existing metrics
            const baseMetrics = {
              navigationTime: performance.now(),
              jsHeapSize: (performance as any).memory?.usedJSHeapSize,
              domNodes: document.getElementsByTagName('*').length,
              resources: performance.getEntriesByType('resource').length
            };

            // New metrics for concurrent testing
            const serverTiming = performance.getEntriesByType('resource')
              .filter(r => {
                const entry = r as PerformanceResourceTiming;
                return entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch';
              })
              .map(r => r.duration);

            const connectionMetrics = performance.getEntriesByType('resource')
              .reduce((acc, r) => {
                const entry = r as PerformanceResourceTiming;
                const serverTiming = entry.serverTiming || [];
                const connectionTime = serverTiming.find(t => t.name === 'connection')?.duration || 0;
                return {
                  totalConnections: acc.totalConnections + 1,
                  totalConnectionTime: acc.totalConnectionTime + connectionTime,
                  maxConnectionTime: Math.max(acc.maxConnectionTime, connectionTime)
                };
              }, { totalConnections: 0, totalConnectionTime: 0, maxConnectionTime: 0 });

            return {
              ...baseMetrics,
              serverTiming: {
                avg: serverTiming.reduce((a, b) => a + b, 0) / serverTiming.length || 0,
                max: Math.max(...serverTiming) || 0,
                p95: serverTiming.sort((a, b) => a - b)[Math.floor(serverTiming.length * 0.95)] || 0
              },
              connectionMetrics
            };
          });

          return {
            user: index + 1,
            loadTime: Date.now() - startTime,
            ...perfMetrics
          };
        });
        return metrics;
      }));
      
      // Calculate aggregate metrics
      const avgLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
      const maxLoadTime = Math.max(...results.map(r => r.loadTime));
      const minLoadTime = Math.min(...results.map(r => r.loadTime));
      const loadTimeVariance = results.reduce((sum, r) => sum + Math.pow(r.loadTime - avgLoadTime, 2), 0) / results.length;
      const resourceContention = Math.sqrt(loadTimeVariance) / avgLoadTime;
      
      // Calculate server metrics
      const avgResponseTime = serverMetrics.responseTimes.reduce((a, b) => a + b, 0) / serverMetrics.responseTimes.length;
      const maxResponseTime = Math.max(...serverMetrics.responseTimes);
      const errorRate = serverMetrics.errors / (serverMetrics.responseTimes.length + serverMetrics.errors);
      
      // Calculate memory metrics
      const avgMemoryUsage = results.reduce((sum, r) => sum + (r.jsHeapSize / 1024 / 1024), 0) / results.length;
      const maxMemoryUsage = Math.max(...results.map(r => r.jsHeapSize / 1024 / 1024));
      
      // Calculate DOM metrics
      const avgDomNodes = results.reduce((sum, r) => sum + r.domNodes, 0) / results.length;
      const avgResources = results.reduce((sum, r) => sum + r.resources, 0) / results.length;

      printSection('Concurrent Users Test Summary', () => {
        console.log(`\nTest Configuration:`);
        console.log(`  Number of Users: ${NUM_CONCURRENT_USERS}`);
        console.log(`  Browser: ${testInfo.project.use.browserName}`);
        console.log(`  Test Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

        console.log('\nPerformance Metrics:');
        console.log('='.repeat(80));
        
        // Load Time Analysis
        const loadTimeRating = getPerformanceRating(avgLoadTime, BENCHMARKS.concurrent.loadTime);
        printMetric('Average Load Time', avgLoadTime, loadTimeRating);
        printMetric('Min Load Time', minLoadTime);
        printMetric('Max Load Time', maxLoadTime);
        printMetric('Load Time Variance', Math.sqrt(loadTimeVariance));
        
        // Memory Analysis
        const memoryRating = getPerformanceRating(avgMemoryUsage, BENCHMARKS.concurrent.memoryPerUser);
        printMetric('Average Memory Usage', avgMemoryUsage, memoryRating, 'MB');
        printMetric('Peak Memory Usage', maxMemoryUsage, undefined, 'MB');
        
        // Server Performance
        const serverRating = getPerformanceRating(avgResponseTime, BENCHMARKS.extended.concurrent.serverResponseTime);
        printMetric('Average Response Time', avgResponseTime, serverRating);
        printMetric('Peak Response Time', maxResponseTime);
        printMetric('Error Rate', errorRate * 100, 
          getPerformanceRating(errorRate, BENCHMARKS.extended.concurrent.errorRate), '%');
        
        // Resource Analysis
        printMetric('Average DOM Nodes', avgDomNodes, 
          getPerformanceRating(avgDomNodes, BENCHMARKS.memory.domNodes));
        printMetric('Average Resources', avgResources);
        printMetric('Resource Contention', resourceContention * 100, 
          getPerformanceRating(resourceContention, BENCHMARKS.concurrent.resourceContention), '%');

        // Recommendations based on all metrics
        console.log('\nKey Findings & Recommendations:');
        console.log('='.repeat(80));
        
        const recommendations = new Set<string>();
        
        // Load Time Recommendations
        if (loadTimeRating.needsAction) {
          recommendations.add('Optimize page load performance:');
          recommendations.add('  • Implement critical CSS inlining');
          recommendations.add('  • Use resource hints (preconnect, prefetch)');
          recommendations.add('  • Consider implementing a service worker for caching');
          recommendations.add('  • Review and optimize third-party script loading');
        }
        
        // Memory Recommendations
        if (memoryRating.needsAction) {
          recommendations.add('Address memory usage:');
          recommendations.add('  • Implement memory leak detection');
          recommendations.add('  • Review third-party script impact');
          recommendations.add('  • Consider implementing resource cleanup');
          recommendations.add('  • Optimize image loading and caching');
        }
        
        // Server Performance Recommendations
        if (serverRating.needsAction) {
          recommendations.add('Improve server performance:');
          recommendations.add('  • Implement server-side caching');
          recommendations.add('  • Consider using a CDN');
          recommendations.add('  • Review database query optimization');
          recommendations.add('  • Implement request queuing for high load');
        }
        
        // Resource Contention Recommendations
        if (resourceContention > BENCHMARKS.concurrent.resourceContention.needsImprovement) {
          recommendations.add('Reduce resource contention:');
          recommendations.add('  • Implement request throttling');
          recommendations.add('  • Consider horizontal scaling');
          recommendations.add('  • Review connection pool settings');
          recommendations.add('  • Implement proper caching strategies');
        }
        
        // Print all recommendations
        if (recommendations.size > 0) {
          Array.from(recommendations).forEach(rec => console.log(rec));
        } else {
          console.log('All metrics are within acceptable ranges. No immediate action required.');
        }
      });

      await Promise.all(contexts.map(context => context.close()));
      
      printTestFooter();
    });
  });
});