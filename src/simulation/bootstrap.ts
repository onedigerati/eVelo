/**
 * Bootstrap Resampling Module
 *
 * Provides bootstrap methods for Monte Carlo return generation:
 * - Simple bootstrap: IID resampling with replacement
 * - Block bootstrap: Preserves autocorrelation via contiguous blocks
 *
 * Both methods accept seeded RNG for reproducibility.
 */

import { mean } from '../math';

/**
 * Simple bootstrap resampling with replacement
 *
 * Samples randomly from historical returns without preserving
 * any time-series structure. Suitable when autocorrelation is negligible.
 *
 * @param returns Historical return series
 * @param targetLength Number of returns to generate
 * @param rng Random number generator (0-1)
 * @returns Array of resampled returns
 */
export function simpleBootstrap(
  returns: number[],
  targetLength: number,
  rng: () => number
): number[] {
  if (returns.length === 0) {
    throw new Error('Cannot bootstrap from empty returns array');
  }

  const result: number[] = [];
  const n = returns.length;

  for (let i = 0; i < targetLength; i++) {
    const idx = Math.floor(rng() * n);
    result.push(returns[idx]);
  }

  return result;
}
