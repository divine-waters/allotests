import { test, expect } from '@playwright/test';
import { calculateScore, getRating, getMetricStatus, printTestHeader, printTestFooter } from './utils'; // Import from utils
import { THRESHOLDS } from './constants';


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

// Add interface for LayoutShift entry (needed for PerformanceObserver)
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

// Add interface for PerformanceNavigationTiming (needed for TTFB)
// Add interface for PerformanceNavigationTiming
interface PerformanceNavigationTiming extends PerformanceEntry {
  responseEnd: number;
  responseStart: number;
  requestStart: number;
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
      printTestHeader(`Competitor Analysis: ${competitor.name}`);
      
      // Basic Performance Test with more lenient navigation strategy
      try {
        await page.goto(competitor.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 20000 // 20 second timeout
        });
        console.log(`✅ Successfully navigated to ${competitor.url}`);
        
        await page.waitForLoadState('load', { timeout: 15000 });
        console.log(`✅ Page fully loaded for ${competitor.name}`);
        
        // Log initial performance metrics
        const initialMetrics = await page.evaluate(() => ({
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          resourceCount: performance.getEntriesByType('resource').length,
          domSize: document.getElementsByTagName('*').length
        }));
        console.log(`📊 Initial Metrics for ${competitor.name}:`);
        console.log(`   - DOM Content Loaded: ${initialMetrics.domContentLoaded}ms`);
        console.log(`   - Total Load Time: ${initialMetrics.loadTime}ms`);
        console.log(`   - Resource Count: ${initialMetrics.resourceCount}`);
        console.log(`   - DOM Size: ${initialMetrics.domSize} nodes`);
      } catch (error) {
        console.log(`⚠️ Warning: Navigation timeout for ${competitor.name}, proceeding with available metrics`);
      }
      
      // Collect only essential metrics
      const metrics = await Promise.race([
        page.evaluate((thresholds) => { // Pass thresholds to the evaluate context
          return new Promise<{ lcp: number; cls: number; ttfb: number }>((resolve) => {
            let lcp = 0;
            let cls = 0;
            let ttfb = 0;
            let lcpResolved = false;
            let clsResolved = false;
            let clsTimeout: NodeJS.Timeout | null = null;
            
            // Final timeout to ensure the promise eventually resolves
            const finalTimeout = setTimeout(() => {
                console.log(`⚠️ Final metrics collection timeout reached inside evaluate.`);
                resolve({ lcp, cls, ttfb }); // Resolve with whatever we have
            }, 15000); // Increased timeout inside evaluate

            // LCP
            const lcpObserver = new PerformanceObserver((entryList) => {
              const entries = entryList.getEntries();
              if (entries.length > 0) {
                lcp = entries[entries.length - 1].startTime;
                console.log(`✅ LCP recorded: ${lcp.toFixed(0)}ms`);
                lcpResolved = true;
                checkCompletion();
              }
            }).observe({ type: 'largest-contentful-paint', buffered: true });

            // CLS
            const clsObserver = new PerformanceObserver((entryList) => {
              for (const entry of entryList.getEntries()) {
                const layoutShift = entry as LayoutShift;
                if (!layoutShift.hadRecentInput) {
                  cls += layoutShift.value;
                  console.log(`✅ CLS updated: ${cls.toFixed(3)}`);
                  // Reset the CLS stability timeout whenever a shift occurs
                  if (clsTimeout) clearTimeout(clsTimeout);
                  clsTimeout = setTimeout(() => {
                      console.log(`✅ CLS stability detected.`);
                      clsResolved = true;
                      checkCompletion();
                  }, 1000); // Consider CLS stable if no shifts for 1 second
                }
              }
            }).observe({ type: 'layout-shift', buffered: true });

            // TTFB
            // TTFB is usually available after navigation. Try to get it immediately.
            // If not available, it will remain 0 initially and might be updated later
            // if the navigation entry becomes available before the timeout.
            // A more robust way might be to poll or wait for the navigation entry.
            // For now, let's get it once.
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries.length > 0) {
                const navEntry = navEntries[0] as PerformanceNavigationTiming;
                ttfb = navEntry.responseStart - navEntry.requestStart;
                console.log(`✅ TTFB recorded: ${ttfb.toFixed(0)}ms`);
            }
            
            // Function to check if we have enough data to resolve
            function checkCompletion() {
                // Resolve once LCP is recorded AND CLS is stable
                if (lcpResolved && clsResolved) {
                    clearTimeout(finalTimeout); // Clear the final timeout
                    if (clsTimeout) clearTimeout(clsTimeout); // Clear the CLS stability timeout
                    console.log(`✅ All core metrics collected.`);
                    resolve({ lcp, cls, ttfb });
                }
            }
          });
        }, THRESHOLDS), // Pass THRESHOLDS to the evaluate context
        // This outer timeout is a safeguard in case the inner evaluate promise hangs
        new Promise<{ lcp: number; cls: number; ttfb: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Outer metrics collection timeout')), 20000) // Increased outer timeout
        ) // Outer timeout should be longer than inner timeout
      ]).catch((error) => {
        console.log(`⚠️ Warning: ${error.message} for ${competitor.name}`);
        return {
          lcp: 0,
          cls: 0,
          ttfb: 0
        };
      });

      const score = calculateScore(metrics);
      const { rating, color } = getRating(score);
      
      console.log(`\n📈 Performance Score for ${competitor.name}:`);
      console.log(`   Score: ${color}${score}/100\x1b[0m (${rating})`);
      
      // LCP Analysis
      const lcpStatus = getMetricStatus(metrics.lcp, THRESHOLDS.lcp);
      console.log(`   LCP: ${metrics.lcp.toFixed(0)}ms (${lcpStatus})`);
      if (metrics.lcp > THRESHOLDS.lcp.poor) {
        console.log('     ⚠️ LCP needs improvement');
        console.log('     Recommendations:');
        console.log('     - Optimize largest contentful paint element');
        console.log('     - Review server response time');
        console.log('     - Consider using a CDN');
      } else if (metrics.lcp <= THRESHOLDS.lcp.excellent) {
        console.log('     ✅ Excellent LCP performance!');
      } else if (metrics.lcp <= THRESHOLDS.lcp.veryGood) {
        console.log('     🌟 Very good LCP performance');
      } else {
        console.log('     ✅ LCP is within acceptable range');
      }

      // CLS Analysis
      const clsStatus = getMetricStatus(metrics.cls, THRESHOLDS.cls);
      console.log(`   CLS: ${metrics.cls.toFixed(3)} (${clsStatus})`);
      if (metrics.cls > THRESHOLDS.cls.poor) {
        console.log('     ⚠️ CLS needs improvement');
        console.log('     Recommendations:');
        console.log('     - Review layout shifts during page load');
        console.log('     - Set explicit dimensions for media');
        console.log('     - Avoid inserting content above existing content');
      } else if (metrics.cls <= THRESHOLDS.cls.excellent) {
        console.log('     ✅ Excellent CLS performance!');
      } else if (metrics.cls <= THRESHOLDS.cls.veryGood) {
        console.log('     🌟 Very good CLS performance');
      } else {
        console.log('     ✅ CLS is within acceptable range');
      }

      // TTFB Analysis
      const ttfbStatus = getMetricStatus(metrics.ttfb, THRESHOLDS.ttfb);
      console.log(`   TTFB: ${metrics.ttfb.toFixed(0)}ms (${ttfbStatus})`);
      if (metrics.ttfb > THRESHOLDS.ttfb.poor) {
        console.log('     ⚠️ TTFB needs improvement');
        console.log('     Recommendations:');
        console.log('     - Optimize server response time');
        console.log('     - Review server-side caching');
        console.log('     - Consider using a CDN');
      } else if (metrics.ttfb <= THRESHOLDS.ttfb.excellent) {
        console.log('     ✅ Excellent TTFB performance!');
      } else if (metrics.ttfb <= THRESHOLDS.ttfb.veryGood) {
        console.log('     🌟 Very good TTFB performance');
      } else {
        console.log('     ✅ TTFB is within acceptable range');
      }

      // Overall Performance Summary
      const passingMetrics = [
        metrics.lcp <= THRESHOLDS.lcp.good,
        metrics.cls <= THRESHOLDS.cls.good,
        metrics.ttfb <= THRESHOLDS.ttfb.good
      ].filter(Boolean).length;

      const totalMetrics = 3;
      const performanceScore = (passingMetrics / totalMetrics) * 100;

      console.log(`\n📊 Overall Performance Summary for ${competitor.name}:`);
      console.log(`   ${passingMetrics}/${totalMetrics} metrics passing thresholds`);
      
      if (performanceScore === 100) {
        console.log('   🏆 All metrics are excellent or very good!');
      } else if (performanceScore >= 66) {
        console.log('   🌟 Most metrics are within acceptable range');
      } else if (performanceScore >= 33) {
        console.log('   ⚠️ Some metrics need improvement');
      } else {
        console.log('   ❌ Most metrics need significant improvement');
      }
      
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

    // Sort results by score in descending order
    results.sort((a, b) => b.score - a.score);

    printTestHeader('Competitor Performance Rankings');
    
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
        if (metricDiffs.lcp !== 0) {
          const diff = Math.abs(metricDiffs.lcp);
          console.log(`- LCP is ${diff.toFixed(0)}ms ${metricDiffs.lcp < 0 ? 'faster' : 'slower'}`);
        }
        if (metricDiffs.cls !== 0) {
          const diff = Math.abs(metricDiffs.cls);
          console.log(`- CLS is ${diff.toFixed(3)} ${metricDiffs.cls < 0 ? 'better' : 'worse'}`);
        }
        if (metricDiffs.ttfb !== 0) {
          const diff = Math.abs(metricDiffs.ttfb);
          console.log(`- TTFB is ${diff.toFixed(0)}ms ${metricDiffs.ttfb < 0 ? 'faster' : 'slower'}`);
        }
      });
    }
    
    printTestFooter();
  });
}); 

