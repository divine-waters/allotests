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
    seoMetrics?: {
      titleLength: number;
      metaDescription: boolean;
      h1Count: number;
      imageAlts: number;
      mobileFriendly: boolean;
      sslSecure: boolean;
      loadTime: number;
      responseTime: number;
    };
  }> = [];

  for (const competitor of COMPETITORS) {
    test(`Performance test for ${competitor.name}`, async ({ page, browser }, testInfo) => {
      const browserName = testInfo.project.use.browserName;
      console.log(`\nTesting ${competitor.name} (${browserName})`);
      
      // Basic Performance Test with more lenient navigation strategy
      const startTime = Date.now();
      try {
        // First try with domcontentloaded, then wait for load
        await page.goto(competitor.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 45000 // Increase timeout to 45 seconds
        });
        await page.waitForLoadState('load', { timeout: 15000 });
      } catch (error) {
        console.log(`Warning: Navigation timeout for ${competitor.name}, proceeding with available metrics`);
      }
      
      // Collect performance metrics with timeout handling
      const metrics = await Promise.race([
        page.evaluate(() => {
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
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navEntry) {
              ttfb = navEntry.responseStart - navEntry.requestStart;
            }

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
        }),
        new Promise<PerformanceMetrics>((_, reject) => 
          setTimeout(() => reject(new Error('Metrics collection timeout')), 10000)
        )
      ]).catch(() => ({
        lcp: 0,
        tbt: 0,
        cls: 0,
        ttfb: 0,
        resourceCount: 0,
        domSize: 0,
        jsHeapSize: 0,
        totalLoadTime: 0
      }));

      // Collect SEO metrics with error handling
      const seoMetrics = await page.evaluate(() => {
        try {
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            titleLength: document.title.length,
            metaDescription: !!document.querySelector('meta[name="description"]'),
            h1Count: document.getElementsByTagName('h1').length,
            imageAlts: Array.from(document.getElementsByTagName('img')).filter(img => img.alt).length,
            mobileFriendly: !!document.querySelector('meta[name="viewport"]'),
            sslSecure: window.location.protocol === 'https:',
            loadTime: performance.now(),
            responseTime: navEntry?.responseEnd || 0
          };
        } catch (error) {
          return {
            titleLength: 0,
            metaDescription: false,
            h1Count: 0,
            imageAlts: 0,
            mobileFriendly: false,
            sslSecure: false,
            loadTime: 0,
            responseTime: 0
          };
        }
      });

      const score = calculateScore(metrics);
      const { rating, color } = getRating(score);
      
      // Store results for final summary
      results.push({
        name: competitor.name,
        metrics,
        score,
        rating,
        seoMetrics
      });
    });
  }

  test.afterAll(async () => {
    if (results.length === 0) {
      console.log('\n⚠️ No test results were collected. Check test execution for errors.');
      return;
    }

    // Sort results by score
    results.sort((a, b) => b.score - a.score);

    // Print Executive Summary
    console.log('\n📊 WEBSITE PERFORMANCE ANALYSIS');
    console.log('='.repeat(80));
    
    // Performance Rankings
    console.log('\n🏆 PERFORMANCE RANKINGS');
    console.log('-'.repeat(40));
    results.forEach((result, index) => {
      const { rating, color } = getRating(result.score);
      
      console.log(`${index + 1}. ${result.name.padEnd(25)} ${color}${result.score}/100\x1b[0m (${rating})`);
      console.log(`   Core Web Vitals:`);
      console.log(`   - LCP: ${result.metrics.lcp.toFixed(0)}ms (${getMetricStatus(result.metrics.lcp, THRESHOLDS.lcp)})`);
      console.log(`   - TBT: ${result.metrics.tbt.toFixed(0)}ms (${getMetricStatus(result.metrics.tbt, THRESHOLDS.tbt)})`);
      console.log(`   - CLS: ${result.metrics.cls.toFixed(3)} (${getMetricStatus(result.metrics.cls, THRESHOLDS.cls)})`);
      console.log(`   - TTFB: ${result.metrics.ttfb.toFixed(0)}ms (${getMetricStatus(result.metrics.ttfb, THRESHOLDS.ttfb)})`);
    });

    // SEO & Technical Metrics
    console.log('\n🔍 SEO & TECHNICAL METRICS');
    console.log('-'.repeat(40));
    console.log('Provider'.padEnd(25) + 'Load Time'.padEnd(12) + 'Response'.padEnd(12) + 'SSL'.padEnd(8) + 'Mobile'.padEnd(8) + 'SEO Score');
    console.log('-'.repeat(65));
    
    results.forEach(result => {
      if (!result.seoMetrics) return;
      
      const seoScore = calculateSEOScore(result.seoMetrics);
      const { rating: seoRating, color: seoColor } = getRating(seoScore);
      
      console.log(
        result.name.padEnd(25) +
        `${result.seoMetrics.loadTime.toFixed(0)}ms`.padEnd(12) +
        `${result.seoMetrics.responseTime.toFixed(0)}ms`.padEnd(12) +
        (result.seoMetrics.sslSecure ? '✓'.padEnd(8) : '✗'.padEnd(8)) +
        (result.seoMetrics.mobileFriendly ? '✓'.padEnd(8) : '✗'.padEnd(8)) +
        `${seoColor}${seoScore}/100\x1b[0m (${seoRating})`
      );
    });

    // Performance Insights
    console.log('\n💡 PERFORMANCE INSIGHTS');
    console.log('-'.repeat(40));
    
    // Compare ALLO with competitors
    const alloResult = results.find(r => r.name === 'ALLO Communications');
    if (alloResult) {
      const competitors = results.filter(r => r.name !== 'ALLO Communications');
      
      // Performance advantages
      const advantages = competitors.filter(c => alloResult.score > c.score);
      if (advantages.length > 0) {
        console.log('Performance Advantages:');
        advantages.forEach(c => {
          const metricDiffs = {
            lcp: alloResult.metrics.lcp - c.metrics.lcp,
            tbt: alloResult.metrics.tbt - c.metrics.tbt,
            cls: alloResult.metrics.cls - c.metrics.cls,
            ttfb: alloResult.metrics.ttfb - c.metrics.ttfb
          };
          
          console.log(`\nvs ${c.name}:`);
          if (metricDiffs.lcp < 0) console.log(`- LCP is ${Math.abs(metricDiffs.lcp).toFixed(0)}ms faster`);
          if (metricDiffs.tbt < 0) console.log(`- TBT is ${Math.abs(metricDiffs.tbt).toFixed(0)}ms better`);
          if (metricDiffs.cls < 0) console.log(`- CLS is ${Math.abs(metricDiffs.cls).toFixed(3)} better`);
          if (metricDiffs.ttfb < 0) console.log(`- TTFB is ${Math.abs(metricDiffs.ttfb).toFixed(0)}ms faster`);
        });
      }

      // Technical advantages
      if (alloResult.seoMetrics) {
        const technicalAdvantages = competitors
          .filter(c => c.seoMetrics)
          .map(c => {
            const advantages: string[] = [];
            if (alloResult.seoMetrics!.loadTime < c.seoMetrics!.loadTime) {
              advantages.push(`Load time is ${(c.seoMetrics!.loadTime - alloResult.seoMetrics!.loadTime).toFixed(0)}ms faster`);
            }
            if (alloResult.seoMetrics!.responseTime < c.seoMetrics!.responseTime) {
              advantages.push(`Response time is ${(c.seoMetrics!.responseTime - alloResult.seoMetrics!.responseTime).toFixed(0)}ms faster`);
            }
            return { name: c.name, advantages };
          })
          .filter(a => a.advantages.length > 0);

        if (technicalAdvantages.length > 0) {
          console.log('\nTechnical Advantages:');
          technicalAdvantages.forEach(a => {
            console.log(`\nvs ${a.name}:`);
            a.advantages.forEach(adv => console.log(`- ${adv}`));
          });
        }
      }
    }
  });
});

// Helper function to get metric status
function getMetricStatus(value: number, threshold: { good: number; poor: number }): string {
  if (value <= threshold.good) return '\x1b[32mGOOD\x1b[0m';
  if (value >= threshold.poor) return '\x1b[31mPOOR\x1b[0m';
  return '\x1b[33mNEEDS IMPROVEMENT\x1b[0m';
}

// Helper function to calculate SEO score
function calculateSEOScore(seoMetrics: { titleLength: number; metaDescription: boolean; h1Count: number; imageAlts: number; mobileFriendly: boolean; sslSecure: boolean; loadTime: number; responseTime: number }): number {
  const score = (seoMetrics.titleLength + (seoMetrics.metaDescription ? 1 : 0) + seoMetrics.h1Count + seoMetrics.imageAlts + (seoMetrics.mobileFriendly ? 1 : 0) + (seoMetrics.sslSecure ? 1 : 0)) / 6;
  return Math.round(score * 100);
} 