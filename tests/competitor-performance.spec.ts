import { test, expect, BrowserContext, Page, TestInfo } from '@playwright/test';
import { THRESHOLDS, COMPETITORS } from './constants';
import { getRating, getMetricStatus, printTestHeader, printTestFooter } from './utils';
import type { CompetitorSite } from './types';

// Add interface for LayoutShift entry
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  lastInputTime: number;
  sources: Array<{
    node?: Node;
    currentRect?: DOMRectReadOnly;
    previousRect?: DOMRectReadOnly;
  }>;
}

interface PerformanceMetrics {
  lcp: number;
  tbt: number;
  cls: number;
  ttfb: number;
  resourceCount: number;
  domSize: number;
  jsHeapSize: number;
  totalLoadTime: number;
}

interface TestResult {
  name: string;
  metrics: PerformanceMetrics;
  score: number;
  rating: string;
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

function printCompetitorInsights(metrics: PerformanceMetrics, competitor: CompetitorSite) {
  console.log('\n💡 Performance Insights:');
  console.log('-'.repeat(40));

  // Core Web Vitals Analysis
  console.log('Core Web Vitals Analysis:');
  const lcpStatus = getMetricStatus(metrics.lcp, THRESHOLDS.lcp);
  const clsStatus = getMetricStatus(metrics.cls, THRESHOLDS.cls);
  const ttfbStatus = getMetricStatus(metrics.ttfb, THRESHOLDS.ttfb);

  console.log(`LCP: ${metrics.lcp.toFixed(0)}ms (${lcpStatus})`);
  if (metrics.lcp > THRESHOLDS.lcp.good) {
    console.log('  Recommendations:');
    console.log('  - Optimize hero image loading');
    console.log('  - Implement resource hints');
    console.log('  - Review critical rendering path');
  }

  console.log(`\nCLS: ${metrics.cls.toFixed(3)} (${clsStatus})`);
  if (metrics.cls > THRESHOLDS.cls.good) {
    console.log('  Recommendations:');
    console.log('  - Reserve space for dynamic content');
    console.log('  - Avoid inserting content above existing content');
    console.log('  - Use proper image dimensions');
  }

  console.log(`\nTTFB: ${metrics.ttfb.toFixed(0)}ms (${ttfbStatus})`);
  if (metrics.ttfb > THRESHOLDS.ttfb.good) {
    console.log('  Recommendations:');
    console.log('  - Implement server-side caching');
    console.log('  - Review server response times');
    console.log('  - Consider using a CDN');
  }

  // Resource Analysis
  console.log('\nResource Analysis:');
  console.log(`Total Resources: ${metrics.resourceCount}`);
  console.log(`DOM Size: ${metrics.domSize} nodes`);
  console.log(`JavaScript Heap: ${(metrics.jsHeapSize / (1024 * 1024)).toFixed(1)}MB`);
  console.log(`Total Load Time: ${metrics.totalLoadTime.toFixed(0)}ms`);

  // Service Comparison
  console.log('\nService Comparison:');
  const services = competitor.services;
  console.log('Available Services:');
  Object.entries(services).forEach(([service, available]) => {
    if (available) {
      console.log(`✓ ${service.replace(/([A-Z])/g, ' $1').trim()}`);
    }
  });

  // Market Focus
  console.log('\nMarket Focus:');
  console.log(`Service Type: ${competitor.serviceType}`);
  console.log(`Market Focus: ${competitor.marketFocus}`);
  console.log(`Regions: ${competitor.region.join(', ')}`);

  // Performance Recommendations
  console.log('\nPerformance Recommendations:');
  if (metrics.lcp > THRESHOLDS.lcp.good || metrics.ttfb > THRESHOLDS.ttfb.good) {
    console.log('- Review and optimize resource loading strategy');
    console.log('- Consider implementing a CDN');
    console.log('- Optimize server response times');
  }
  if (metrics.cls > THRESHOLDS.cls.good) {
    console.log('- Implement proper layout stability measures');
    console.log('- Review dynamic content insertion');
    console.log('- Optimize image loading and dimensions');
  }
  if (metrics.resourceCount > 100) {
    console.log('- Implement resource bundling');
    console.log('- Review and remove unused resources');
    console.log('- Consider lazy loading for non-critical resources');
  }
  if (metrics.domSize > 1500) {
    console.log('- Review and optimize DOM structure');
    console.log('- Consider implementing virtual DOM');
    console.log('- Implement lazy loading for off-screen content');
  }
}

function printCompetitorTestStatus(testInfo: TestInfo, competitor: string, status: 'started' | 'completed' | 'failed', error?: string) {
  const timestamp = new Date().toISOString();
  testInfo.annotations.push({ type: 'competitor_status', description: `${competitor} - ${status}` });
  
  const output = [
    `\nCompetitor Test Status: ${competitor}`,
    `Timestamp: ${timestamp}`,
    `Status: ${status.toUpperCase()}`,
    `URL: ${COMPETITORS.find(c => c.name === competitor)?.url || 'Unknown'}`,
    ...(error ? [`Error: ${error}`] : []),
    '-'.repeat(80)
  ].join('\n');
  
  console.log(output);
  testInfo.attachments.push({
    name: `${competitor.toLowerCase().replace(/\s+/g, '-')}-status`,
    contentType: 'text/plain',
    body: Buffer.from(output)
  });
}

function printCompetitorSummary(testInfo: TestInfo, competitor: string, metrics: any, error?: string) {
  const competitorInfo = COMPETITORS.find(c => c.name === competitor);
  const output = [
    `\n📊 ${competitor} Performance Summary`,
    '-'.repeat(80),
    `Region: ${competitorInfo?.region || 'Unknown'}`,
    `Service Type: ${competitorInfo?.serviceType || 'Unknown'}`,
    `Market Focus: ${competitorInfo?.marketFocus || 'Unknown'}`,
    ...(error ? [
      '❌ Test Failed',
      `Error: ${error}`,
      '\nPossible Issues:',
      '- Network connectivity issues',
      '- Server response timeouts',
      '- Resource loading failures',
      '- Browser compatibility issues'
    ] : [
      '✅ Test Completed',
      '\nCollected Metrics:',
      `• LCP: ${metrics?.lcp ? metrics.lcp + 'ms' : 'Not collected'}`,
      `• CLS: ${metrics?.cls ? metrics.cls.toFixed(3) : 'Not collected'}`,
      `• TTFB: ${metrics?.ttfb ? metrics.ttfb + 'ms' : 'Not collected'}`,
      `• TBT: ${metrics?.tbt ? metrics.tbt.toFixed(0) + 'ms' : 'Not collected'}`,
      `• Resource Count: ${metrics?.resourceCount || 'Not collected'}`,
      `• DOM Size: ${metrics?.domSize || 'Not collected'}`,
      `• JS Heap Size: ${metrics?.jsHeapSize ? (metrics.jsHeapSize / (1024 * 1024)).toFixed(2) + 'MB' : 'Not collected'}`
    ]),
    '\nTest Environment:',
    getEnvironmentInfo(),
    '-'.repeat(80)
  ].join('\n');
  
  console.log(output);
  testInfo.attachments.push({
    name: `${competitor.toLowerCase().replace(/\s+/g, '-')}-summary`,
    contentType: 'text/plain',
    body: Buffer.from(output)
  });
}

test.describe('Competitor Performance Analysis', () => {
  const results: Array<{ competitor: string; metrics: any; error?: string }> = [];

  for (const competitor of COMPETITORS) {
    test(`Analyze ${competitor.name} performance`, async ({ browser }) => {
      const testInfo = test.info();
      
      await test.step('Initialize test', async () => {
        testInfo.annotations.push({ type: 'test_type', description: `Competitor Analysis - ${competitor.name}` });
        test.info().annotations.push({ 
          type: 'test_output', 
          description: [
            '\n🧪 Starting Competitor Analysis',
            '-'.repeat(80),
            `Competitor: ${competitor.name}`,
            `URL: ${competitor.url}`,
            '\nTest Environment:',
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
            recordHar: { path: 'test-results/hars/' + competitor.name.toLowerCase().replace(/\s+/g, '-') + '.har' }
          });
          
          page = await context.newPage();
          
          // Set default timeout
          page.setDefaultTimeout(45000); // Increased timeout
          page.setDefaultNavigationTimeout(45000);
          
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

        await test.step('Navigate and collect metrics', async () => {
          if (!page) throw new Error('Page not initialized');
          
          // Navigate with retry logic
          let retryCount = 0;
          const maxRetries = 3;
          let lastError: Error | undefined;
          
          while (retryCount < maxRetries) {
            try {
              await page.goto(competitor.url, { 
                waitUntil: 'networkidle',
                timeout: 45000 // Increased timeout
              });
              
              // Wait for network to be idle
              await page.waitForLoadState('networkidle', { timeout: 10000 });
              
              // Collect metrics
              metrics = await page.evaluate(() => {
                const memory = (performance as any).memory;
                const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                return {
                  lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0,
                  cls: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + (entry as any).value, 0),
                  ttfb: navEntry?.responseStart || 0,
                  tbt: performance.getEntriesByType('longtask').reduce((sum, task) => sum + task.duration, 0),
                  resourceCount: performance.getEntriesByType('resource').length,
                  domSize: document.getElementsByTagName('*').length,
                  jsHeapSize: memory?.usedJSHeapSize || 0,
                  totalLoadTime: navEntry?.loadEventEnd - navEntry?.startTime || 0
                };
              });

              test.info().annotations.push(
                { type: 'metric', description: `LCP: ${metrics.lcp}ms` },
                { type: 'metric', description: `CLS: ${metrics.cls.toFixed(3)}` },
                { type: 'metric', description: `TTFB: ${metrics.ttfb}ms` },
                { type: 'metric', description: `TBT: ${metrics.tbt.toFixed(0)}ms` }
              );
              
              break; // Success, exit retry loop
            } catch (err) {
              lastError = err;
              retryCount++;
              if (retryCount === maxRetries) {
                throw new Error(`Failed to load page after ${maxRetries} attempts. Last error: ${lastError.message}`);
              }
              test.info().annotations.push({ 
                type: 'retry', 
                description: `Retry ${retryCount}/${maxRetries}: ${lastError.message}` 
              });
              await page.waitForTimeout(2000 * retryCount); // Exponential backoff
            }
          }
        });

        await test.step('Print competitor summary', async () => {
          const competitorInfo = COMPETITORS.find(c => c.name === competitor.name);
          const output = [
            `\n📊 ${competitor.name} Performance Summary`,
            '-'.repeat(80),
            '✅ Test Completed',
            `Region: ${competitorInfo?.region || 'Unknown'}`,
            `Service Type: ${competitorInfo?.serviceType || 'Unknown'}`,
            `Market Focus: ${competitorInfo?.marketFocus || 'Unknown'}`,
            '\nCollected Metrics:',
            `• LCP: ${metrics.lcp}ms`,
            `• CLS: ${metrics.cls.toFixed(3)}`,
            `• TTFB: ${metrics.ttfb}ms`,
            `• TBT: ${metrics.tbt.toFixed(0)}ms`,
            `• Resource Count: ${metrics.resourceCount}`,
            `• DOM Size: ${metrics.domSize}`,
            `• JS Heap Size: ${(metrics.jsHeapSize / (1024 * 1024)).toFixed(2)}MB`,
            `• Total Load Time: ${metrics.totalLoadTime}ms`,
            '\nTest Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n');
          
          test.info().annotations.push({ type: 'test_output', description: output });
        });

        results.push({ competitor: competitor.name, metrics });
        
      } catch (err) {
        error = err.message;
        await test.step('Handle test failure', async () => {
          const output = [
            `\n❌ ${competitor.name} Performance Test Failed`,
            '-'.repeat(80),
            `Error: ${error}`,
            '\nPossible Issues:',
            '- Network connectivity issues',
            '- Server response timeouts',
            '- Resource loading failures',
            '- Browser compatibility issues',
            '\nTest Environment:',
            getEnvironmentInfo(),
            '-'.repeat(80)
          ].join('\n');
          
          test.info().annotations.push({ type: 'test_output', description: output });
          results.push({ competitor: competitor.name, metrics, error });
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
            description: `${competitor.name} - ${status}` 
          });
        });
      }
    });
  }

  test.afterAll(async () => {
    const testInfo = test.info();
    
    await test.step('Generate final report', async () => {
      if (results.length === 0) {
        const output = [
          '\n⚠️ No test results were collected',
          'Possible issues:',
          '- Network connectivity problems',
          '- Server response timeouts',
          '- Browser compatibility issues',
          '- Resource loading failures',
          '- Test execution errors',
          '\nTest Environment:',
          getEnvironmentInfo(),
          '-'.repeat(80)
        ].join('\n');
        
        test.info().annotations.push({ type: 'test_output', description: output });
        return;
      }

      const sortedResults = results
        .filter(r => !r.error)
        .map(r => ({
          ...r,
          score: calculateScore(r.metrics)
        }))
        .sort((a, b) => b.score - a.score);

      const output = [
        '\n📊 Competitor Performance Rankings',
        '-'.repeat(80),
        ...sortedResults.map((r, i) => [
          `${i + 1}. ${r.competitor}`,
          `   Score: ${r.score.toFixed(2)}`,
          `   LCP: ${r.metrics.lcp}ms`,
          `   CLS: ${r.metrics.cls.toFixed(3)}`,
          `   TTFB: ${r.metrics.ttfb}ms`,
          `   TBT: ${r.metrics.tbt.toFixed(0)}ms`
        ].join('\n')),
        '\n💡 Performance Insights:',
        `• Industry Position: ${getIndustryPosition(sortedResults)}`,
        `• ALLO Rank: ${getALLORank(sortedResults)}`,
        `• Key Differentiators: ${getKeyDifferentiators(sortedResults)}`,
        '\nTest Environment:',
        getEnvironmentInfo(),
        '-'.repeat(80)
      ].join('\n');
      
      test.info().annotations.push({ type: 'test_output', description: output });
    });
  });
});

