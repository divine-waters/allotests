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
    name: 'Vast Broadband',
    url: 'https://www.vastbroadband.com/',
    region: ['Lincoln, NE', 'Grand Island, NE'],
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
    url: 'https://www.nextlight.net/',
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
    name: 'Elevate Fiber',
    url: 'https://elevatefiber.com/',
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
  }> = [];

  for (const competitor of COMPETITORS) {
    test(`Performance test for ${competitor.name}`, async ({ page }) => {
      console.log(`\nTesting ${competitor.name} (${competitor.url})`);
      console.log('='.repeat(80));

      const startTime = Date.now();
      
      // Navigate to the page
      await page.goto(competitor.url, { waitUntil: 'networkidle' });
      
      // Collect Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise<PerformanceMetrics>((resolve) => {
          let lcp = 0;
          let cls = 0;
          let tbt = 0;
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

          // Additional metrics
          const resourceCount = performance.getEntriesByType('resource').length;
          const domSize = document.getElementsByTagName('*').length;
          const jsHeapSize = (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0;

          // Wait for metrics to be collected
          setTimeout(() => {
            resolve({
              lcp,
              tbt,
              cls,
              ttfb,
              resourceCount,
              domSize,
              jsHeapSize,
              totalLoadTime: performance.now()
            });
          }, 5000);
        });
      });

      const score = calculateScore(metrics);
      const { rating, color } = getRating(score);
      
      results.push({
        name: competitor.name,
        metrics,
        score,
        rating
      });

      // Print detailed results with color-coded ratings
      console.log('\nPerformance Metrics:');
      console.log('-'.repeat(40));
      console.log(`LCP: ${metrics.lcp.toFixed(0)}ms (${calculateMetricScore(metrics.lcp, THRESHOLDS.lcp.good, THRESHOLDS.lcp.poor)}/100)`);
      console.log(`TBT: ${metrics.tbt.toFixed(0)}ms (${calculateMetricScore(metrics.tbt, THRESHOLDS.tbt.good, THRESHOLDS.tbt.poor)}/100)`);
      console.log(`CLS: ${metrics.cls.toFixed(3)} (${calculateMetricScore(metrics.cls, THRESHOLDS.cls.good, THRESHOLDS.cls.poor)}/100)`);
      console.log(`TTFB: ${metrics.ttfb.toFixed(0)}ms (${calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb.good, THRESHOLDS.ttfb.poor)}/100)`);
      console.log(`Resource Count: ${metrics.resourceCount} (${calculateMetricScore(metrics.resourceCount, THRESHOLDS.resourceCount.good, THRESHOLDS.resourceCount.poor)}/100)`);
      console.log(`DOM Size: ${metrics.domSize} nodes (${calculateMetricScore(metrics.domSize, THRESHOLDS.domSize.good, THRESHOLDS.domSize.poor)}/100)`);
      console.log(`JS Heap Size: ${metrics.jsHeapSize.toFixed(1)}MB (${calculateMetricScore(metrics.jsHeapSize, THRESHOLDS.jsHeapSize.good, THRESHOLDS.jsHeapSize.poor)}/100)`);
      console.log(`Total Load Time: ${metrics.totalLoadTime.toFixed(0)}ms (${calculateMetricScore(metrics.totalLoadTime, THRESHOLDS.totalLoadTime.good, THRESHOLDS.totalLoadTime.poor)}/100)`);
      
      console.log('\nOverall Score:');
      console.log('-'.repeat(40));
      console.log(`Score: ${score}/100`);
      console.log(`Rating: ${color}${rating}\x1b[0m`);
    });
  }

  test.afterAll(async () => {
    // Sort results by score
    results.sort((a, b) => b.score - a.score);

    // Group results by region
    const regionalResults = new Map<string, Array<{
      name: string;
      metrics: PerformanceMetrics;
      score: number;
      rating: string;
    }>>();

    // Initialize regions and group competitors
    const allRegions = new Set<string>();
    COMPETITORS.forEach(competitor => {
      competitor.region.forEach(region => allRegions.add(region));
    });

    results.forEach(result => {
      const competitor = COMPETITORS.find(c => c.name === result.name);
      if (competitor) {
        competitor.region.forEach(region => {
          if (!regionalResults.has(region)) {
            regionalResults.set(region, []);
          }
          regionalResults.get(region)?.push(result);
        });
      }
    });

    // Calculate overall industry average
    const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    const { rating: avgRating, color: avgColor } = getRating(avgScore);

    // Print Executive Summary
    console.log('\n📊 PERFORMANCE ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    
    // Overall Industry Health
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

    // Regional Market Analysis
    console.log('\n🌎 REGIONAL MARKET ANALYSIS');
    console.log('='.repeat(80));

    // Define specific regions for analysis
    const specificRegions = [
      // Nebraska
      'Lincoln, NE',
      'Grand Island, NE',
      'Kearney, NE',
      'Norfolk, NE',
      // Colorado
      'Boulder, CO',
      'Greeley, CO',
      'Brighton, CO',
      // Arizona
      'Flagstaff, AZ',
      'Lake Havasu City, AZ',
      // Missouri
      'Joplin, MO'
    ].filter(region => 
      COMPETITORS.some(competitor => competitor.region.includes(region))
    );

    // Calculate regional statistics for specific regions
    const regionalStats = specificRegions.map(region => {
      const competitors = results.filter(result => {
        const competitor = COMPETITORS.find(c => c.name === result.name);
        return competitor?.region.includes(region);
      });

      // Only include regions with fiber competitors
      if (competitors.length === 0) return null;

      const avgScore = Math.round(competitors.reduce((sum, r) => sum + r.score, 0) / competitors.length);
      const bestProvider = competitors.sort((a, b) => b.score - a.score)[0];
      const worstProvider = competitors.sort((a, b) => a.score - b.score)[0];
      const performanceGap = bestProvider.score - worstProvider.score;
      
      return {
        region,
        avgScore,
        bestProvider,
        worstProvider,
        performanceGap,
        providerCount: competitors.length,
        totalProviders: COMPETITORS.filter(c => c.region.includes(region)).length,
        serviceTypes: [...new Set(COMPETITORS
          .filter(c => c.region.includes(region))
          .map(c => c.serviceType))]
      };
    })
    .filter(stat => stat !== null) // Remove regions without fiber competitors
    .sort((a, b) => b!.avgScore - a!.avgScore);

    // Print regional comparison table with updated headers
    console.log('\nRegional Performance Comparison (Fiber Internet Market):');
    console.log('-'.repeat(140));
    console.log('Region'.padEnd(25) + 'Avg Score'.padEnd(15) + 'Best Provider'.padEnd(20) + 'Worst Provider'.padEnd(20) + 'Gap'.padEnd(10) + 'Coverage'.padEnd(10) + 'Service Types');
    console.log('-'.repeat(140));
    
    regionalStats.forEach(({ region, avgScore, bestProvider, worstProvider, performanceGap, providerCount, totalProviders, serviceTypes }) => {
      const { rating, color } = getRating(avgScore);
      console.log(
        region.padEnd(25) +
        `${color}${avgScore}/100\x1b[0m`.padEnd(15) +
        bestProvider.name.padEnd(20) +
        worstProvider.name.padEnd(20) +
        `${performanceGap}pts`.padEnd(10) +
        `${providerCount}/${totalProviders}`.padEnd(10) +
        serviceTypes.join(', ')
      );
    });

    // Add market focus analysis
    console.log('\n📊 MARKET FOCUS ANALYSIS');
    console.log('-'.repeat(40));
    COMPETITORS.forEach(competitor => {
      console.log(`\n${competitor.name}:`);
      console.log(`  • Service Type: ${competitor.serviceType}`);
      console.log(`  • Market Focus: ${competitor.marketFocus}`);
      console.log(`  • Coverage: ${competitor.region.join(', ')}`);
    });

    // Key Regional Insights
    console.log('\n🔍 KEY REGIONAL INSIGHTS');
    console.log('-'.repeat(40));
    
    // Find strongest and weakest regions
    const strongestRegion = regionalStats[0];
    const weakestRegion = regionalStats[regionalStats.length - 1];
    
    console.log(`Strongest Market: ${strongestRegion.region}`);
    console.log(`  • Average Score: ${strongestRegion.avgScore}/100`);
    console.log(`  • Best Provider: ${strongestRegion.bestProvider.name} (${strongestRegion.bestProvider.score}/100)`);
    console.log(`  • Market Coverage: ${strongestRegion.providerCount}/${strongestRegion.totalProviders} providers`);
    
    console.log(`\nWeakest Market: ${weakestRegion.region}`);
    console.log(`  • Average Score: ${weakestRegion.avgScore}/100`);
    console.log(`  • Best Provider: ${weakestRegion.bestProvider.name} (${weakestRegion.bestProvider.score}/100)`);
    console.log(`  • Market Coverage: ${weakestRegion.providerCount}/${weakestRegion.totalProviders} providers`);

    // Competitive Gaps
    console.log('\n📈 COMPETITIVE GAPS');
    console.log('-'.repeat(40));
    regionalStats.forEach(({ region, performanceGap, bestProvider, worstProvider }) => {
      if (performanceGap > 10) { // Only show significant gaps
        console.log(`${region}:`);
        console.log(`  • ${performanceGap} point gap between ${bestProvider.name} and ${worstProvider.name}`);
        console.log(`  • ${bestProvider.name} leads in: ${getLeadingMetrics(bestProvider.metrics, worstProvider.metrics)}`);
      }
    });

    // ALLO Performance Analysis
    const alloResult = results.find(r => r.name === 'ALLO Communications');
    if (alloResult) {
      console.log('\n🎯 ALLO COMMUNICATIONS ANALYSIS');
      console.log('-'.repeat(40));
      console.log(`Overall Score: ${alloResult.score}/100 (${getRating(alloResult.score).rating})`);
      
      // Regional Performance
      console.log('\nRegional Performance:');
      const alloCompetitor = COMPETITORS.find(c => c.name === 'ALLO Communications');
      if (alloCompetitor) {
        alloCompetitor.region.forEach(region => {
          const regionStats = regionalResults.get(region);
          if (regionStats) {
            const rank = regionStats.findIndex(c => c.name === 'ALLO Communications') + 1;
            console.log(`  • ${region}: Rank #${rank} of ${regionStats.length} providers`);
          }
        });
      }

      // Competitive Advantages
      console.log('\nCompetitive Advantages:');
      const advantages = getCompetitiveAdvantages(alloResult, results);
      advantages.forEach(adv => console.log(`  • ${adv}`));
    }

    // Add service comparison analysis
    console.log('\n📊 SERVICE COMPARISON ANALYSIS');
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

    console.log('\nALLO Services:');
    Object.entries(alloServices).forEach(([service, available]) => {
      if (available) {
        console.log(`  • ${service.replace(/([A-Z])/g, ' $1').trim()}`);
      }
    });

    console.log('\nCompetitor Service Comparison:');
    COMPETITORS.forEach(competitor => {
      console.log(`\n${competitor.name}:`);
      Object.entries(competitor.services).forEach(([service, available]) => {
        const serviceName = service.replace(/([A-Z])/g, ' $1').trim();
        console.log(`  • ${serviceName}: ${available ? '✓' : '✗'}`);
      });
      
      // Calculate service match percentage
      const matchingServices = Object.entries(competitor.services)
        .filter(([service, available]) => available && alloServices[service as keyof typeof alloServices])
        .length;
      const totalServices = Object.keys(alloServices).length;
      const matchPercentage = (matchingServices / totalServices) * 100;
      
      console.log(`  Service Match: ${matchPercentage.toFixed(1)}% of ALLO services`);
    });
  });
});

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