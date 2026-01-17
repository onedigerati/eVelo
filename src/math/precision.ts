/**
 * Precision utilities for financial calculations
 *
 * These utilities prevent floating point accumulation errors that occur
 * when summing thousands of values over long simulation periods.
 */

/** Epsilon for floating point comparisons */
export const EPSILON = 1e-10;

/**
 * Round a number to specified decimal places
 * Uses standard Math.round with power of 10 multiplier
 */
export function round(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Compare two floating point numbers within epsilon tolerance
 * Returns true if the absolute difference is less than epsilon
 */
export function almostEqual(a: number, b: number, epsilon: number = EPSILON): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Kahan summation algorithm for minimizing floating point accumulation errors
 *
 * Standard array.reduce accumulates errors over thousands of iterations.
 * Kahan's compensated summation tracks lost bits to maintain precision.
 *
 * @see https://en.wikipedia.org/wiki/Kahan_summation_algorithm
 */
export function sum(values: number[]): number {
  if (values.length === 0) return 0;

  let sum = 0;
  let compensation = 0; // Running compensation for lost low-order bits

  for (let i = 0; i < values.length; i++) {
    const y = values[i] - compensation; // Compensated value
    const t = sum + y;                   // New sum (may lose precision)
    compensation = (t - sum) - y;        // Recover lost precision
    sum = t;
  }

  return sum;
}
