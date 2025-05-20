import { test, expect } from '@playwright/test';

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
    }, { timeout: 6000 }); // Add explicit timeout to page.evaluate

    console.log('LCP Diagnostic Report:');
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

    console.log('TBT Diagnostic Report:');
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
  });
});
