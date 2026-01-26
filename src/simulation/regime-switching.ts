/**
 * Regime-Switching Return Generation
 *
 * Implements a Markov regime-switching model for realistic market simulation.
 * Based on Hamilton (1989) regime-switching methodology.
 *
 * Markets transition between bull, bear, and crash regimes according to
 * a configurable transition matrix, with each regime having distinct
 * return distributions.
 *
 * Note: Returns are floored at -100% (total loss) since a portfolio position
 * cannot lose more than 100% of its value. This is necessary because normal
 * distribution sampling can produce extreme values when stddev is high.
 */

import { normalRandom, correlatedSamples } from '../math';
import type {
  MarketRegime,
  TransitionMatrix,
  RegimeParamsMap,
  RegimeCalibrationMode,
  AssetHistoricalStats,
  AssetClass,
} from './types';
import {
  DEFAULT_TRANSITION_MATRIX,
  DEFAULT_REGIME_PARAMS,
  SURVIVORSHIP_BIAS,
  REGIME_CONFIG,
  getRegimeMultipliers,
} from './types';

/**
 * Result of regime-switching return generation
 */
export interface RegimeReturnsResult {
  /** Generated annual returns */
  returns: number[];
  /** Regime for each year (for analysis/debugging) */
  regimes: MarketRegime[];
}

/**
 * Determine next market regime via Markov transition
 *
 * Uses the current regime's row in the transition matrix to
 * probabilistically select the next regime.
 *
 * @param current Current market regime
 * @param matrix Transition probability matrix
 * @param rng Random number generator (0-1)
 * @returns Next market regime
 */
export function nextRegime(
  current: MarketRegime,
  matrix: TransitionMatrix,
  rng: () => number
): MarketRegime {
  const probs = matrix[current];
  const r = rng();

  // Cumulative probability selection for 4-regime system
  if (r < probs.bull) {
    return 'bull';
  }
  if (r < probs.bull + probs.bear) {
    return 'bear';
  }
  if (r < probs.bull + probs.bear + probs.crash) {
    return 'crash';
  }
  return 'recovery';
}

/**
 * Validate transition matrix for sanity
 *
 * Checks that:
 * - All probabilities are non-negative
 * - Each row sums to 1 (within tolerance)
 *
 * @param matrix Transition matrix to validate
 * @returns True if valid, throws error otherwise
 */
export function validateTransitionMatrix(matrix: TransitionMatrix): boolean {
  const regimes: MarketRegime[] = ['bull', 'bear', 'crash', 'recovery'];
  const tolerance = 0.0001;

  for (const regime of regimes) {
    const row = matrix[regime];

    // Check non-negative probabilities
    for (const targetRegime of regimes) {
      if (row[targetRegime] < 0) {
        throw new Error(
          `Invalid transition probability: ${regime} -> ${targetRegime} = ${row[targetRegime]} (must be non-negative)`
        );
      }
    }

    // Check row sum equals 1
    const rowSum = row.bull + row.bear + row.crash + row.recovery;
    if (Math.abs(rowSum - 1.0) > tolerance) {
      throw new Error(
        `Invalid transition matrix: ${regime} row sums to ${rowSum} (must sum to 1.0)`
      );
    }
  }

  return true;
}

/**
 * Return clamping constants
 * - MIN_RETURN_CLAMP: Floor at -99% (total loss protection)
 * - MAX_RETURN_CLAMP: Ceiling at +500% (extreme tail protection)
 */
const MIN_RETURN_CLAMP = -0.99;
const MAX_RETURN_CLAMP = 5.0;

/**
 * Generate returns using regime-switching model
 *
 * Simulates a Markov chain of market regimes (bull/bear/crash/recovery)
 * and generates returns from each regime's distribution.
 * This captures realistic volatility clustering and crash sequences.
 *
 * Based on Hamilton (1989) regime-switching model.
 *
 * @param years Number of years to generate
 * @param rng Random number generator (0-1)
 * @param initialRegime Starting market regime (default: 'bull')
 * @param matrix Transition probability matrix
 * @param params Return distribution parameters per regime
 * @param calibrationMode Mode for survivorship bias adjustment (default: 'historical')
 * @returns Object with returns array and regime sequence
 */
export function generateRegimeReturns(
  years: number,
  rng: () => number,
  initialRegime: MarketRegime = 'bull',
  matrix?: TransitionMatrix,
  params?: RegimeParamsMap,
  calibrationMode: RegimeCalibrationMode = 'historical'
): RegimeReturnsResult {
  // Use defaults from types if not provided
  const effectiveMatrix = matrix ?? DEFAULT_TRANSITION_MATRIX;
  const effectiveParams = params ?? DEFAULT_REGIME_PARAMS;

  // Get survivorship bias adjustment for this calibration mode
  const survivorshipBias = SURVIVORSHIP_BIAS[calibrationMode];

  const returns: number[] = [];
  const regimes: MarketRegime[] = [];
  let currentRegime = initialRegime;

  for (let year = 0; year < years; year++) {
    // Record current regime
    regimes.push(currentRegime);

    // Generate return from current regime's distribution
    const { mean, stddev } = effectiveParams[currentRegime];

    // Apply survivorship bias adjustment to mean
    const adjustedMean = mean - survivorshipBias;

    const rawReturn = normalRandom(adjustedMean, stddev, rng);

    // Clamp return between -99% and +500%
    const yearReturn = Math.max(MIN_RETURN_CLAMP, Math.min(MAX_RETURN_CLAMP, rawReturn));
    returns.push(yearReturn);

    // Transition to next regime
    currentRegime = nextRegime(currentRegime, effectiveMatrix, rng);
  }

  return { returns, regimes };
}

