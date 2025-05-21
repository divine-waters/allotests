/**
 * Constants and configuration for the performance testing suite
 * This module contains thresholds, benchmarks, and competitor data used for testing
 */

import type { CompetitorSite } from './types';

/**
 * Performance thresholds based on Core Web Vitals and competitive analysis
 * These thresholds define the boundaries for excellent, very good, good, and poor performance
 * for key web performance metrics:
 * - LCP (Largest Contentful Paint): Measures loading performance
 * - CLS (Cumulative Layout Shift): Measures visual stability
 * - TTFB (Time to First Byte): Measures server response time
 */
export const THRESHOLDS = {
  lcp: {
    excellent: 1000,   // 1s - Outstanding performance
    veryGood: 1500,    // 1.5s - Very good performance
    good: 2000,        // 2s - Good performance
    poor: 4000         // 4s - Poor performance
  },
  cls: {
    excellent: 0.05,   // 0.05 - Outstanding stability
    veryGood: 0.075,   // 0.075 - Very good stability
    good: 0.1,         // 0.1 - Good stability
    poor: 0.25         // 0.25 - Poor stability
  },
  ttfb: {
    excellent: 100,    // 100ms - Outstanding response
    veryGood: 150,     // 150ms - Very good response
    good: 200,         // 200ms - Good response
    poor: 500          // 500ms - Poor response
  }
};

/**
 * Extended thresholds for additional performance metrics
 * Used for more detailed performance analysis beyond Core Web Vitals
 * Includes metrics for:
 * - Concurrent user testing
 * - Memory usage and event listener monitoring
 */
export const EXTENDED_THRESHOLDS = {
  concurrent: {
    errorRate: {
      excellent: 0.02,    // 2% - Excellent error rate under load
      veryGood: 0.035,    // 3.5% - Very good error rate under load
      good: 0.05,         // 5% - Good error rate under load
      poor: 0.10          // 10% - Poor error rate under load
    }
  },
  memory: {
    eventListeners: {
      excellent: 50,      // 50 - Excellent number of event listeners
      veryGood: 75,       // 75 - Very good number of event listeners
      good: 100,          // 100 - Good number of event listeners
      poor: 200           // 200 - Poor number of event listeners
    }
  }
};

/**
 * Performance benchmarks for different test scenarios
 * Defines acceptable performance levels for various test conditions:
 * - Network conditions (3G, etc.)
 * - CPU performance
 * - Concurrent user load
 * - Memory usage
 */
export const BENCHMARKS = {
  network: {
    '3G': {
      loadTime: {
        excellent: 2000,   // 2s - Excellent load time under 3G
        veryGood: 2500,    // 2.5s - Very good load time under 3G
        good: 3000,        // 3s - Good load time under 3G
        poor: 5000         // 5s - Poor load time under 3G
      },
      resources: {
        excellent: 25,     // 25 - Excellent number of resources
        veryGood: 35,      // 35 - Very good number of resources
        good: 50,          // 50 - Good number of resources
        poor: 100          // 100 - Poor number of resources
      },
      memory: {
        excellent: 30,     // 30MB - Excellent memory usage
        veryGood: 40,      // 40MB - Very good memory usage
        good: 50,          // 50MB - Good memory usage
        poor: 100          // 100MB - Poor memory usage
      }
    }
  },
  cpu: {
    loadTime: {
      excellent: 1500,     // 1.5s - Excellent load time under CPU throttling
      veryGood: 1750,      // 1.75s - Very good load time under CPU throttling
      good: 2000,          // 2s - Good load time under CPU throttling
      poor: 4000           // 4s - Poor load time under CPU throttling
    },
    jsExecutionTime: {
      excellent: 50,       // 50ms - Excellent JS execution time
      veryGood: 75,        // 75ms - Very good JS execution time
      good: 100,           // 100ms - Good JS execution time
      poor: 300            // 300ms - Poor JS execution time
    }
  },
  concurrent: {
    loadTime: {
      excellent: 1500,     // 1.5s - Excellent load time under concurrent users
      veryGood: 1750,      // 1.75s - Very good load time under concurrent users
      good: 2000,          // 2s - Good load time under concurrent users
      poor: 4000           // 4s - Poor load time under concurrent users
    },
    resourceContention: {
      excellent: 1.5,      // 1.5 - Excellent resource contention ratio
      veryGood: 1.75,      // 1.75 - Very good resource contention ratio
      good: 2.0,           // 2.0 - Good resource contention ratio
      poor: 4.0            // 4.0 - Poor resource contention ratio
    }
  },
  memory: {
    heapGrowth: {
      excellent: 10,       // 10MB - Excellent heap growth
      veryGood: 15,        // 15MB - Very good heap growth
      good: 20,            // 20MB - Good heap growth
      poor: 50             // 50MB - Poor heap growth
    },
    domNodes: {
      excellent: 500,      // 500 - Excellent number of DOM nodes
      veryGood: 750,       // 750 - Very good number of DOM nodes
      good: 1000,          // 1000 - Good number of DOM nodes
      poor: 2000           // 2000 - Poor number of DOM nodes
    }
  }
};

/**
 * Competitor information for comparative analysis
 * Contains detailed information about competing fiber providers including:
 * - Service areas
 * - Available services
 * - Market focus
 * Used for competitive benchmarking and market analysis
 */
export const COMPETITORS: CompetitorSite[] = [
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