export const THRESHOLDS = {
  lcp: {
    excellent: 2500,  // 2.5s
    good: 4000,      // 4s
    poor: 6000       // 6s
  },
  cls: {
    excellent: 0.1,  // 0.1
    good: 0.25,      // 0.25
    poor: 0.4        // 0.4
  },
  ttfb: {
    excellent: 800,  // 800ms
    good: 1800,      // 1.8s
    poor: 3000       // 3s
  }
};

export const COMPETITORS = [
  {
    name: 'ALLO Communications',
    url: 'https://www.allo.com'
  },
  {
    name: 'Competitor A',
    url: 'https://www.competitor-a.com'
  },
  {
    name: 'Competitor B',
    url: 'https://www.competitor-b.com'
  }
];

export const BENCHMARKS = {
  network: {
    '3G': {
      loadTime: { good: 5000, poor: 8000 },
      resources: { good: 50, poor: 100 },
      memory: { good: 100, poor: 200 }
    }
  },
  cpu: {
    loadTime: { good: 3000, poor: 5000 },
    jsExecutionTime: { good: 1000, poor: 2000 }
  },
  concurrent: {
    loadTime: { good: 4000, poor: 7000 },
    errorRate: { good: 0.01, poor: 0.05 },
    resourceContention: { good: 0.2, poor: 0.5 }
  },
  memory: {
    heapGrowth: { good: 50, poor: 100 },
    domNodes: { good: 1000, poor: 2000 },
    eventListeners: { good: 100, poor: 200 }
  },
  extended: {
    concurrent: {
      errorRate: { good: 0.01, poor: 0.05 }
    },
    memory: {
      eventListeners: { good: 100, poor: 200 }
    }
  }
}; 