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

/**
 * Politis-White (2004) automatic block length selection
 *
 * Calculates optimal block length for block bootstrap based on
 * first-order autocorrelation of the series. Higher autocorrelation
 * results in larger blocks to preserve serial dependence.
 *
 * Reference: Politis & White, "Automatic Block-Length Selection for
 * the Dependent Bootstrap", Econometric Reviews 23(1), 2004
 *
 * @param returns Time series of returns
 * @returns Optimal block length (clamped to [3, n/4])
 */
export function optimalBlockLength(returns: number[]): number {
  const n = returns.length;

  if (n < 12) {
    // Too short for meaningful autocorrelation estimate
    return Math.max(3, Math.floor(n / 2));
  }

  // Calculate sample mean
  const meanR = mean(returns);

  // Calculate first-order autocorrelation (lag-1)
  let numerator = 0;
  let denominator = 0;

  for (let i = 1; i < n; i++) {
    numerator += (returns[i] - meanR) * (returns[i - 1] - meanR);
  }
  for (let i = 0; i < n; i++) {
    denominator += (returns[i] - meanR) ** 2;
  }

  // Avoid division by zero
  if (denominator === 0) {
    return 3;
  }

  const rho1 = numerator / denominator;

  // Politis-White rule with Patton-Politis-White correction
  // g captures persistence: higher autocorrelation -> larger g
  const absRho = Math.abs(rho1);
  const rhoSquared = rho1 ** 2;

  // Guard against rho1 = 1 (perfect autocorrelation)
  if (rhoSquared >= 1) {
    return Math.floor(n / 4);
  }

  const g = (2 * absRho) / (1 - rhoSquared);

  // Block length formula: L* = c * n^(1/3) * g^(1/3)
  // Using c ≈ (3/2)^(1/3) from the literature
  const blockLength = Math.ceil(
    Math.pow((3 * n) / 2, 1 / 3) * Math.pow(Math.max(g, 0.01), 1 / 3)
  );

  // Clamp to reasonable bounds: minimum 3, maximum n/4
  return Math.max(3, Math.min(Math.floor(n / 4), blockLength));
}

/**
 * Moving block bootstrap resampling
 *
 * Preserves autocorrelation by sampling contiguous blocks from
 * the historical series. Blocks can overlap in the original series.
 *
 * Use for return series with significant serial correlation
 * (e.g., monthly returns, high-frequency data).
 *
 * @param returns Historical return series
 * @param targetLength Number of returns to generate
 * @param rng Random number generator (0-1)
 * @param blockSize Optional fixed block size (auto-calculated if not provided)
 * @returns Array of resampled returns preserving autocorrelation
 */
export function blockBootstrap(
  returns: number[],
  targetLength: number,
  rng: () => number,
  blockSize?: number
): number[] {
  if (returns.length === 0) {
    throw new Error('Cannot bootstrap from empty returns array');
  }

  const n = returns.length;

  // Calculate or validate block size
  const effectiveBlockSize = blockSize ?? optimalBlockLength(returns);

  // Block size cannot exceed series length
  const safeBlockSize = Math.min(effectiveBlockSize, n);

  if (safeBlockSize < 1) {
    throw new Error('Block size must be at least 1');
  }

  const result: number[] = [];

  // Maximum starting index for a block
  const maxStart = n - safeBlockSize;

  while (result.length < targetLength) {
    // Select random block starting position
    const startIdx = maxStart > 0 ? Math.floor(rng() * (maxStart + 1)) : 0;

    // Copy block to result (up to targetLength)
    for (let i = 0; i < safeBlockSize && result.length < targetLength; i++) {
      result.push(returns[startIdx + i]);
    }
  }

  return result;
}

/**
 * Correlated simple bootstrap resampling with shared year index
 *
 * Preserves cross-asset correlations by sampling the same historical year
 * for all assets in each simulation period. This maintains the natural
 * correlation structure present in historical data.
 *
 * Example: If 2008 is sampled, all assets use their 2008 returns,
 * preserving the crisis correlation spike that occurred that year.
 *
 * @param assetReturns Array of historical return series (one per asset)
 * @param targetLength Number of returns to generate
 * @param rng Random number generator (0-1)
 * @returns Array of resampled returns for each asset (preserving correlations)
 */
export function correlatedBootstrap(
  assetReturns: number[][],
  targetLength: number,
  rng: () => number
): number[][] {
  if (assetReturns.length === 0) {
    throw new Error('Cannot bootstrap from empty asset array');
  }

  // Find minimum historical data length across all assets
  const minLength = Math.min(...assetReturns.map(returns => returns.length));

  if (minLength === 0) {
    throw new Error('All assets must have at least one historical return');
  }

  // Initialize result arrays for each asset
  const results: number[][] = assetReturns.map(() => []);

  // Sample targetLength years using shared year indices
  for (let i = 0; i < targetLength; i++) {
    // Sample a single year index that all assets will use
    const sharedYearIndex = Math.floor(rng() * minLength);

    // Apply this year's return to all assets
    assetReturns.forEach((returns, assetIdx) => {
      results[assetIdx].push(returns[sharedYearIndex]);
    });
  }

  return results;
}

/**
 * Correlated block bootstrap resampling with shared block indices
 *
 * Preserves both autocorrelation (within each asset) and cross-asset
 * correlations by sampling the same historical blocks for all assets.
 *
 * Use when returns have significant serial correlation AND you need
 * to preserve cross-asset correlation structure.
 *
 * @param assetReturns Array of historical return series (one per asset)
 * @param targetLength Number of returns to generate
 * @param rng Random number generator (0-1)
 * @param blockSize Optional fixed block size (auto-calculated from first asset if not provided)
 * @returns Array of resampled returns for each asset (preserving both types of correlation)
 */
export function correlatedBlockBootstrap(
  assetReturns: number[][],
  targetLength: number,
  rng: () => number,
  blockSize?: number
): number[][] {
  if (assetReturns.length === 0) {
    throw new Error('Cannot bootstrap from empty asset array');
  }

  // Find minimum historical data length across all assets
  const minLength = Math.min(...assetReturns.map(returns => returns.length));

  if (minLength === 0) {
    throw new Error('All assets must have at least one historical return');
  }

  // Calculate or validate block size using first asset
  const effectiveBlockSize = blockSize ?? optimalBlockLength(assetReturns[0]);

  // Block size cannot exceed minimum series length
  const safeBlockSize = Math.min(effectiveBlockSize, minLength);

  if (safeBlockSize < 1) {
    throw new Error('Block size must be at least 1');
  }

  // Initialize result arrays for each asset
  const results: number[][] = assetReturns.map(() => []);

  // Maximum starting index for a block
  const maxStart = minLength - safeBlockSize;

  // Sample blocks until we reach targetLength
  while (results[0].length < targetLength) {
    // Sample a single block starting position that all assets will use
    const sharedStartIdx = maxStart > 0 ? Math.floor(rng() * (maxStart + 1)) : 0;

    // Copy this block for all assets
    for (let i = 0; i < safeBlockSize && results[0].length < targetLength; i++) {
      assetReturns.forEach((returns, assetIdx) => {
        results[assetIdx].push(returns[sharedStartIdx + i]);
      });
    }
  }

  return results;
}
