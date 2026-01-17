/**
 * Random number generation for Monte Carlo simulation
 *
 * Provides distribution sampling functions for generating
 * correlated asset returns in simulation.
 */

import { choleskyDecomposition } from './correlation';
import { round } from './precision';

/** Default decimal precision for output values */
const DEFAULT_PRECISION = 6;

/**
 * Generate a random sample from a normal (Gaussian) distribution
 *
 * Uses the Box-Muller transform to convert uniform random numbers
 * to normally distributed values.
 *
 * @param mean - Mean of the distribution (default: 0)
 * @param stddev - Standard deviation (default: 1)
 * @param rng - Random number generator returning values in [0, 1) (default: Math.random)
 * @returns Random sample from N(mean, stddev^2)
 */
export function normalRandom(
  mean: number = 0,
  stddev: number = 1,
  rng: () => number = Math.random
): number {
  // Box-Muller transform
  // Generate two uniform random numbers in (0, 1)
  // Use 1 - rng() to avoid log(0)
  const u1 = 1 - rng();
  const u2 = rng();

  // Transform to standard normal
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale and shift to desired distribution
  return mean + z * stddev;
}

/**
 * Generate a random sample from a lognormal distribution
 *
 * The lognormal distribution is the distribution of a random variable
 * whose logarithm is normally distributed.
 *
 * @param mu - Mean of the underlying normal distribution (default: 0)
 * @param sigma - Stddev of the underlying normal distribution (default: 1)
 * @param rng - Random number generator returning values in [0, 1) (default: Math.random)
 * @returns Positive random sample from LogNormal(mu, sigma^2)
 */
export function lognormalRandom(
  mu: number = 0,
  sigma: number = 1,
  rng: () => number = Math.random
): number {
  // exp(normal(mu, sigma))
  return Math.exp(normalRandom(mu, sigma, rng));
}

/**
 * Generate correlated samples using Cholesky decomposition
 *
 * Given a correlation matrix, generates k correlated samples (one per asset).
 * The correlation structure is preserved through the transformation Y = L * Z
 * where L is the Cholesky factor and Z is a vector of independent standard normals.
 *
 * @param n - Number of assets (k = matrix size)
 * @param correlationMatrix - Symmetric positive-definite correlation matrix
 * @param rng - Random number generator returning values in [0, 1) (default: Math.random)
 * @param mean - Mean of the output distribution (default: 0)
 * @param stddev - Standard deviation of the output distribution (default: 1)
 * @returns Array of n correlated samples (one per asset)
 * @throws Error if correlation matrix is not positive-definite
 */
export function correlatedSamples(
  n: number,
  correlationMatrix: number[][],
  rng: () => number = Math.random,
  mean: number = 0,
  stddev: number = 1
): number[] {
  // Compute Cholesky decomposition
  const L = choleskyDecomposition(correlationMatrix);

  if (L === null) {
    throw new Error('Invalid correlation matrix: not positive-definite');
  }

  const k = correlationMatrix.length; // Number of assets

  // Validate n matches matrix size
  if (n !== k) {
    throw new Error(`Number of assets (${n}) must match correlation matrix size (${k})`);
  }

  // Generate k independent standard normal samples
  const uncorrelated: number[] = [];
  for (let j = 0; j < k; j++) {
    uncorrelated.push(normalRandom(0, 1, rng));
  }

  // Multiply by Cholesky factor: correlated = L * uncorrelated
  // Then scale and shift to desired distribution
  const correlated: number[] = [];
  for (let i = 0; i < k; i++) {
    let value = 0;
    for (let j = 0; j <= i; j++) {
      // L is lower triangular, so L[i][j] = 0 for j > i
      value += L[i][j] * uncorrelated[j];
    }
    // Scale by stddev and shift by mean
    correlated.push(round(mean + value * stddev, DEFAULT_PRECISION));
  }

  return correlated;
}
