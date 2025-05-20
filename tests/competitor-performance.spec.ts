import { test, expect } from '@playwright/test';

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

interface CompetitorSite {
  name: string;
  url: string;
  region: string[];
  serviceType: string;
  marketFocus: string;
  services: {
    fiberInternet: boolean;
    fiberTV: boolean;
    fiberPhone: boolean;
    mobilePhone: boolean;
    smartTown: boolean;
    wifiExperience: boolean;
    outdoorWifi: boolean;
    fiberStreaming: boolean;
    bark: boolean;
  };
}

const COMPETITORS: CompetitorSite[] = [
  {
    name: 'ALLO Communications',
    url: 'https://www.allocommunications.com/',
    region: ['Lincoln, NE', 'Grand Island, NE', 'Boulder, CO', 'Greeley, CO', 'Flagstaff, AZ', 'Joplin, MO'],
    serviceType: 'Fiber',
    marketFocus: 'Residential & Business Fiber',
    services: {
      fiberInternet: true,
      fiberTV: true,
      fiberPhone: true,
      mobilePhone: true,
      smartTown: true,
      wifiExperience: true,
      outdoorWifi: true,
      fiberStreaming: true,
      bark: true
    }
  },
  {
    name: 'Great Plains Communications',
    url: 'https://www.gpcom.com/',
    region: ['Lincoln, NE', 'Grand Island, NE', 'Kearney, NE', 'Norfolk, NE'],
    serviceType: 'Fiber',
    marketFocus: 'Residential & Business Fiber',
    services: {
      fiberInternet: true,
      fiberTV: true,
      fiberPhone: true,
      mobilePhone: false,
      smartTown: false,
      wifiExperience: true,
      outdoorWifi: false,
      fiberStreaming: true,
      bark: false
    }
  },
  {
    name: 'NextLight',
    url: 'https://mynextlight.com/',
    region: ['Boulder, CO', 'Greeley, CO'],
    serviceType: 'Fiber',
    marketFocus: 'Residential & Business Fiber',
    services: {
      fiberInternet: true,
      fiberTV: true,
      fiberPhone: true,
      mobilePhone: false,
      smartTown: true,
      wifiExperience: true,
      outdoorWifi: true,
      fiberStreaming: true,
      bark: false
    }
  },
  {
    name: 'Elevate Internet',
    url: 'https://www.elevateinternet.com/',
    region: ['Boulder, CO', 'Brighton, CO'],
    serviceType: 'Fiber',
    marketFocus: 'Residential & Business Fiber',
    services: {
      fiberInternet: true,
      fiberTV: true,
      fiberPhone: true,
      mobilePhone: false,
      smartTown: false,
      wifiExperience: true,
      outdoorWifi: false,
      fiberStreaming: true,
      bark: false
    }
  },
  {
    name: 'Ting Internet',
    url: 'https://ting.com/internet',
    region: ['Boulder, CO'],
    serviceType: 'Fiber',
    marketFocus: 'Residential & Business Fiber',
    services: {
      fiberInternet: true,
      fiberTV: false,
      fiberPhone: true,
      mobilePhone: false,
      smartTown: false,
      wifiExperience: true,
      outdoorWifi: false,
      fiberStreaming: false,
      bark: false
    }
  },
  {
    name: 'Wyyerd Fiber',
    url: 'https://wyyerd.com/',
    region: ['Flagstaff, AZ', 'Lake Havasu City, AZ'],
    serviceType: 'Fiber',
    marketFocus: 'Residential & Business Fiber',
    services: {
      fiberInternet: true,
      fiberTV: true,
      fiberPhone: true,
      mobilePhone: false,
      smartTown: false,
      wifiExperience: true,
      outdoorWifi: false,
      fiberStreaming: true,
      bark: false
    }
  },
  {
    name: 'Socket Telecom',
    url: 'https://www.socket.net/',
    region: ['Joplin, MO'],
    serviceType: 'Fiber',
    marketFocus: 'Residential & Business Fiber',
    services: {
      fiberInternet: true,
      fiberTV: true,
      fiberPhone: true,
      mobilePhone: false,
      smartTown: false,
      wifiExperience: true,
      outdoorWifi: false,
      fiberStreaming: true,
      bark: false
    }
  }
];

