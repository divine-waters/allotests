function printTestInsights(metrics: any, testType: string) {
  console.log('\n💡 Test Insights:');
  console.log('-'.repeat(40));

  switch (testType) {
    case '3G':
      console.log('Network Performance Analysis:');
      if (metrics.loadTime <= BENCHMARKS.network['3G'].loadTime.good) {
        console.log('✓ Excellent load time under 3G conditions');
        console.log('  • Fast resource loading and processing');
        console.log('  • Efficient critical rendering path');
      } else {
        console.log('⚠️ Load time needs improvement');
        console.log('  • Consider optimizing resource loading');
        console.log('  • Review critical rendering path');
      }

      if (metrics.resources <= BENCHMARKS.network['3G'].resources.good) {
        console.log('\n✓ Resource count is well optimized');
        console.log('  • Efficient resource bundling');
        console.log('  • Good use of HTTP/2 multiplexing');
      } else {
        console.log('\n⚠️ High resource count detected');
        console.log('  • Consider bundling more resources');
        console.log('  • Review third-party script impact');
      }

      if (metrics.memoryMB <= BENCHMARKS.network['3G'].memory.good) {
        console.log('\n✓ Memory usage is well managed');
        console.log('  • Efficient resource cleanup');
        console.log('  • Good memory management practices');
      } else {
        console.log('\n⚠️ Memory usage is high');
        console.log('  • Review memory allocation patterns');
        console.log('  • Check for memory leaks');
      }
      break;

    case 'CPU':
      console.log('CPU Performance Analysis:');
      if (metrics.loadTime <= BENCHMARKS.cpu.loadTime.good) {
        console.log('✓ Excellent CPU performance');
        console.log('  • Efficient JavaScript execution');
        console.log('  • Well-optimized rendering');
      } else {
        console.log('⚠️ CPU performance needs improvement');
        console.log('  • Review JavaScript execution patterns');
        console.log('  • Consider code splitting');
      }

      if (metrics.jsExecutionTime <= BENCHMARKS.cpu.jsExecutionTime.good) {
        console.log('\n✓ JavaScript execution is efficient');
        console.log('  • Fast script processing');
        console.log('  • Good use of async operations');
      } else {
        console.log('\n⚠️ JavaScript execution is slow');
        console.log('  • Profile JavaScript execution');
        console.log('  • Consider using Web Workers');
      }
      break;

    case 'Concurrent':
      console.log('Concurrent User Performance Analysis:');
      if (metrics.avgLoadTime <= BENCHMARKS.concurrent.loadTime.good) {
        console.log('✓ Excellent performance under load');
        console.log('  • Efficient resource handling');
        console.log('  • Good server response times');
      } else {
        console.log('⚠️ Performance degrades under load');
        console.log('  • Review server capacity');
        console.log('  • Consider implementing caching');
      }

      if (metrics.errorRate <= BENCHMARKS.extended.concurrent.errorRate.good) {
        console.log('\n✓ Low error rate under load');
        console.log('  • Stable server performance');
        console.log('  • Good error handling');
      } else {
        console.log('\n⚠️ High error rate detected');
        console.log('  • Review server stability');
        console.log('  • Check error handling');
      }

      if (metrics.resourceContention <= BENCHMARKS.concurrent.resourceContention.good) {
        console.log('\n✓ Good resource management');
        console.log('  • Efficient request handling');
        console.log('  • Well-balanced load distribution');
      } else {
        console.log('\n⚠️ Resource contention detected');
        console.log('  • Review request queuing');
        console.log('  • Consider load balancing');
      }
      break;

    case 'Memory':
      console.log('Memory Performance Analysis:');
      if (metrics.heapGrowth <= BENCHMARKS.memory.heapGrowth.good) {
        console.log('✓ Excellent memory management');
        console.log('  • Stable memory usage');
        console.log('  • Efficient garbage collection');
      } else {
        console.log('⚠️ Memory growth needs attention');
        console.log('  • Check for memory leaks');
        console.log('  • Review object lifecycle');
      }

      if (metrics.domNodes <= BENCHMARKS.memory.domNodes.good) {
        console.log('\n✓ DOM size is well optimized');
        console.log('  • Efficient DOM structure');
        console.log('  • Good use of virtual DOM');
      } else {
        console.log('\n⚠️ Large DOM size detected');
        console.log('  • Consider DOM optimization');
        console.log('  • Review component structure');
      }

      if (metrics.eventListeners <= BENCHMARKS.extended.memory.eventListeners.good) {
        console.log('\n✓ Event listener count is optimal');
        console.log('  • Efficient event handling');
        console.log('  • Good use of event delegation');
      } else {
        console.log('\n⚠️ High event listener count');
        console.log('  • Review event binding');
        console.log('  • Consider event delegation');
      }
      break;

    case 'LCP':
      console.log('LCP Performance Analysis:');
      if (metrics.lcp <= 1000) {
        console.log('✓ Outstanding LCP performance');
        console.log('  • Fast content delivery');
        console.log('  • Well-optimized hero image');
      } else if (metrics.lcp <= 2500) {
        console.log('✓ Good LCP performance');
        console.log('  • Acceptable content delivery');
        console.log('  • Consider image optimization');
      } else {
        console.log('⚠️ LCP needs improvement');
        console.log('  • Optimize hero image loading');
        console.log('  • Review resource prioritization');
      }
      break;

    case 'TBT':
      console.log('TBT Performance Analysis:');
      if (metrics.totalTBT <= 200) {
        console.log('✓ Excellent TBT performance');
        console.log('  • Minimal main thread blocking');
        console.log('  • Efficient JavaScript execution');
      } else if (metrics.totalTBT <= 600) {
        console.log('✓ Acceptable TBT performance');
        console.log('  • Moderate main thread blocking');
        console.log('  • Consider task optimization');
      } else {
        console.log('⚠️ TBT needs improvement');
        console.log('  • Review long tasks');
        console.log('  • Optimize JavaScript execution');
      }
      break;
  }
}

