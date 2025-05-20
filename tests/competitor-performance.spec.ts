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
  }
];

// Performance thresholds based on Core Web Vitals
const THRESHOLDS = {
  lcp: {
    good: 2500,    // 2.5s
    poor: 4000     // 4s
  },
  cls: {
    good: 0.1,     // 0.1
    poor: 0.25     // 0.25
  },
  ttfb: {
    good: 200,     // 200ms
    poor: 500      // 500ms
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

// Add interface for PerformanceNavigationTiming
interface PerformanceNavigationTiming extends PerformanceEntry {
  responseEnd: number;
  responseStart: number;
  requestStart: number;
}

// Helper function to calculate individual metric scores on 0-100 scale
function calculateMetricScore(value: number, good: number, poor: number): number {
  if (value <= good) return 100;
  if (value >= poor) return 0;
  // Linear interpolation between good and poor thresholds
  return Math.round(100 - ((value - good) / (poor - good)) * 100);
}

function calculateScore(metrics: { lcp: number; cls: number; ttfb: number }): number {
  const scores = {
    lcp: calculateMetricScore(metrics.lcp, THRESHOLDS.lcp.good, THRESHOLDS.lcp.poor),
    cls: calculateMetricScore(metrics.cls, THRESHOLDS.cls.good, THRESHOLDS.cls.poor),
    ttfb: calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb.good, THRESHOLDS.ttfb.poor)
  };

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
    metrics: {
      lcp: number;
      cls: number;
      ttfb: number;
    };
    score: number;
    rating: string;
  }> = [];

  for (const competitor of COMPETITORS) {
    test(`Performance test for ${competitor.name}`, async ({ page }, testInfo) => {
      const browserName = testInfo.project.use.browserName;
      
      // Basic Performance Test with more lenient navigation strategy
      try {
        await page.goto(competitor.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 20000 // 20 second timeout
        });
        await page.waitForLoadState('load', { timeout: 10000 });
      } catch (error) {
        console.log(`Warning: Navigation timeout for ${competitor.name}, proceeding with available metrics`);
      }
      
      // Collect only essential metrics
      const metrics = await Promise.race([
        page.evaluate(() => {
          return new Promise<{ lcp: number; cls: number; ttfb: number }>((resolve) => {
            let lcp = 0;
            let cls = 0;
            let ttfb = 0;
            
            // LCP
            new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              if (entries.length > 0) {
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

            // TTFB
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navEntry) {
              ttfb = navEntry.responseStart - navEntry.requestStart;
            }

            // Resolve after 3 seconds
            setTimeout(() => resolve({ lcp, cls, ttfb }), 3000);
          });
        }),
        new Promise<{ lcp: number; cls: number; ttfb: number }>((_, reject) => 
          setTimeout(() => reject(new Error('Metrics collection timeout')), 5000)
        )
      ]).catch(() => ({
        lcp: 0,
        cls: 0,
        ttfb: 0
      }));

      const score = calculateScore(metrics);
      const { rating } = getRating(score);
      
      results.push({
        name: competitor.name,
        metrics,
        score,
        rating
      });
    });
  }

  test.afterAll(async () => {
    if (results.length === 0) {
      console.log('\n⚠️ No test results were collected.');
      return;
    }

    // Sort results by score
    results.sort((a, b) => b.score - a.score);

    // Print Performance Summary
    console.log('\n📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    
    // Performance Rankings
    results.forEach((result, index) => {
      const { rating, color } = getRating(result.score);
      
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   Score: ${color}${result.score}/100\x1b[0m (${rating})`);
      console.log(`   LCP: ${result.metrics.lcp.toFixed(0)}ms (${getMetricStatus(result.metrics.lcp, THRESHOLDS.lcp)})`);
      console.log(`   CLS: ${result.metrics.cls.toFixed(3)} (${getMetricStatus(result.metrics.cls, THRESHOLDS.cls)})`);
      console.log(`   TTFB: ${result.metrics.ttfb.toFixed(0)}ms (${getMetricStatus(result.metrics.ttfb, THRESHOLDS.ttfb)})`);
    });

    // Performance Insights
    console.log('\n💡 KEY INSIGHTS');
    console.log('-'.repeat(40));
    
    const alloResult = results.find(r => r.name === 'ALLO Communications');
    if (alloResult) {
      const competitors = results.filter(r => r.name !== 'ALLO Communications');
      
      // Compare with competitors
      competitors.forEach(c => {
        const metricDiffs = {
          lcp: alloResult.metrics.lcp - c.metrics.lcp,
          cls: alloResult.metrics.cls - c.metrics.cls,
          ttfb: alloResult.metrics.ttfb - c.metrics.ttfb
        };
        
        console.log(`\nvs ${c.name}:`);
        if (metricDiffs.lcp < 0) console.log(`- LCP is ${Math.abs(metricDiffs.lcp).toFixed(0)}ms faster`);
        if (metricDiffs.cls < 0) console.log(`- CLS is ${Math.abs(metricDiffs.cls).toFixed(3)} better`);
        if (metricDiffs.ttfb < 0) console.log(`- TTFB is ${Math.abs(metricDiffs.ttfb).toFixed(0)}ms faster`);
      });
    }
  });
});

// Helper function to get metric status
function getMetricStatus(value: number, threshold: { good: number; poor: number }): string {
  if (value <= threshold.good) return '\x1b[32mGOOD\x1b[0m';
  if (value >= threshold.poor) return '\x1b[31mPOOR\x1b[0m';
  return '\x1b[33mNEEDS IMPROVEMENT\x1b[0m';
} 