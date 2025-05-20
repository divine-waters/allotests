import { THRESHOLDS } from './constants';

export function calculateScore(metrics: { lcp: number; cls: number; ttfb: number }): number {
  const lcpScore = calculateMetricScore(metrics.lcp, THRESHOLDS.lcp);
  const clsScore = calculateMetricScore(metrics.cls, THRESHOLDS.cls);
  const ttfbScore = calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb);
  
  // Weight the metrics (LCP: 40%, CLS: 30%, TTFB: 30%)
  return Math.round((lcpScore * 0.4) + (clsScore * 0.3) + (ttfbScore * 0.3));
}

function calculateMetricScore(value: number, thresholds: { excellent: number; good: number; poor: number }): number {
  if (value <= thresholds.excellent) return 100;
  if (value <= thresholds.good) return 80;
  if (value <= thresholds.poor) return 50;
  return 0;
}

export function getRating(score: number): { rating: string; color: string } {
  if (score >= 90) return { rating: 'Excellent', color: '\x1b[32m' }; // Green
  if (score >= 80) return { rating: 'Good', color: '\x1b[36m' };      // Cyan
  if (score >= 70) return { rating: 'Fair', color: '\x1b[33m' };      // Yellow
  return { rating: 'Poor', color: '\x1b[31m' };                       // Red
}

export function getMetricStatus(value: number, thresholds: { excellent: number; good: number; poor: number }): string {
  if (value <= thresholds.excellent) return 'Excellent';
  if (value <= thresholds.good) return 'Good';
  if (value <= thresholds.poor) return 'Fair';
  return 'Poor';
}

export function printTestHeader(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${title}`);
  console.log('='.repeat(80));
}

export function printTestFooter(): void {
  console.log('\n' + '='.repeat(80) + '\n');
} 