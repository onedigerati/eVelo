/**
 * Fat-Tail Return Model with Student's t-Distribution
 *
 * Generates returns with fatter tails than normal distribution to better
 * capture extreme market events (crashes, rallies). Uses Student's t-distribution
 * with asset-class specific parameters.
 *
 * Reference: Student's t-distribution has probability density:
 *   f(x) ∝ (1 + x²/ν)^(-(ν+1)/2)
 *
 * Where ν (nu) is degrees of freedom. Lower ν = fatter tails.
 */

import { AssetClass, FAT_TAIL_PARAMS } from './types';

/**
 * Generate a Student's t-distributed random variable
 *
 * Uses Box-Muller transform for normal variates, then applies
 * chi-squared distribution for t-distribution.
 *
 * @param degreesOfFreedom Degrees of freedom (lower = fatter tails)
 * @returns Student's t-distributed random variable
 */
export function studentT(degreesOfFreedom: number): number {
  // Generate chi-squared random variable with df degrees of freedom
  // Using sum of squared normals: χ²(k) = Σ(Z_i²) for i=1..k
  let chiSquared = 0;
  for (let i = 0; i < degreesOfFreedom; i++) {
    const z = boxMullerNormal();
    chiSquared += z * z;
  }

  // Student's t = Z / sqrt(χ²/ν)
  const z = boxMullerNormal();
  return z / Math.sqrt(chiSquared / degreesOfFreedom);
}

/**
 * Box-Muller transform for standard normal random variable
 *
 * Generates N(0,1) from uniform random variables.
 *
 * @returns Standard normal random variable (mean=0, stddev=1)
 */
function boxMullerNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Cholesky decomposition for correlation matrix
 *
 * Decomposes correlation matrix C into lower triangular L where C = LL^T
 * Used to generate correlated random variables.
 *
 * @param correlationMatrix NxN symmetric positive definite matrix
 * @returns Lower triangular Cholesky factor L
 */
function choleskyDecomposition(correlationMatrix: number[][]): number[][] {
  const n = correlationMatrix.length;
  const L: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }

      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, correlationMatrix[i][i] - sum));
      } else {
        L[i][j] = (correlationMatrix[i][j] - sum) / Math.max(1e-10, L[j][j]);
      }
    }
  }

  return L;
}

/**
 * Generate fat-tailed return for a single asset
 *
 * Applies Student's t-distribution with asset-class specific parameters:
 * - Survivorship bias adjustment
 * - Volatility scaling
 * - Degrees of freedom (tail fatness)
 * - Skew multiplier (asymmetry)
 *
 * Return is clamped to [-0.99, +10.0] to prevent extreme outliers.
 *
 * @param historicalReturns Historical annual returns for the asset
 * @param assetClass Asset class (determines distribution parameters)
 * @returns Annual return with fat-tail behavior
 */
export function generateFatTailReturn(
  historicalReturns: number[],
  assetClass: AssetClass = 'equity_index'
): number {
  if (historicalReturns.length === 0) {
    throw new Error('generateFatTailReturn: historicalReturns cannot be empty');
  }

  const params = FAT_TAIL_PARAMS[assetClass];

  // Calculate empirical mean and stddev
  const mean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
  const variance = historicalReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / historicalReturns.length;
  const stddev = Math.sqrt(variance);

  // Generate Student's t random variable
  const t = studentT(params.degreesOfFreedom);

  // Apply skew (negative skew makes crashes more likely than rallies)
  const skewedT = t + params.skewMultiplier * (t * t - 1);

  // Scale by volatility and center at mean
  const scaledReturn = mean + skewedT * stddev * params.volatilityScaling;

  // Apply survivorship bias (upward adjustment)
  const biasedReturn = scaledReturn + params.survivorshipBias;

  // Clamp to reasonable range
  // -99% minimum (total loss), +1000% maximum (10x return)
  const clampedReturn = Math.max(-0.99, Math.min(10.0, biasedReturn));

  return clampedReturn;
}

/**
 * Generate correlated fat-tail returns for multiple assets
 *
 * Applies Cholesky decomposition to correlation matrix to generate
 * correlated Student's t random variables.
 *
 * @param historicalReturnsArray Array of historical returns for each asset
 * @param assetClasses Array of asset classes (one per asset)
 * @param correlationMatrix NxN correlation matrix
 * @returns Array of correlated annual returns
 */
export function generateCorrelatedFatTailReturns(
  historicalReturnsArray: number[][],
  assetClasses: AssetClass[],
  correlationMatrix: number[][]
): number[] {
  const n = historicalReturnsArray.length;

  if (assetClasses.length !== n) {
    throw new Error('assetClasses length must match historicalReturnsArray length');
  }

  if (correlationMatrix.length !== n || correlationMatrix[0].length !== n) {
    throw new Error('correlationMatrix must be NxN where N is number of assets');
  }

  // Calculate empirical statistics for each asset
  const stats = historicalReturnsArray.map((returns) => {
    if (returns.length === 0) {
      throw new Error('generateCorrelatedFatTailReturns: historicalReturns cannot be empty');
    }
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    const stddev = Math.sqrt(variance);
    return { mean, stddev };
  });

  // Cholesky decomposition of correlation matrix
  const L = choleskyDecomposition(correlationMatrix);

  // Generate independent Student's t variables
  const tVariables = assetClasses.map((assetClass) => {
    const params = FAT_TAIL_PARAMS[assetClass];
    const t = studentT(params.degreesOfFreedom);
    // Apply skew
    return t + params.skewMultiplier * (t * t - 1);
  });

  // Apply correlation structure: correlatedT = L * independentT
  const correlatedT = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      correlatedT[i] += L[i][j] * tVariables[j];
    }
  }

  // Scale by volatility, center at mean, apply survivorship bias
  const returns = correlatedT.map((t, i) => {
    const params = FAT_TAIL_PARAMS[assetClasses[i]];
    const scaledReturn = stats[i].mean + t * stats[i].stddev * params.volatilityScaling;
    const biasedReturn = scaledReturn + params.survivorshipBias;
    // Clamp to reasonable range
    return Math.max(-0.99, Math.min(10.0, biasedReturn));
  });

  return returns;
}