// Performance thresholds based on Core Web Vitals and industry standards
const THRESHOLDS = {
  lcp: {
    good: 2500,    // 2.5s
    poor: 4000     // 4s
  },
  tbt: {
    good: 300,     // 300ms
    poor: 600      // 600ms
  },
  cls: {
    good: 0.1,     // 0.1
    poor: 0.25     // 0.25
  },
  ttfb: {
    good: 200,     // 200ms
    poor: 500      // 500ms
  },
  resourceCount: {
    good: 70,      // 70 resources
    poor: 150      // 150 resources
  },
  domSize: {
    good: 1500,    // 1500 nodes
    poor: 3000     // 3000 nodes
  },
  jsHeapSize: {
    good: 40,      // 40MB
    poor: 80       // 80MB
  },
  totalLoadTime: {
    good: 3000,    // 3s
    poor: 5000     // 5s
  }
};

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

// Helper function to calculate individual metric scores on 0-100 scale
function calculateMetricScore(value: number, good: number, poor: number): number {
  if (value <= good) return 100;
  if (value >= poor) return 0;
  // Linear interpolation between good and poor thresholds
  return Math.round(100 - ((value - good) / (poor - good)) * 100);
}

function calculateScore(metrics: PerformanceMetrics): number {
  const scores = {
    lcp: calculateMetricScore(metrics.lcp, THRESHOLDS.lcp.good, THRESHOLDS.lcp.poor),
    tbt: calculateMetricScore(metrics.tbt, THRESHOLDS.tbt.good, THRESHOLDS.tbt.poor),
    cls: calculateMetricScore(metrics.cls, THRESHOLDS.cls.good, THRESHOLDS.cls.poor),
    ttfb: calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb.good, THRESHOLDS.ttfb.poor),
    resourceCount: calculateMetricScore(metrics.resourceCount, THRESHOLDS.resourceCount.good, THRESHOLDS.resourceCount.poor),
    domSize: calculateMetricScore(metrics.domSize, THRESHOLDS.domSize.good, THRESHOLDS.domSize.poor),
    jsHeapSize: calculateMetricScore(metrics.jsHeapSize, THRESHOLDS.jsHeapSize.good, THRESHOLDS.jsHeapSize.poor),
    totalLoadTime: calculateMetricScore(metrics.totalLoadTime, THRESHOLDS.totalLoadTime.good, THRESHOLDS.totalLoadTime.poor)
  };

  // Calculate weighted average (all metrics have equal weight)
  return Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length);
}

function getRating(score: number): { rating: string; color: string } {
  if (score >= 90) return { rating: 'EXCELLENT', color: '\x1b[32m' }; // Green
  if (score >= 75) return { rating: 'VERY GOOD', color: '\x1b[36m' }; // Cyan
  if (score >= 60) return { rating: 'GOOD', color: '\x1b[34m' }; // Blue
  if (score >= 45) return { rating: 'FAIR', color: '\x1b[33m' }; // Yellow
  if (score >= 30) return { rating: 'NEEDS IMPROVEMENT', color: '\x1b[35m' }; // Magenta
  return { rating: 'POOR', color: '\x1b[31m' }; // Red
}

