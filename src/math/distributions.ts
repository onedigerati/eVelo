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
 * @returns Random sample from N(mean, stddev^2)
 */
export function normalRandom(mean: number = 0, stddev: number = 1): number {
  // Box-Muller transform
  // Generate two uniform random numbers in (0, 1)
  // Use 1 - Math.random() to avoid log(0)
  const u1 = 1 - Math.random();
  const u2 = Math.random();

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
 * @returns Positive random sample from LogNormal(mu, sigma^2)
 */
export function lognormalRandom(mu: number = 0, sigma: number = 1): number {
  // exp(normal(mu, sigma))
  return Math.exp(normalRandom(mu, sigma));
}

/**
 * Generate correlated samples using Cholesky decomposition
 *
 * Given a correlation matrix, generates n sets of correlated
 * standard normal samples. The correlation structure is preserved
 * through the transformation Y = L * Z where L is the Cholesky
 * factor and Z is a vector of independent standard normals.
 *
 * @param n - Number of samples to generate
 * @param correlationMatrix - Symmetric positive-definite correlation matrix
 * @returns Array of n sample vectors, each with k elements (k = matrix size)
 * @throws Error if correlation matrix is not positive-definite
 */
export function correlatedSamples(n: number, correlationMatrix: number[][]): number[][] {
  // Compute Cholesky decomposition
  const L = choleskyDecomposition(correlationMatrix);

  if (L === null) {
    throw new Error('Invalid correlation matrix: not positive-definite');
  }

  const k = correlationMatrix.length; // Number of assets
  const samples: number[][] = [];

  // Generate n sets of correlated samples
  for (let sampleIdx = 0; sampleIdx < n; sampleIdx++) {
    // Generate k independent standard normal samples
    const uncorrelated: number[] = [];
    for (let j = 0; j < k; j++) {
      uncorrelated.push(normalRandom());
    }

    // Multiply by Cholesky factor: correlated = L * uncorrelated
    const correlated: number[] = [];
    for (let i = 0; i < k; i++) {
      let value = 0;
      for (let j = 0; j <= i; j++) {
        // L is lower triangular, so L[i][j] = 0 for j > i
        value += L[i][j] * uncorrelated[j];
      }
      correlated.push(round(value, DEFAULT_PRECISION));
    }

    samples.push(correlated);
  }

  return samples;
}