test.describe('Performance Tests', () => {
  const url = 'https://www.allocommunications.com/';

  // Original performance test
  test('Homepage Performance', async ({ page, context }) => {
    printTestHeader('Homepage Performance Test');
    
    // ... existing test code ...

    // LCP Diagnostic Report
    printTestHeader('LCP Diagnostic Report');
    console.log(`LCP Value: ${lcpDetails.lcp}ms (Threshold: 2500ms)`);
    console.log(`LCP Element: ${lcpDetails.element}`);
    console.log(`Element Size: ${Math.round(lcpDetails.size)}px²`);
    console.log(`Resource URL: ${lcpDetails.url}`);
    console.log(`Timestamp: ${lcpDetails.timestamp}ms`);
    printTestInsights({ lcp: lcpDetails.lcp }, 'LCP');

    // TBT Diagnostic Report
    printTestHeader('TBT Diagnostic Report');
    console.log(`Total Blocking Time: ${tbtDetails.totalTBT}ms`);
    console.log(`Threshold: 300ms (Good: 0-200ms, Needs Improvement: 200-600ms, Poor: >600ms)`);
    
    if (tbtDetails.tasks.length > 0) {
      // ... existing TBT analysis code ...
    } else {
      console.log('\nNo blocking tasks detected during measurement period.');
    }
    printTestInsights({ totalTBT: tbtDetails.totalTBT }, 'TBT');
    
    printTestFooter();
  });

  // Stress test scenarios
  test.describe('Stress Tests', () => {
    test('Performance under 3G network conditions', async ({ browser }, testInfo) => {
      printTestHeader('3G Network Performance Test');
      
      // ... existing test code ...
      
      printTestInsights({
        loadTime: totalLoadTime,
        resources: navigationMetrics.resources,
        memoryMB: memoryMB
      }, '3G');
      
      printTestFooter();
    });

    test('Performance under CPU throttling', async ({ browser }, testInfo) => {
      printTestHeader('CPU Throttling Performance Test');
      
      // ... existing test code ...
      
      printTestInsights({
        loadTime: metrics.loadTime,
        jsExecutionTime: metrics.jsExecutionTime
      }, 'CPU');
      
      printTestFooter();
    });

    test('Performance under concurrent user load', async ({ browser }, testInfo) => {
      printTestHeader('Concurrent Users Performance Test');
      
      // ... existing test code ...
      
      printTestInsights({
        avgLoadTime,
        errorRate,
        resourceContention
      }, 'Concurrent');
      
      printTestFooter();
    });

    test('Performance under memory pressure', async ({ browser }, testInfo) => {
      printTestHeader('Memory Pressure Performance Test');
      
      // ... existing test code ...
      
      printTestInsights({
        heapGrowth,
        domNodes: finalDomNodes,
        eventListeners: finalEventListeners
      }, 'Memory');
      
      printTestFooter();
    });
  });
}); 