function calculateScore(metrics: any): number {
  // Normalize metrics to 0-1 range and calculate weighted average
  const weights = {
    lcp: 0.3,
    cls: 0.3,
    ttfb: 0.2,
    tbt: 0.2
  };
  
  const normalized = {
    lcp: Math.max(0, 1 - (metrics.lcp / 2500)), // 2500ms is poor threshold
    cls: Math.max(0, 1 - (metrics.cls / 0.25)), // 0.25 is poor threshold
    ttfb: Math.max(0, 1 - (metrics.ttfb / 600)), // 600ms is poor threshold
    tbt: Math.max(0, 1 - (metrics.tbt / 300)) // 300ms is poor threshold
  };
  
  return Object.entries(weights).reduce((score, [metric, weight]) => 
    score + (normalized[metric] * weight), 0) * 100;
}

function getIndustryPosition(results: Array<{ competitor: string; score: number }>): string {
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  if (avgScore >= 80) return 'Leading the industry';
  if (avgScore >= 60) return 'Competitive in the market';
  return 'Room for improvement';
}

function getALLORank(results: Array<{ competitor: string; score: number }>): string {
  const alloResult = results.find(r => r.competitor === 'ALLO Communications');
  if (!alloResult) return 'Not ranked';
  const rank = results.findIndex(r => r.competitor === 'ALLO Communications') + 1;
  const total = results.length;
  return `${rank} of ${total} (${alloResult.score.toFixed(1)} score)`;
}

function getKeyDifferentiators(results: Array<{ competitor: string; metrics: any; score: number }>): string {
  const alloResult = results.find(r => r.competitor === 'ALLO Communications');
  if (!alloResult) return 'No data available';
  
  const differentiators: string[] = [];
  if (alloResult.metrics.lcp < 1000) differentiators.push('Fast LCP');
  if (alloResult.metrics.cls < 0.1) differentiators.push('Low CLS');
  if (alloResult.metrics.ttfb < 200) differentiators.push('Quick TTFB');
  if (alloResult.metrics.tbt < 100) differentiators.push('Minimal TBT');
  
  return differentiators.length > 0 ? differentiators.join(', ') : 'No significant advantages';
} 