import { test, expect } from '@playwright/test';
import { THRESHOLDS, COMPETITORS } from './constants';
import { calculateScore, getRating, getMetricStatus, printTestHeader, printTestFooter } from './utils';

interface PerformanceMetrics {
  lcp: number;
  cls: number;
  ttfb: number;
}

interface TestResult {
  name: string;
  metrics: PerformanceMetrics;
  score: number;
  rating: string;
}

function printCompetitorInsights(result: TestResult, allResults: TestResult[]): void {
  console.log('\n💡 Performance Insights:');
  console.log('-'.repeat(40));

  // Overall Performance
  console.log('Overall Performance:');
  if (result.score >= 95) {
    console.log('✓ Outstanding overall performance');
    console.log('  • Excellent across all metrics');
    console.log('  • Industry-leading performance');
  } else if (result.score >= 85) {
    console.log('✓ Very good overall performance');
    console.log('  • Strong performance in most areas');
    console.log('  • Minor optimization opportunities');
  } else if (result.score >= 75) {
    console.log('✓ Good overall performance');
    console.log('  • Solid performance with room for improvement');
    console.log('  • Consider targeted optimizations');
  } else {
    console.log('⚠️ Performance needs improvement');
    console.log('  • Multiple areas need attention');
    console.log('  • Prioritize critical optimizations');
  }

  // LCP Analysis
  console.log('\nLCP Analysis:');
  if (result.metrics.lcp <= THRESHOLDS.lcp.excellent) {
    console.log('✓ Outstanding LCP performance');
    console.log('  • Fast content delivery');
    console.log('  • Well-optimized hero content');
  } else if (result.metrics.lcp <= THRESHOLDS.lcp.good) {
    console.log('✓ Good LCP performance');
    console.log('  • Acceptable content delivery');
    console.log('  • Consider hero content optimization');
  } else {
    console.log('⚠️ LCP needs improvement');
    console.log('  • Slow content delivery');
    console.log('  • Review hero content loading');
  }

  // CLS Analysis
  console.log('\nCLS Analysis:');
  if (result.metrics.cls <= THRESHOLDS.cls.excellent) {
    console.log('✓ Outstanding visual stability');
    console.log('  • Minimal layout shifts');
    console.log('  • Well-managed dynamic content');
  } else if (result.metrics.cls <= THRESHOLDS.cls.good) {
    console.log('✓ Good visual stability');
    console.log('  • Acceptable layout shifts');
    console.log('  • Consider reducing dynamic shifts');
  } else {
    console.log('⚠️ CLS needs improvement');
    console.log('  • Excessive layout shifts');
    console.log('  • Review dynamic content loading');
  }

  // TTFB Analysis
  console.log('\nTTFB Analysis:');
  if (result.metrics.ttfb <= THRESHOLDS.ttfb.excellent) {
    console.log('✓ Outstanding server response');
    console.log('  • Fast server processing');
    console.log('  • Efficient backend operations');
  } else if (result.metrics.ttfb <= THRESHOLDS.ttfb.good) {
    console.log('✓ Good server response');
    console.log('  • Acceptable server processing');
    console.log('  • Consider backend optimizations');
  } else {
    console.log('⚠️ TTFB needs improvement');
    console.log('  • Slow server response');
    console.log('  • Review backend performance');
  }

  // Competitive Analysis
  const otherResults = allResults.filter(r => r.name !== result.name);
  if (otherResults.length > 0) {
    console.log('\nCompetitive Position:');
    const rank = allResults.findIndex(r => r.name === result.name) + 1;
    const total = allResults.length;
    
    if (rank === 1) {
      console.log('✓ Leading performance among competitors');
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

    // Compare with top performer
    const topPerformer = allResults[0];
    if (topPerformer.name !== result.name) {
      console.log('\nvs Top Performer:');
      const lcpDiff = result.metrics.lcp - topPerformer.metrics.lcp;
      const clsDiff = result.metrics.cls - topPerformer.metrics.cls;
      const ttfbDiff = result.metrics.ttfb - topPerformer.metrics.ttfb;

      if (lcpDiff > 0) {
        console.log(`• LCP is ${lcpDiff.toFixed(0)}ms slower than ${topPerformer.name}`);
      }
      if (clsDiff > 0) {
        console.log(`• CLS is ${clsDiff.toFixed(3)} worse than ${topPerformer.name}`);
      }
      if (ttfbDiff > 0) {
        console.log(`• TTFB is ${ttfbDiff.toFixed(0)}ms slower than ${topPerformer.name}`);
      }
    }
  }
}

test.describe('Competitor Performance Analysis', () => {
  const results: TestResult[] = [];

  for (const competitor of COMPETITORS) {
    test(`Performance test for ${competitor.name}`, async ({ page }, testInfo) => {
      printTestHeader(`Competitor Analysis: ${competitor.name}`);
      
      // Navigate to competitor's website
      await page.goto(competitor.url);
      
      // Collect performance metrics
      const metrics: PerformanceMetrics = {
        lcp: await page.evaluate(() => {
          const entries = performance.getEntriesByType('largest-contentful-paint');
          return entries[entries.length - 1]?.startTime || 0;
        }),
        cls: await page.evaluate(() => {
          const entries = performance.getEntriesByType('layout-shift');
          return entries.reduce((sum, entry) => sum + (entry as any).value, 0);
        }),
        ttfb: await page.evaluate(() => {
          const entries = performance.getEntriesByType('navigation');
          const navEntry = entries[0] as PerformanceNavigationTiming;
          return navEntry?.responseStart || 0;
        })
      };

      const score = calculateScore(metrics);
      const { rating } = getRating(score);
      
      const result: TestResult = {
        name: competitor.name,
        metrics,
        score,
        rating
      };
      
      results.push(result);
      printCompetitorInsights(result, results);
      printTestFooter();
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
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
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
    if (alloResult) {
      console.log('\nALLO Communications Position:');
      const rank = results.findIndex(r => r.name === 'ALLO Communications') + 1;
      const total = results.length;
      
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
      const competitors = results.filter(r => r.name !== 'ALLO Communications');
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
    
    printTestFooter();
  });
}); 