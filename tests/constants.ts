import type { CompetitorSite } from './types';

// Performance thresholds based on Core Web Vitals and competitive analysis
export const THRESHOLDS = {
  lcp: {
    excellent: 1000,   // 1s - Outstanding performance
    good: 2000,       // 2s - Good performance
    poor: 4000        // 4s - Poor performance
  },
  cls: {
    excellent: 0.05,  // 0.05 - Outstanding stability
    good: 0.1,        // 0.1 - Good stability
    poor: 0.25        // 0.25 - Poor stability
  },
  ttfb: {
    excellent: 100,   // 100ms - Outstanding response
    good: 200,        // 200ms - Good response
    poor: 500         // 500ms - Poor response
  }
};

// Extended thresholds for additional metrics
export const EXTENDED_THRESHOLDS = {
  concurrent: {
    errorRate: {
      good: 0.05,     // 5% - Good error rate under load
      poor: 0.10      // 10% - Poor error rate under load
    }
  },
  memory: {
    eventListeners: {
      good: 100,      // 100 - Good number of event listeners
      poor: 200       // 200 - Poor number of event listeners
    }
  }
};

// Performance benchmarks for different test types
export const BENCHMARKS = {
  network: {
    '3G': {
      loadTime: {
        good: 3000,   // 3s - Good load time under 3G
        poor: 5000    // 5s - Poor load time under 3G
      },
      resources: {
        good: 50,     // 50 - Good number of resources
        poor: 100     // 100 - Poor number of resources
      },
      memory: {
        good: 50,     // 50MB - Good memory usage
        poor: 100     // 100MB - Poor memory usage
      }
    }
  },
  cpu: {
    loadTime: {
      good: 2000,     // 2s - Good load time under CPU throttling
      poor: 4000      // 4s - Poor load time under CPU throttling
    },
    jsExecutionTime: {
      good: 100,      // 100ms - Good JS execution time
      poor: 300       // 300ms - Poor JS execution time
    }
  },
  concurrent: {
    loadTime: {
      good: 2000,     // 2s - Good load time under concurrent users
      poor: 4000      // 4s - Poor load time under concurrent users
    },
    resourceContention: {
      good: 2.0,      // 2.0 - Good resource contention ratio
      poor: 4.0       // 4.0 - Poor resource contention ratio
    }
  },
  memory: {
    heapGrowth: {
      good: 20,       // 20MB - Good heap growth
      poor: 50        // 50MB - Poor heap growth
    },
    domNodes: {
      good: 1000,     // 1000 - Good number of DOM nodes
      poor: 2000      // 2000 - Poor number of DOM nodes
    }
  }
};

// Competitor information
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