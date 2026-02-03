/**
 * Math module barrel export
 *
 * Provides unified access to all math functions:
 * - Precision utilities for floating point handling
 * - Statistical functions for analysis
 * - Correlation functions for asset relationships
 * - Distribution functions for Monte Carlo sampling
 */

// Precision utilities
export { sum, round, almostEqual, EPSILON } from './precision';

// Statistical functions
export { mean, variance, stddev, percentile } from './statistics';

// Correlation functions
export { pearsonCorrelation, correlationMatrix, choleskyDecomposition, regularizeCorrelationMatrix } from './correlation';

// Distribution functions
export { normalRandom, lognormalRandom, correlatedSamples } from './distributions';
