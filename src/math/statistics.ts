/**
 * Core statistical functions for Monte Carlo simulation
 *
 * These functions match simple-statistics library behavior for validation.
 * Used for correlation calculations and simulation result analysis.
 */

import { sum, round } from './precision';

/** Default decimal precision for output values */
const DEFAULT_PRECISION = 6;

/**
 * Calculate the arithmetic mean of an array of numbers
 * Uses Kahan summation for precision over large arrays
 *
 * @returns 0 for empty array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return round(sum(values) / values.length, DEFAULT_PRECISION);
}

/**
 * Calculate variance of an array of numbers
 *
 * @param values - Array of numbers
 * @param population - If true, use N denominator (population variance)
 *                     If false (default), use N-1 denominator (sample variance)
 * @returns 0 for empty array or length < 2 when sample variance
 */
export function variance(values: number[], population: boolean = false): number {
  const n = values.length;

  if (n === 0) return 0;
  if (!population && n < 2) return 0;

  const m = sum(values) / n; // Raw mean (avoid double rounding)
  const squaredDiffs: number[] = [];

  for (let i = 0; i < n; i++) {
    const diff = values[i] - m;
    squaredDiffs.push(diff * diff);
  }

  const sumSquaredDiffs = sum(squaredDiffs);
  const denominator = population ? n : n - 1;

  return round(sumSquaredDiffs / denominator, DEFAULT_PRECISION);
}

/**
 * Calculate standard deviation of an array of numbers
 *
 * @param values - Array of numbers
 * @param population - If true, use population stddev (N denominator)
 *                     If false (default), use sample stddev (N-1 denominator)
 * @returns Square root of variance
 */
export function stddev(values: number[], population: boolean = false): number {
  return round(Math.sqrt(variance(values, population)), DEFAULT_PRECISION);
}

/**
 * Calculate percentile of an array of numbers
 *
 * Uses linear interpolation between floor and ceil indices.
 * Formula: index = (p/100) * (n-1), interpolate between sorted[floor] and sorted[ceil]
 *
 * @param values - Array of numbers
 * @param p - Percentile value (0-100, not 0-1)
 * @returns 0 for empty array, the single value for single-element array
 */
export function percentile(values: number[], p: number): number {
  const n = values.length;

  if (n === 0) return 0;
  if (n === 1) return values[0];

  // Sort values (create copy to avoid mutation)
  const sorted = [...values].sort((a, b) => a - b);

  // Clamp percentile to valid range
  const clampedP = Math.max(0, Math.min(100, p));

  // Calculate index position
  const index = (clampedP / 100) * (n - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  // If index is integer, return exact value
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  // Linear interpolation
  const fraction = index - lowerIndex;
  const result = sorted[lowerIndex] + fraction * (sorted[upperIndex] - sorted[lowerIndex]);

  return round(result, DEFAULT_PRECISION);
}

// Re-export sum from precision for convenience
export { sum } from './precision';
