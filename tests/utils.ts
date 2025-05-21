/**
 * Utility functions for performance testing and scoring
 * This module provides functions for calculating performance scores, ratings,
 * and formatting test output for web performance metrics.
 */

import { THRESHOLDS } from './constants';

/**
 * Calculates a score for an individual metric on a 0-100 scale with more granular scoring.
 * Uses linear interpolation between thresholds.
 * @param value - The actual metric value
 * @param thresholds - Object containing excellent, veryGood, good, and poor threshold values
 * @returns A score between 0-100
 */
export function calculateMetricScore(value: number, thresholds: { excellent: number; veryGood: number; good: number; poor: number }): number {
  if (value <= thresholds.excellent) return 100;
  if (value <= thresholds.veryGood) {
    // Linear interpolation between excellent and very good (100 to 90)
    return Math.round(90 + ((thresholds.veryGood - value) / (thresholds.veryGood - thresholds.excellent)) * 10);
  }
  if (value <= thresholds.good) {
    // Linear interpolation between very good and good (90 to 80)
    return Math.round(80 + ((thresholds.good - value) / (thresholds.good - thresholds.veryGood)) * 10);
  }
  if (value <= thresholds.poor) {
    // Linear interpolation between good and poor (80 to 40)
    return Math.round(40 + ((thresholds.poor - value) / (thresholds.poor - thresholds.good)) * 40);
  }
  // Linear interpolation for values worse than poor (40 to 0)
  return Math.max(0, Math.round(40 * (thresholds.poor / value))); // Simple inverse scaling for poor values
}
/**
 * Calculates an overall performance score based on Core Web Vitals metrics */

export function calculateScore(metrics: { lcp: number; cls: number; ttfb: number }): number {
  const lcpScore = calculateMetricScore(metrics.lcp, THRESHOLDS.lcp);
  const clsScore = calculateMetricScore(metrics.cls, THRESHOLDS.cls);
  const ttfbScore = calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb);
  return Math.round((lcpScore * 0.4) + (clsScore * 0.3) + (ttfbScore * 0.3));
}

/**
 * Converts a numerical score into a rating with associated color for console output
 * @param score - The performance score (0-100)
 * @returns Object containing rating text and ANSI color code
 * Rating levels:
 * - 90-100: Excellent (Green)
 * - 85-94: Very Good (Cyan)
 * - 75-84: Good (Blue)
 * - 65-74: Fair (Yellow)
 * - 50-64: Needs Improvement (Magenta)
 * - 0-49: Poor (Red)
 */
export function getRating(score: number): { rating: string; color: string } {
  if (score >= 95) return { rating: 'EXCELLENT', color: '\x1b[32m' }; // Green
  if (score >= 85) return { rating: 'VERY GOOD', color: '\x1b[36m' }; // Cyan
  if (score >= 75) return { rating: 'GOOD', color: '\x1b[34m' }; // Blue
  if (score >= 70) return { rating: 'Fair', color: '\x1b[33m' };      // Yellow
  return { rating: 'Poor', color: '\x1b[31m' };                       // Red
}

/**
 * Determines the status of a metric based on its value and thresholds
 * @param value - The actual metric value
 * @param thresholds - Object containing excellent, veryGood, good, and poor threshold values
 * @returns Status string: 'Excellent', 'Very Good', 'Good', 'Fair', or 'Poor'
 * Status levels are determined by comparing the value against thresholds:
 * Status levels with ANSI color codes.
 */

export function getMetricStatus(value: number, thresholds: { excellent: number; veryGood: number; good: number; poor: number }): string {
  if (value <= thresholds.excellent) return '\x1b[32mEXCELLENT\x1b[0m'; // Green
  if (value <= thresholds.veryGood) return '\x1b[92mVERY GOOD\x1b[0m'; // Light Green/Yellow-Green
  if (value <= thresholds.good) return '\x1b[34mGOOD\x1b[0m'; // Blue
  if (value <= thresholds.poor) return '\x1b[33mNEEDS IMPROVEMENT\x1b[0m'; // Yellow
  return '\x1b[31mPOOR\x1b[0m'; // Red
}
/* // Original simpler version
  if (value <= thresholds.good) return 'Good';
  if (value <= thresholds.poor) return 'Fair';
  return 'Poor';

/**
 * Prints a formatted header for test output
 * @param title - The title of the test to display
 */
export function printTestHeader(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${title}`);
  console.log('='.repeat(80) + 'n');
}

/**
 * Prints a formatted footer for test output
 */
export function printTestFooter(): void {
  console.log('\n' + '='.repeat(80) + '\n');
}