test.describe('Competitor Performance Analysis', () => {
  const results: Array<{
    name: string;
    metrics: PerformanceMetrics;
    score: number;
    rating: string;
    concurrentMetrics?: {
      avgResponseTime: number;
      errorRate: number;
      maxQueueLength: number;
    };
  }> = [];

  for (const competitor of COMPETITORS) {
    test(`Performance test for ${competitor.name}`, async ({ page, browser }, testInfo) => {
      console.log(`\nTesting ${competitor.name} (${competitor.url})`);
      console.log(`Browser: ${testInfo.project.use.browserName}`);
      console.log('='.repeat(80));

      // Basic Performance Test
      const startTime = Date.now();
      await page.goto(competitor.url, { waitUntil: 'networkidle' });
      
      // Collect Core Web Vitals and basic metrics
      const metrics = await page.evaluate(() => {
        return new Promise<PerformanceMetrics>((resolve) => {
          let lcp = 0;
          let cls = 0;
          let tbt = 0;
          let ttfb = 0;
          
          // LCP with timeout handling
          const lcpTimeout = setTimeout(() => {
            resolve({
              lcp: 0,
              tbt,
              cls,
              ttfb,
              resourceCount: performance.getEntriesByType('resource').length,
              domSize: document.getElementsByTagName('*').length,
              jsHeapSize: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
              totalLoadTime: performance.now()
            });
          }, 5000);

          // LCP
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
              clearTimeout(lcpTimeout);
              lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          // CLS
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              const layoutShift = entry as LayoutShift;
              if (!layoutShift.hadRecentInput) {
                cls += layoutShift.value;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });

          // TBT
          let totalBlockingTime = 0;
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (entry.duration > 50) {
                totalBlockingTime += entry.duration - 50;
              }
            }
            tbt = totalBlockingTime;
          }).observe({ type: 'longtask', buffered: true });

          // TTFB
          const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          ttfb = navigationEntry.responseStart - navigationEntry.requestStart;

          // Wait for metrics to be collected
          setTimeout(() => {
            clearTimeout(lcpTimeout);
            resolve({
              lcp,
              tbt,
              cls,
              ttfb,
              resourceCount: performance.getEntriesByType('resource').length,
              domSize: document.getElementsByTagName('*').length,
              jsHeapSize: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
              totalLoadTime: performance.now()
            });
          }, 5000);
        });
      });

      // Concurrent User Test (simplified)
      const NUM_CONCURRENT_USERS = 3;
      const contexts = await Promise.all(
        Array(NUM_CONCURRENT_USERS).fill(null).map(() => browser.newContext())
      );
      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      );

      const serverMetrics = {
        responseTimes: [] as number[],
        errors: 0,
        queueLength: 0,
        maxQueueLength: 0
      };

      // Simplified concurrent testing
      await Promise.all(pages.map(async (page) => {
        page.on('request', () => {
          serverMetrics.queueLength++;
          serverMetrics.maxQueueLength = Math.max(serverMetrics.maxQueueLength, serverMetrics.queueLength);
        });
        
        page.on('response', (response) => {
          serverMetrics.queueLength--;
          if (!response.ok()) serverMetrics.errors++;
        });

        await page.goto(competitor.url, { waitUntil: 'networkidle' });
      }));

      const avgResponseTime = serverMetrics.responseTimes.length > 0 
        ? serverMetrics.responseTimes.reduce((a, b) => a + b, 0) / serverMetrics.responseTimes.length 
        : 0;
      const errorRate = serverMetrics.errors / (NUM_CONCURRENT_USERS * 2);

      const score = calculateScore(metrics);
      const { rating, color } = getRating(score);
      
      results.push({
        name: competitor.name,
        metrics,
        score,
        rating,
        concurrentMetrics: {
          avgResponseTime,
          errorRate,
          maxQueueLength: serverMetrics.maxQueueLength
        }
      });

      // Print simplified results
      console.log('\nPerformance Metrics:');
      console.log('-'.repeat(40));
      if (metrics.lcp > 0) {
        console.log(`LCP: ${metrics.lcp.toFixed(0)}ms (${calculateMetricScore(metrics.lcp, THRESHOLDS.lcp.good, THRESHOLDS.lcp.poor)}/100)`);
      } else {
        console.log('LCP: Failed to measure (timeout)');
      }
      console.log(`TBT: ${metrics.tbt.toFixed(0)}ms (${calculateMetricScore(metrics.tbt, THRESHOLDS.tbt.good, THRESHOLDS.tbt.poor)}/100)`);
      console.log(`CLS: ${metrics.cls.toFixed(3)} (${calculateMetricScore(metrics.cls, THRESHOLDS.cls.good, THRESHOLDS.cls.poor)}/100)`);
      console.log(`TTFB: ${metrics.ttfb.toFixed(0)}ms (${calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb.good, THRESHOLDS.ttfb.poor)}/100)`);
      
      console.log('\nConcurrent User Test Results:');
      console.log('-'.repeat(40));
      console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`Error Rate: ${(errorRate * 100).toFixed(1)}%`);
      console.log(`Maximum Queue Length: ${serverMetrics.maxQueueLength}`);
      
      console.log('\nOverall Score:');
      console.log('-'.repeat(40));
      console.log(`Score: ${score}/100`);
      console.log(`Rating: ${color}${rating}\x1b[0m`);

      await Promise.all(contexts.map(context => context.close()));
    });
  }

  test.afterAll(async () => {
    // Sort results by score
    results.sort((a, b) => b.score - a.score);

    // Print Executive Summary
    console.log('\n📊 PERFORMANCE ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    
    // Overall Industry Health
    const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    const { rating: avgRating, color: avgColor } = getRating(avgScore);

    console.log('\n🏢 INDUSTRY OVERVIEW');
    console.log('-'.repeat(40));
    console.log(`Industry Average: ${avgColor}${avgScore}/100 (${avgRating})\x1b[0m`);
    console.log(`Total Providers Analyzed: ${results.length}`);
    
    // Top Performers
    console.log('\n🏆 TOP PERFORMERS');
    console.log('-'.repeat(40));
    results.slice(0, 3).forEach((result, index) => {
      const { rating, color } = getRating(result.score);
      console.log(`${index + 1}. ${result.name.padEnd(20)} ${color}${result.score}/100 (${rating})\x1b[0m`);
    });

    // Service Comparison
    console.log('\n📊 SERVICE COMPARISON');
    console.log('-'.repeat(40));
    
    const alloServices = {
      fiberInternet: true,
      fiberTV: true,
      fiberPhone: true,
      mobilePhone: true,
      smartTown: true,
      wifiExperience: true,
      outdoorWifi: true,
      fiberStreaming: true,
      bark: true
    };

    COMPETITORS.forEach(competitor => {
      const matchingServices = Object.entries(competitor.services)
        .filter(([service, available]) => available && alloServices[service as keyof typeof alloServices])
        .length;
      const totalServices = Object.keys(alloServices).length;
      const matchPercentage = (matchingServices / totalServices) * 100;
      
      console.log(`\n${competitor.name}:`);
      console.log(`  Service Match: ${matchPercentage.toFixed(1)}% of ALLO services`);
      console.log(`  Performance Score: ${results.find(r => r.name === competitor.name)?.score}/100`);
    });

    // Performance Comparison
    console.log('\n📈 PERFORMANCE COMPARISON');
    console.log('-'.repeat(40));
    console.log('Provider'.padEnd(20) + 'Score'.padEnd(10) + 'LCP'.padEnd(10) + 'TBT'.padEnd(10) + 'CLS'.padEnd(10) + 'TTFB'.padEnd(10) + 'Concurrent Score');
    console.log('-'.repeat(80));
    
    results.forEach(result => {
      const { rating, color } = getRating(result.score);
      const concurrentScore = result.concurrentMetrics 
        ? calculateConcurrentScore(result.concurrentMetrics)
        : 0;
      
      console.log(
        result.name.padEnd(20) +
        `${color}${result.score}/100\x1b[0m`.padEnd(10) +
        `${result.metrics.lcp.toFixed(0)}ms`.padEnd(10) +
        `${result.metrics.tbt.toFixed(0)}ms`.padEnd(10) +
        `${result.metrics.cls.toFixed(3)}`.padEnd(10) +
        `${result.metrics.ttfb.toFixed(0)}ms`.padEnd(10) +
        `${concurrentScore}/100`
      );
    });
  });
});

