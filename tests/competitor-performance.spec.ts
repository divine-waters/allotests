import { test, expect } from '@playwright/test';
import { THRESHOLDS, COMPETITORS } from './constants';
import { calculateScore, getRating, getMetricStatus, printTestHeader, printTestFooter } from './utils';
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

test.describe('Competitor Performance Analysis', () => {
  const results: TestResult[] = [];

  for (const competitor of COMPETITORS) {
    test(`Performance test for ${competitor.name}`, async ({ page }, testInfo) => {
      printTestHeader(`Competitor Analysis: ${competitor.name}`);
      
      let metrics: PerformanceMetrics;
      
      try {
        // Navigate to the page with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await page.goto(competitor.url, { 
              waitUntil: 'domcontentloaded',
              timeout: 30000 // Increased timeout to 30 seconds
            });
            await page.waitForLoadState('load', { timeout: 15000 });
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            console.log(`Retry ${retryCount}/${maxRetries} for ${competitor.name}...`);
            await page.waitForTimeout(2000); // Wait 2 seconds before retry
          }
        }
        
        // Collect comprehensive metrics with proper error handling
        metrics = await Promise.race([
          page.evaluate(() => {
            return new Promise<PerformanceMetrics>((resolve) => {
              let lcp = 0;
              let cls = 0;
              let ttfb = 0;
              let tbt = 0;
              let resourceCount = 0;
              let domSize = 0;
              let jsHeapSize = 0;
              let totalLoadTime = 0;
              
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
              new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                  tbt += entry.duration;
                }
              }).observe({ type: 'longtask', buffered: true });

              // TTFB and other metrics
              const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
              if (navEntry) {
                ttfb = navEntry.responseStart - navEntry.requestStart;
                totalLoadTime = navEntry.loadEventEnd - navEntry.startTime;
              }

              // Resource count and DOM size
              resourceCount = performance.getEntriesByType('resource').length;
              domSize = document.getElementsByTagName('*').length;
              jsHeapSize = (performance as any).memory?.usedJSHeapSize || 0;

              // Resolve after 5 seconds to ensure we capture all metrics
              setTimeout(() => resolve({
                lcp,
                cls,
                ttfb,
                tbt,
                resourceCount,
                domSize,
                jsHeapSize,
                totalLoadTime
              }), 5000);
            });
          }),
          new Promise<PerformanceMetrics>((_, reject) => 
            setTimeout(() => reject(new Error('Metrics collection timeout')), 10000)
          )
        ]).catch((error) => {
          console.log(`Warning: Metrics collection failed for ${competitor.name}: ${error.message}`);
          return {
            lcp: 0,
            cls: 0,
            ttfb: 0,
            tbt: 0,
            resourceCount: 0,
            domSize: 0,
            jsHeapSize: 0,
            totalLoadTime: 0
          };
        });

        // Calculate score and rating
        const score = calculateScore(metrics);
        const { rating } = getRating(score);
        
        // Add result to array
        results.push({
          name: competitor.name,
          metrics,
          score,
          rating
        });

        // Print insights
        printCompetitorInsights(metrics, competitor);
        
        // Add basic assertions to ensure metrics are collected
        expect(metrics.lcp, 'LCP should be collected').toBeDefined();
        expect(metrics.cls, 'CLS should be collected').toBeDefined();
        expect(metrics.ttfb, 'TTFB should be collected').toBeDefined();
        
      } catch (error) {
        console.log(`Error testing ${competitor.name}: ${error.message}`);
        // Add a failed result to maintain test continuity
        results.push({
          name: competitor.name,
          metrics: {
            lcp: 0,
            cls: 0,
            ttfb: 0,
            tbt: 0,
            resourceCount: 0,
            domSize: 0,
            jsHeapSize: 0,
            totalLoadTime: 0
          },
          score: 0,
          rating: 'FAILED'
        });
      }
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

    // Overall Insights
    console.log('\n💡 Overall Insights:');
    console.log('-'.repeat(40));
    
    // Industry Position
    const successfulResults = results.filter(r => r.score > 0);
    if (successfulResults.length > 0) {
      const avgScore = successfulResults.reduce((sum, r) => sum + r.score, 0) / successfulResults.length;
      console.log('Industry Position:');
      if (avgScore >= 90) {
        console.log('✓ Industry-leading performance');
        console.log('  • Strong overall metrics');
        console.log('  • Competitive advantage');
      } else if (avgScore >= 80) {
        console.log('✓ Above industry average');
        console.log('  • Good overall performance');
        console.log('  • Room for optimization');
      } else {
        console.log('⚠️ Below industry average');
        console.log('  • Performance needs improvement');
        console.log('  • Focus on critical optimizations');
      }

      // Competitive Analysis
      const alloResult = results.find(r => r.name === 'ALLO Communications');
      if (alloResult && alloResult.score > 0) {
        console.log('\nALLO Communications Position:');
        const rank = results.findIndex(r => r.name === 'ALLO Communications') + 1;
        const total = successfulResults.length;
        
        if (rank === 1) {
          console.log('✓ Leading performance');
          console.log(`  • Ranked #1 of ${total} competitors`);
          console.log('  • Industry-leading metrics');
        } else if (rank <= Math.ceil(total / 2)) {
          console.log('✓ Above average performance');
          console.log(`  • Ranked #${rank} of ${total} competitors`);
          console.log('  • Strong competitive position');
        } else {
          console.log('⚠️ Below average performance');
          console.log(`  • Ranked #${rank} of ${total} competitors`);
          console.log('  • Needs improvement to compete');
        }

        // Compare with competitors
        const competitors = successfulResults.filter(r => r.name !== 'ALLO Communications');
        if (competitors.length > 0) {
          console.log('\nKey Differentiators:');
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
      }
    } else {
      console.log('⚠️ No successful test results to analyze');
    }
    
    printTestFooter();
  });
}); 