/**
 * Result of correlated regime-switching return generation
 */
export interface CorrelatedRegimeReturnsResult {
  /** Generated annual returns per asset [asset][year] */
  returns: number[][];
  /** Regime for each year (shared across all assets) */
  regimes: MarketRegime[];
}

/**
 * Generate correlated returns across multiple assets using regime model
 *
 * All assets share the same regime sequence. Returns are generated using the
 * multiplier-based approach (aligned with reference methodology):
 *
 * For each year:
 *   adjustedMean = (historicalMean * multiplier.meanMultiplier) + multiplier.meanAdjustment - survivorshipBias
 *   adjustedStddev = historicalStddev * multiplier.volMultiplier
 *
 * @param years Number of years to generate
 * @param numAssets Number of assets in portfolio
 * @param correlationMatrix Asset correlation matrix (from historical data)
 * @param rng Random number generator
 * @param initialRegime Starting regime
 * @param matrix Transition matrix (if not provided, uses REGIME_CONFIG based on calibrationMode)
 * @param params Shared regime parameters (legacy, used if assetHistoricalStats not provided)
 * @param assetRegimeParams Legacy per-asset regime params (ignored if assetHistoricalStats provided)
 * @param calibrationMode Mode for regime multipliers and survivorship bias (default: 'historical')
 * @param assetHistoricalStats Per-asset historical statistics for multiplier approach
 * @returns Object with 2D returns array [asset][year] and regime sequence
 */
export function generateCorrelatedRegimeReturns(
  years: number,
  numAssets: number,
  correlationMatrix: number[][],
  rng: () => number,
  initialRegime: MarketRegime = 'bull',
  matrix?: TransitionMatrix,
  params?: RegimeParamsMap,
  assetRegimeParams?: RegimeParamsMap[],
  calibrationMode: RegimeCalibrationMode = 'historical',
  assetHistoricalStats?: AssetHistoricalStats[]
): CorrelatedRegimeReturnsResult {
  // Get regime config for this calibration mode
  const regimeConfig = REGIME_CONFIG[calibrationMode];

  // Use transition matrix from config if not explicitly provided
  const effectiveMatrix = matrix ?? regimeConfig.transitions;
  const effectiveParams = params ?? DEFAULT_REGIME_PARAMS;

  // Get survivorship bias from config
  const survivorshipBias = regimeConfig.survivorshipBias;

  // Generate regime sequence first
  const regimes: MarketRegime[] = [];
  let currentRegime = initialRegime;

  for (let year = 0; year < years; year++) {
    regimes.push(currentRegime);
    currentRegime = nextRegime(currentRegime, effectiveMatrix, rng);
  }

  // Initialize returns arrays for each asset
  const returns: number[][] = Array.from(
    { length: numAssets },
    () => new Array(years)
  );

  // Generate returns for each year
  for (let year = 0; year < years; year++) {
    const regime = regimes[year];

    if (assetHistoricalStats && assetHistoricalStats.length === numAssets) {
      // NEW: Multiplier-based approach (aligned with reference methodology)
      // Generate correlated standard normal samples
      const correlated = correlatedSamples(
        numAssets,
        correlationMatrix,
        rng,
        0, // mean=0 for standard normal
        1  // stddev=1 for standard normal
      );

      // Apply regime multipliers to each asset's historical statistics
      for (let asset = 0; asset < numAssets; asset++) {
        const stats = assetHistoricalStats[asset];
        const multipliers = getRegimeMultipliers(regime, stats.assetClass, calibrationMode);

        // Formula: adjustedMean = (historicalMean * meanMultiplier) + meanAdjustment - survivorshipBias
        const adjustedMean = (stats.mean * multipliers.meanMultiplier) + multipliers.meanAdjustment - survivorshipBias;
        const adjustedStddev = stats.stddev * multipliers.volMultiplier;

        // Generate return: mean + stddev * z
        const rawReturn = adjustedMean + adjustedStddev * correlated[asset];

        // Clamp return between -99% and +500%
        returns[asset][year] = Math.max(MIN_RETURN_CLAMP, Math.min(MAX_RETURN_CLAMP, rawReturn));
      }
    } else if (assetRegimeParams && assetRegimeParams.length === numAssets) {
      // LEGACY: Asset-specific calibrated parameters (deprecated, kept for backward compatibility)
      const correlated = correlatedSamples(
        numAssets,
        correlationMatrix,
        rng,
        0,
        1
      );

      for (let asset = 0; asset < numAssets; asset++) {
        const { mean, stddev } = assetRegimeParams[asset][regime];
        const adjustedMean = mean - survivorshipBias;
        const rawReturn = adjustedMean + stddev * correlated[asset];
        returns[asset][year] = Math.max(MIN_RETURN_CLAMP, Math.min(MAX_RETURN_CLAMP, rawReturn));
      }
    } else {
      // Shared parameters (fallback)
      const { mean, stddev } = effectiveParams[regime];
      const adjustedMean = mean - survivorshipBias;
      const yearReturns = correlatedSamples(
        numAssets,
        correlationMatrix,
        rng,
        adjustedMean,
        stddev
      );

      for (let asset = 0; asset < numAssets; asset++) {
        returns[asset][year] = Math.max(MIN_RETURN_CLAMP, Math.min(MAX_RETURN_CLAMP, yearReturns[asset]));
      }
    }
  }

  return { returns, regimes };
}
