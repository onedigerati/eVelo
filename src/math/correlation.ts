/**
 * Correlation calculation and Cholesky decomposition
 *
 * Provides correlation functions for analyzing asset relationships
 * and Cholesky decomposition for generating correlated random samples.
 */

import { mean, stddev } from './statistics';
import { sum, round, EPSILON } from './precision';

/** Default decimal precision for output values */
const DEFAULT_PRECISION = 6;

/** Maximum correlation for off-diagonal elements (prevents singularity) */
const MAX_CORRELATION = 0.9999;

/** Regularization factor added to diagonal when matrix is near-singular */
const REGULARIZATION_EPSILON = 1e-6;

/**
 * Calculate Pearson correlation coefficient between two arrays
 *
 * Formula: Σ((xi - x̄)(yi - ȳ)) / (n * σx * σy)
 *
 * @param x - First array of values
 * @param y - Second array of values
 * @returns Correlation coefficient in [-1, 1] range, NaN if invalid input
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;

  // Validate input
  if (n !== y.length || n < 2) {
    return NaN;
  }

  // Calculate means (use raw mean to avoid double rounding)
  const meanX = sum(x) / n;
  const meanY = sum(y) / n;

  // Calculate standard deviations (sample, N-1)
  const stdX = stddev(x);
  const stdY = stddev(y);

  // Handle zero standard deviation (constant values)
  if (stdX === 0 || stdY === 0) {
    return NaN;
  }

  // Calculate covariance numerator: Σ((xi - x̄)(yi - ȳ))
  const products: number[] = [];
  for (let i = 0; i < n; i++) {
    products.push((x[i] - meanX) * (y[i] - meanY));
  }
  const covariance = sum(products);

  // Calculate correlation: covariance / (n * σx * σy)
  // Note: Using n-1 since we used sample stddev
  const correlation = covariance / ((n - 1) * stdX * stdY);

  // Clamp to [-1, 1] to handle floating point edge cases
  const clamped = Math.max(-1, Math.min(1, correlation));

  return round(clamped, DEFAULT_PRECISION);
}

/**
 * Calculate correlation matrix for multiple asset return series
 *
 * @param assetReturns - Array of return arrays, one per asset
 * @returns Symmetric n×n correlation matrix where n = number of assets
 */
export function correlationMatrix(assetReturns: number[][]): number[][] {
  const n = assetReturns.length;

  if (n === 0) {
    return [];
  }

  // Initialize matrix with zeros
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  // Calculate correlations
  for (let i = 0; i < n; i++) {
    // Diagonal is always 1.0
    matrix[i][i] = 1.0;

    // Calculate off-diagonal correlations (symmetric)
    for (let j = i + 1; j < n; j++) {
      const corr = pearsonCorrelation(assetReturns[i], assetReturns[j]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return matrix;
}

/**
 * Regularize a correlation matrix to ensure it's positive-definite
 *
 * This handles two common issues:
 * 1. Off-diagonal correlations of exactly ±1.0 (makes matrix singular)
 * 2. Near-singular matrices that fail Cholesky (adds small diagonal regularization)
 *
 * @param matrix - Correlation matrix to regularize
 * @param addDiagonalRegularization - Whether to also add diagonal regularization
 * @returns A new regularized matrix (original is not modified)
 */
export function regularizeCorrelationMatrix(
  matrix: number[][],
  addDiagonalRegularization: boolean = false
): number[][] {
  const n = matrix.length;
  if (n === 0) return [];

  // Create a copy of the matrix
  const regularized: number[][] = matrix.map(row => [...row]);

  // Cap off-diagonal correlations at ±MAX_CORRELATION
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        regularized[i][j] = Math.max(-MAX_CORRELATION, Math.min(MAX_CORRELATION, regularized[i][j]));
      }
    }
  }

  // Optionally add small diagonal regularization
  if (addDiagonalRegularization) {
    for (let i = 0; i < n; i++) {
      regularized[i][i] = 1.0 + REGULARIZATION_EPSILON;
    }
  }

  return regularized;
}

/**
 * Cholesky decomposition of a symmetric positive-definite matrix
 *
 * Produces lower triangular matrix L such that L * L^T = input matrix.
 * Used to generate correlated random samples: Y = L * Z where Z is uncorrelated.
 *
 * Automatically regularizes near-singular matrices (e.g., when assets have
 * perfect or near-perfect correlations) to ensure successful decomposition.
 *
 * @param matrix - Symmetric positive-definite matrix (typically correlation matrix)
 * @returns Lower triangular matrix L, or null if matrix is not positive-definite
 */
export function choleskyDecomposition(matrix: number[][]): number[][] | null {
  const n = matrix.length;

  if (n === 0) {
    return [];
  }

  // Try with original matrix first
  let result = choleskyDecompositionInternal(matrix);
  if (result !== null) {
    return result;
  }

  // First attempt: cap correlations at ±0.9999
  const regularized = regularizeCorrelationMatrix(matrix, false);
  result = choleskyDecompositionInternal(regularized);
  if (result !== null) {
    console.warn('Correlation matrix required regularization (capped correlations at ±0.9999)');
    return result;
  }

  // Second attempt: add diagonal regularization
  const fullyRegularized = regularizeCorrelationMatrix(matrix, true);
  result = choleskyDecompositionInternal(fullyRegularized);
  if (result !== null) {
    console.warn('Correlation matrix required diagonal regularization');
    return result;
  }

  // If still failing, return null
  return null;
}

/**
 * Internal Cholesky decomposition without regularization attempts
 */
function choleskyDecompositionInternal(matrix: number[][]): number[][] | null {
  const n = matrix.length;

  // Initialize L matrix with zeros
  const L: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  // Cholesky-Banachiewicz algorithm
  for (let j = 0; j < n; j++) {
    for (let i = j; i < n; i++) {
      let sumVal = matrix[i][j];

      // Subtract sum of products of previous column values
      for (let k = 0; k < j; k++) {
        sumVal -= L[i][k] * L[j][k];
      }

      if (i === j) {
        // Diagonal element
        if (sumVal <= EPSILON) {
          // Matrix is not positive-definite
          return null;
        }
        L[i][j] = round(Math.sqrt(sumVal), DEFAULT_PRECISION);
      } else {
        // Off-diagonal element
        L[i][j] = round(sumVal / L[j][j], DEFAULT_PRECISION);
      }
    }
  }

  return L;
}
