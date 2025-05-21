/**
 * Utility functions for performance testing and scoring
 * This module provides functions for calculating performance scores, ratings,
 * and formatting test output for web performance metrics.
 */

import { THRESHOLDS } from './constants';

/**
 * Calculates an overall performance score based on Core Web Vitals metrics
 * @param metrics - Object containing LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), and TTFB (Time to First Byte)
 * @returns A weighted score between 0-100, where:
 * - LCP contributes 40% of the score
 * - CLS contributes 30% of the score
 * - TTFB contributes 30% of the score
 */
export function calculateScore(metrics: { lcp: number; cls: number; ttfb: number }): number {
  const lcpScore = calculateMetricScore(metrics.lcp, THRESHOLDS.lcp);
  const clsScore = calculateMetricScore(metrics.cls, THRESHOLDS.cls);
  const ttfbScore = calculateMetricScore(metrics.ttfb, THRESHOLDS.ttfb);
  
  // Weight the metrics (LCP: 40%, CLS: 30%, TTFB: 30%)
  return Math.round((lcpScore * 0.4) + (clsScore * 0.3) + (ttfbScore * 0.3));
}

/**
 * Calculates a score for an individual metric based on defined thresholds
 * @param value - The actual metric value
 * @param thresholds - Object containing excellent, good, and poor threshold values
 * @returns A score of 100 (excellent), 80 (good), 50 (fair), or 0 (poor)
 */
function calculateMetricScore(value: number, thresholds: { excellent: number; good: number; poor: number }): number {
  if (value <= thresholds.excellent) return 100;
  if (value <= thresholds.good) return 80;
  if (value <= thresholds.poor) return 50;
  return 0;
}

/**
 * Converts a numerical score into a rating with associated color for console output
 * @param score - The performance score (0-100)
 * @returns Object containing rating text and ANSI color code
 * Rating levels:
 * - 90-100: Excellent (Green)
 * - 85-89: Very Good (Yellow-Green)
 * - 80-84: Good (Cyan)
 * - 70-79: Fair (Yellow)
 * - 0-69: Poor (Red)
 */
export function getRating(score: number): { rating: string; color: string } {
  if (score >= 90) return { rating: 'Excellent', color: '\x1b[32m' }; // Green
  if (score >= 85) return { rating: 'Very Good', color: '\x1b[92m' };  // Yellow-Green
  if (score >= 80) return { rating: 'Good', color: '\x1b[36m' };      // Cyan
  if (score >= 70) return { rating: 'Fair', color: '\x1b[33m' };      // Yellow
  return { rating: 'Poor', color: '\x1b[31m' };                       // Red
}

/**
 * Determines the status of a metric based on its value and thresholds
 * @param value - The actual metric value
 * @param thresholds - Object containing excellent, veryGood, good, and poor threshold values
 * @returns Status string: 'Excellent', 'Very Good', 'Good', 'Fair', or 'Poor'
 * Status levels are determined by comparing the value against thresholds:
 * - Excellent: value <= excellent threshold
 * - Very Good: value <= veryGood threshold
 * - Good: value <= good threshold
 * - Fair: value <= poor threshold
 * - Poor: value > poor threshold
 */
export function getMetricStatus(value: number, thresholds: { excellent: number; veryGood: number; good: number; poor: number }): string {
  if (value <= thresholds.excellent) return 'Excellent';
  if (value <= thresholds.veryGood) return 'Very Good';
  if (value <= thresholds.good) return 'Good';
  if (value <= thresholds.poor) return 'Fair';
  return 'Poor';
}

/**
 * Prints a formatted header for test output
 * @param title - The title of the test to display
 */
export function printTestHeader(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${title}`);
  console.log('='.repeat(80));
}

/**
 * Prints a formatted footer for test output
 */
export function printTestFooter(): void {
  console.log('\n' + '='.repeat(80) + '\n');
} 