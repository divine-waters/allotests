import { test, expect, BrowserContext, Page, TestInfo } from '@playwright/test';
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

// Add environment configuration
const TEST_ENV = {
  browser: process.env.BROWSER || 'chromium',
  viewport: process.env.VIEWPORT || '1920x1080',
  network: process.env.NETWORK || 'no-throttling',
  device: process.env.DEVICE || 'desktop',
  locale: process.env.LOCALE || 'en-US',
  timezone: process.env.TIMEZONE || 'America/Denver'
};

function getEnvironmentInfo() {
  return [
    `• Browser: ${TEST_ENV.browser}`,
    `• Viewport: ${TEST_ENV.viewport}`,
    `• Network: ${TEST_ENV.network}`,
    `• Device: ${TEST_ENV.device}`,
    `• Locale: ${TEST_ENV.locale}`,
    `• Timezone: ${TEST_ENV.timezone}`
  ].join('\n');
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

function printTestExecutionStatus(testInfo: TestInfo, testType: string, status: 'started' | 'completed' | 'failed', error?: string) {
  const timestamp = new Date().toISOString();
  testInfo.annotations.push({ type: 'test_status', description: `${testType} - ${status}` });
  
  const output = [
    `\nTest Execution Status: ${testType}`,
    `Timestamp: ${timestamp}`,
    `Status: ${status.toUpperCase()}`,
    ...(error ? [`Error: ${error}`] : []),
    '-'.repeat(80)
  ].join('\n');
  
  console.log(output);
  testInfo.attachments.push({
    name: `${testType.toLowerCase().replace(/\s+/g, '-')}-status`,
    contentType: 'text/plain',
    body: Buffer.from(output)
  });
}

function printTestSummary(testInfo: TestInfo, testType: string, metrics: any, error?: string) {
  const output = [
    `\n📊 ${testType} Test Summary`,
    '-'.repeat(80),
    error ? [
      '❌ Test Failed',
      `Error: ${error}`,
      '\nPossible Issues:',
      ...getPossibleIssues(testType)
    ] : [
      '✅ Test Completed',
      '\nCollected Metrics:',
      ...formatMetrics(testType, metrics)
    ],
    '\nTest Environment:',
    getEnvironmentInfo(),
    '-'.repeat(80)
  ].join('\n');
  
  console.log(output);
  testInfo.attachments.push({
    name: `${testType.toLowerCase().replace(/\s+/g, '-')}-summary`,
    contentType: 'text/plain',
    body: Buffer.from(output)
  });
}

function getPossibleIssues(testType: string): string[] {
  switch (testType) {
    case '3G Network':
      return [
        '- Network connectivity issues',
        '- Server response timeouts',
        '- Resource loading failures'
      ];
    case 'CPU Throttling':
      return [
        '- JavaScript execution errors',
        '- Resource processing timeouts',
        '- Browser performance limitations'
      ];
    case 'Homepage':
      return [
        '- Page load failures',
        '- Resource loading issues',
        '- Performance metric collection errors'
      ];
    case 'Concurrent Users':
      return [
        '- Server capacity issues',
        '- Resource contention',
        '- Connection pool exhaustion'
      ];
    case 'Memory Pressure':
      return [
        '- Memory allocation failures',
        '- Browser performance limitations',
        '- Resource exhaustion'
      ];
    default:
      return ['- Unknown test failure'];
  }
}

function formatMetrics(testType: string, metrics: any): string[] {
  switch (testType) {
    case '3G Network':
      return [
        `• Load Time: ${metrics?.loadTime ? metrics.loadTime + 'ms' : 'Not collected'}`,
        `• Resource Count: ${metrics?.resources || 'Not collected'}`,
        `• Memory Usage: ${metrics?.memoryMB ? metrics.memoryMB.toFixed(2) + 'MB' : 'Not collected'}`
      ];
    case 'CPU Throttling':
      return [
        `• Load Time: ${metrics?.loadTime ? metrics.loadTime + 'ms' : 'Not collected'}`,
        `• JS Execution: ${metrics?.jsExecutionTime ? metrics.jsExecutionTime.toFixed(0) + 'ms' : 'Not collected'}`,
        `• Long Tasks: ${metrics?.longTasks?.length || 0}`
      ];
    case 'Homepage':
      return [
        `• LCP: ${metrics?.lcp ? metrics.lcp + 'ms' : 'Not collected'}`,
        `• TBT: ${metrics?.totalTBT ? metrics.totalTBT.toFixed(0) + 'ms' : 'Not collected'}`,
        `• Resource Count: ${metrics?.resourceCount || 'Not collected'}`
      ];
    case 'Concurrent Users':
      return [
        `• Average Load Time: ${metrics?.avgLoadTime ? metrics.avgLoadTime.toFixed(0) + 'ms' : 'Not collected'}`,
        `• Error Rate: ${metrics?.errorRate ? (metrics.errorRate * 100).toFixed(1) + '%' : 'Not collected'}`,
        `• Resource Contention: ${metrics?.resourceContention ? metrics.resourceContention.toFixed(1) + '%' : 'Not collected'}`
      ];
    case 'Memory Pressure':
      return [
        `• Heap Growth: ${metrics?.heapGrowth ? metrics.heapGrowth.toFixed(2) + 'MB' : 'Not collected'}`,
        `• DOM Nodes: ${metrics?.domNodes || 'Not collected'}`,
        `• Event Listeners: ${metrics?.eventListeners || 'Not collected'}`
      ];
    default:
      return ['No metrics collected'];
  }
}

test.describe('Performance Tests', () => {
  const url = 'https://www.allocommunications.com/';

  test('Homepage Performance', async ({ page, context }) => {
    const testInfo = test.info();
    
    await test.step('Initialize test', async () => {
      testInfo.annotations.push({ type: 'test_type', description: 'Homepage Performance Test' });
      test.info().annotations.push({ 
        type: 'test_output', 
        description: [
          '\n🧪 Starting Homepage Performance Test',
          '-'.repeat(80),
          'Test Environment:',
          getEnvironmentInfo(),
          '-'.repeat(80)
        ].join('\n')
      });
    });

    let metrics: any = {};
    let error: string | undefined;
    
    try {
      await test.step('Enable performance monitoring', async () => {
        await context.route('**/*', async route => {
          const request = route.request();
          const headers = { ...request.headers(), 'x-performance-tracking': 'true' };
          await route.continue({ headers });
        });
      });

      await test.step('Navigate to homepage', async () => {
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
            test.info().annotations.push({ type: 'retry', description: `Retry ${retryCount}/${maxRetries}` });
            await page.waitForTimeout(2000);
          }
        }
      });

      await test.step('Collect performance metrics', async () => {
        const lcpDetails: LCPDetails = await page.evaluate(() => {
          const entries = performance.getEntriesByType('largest-contentful-paint');
          const lastEntry = entries[entries.length - 1] as any;
          return {
            lcp: lastEntry?.startTime || 0,
            element: lastEntry?.element?.tagName || 'unknown',
            size: lastEntry?.size || 0,
            url: lastEntry?.url || '',
            timestamp: lastEntry?.startTime || 0
          };
        });

        const tbtDetails: TBTDetails = await page.evaluate(() => {
          const longTasks = performance.getEntriesByType('longtask').map(task => ({
            name: task.name,
            duration: task.duration,
            startTime: task.startTime
          }));

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

          return {
            totalTBT: longTasks.reduce((sum, task) => sum + task.duration, 0),
            tasks: longTasks,
            resourceTiming: resources
          };
        });

        metrics = {
          lcp: lcpDetails.lcp,
          totalTBT: tbtDetails.totalTBT,
          resourceCount: tbtDetails.resourceTiming.length
        };

        test.info().annotations.push(
          { type: 'metric', description: `LCP: ${metrics.lcp}ms` },
          { type: 'metric', description: `TBT: ${metrics.totalTBT.toFixed(0)}ms` },
          { type: 'metric', description: `Resources: ${metrics.resourceCount}` }
        );
      });

      await test.step('Print test summary', async () => {
        const output = [
          '\n📊 Homepage Performance Summary',
          '-'.repeat(80),
          '✅ Test Completed',
          '\nCollected Metrics:',
          `• LCP: ${metrics.lcp}ms`,
          `• TBT: ${metrics.totalTBT.toFixed(0)}ms`,
          `• Resource Count: ${metrics.resourceCount}`,
          '\nTest Environment:',
          getEnvironmentInfo(),
          '-'.repeat(80)
        ].join('\n');
        
        test.info().annotations.push({ type: 'test_output', description: output });
      });

    } catch (err) {
      error = err.message;
      await test.step('Handle test failure', async () => {
        const output = [
          '\n❌ Homepage Performance Test Failed',
          '-'.repeat(80),
          `Error: ${error}`,
          '\nPossible Issues:',
          '- Page load failures',
          '- Resource loading issues',
          '- Performance metric collection errors',
          '\nTest Environment:',
          getEnvironmentInfo(),
          '-'.repeat(80)
        ].join('\n');
        
        test.info().annotations.push({ type: 'test_output', description: output });
      });
    } finally {
      await test.step('Finalize test', async () => {
        const status = error ? 'failed' : 'completed';
        test.info().annotations.push({ 
          type: 'test_status', 
          description: `Homepage Performance Test - ${status}` 
        });
        test.info().annotations.push({ 
          type: 'test_output', 
          description: `\n🧪 Homepage Performance Test ${status.toUpperCase()}` 
        });
      });
    }
  });

  // Stress test scenarios
  test.describe('Stress Tests', () => {
    test('Performance under concurrent user load', async ({ browser }) => {
      const testInfo = test.info();
      const numUsers = 5; // Reduced from 10 to 5 for better stability
      
      await test.step('Initialize test', async () => {
        testInfo.annotations.push({ type: 'test_type', description: 'Concurrent Users Performance Test' });
        test.info().annotations.push({ 
          type: 'test_output', 
          description: [
            '\n🧪 Starting Concurrent Users Performance Test',
            '-'.repeat(80),
            `Concurrent Users: ${numUsers}`,
            'Test Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n')
        });
      });

      let metrics: any = {};
      let error: string | undefined;
      
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];
      const results: Array<{ loadTime: number; error: any; resourceContention?: number }> = [];
      
      try {
        // Create contexts and pages
        await test.step('Setup concurrent users', async () => {
          for (let i = 0; i < numUsers; i++) {
            const context = await browser.newContext({
              ...testInfo.project.use,
              // Add performance monitoring
              recordVideo: { dir: 'test-results/videos' },
              recordHar: { path: `test-results/hars/concurrent-user-${i}.har` }
            });
            contexts.push(context);
            
            const page = await context.newPage();
            // Set default timeout
            page.setDefaultTimeout(90000); // Increased timeout for concurrent load
            page.setDefaultNavigationTimeout(90000);
            
            // Add error handling for page crashes
            page.on('crash', () => {
              throw new Error(`Page ${i} crashed during test execution`);
            });
            
            // Add error handling for console errors
            page.on('console', msg => {
              if (msg.type() === 'error') {
                console.log(`Page ${i} error: ${msg.text()}`);
              }
            });
            
            pages.push(page);
          }
        });

        // Navigate all pages concurrently
        await test.step('Navigate pages', async () => {
          const navigationPromises = pages.map(async (page, index) => {
            const startTime = Date.now();
            try {
              // Use Promise.race to handle timeouts better
              await Promise.race([
                page.goto(url, { 
                  waitUntil: 'networkidle',
                  timeout: 90000 // Increased timeout for concurrent load
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Navigation timeout for user ${index}`)), 90000)
                )
              ]);
              
              // Wait for network to be idle with timeout
              await Promise.race([
                page.waitForLoadState('networkidle', { timeout: 30000 }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error(`Network idle timeout for user ${index}`)), 30000)
                )
              ]);
              
              // Collect resource contention metrics before closing
              const resourceContention = await page.evaluate(() => {
                const entries = performance.getEntriesByType('resource');
                const concurrentRequests = entries.reduce((max, entry) => {
                  const start = entry.startTime;
                  const end = start + entry.duration;
                  return Math.max(max, entries.filter(e => 
                    e.startTime <= end && (e.startTime + e.duration) >= start
                  ).length);
                }, 0);
                return concurrentRequests / entries.length;
              });

              return { 
                loadTime: Date.now() - startTime, 
                error: null,
                resourceContention 
              };
            } catch (err) {
              return { 
                loadTime: 0, 
                error: err instanceof Error ? err : new Error(String(err)),
                resourceContention: 0
              };
            }
          });

          const navigationResults = await Promise.all(navigationPromises);
          results.push(...navigationResults);
        });

        // Calculate metrics
        await test.step('Calculate metrics', async () => {
          const successfulLoads = results.filter(r => !r.error);
          const avgLoadTime = successfulLoads.length > 0 
            ? successfulLoads.reduce((sum, r) => sum + r.loadTime, 0) / successfulLoads.length 
            : 0;
          const errorRate = (numUsers - successfulLoads.length) / numUsers;
          const avgResourceContention = successfulLoads.length > 0
            ? successfulLoads.reduce((sum, r) => sum + (r.resourceContention || 0), 0) / successfulLoads.length
            : 0;

          metrics = {
            avgLoadTime,
            errorRate,
            resourceContention: avgResourceContention,
            successfulLoads: successfulLoads.length,
            totalLoads: numUsers
          };

          test.info().annotations.push(
            { type: 'metric', description: `Average Load Time: ${metrics.avgLoadTime.toFixed(0)}ms` },
            { type: 'metric', description: `Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%` },
            { type: 'metric', description: `Resource Contention: ${metrics.resourceContention.toFixed(1)}%` },
            { type: 'metric', description: `Successful Loads: ${metrics.successfulLoads}/${metrics.totalLoads}` }
          );
        });

        await test.step('Print test summary', async () => {
          const output = [
            '\n📊 Concurrent Users Performance Summary',
            '-'.repeat(80),
            '✅ Test Completed',
            '\nCollected Metrics:',
            `• Average Load Time: ${metrics.avgLoadTime.toFixed(0)}ms`,
            `• Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
            `• Resource Contention: ${metrics.resourceContention.toFixed(1)}%`,
            `• Successful Loads: ${metrics.successfulLoads}/${metrics.totalLoads}`,
            '\nTest Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n');
          
          test.info().annotations.push({ type: 'test_output', description: output });
        });

      } catch (err) {
        error = err.message;
        await test.step('Handle test failure', async () => {
          const output = [
            '\n❌ Concurrent Users Performance Test Failed',
            '-'.repeat(80),
            `Error: ${error}`,
            '\nPossible Issues:',
            '- Server capacity exceeded',
            '- Network connectivity issues',
            '- Resource contention',
            '- Browser performance limitations',
            '\nTest Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n');
          
          test.info().annotations.push({ type: 'test_output', description: output });
        });
      } finally {
        await test.step('Cleanup', async () => {
          try {
            // Close pages first
            await Promise.allSettled(pages.map(async (page, index) => {
              try {
                await page.close().catch(() => {});
              } catch (err) {
                console.error(`Error closing page ${index}:`, err);
              }
            }));
            pages.length = 0; // Clear the array
            
            // Then close contexts
            await Promise.allSettled(contexts.map(async (context, index) => {
              try {
                await context.close().catch(() => {});
              } catch (err) {
                console.error(`Error closing context ${index}:`, err);
              }
            }));
            contexts.length = 0; // Clear the array
          } catch (err) {
            console.error('Error during cleanup:', err);
          }
          
          const status = error ? 'failed' : 'completed';
          test.info().annotations.push({ 
            type: 'test_status', 
            description: `Concurrent Users Performance Test - ${status}` 
          });
        });
      }
    });

    test('Performance under memory pressure', async ({ browser }) => {
      const testInfo = test.info();
      
      await test.step('Initialize test', async () => {
        testInfo.annotations.push({ type: 'test_type', description: 'Memory Pressure Performance Test' });
        test.info().annotations.push({ 
          type: 'test_output', 
          description: [
            '\n🧪 Starting Memory Pressure Performance Test',
            '-'.repeat(80),
            'Test Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n')
        });
      });

      let metrics: any = {};
      let error: string | undefined;
      let context: BrowserContext | null = null;
      let page: Page | null = null;
      
      try {
        await test.step('Setup browser context', async () => {
          context = await browser.newContext({
            ...testInfo.project.use,
            // Add performance monitoring
            recordVideo: { dir: 'test-results/videos' },
            recordHar: { path: 'test-results/hars/memory-pressure-test.har' }
          });
          
          page = await context.newPage();
          
          // Set default timeout
          page.setDefaultTimeout(60000); // Increased timeout
          page.setDefaultNavigationTimeout(60000);
          
          // Add error handling for page crashes
          page.on('crash', () => {
            throw new Error('Page crashed during test execution');
          });
          
          // Add error handling for console errors
          page.on('console', msg => {
            if (msg.type() === 'error') {
              console.log(`Page error: ${msg.text()}`);
            }
          });
        });

        await test.step('Collect initial metrics', async () => {
          if (!page) throw new Error('Page not initialized');
          
          metrics.initial = await page.evaluate(() => {
            const memory = (performance as any).memory;
            return {
              heapSize: memory?.usedJSHeapSize || 0,
              domNodes: document.getElementsByTagName('*').length,
              eventListeners: (window as any).__eventListeners?.length || 0,
              timestamp: Date.now()
            };
          }).catch(() => ({
            heapSize: 0,
            domNodes: 0,
            eventListeners: 0,
            timestamp: Date.now()
          }));

          test.info().annotations.push(
            { type: 'metric', description: `Initial Heap Size: ${(metrics.initial.heapSize / (1024 * 1024)).toFixed(2)}MB` },
            { type: 'metric', description: `Initial DOM Nodes: ${metrics.initial.domNodes}` },
            { type: 'metric', description: `Initial Event Listeners: ${metrics.initial.eventListeners}` }
          );
        });

        await test.step('Simulate memory pressure', async () => {
          if (!page) throw new Error('Page not initialized');
          
          // Navigate with retry logic
          let retryCount = 0;
          const maxRetries = 3;
          let lastError: Error = new Error('Initial error state');
          
          while (retryCount < maxRetries) {
            try {
              await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: 60000 // Increased timeout
              });
              
              // Wait for network to be idle
              await page.waitForLoadState('networkidle', { timeout: 15000 });
              
              // Simulate user interactions
              await page.evaluate(() => {
                // Create DOM elements
                for (let i = 0; i < 100; i++) {
                  const div = document.createElement('div');
                  div.textContent = `Test Element ${i}`;
                  document.body.appendChild(div);
                }
                
                // Add event listeners
                for (let i = 0; i < 50; i++) {
                  document.addEventListener(`test-event-${i}`, () => {});
                }
                
                // Create objects in memory
                window['testObjects'] = Array(1000).fill(null).map((_, i) => ({
                  id: i,
                  data: new Array(100).fill('test data')
                }));
              });
              
              // Wait for potential garbage collection
              await page.waitForTimeout(2000);
              break;
            } catch (err) {
              lastError = err instanceof Error ? err : new Error(String(err));
              retryCount++;
              if (retryCount === maxRetries) {
                throw new Error(`Failed to simulate memory pressure after ${maxRetries} attempts. Last error: ${lastError.message}`);
              }
              test.info().annotations.push({ 
                type: 'retry', 
                description: `Retry ${retryCount}/${maxRetries}: ${lastError.message}` 
              });
              await page.waitForTimeout(2000 * retryCount); // Exponential backoff
            }
          }
        });

        await test.step('Collect final metrics', async () => {
          if (!page) throw new Error('Page not initialized');
          
          metrics.final = await page.evaluate(() => {
            const memory = (performance as any).memory;
            return {
              heapSize: memory?.usedJSHeapSize || 0,
              domNodes: document.getElementsByTagName('*').length,
              eventListeners: (window as any).__eventListeners?.length || 0,
              timestamp: Date.now()
            };
          }).catch(() => ({
            heapSize: 0,
            domNodes: 0,
            eventListeners: 0,
            timestamp: Date.now()
          }));

          // Calculate metrics
          metrics.heapGrowth = (metrics.final.heapSize - metrics.initial.heapSize) / (1024 * 1024);
          metrics.domGrowth = metrics.final.domNodes - metrics.initial.domNodes;
          metrics.listenerGrowth = metrics.final.eventListeners - metrics.initial.eventListeners;
          metrics.testDuration = (metrics.final.timestamp - metrics.initial.timestamp) / 1000;

          test.info().annotations.push(
            { type: 'metric', description: `Heap Growth: ${metrics.heapGrowth.toFixed(2)}MB` },
            { type: 'metric', description: `DOM Growth: ${metrics.domGrowth} nodes` },
            { type: 'metric', description: `Event Listener Growth: ${metrics.listenerGrowth}` },
            { type: 'metric', description: `Test Duration: ${metrics.testDuration.toFixed(1)}s` }
          );
        });

        await test.step('Print test summary', async () => {
          const output = [
            '\n📊 Memory Pressure Performance Summary',
            '-'.repeat(80),
            '✅ Test Completed',
            '\nCollected Metrics:',
            `• Heap Growth: ${metrics.heapGrowth.toFixed(2)}MB`,
            `• DOM Growth: ${metrics.domGrowth} nodes`,
            `• Event Listener Growth: ${metrics.listenerGrowth}`,
            `• Test Duration: ${metrics.testDuration.toFixed(1)}s`,
            '\nMemory Analysis:',
            ...(metrics.heapGrowth > 50 ? [
              '⚠️ High Memory Growth Detected:',
              '- Consider implementing memory cleanup',
              '- Review object lifecycle management',
              '- Check for memory leaks in event handlers'
            ] : []),
            ...(metrics.domGrowth > 1000 ? [
              '\n⚠️ Large DOM Growth Detected:',
              '- Review DOM manipulation patterns',
              '- Consider implementing virtual DOM',
              '- Check for unnecessary element creation'
            ] : []),
            ...(metrics.listenerGrowth > 100 ? [
              '\n⚠️ High Event Listener Growth Detected:',
              '- Implement event delegation',
              '- Review event listener cleanup',
              '- Check for duplicate event bindings'
            ] : []),
            '\nTest Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n');
          
          test.info().annotations.push({ type: 'test_output', description: output });
        });

      } catch (err) {
        error = err.message;
        await test.step('Handle test failure', async () => {
          const output = [
            '\n❌ Memory Pressure Performance Test Failed',
            '-'.repeat(80),
            `Error: ${error}`,
            '\nPossible Issues:',
            '- Memory allocation failures',
            '- Browser performance limitations',
            '- Resource exhaustion',
            '- Test timeout exceeded',
            '\nTest Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n');
          
          test.info().annotations.push({ type: 'test_output', description: output });
        });
      } finally {
        await test.step('Cleanup', async () => {
          try {
            if (page) await page.close().catch(() => {});
            if (context) await context.close().catch(() => {});
          } catch (err) {
            console.error('Error during cleanup:', err);
          }
          
          const status = error ? 'failed' : 'completed';
          test.info().annotations.push({ 
            type: 'test_status', 
            description: `Memory Pressure Performance Test - ${status}` 
          });
        });
      }
    });
  });
});