// Helper function to calculate concurrent performance score
function calculateConcurrentScore(metrics: { avgResponseTime: number; errorRate: number; maxQueueLength: number }): number {
  const responseScore = calculateMetricScore(metrics.avgResponseTime, 200, 500);
  const errorScore = calculateMetricScore(metrics.errorRate * 100, 1, 5);
  const queueScore = calculateMetricScore(metrics.maxQueueLength, 5, 20);
  
  return Math.round((responseScore + errorScore + queueScore) / 3);
}

// Helper function to identify leading metrics
function getLeadingMetrics(best: PerformanceMetrics, worst: PerformanceMetrics): string {
  const leadingMetrics: string[] = [];
  if (best.lcp < worst.lcp) leadingMetrics.push('LCP');
  if (best.tbt < worst.tbt) leadingMetrics.push('TBT');
  if (best.cls < worst.cls) leadingMetrics.push('CLS');
  if (best.ttfb < worst.ttfb) leadingMetrics.push('TTFB');
  return leadingMetrics.join(', ');
}

// Helper function to identify competitive advantages
function getCompetitiveAdvantages(allo: { metrics: PerformanceMetrics, score: number }, allResults: Array<{ metrics: PerformanceMetrics, score: number }>): string[] {
  const advantages: string[] = [];
  const avgLCP = allResults.reduce((sum, r) => sum + r.metrics.lcp, 0) / allResults.length;
  const avgTBT = allResults.reduce((sum, r) => sum + r.metrics.tbt, 0) / allResults.length;
  const avgCLS = allResults.reduce((sum, r) => sum + r.metrics.cls, 0) / allResults.length;
  const avgTTFB = allResults.reduce((sum, r) => sum + r.metrics.ttfb, 0) / allResults.length;

  if (allo.metrics.lcp < avgLCP * 0.9) advantages.push(`LCP ${Math.round((1 - allo.metrics.lcp/avgLCP) * 100)}% faster than average`);
  if (allo.metrics.tbt < avgTBT * 0.9) advantages.push(`TBT ${Math.round((1 - allo.metrics.tbt/avgTBT) * 100)}% better than average`);
  if (allo.metrics.cls < avgCLS * 0.9) advantages.push(`CLS ${Math.round((1 - allo.metrics.cls/avgCLS) * 100)}% better than average`);
  if (allo.metrics.ttfb < avgTTFB * 0.9) advantages.push(`TTFB ${Math.round((1 - allo.metrics.ttfb/avgTTFB) * 100)}% faster than average`);

  return advantages;
} 