// Move these functions to utils.ts
/*
// Helper function to calculate individual metric scores on 0-100 scale with more granular scoring
function calculateMetricScore(value: number, thresholds: { excellent: number; veryGood: number; good: number; poor: number }): number {
  if (value <= thresholds.excellent) return 100;
  if (value <= thresholds.veryGood) {
    // Linear interpolation between excellent and very good
    return Math.round(90 + ((thresholds.veryGood - value) / (thresholds.veryGood - thresholds.excellent)) * 10);
  }
  if (value <= thresholds.good) {
    // Linear interpolation between very good and good
    return Math.round(80 + ((thresholds.good - value) / (thresholds.good - thresholds.veryGood)) * 10);
  }
  if (value <= thresholds.poor) {
    // Linear interpolation between good and poor
    return Math.round(40 + ((thresholds.poor - value) / (thresholds.poor - thresholds.good)) * 40);
  }
  return Math.max(0, Math.round(40 * (thresholds.poor / value)));
}

function calculateScore(metrics: { lcp: number; cls: number; ttfb: number }): number {
  const scores = {
    lcp: calculateMetricScore(metrics.lcp, THRESHOLDS.lcp),
    cls: calculateMetricScore(metrics.cls, THRESHOLDS.cls),
    ttfb: calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb)
  };

  // Weight the metrics (LCP is most important, then TTFB, then CLS)
  const weightedScore = (scores.lcp * 0.5) + (scores.ttfb * 0.3) + (scores.cls * 0.2);
  return Math.round(weightedScore);
}

function getRating(score: number): { rating: string; color: string } {
  if (score >= 95) return { rating: 'EXCELLENT', color: '\x1b[32m' }; // Green
  if (score >= 85) return { rating: 'VERY GOOD', color: '\x1b[36m' }; // Cyan
  if (score >= 75) return { rating: 'GOOD', color: '\x1b[34m' }; // Blue
  if (score >= 65) return { rating: 'FAIR', color: '\x1b[33m' }; // Yellow
  if (score >= 50) return { rating: 'NEEDS IMPROVEMENT', color: '\x1b[35m' }; // Magenta
  return { rating: 'POOR', color: '\x1b[31m' }; // Red
}

// Helper function to get metric status with more granular ratings
function getMetricStatus(value: number, threshold: { excellent: number; veryGood: number; good: number; poor: number }): string {
  if (value <= threshold.excellent) return '\x1b[32mEXCELLENT\x1b[0m';
  if (value <= threshold.veryGood) return '\x1b[92mVERY GOOD\x1b[0m';
  if (value <= threshold.good) return '\x1b[34mGOOD\x1b[0m';
  if (value <= threshold.poor) return '\x1b[33mNEEDS IMPROVEMENT\x1b[0m';
  return '\x1b[31mPOOR\x1b[0m';
}

function printTestHeader(testName: string) {
  console.log('\n' + '='.repeat(80));
  console.log(` 🧪 ${testName} `.padStart(40 + testName.length/2, '=').padEnd(80, '='));
  console.log('='.repeat(80) + '\n');
}
*/