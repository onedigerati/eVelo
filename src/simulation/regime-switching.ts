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
} from './types';
import {
  DEFAULT_TRANSITION_MATRIX,
  DEFAULT_REGIME_PARAMS,
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

  // Cumulative probability selection
  if (r < probs.bull) {
    return 'bull';
  }
  if (r < probs.bull + probs.bear) {
    return 'bear';
  }
  return 'crash';
}

/**
 * Generate returns using regime-switching model
 *
 * Simulates a Markov chain of market regimes (bull/bear/crash)
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
 * @returns Object with returns array and regime sequence
 */
export function generateRegimeReturns(
  years: number,
  rng: () => number,
  initialRegime: MarketRegime = 'bull',
  matrix?: TransitionMatrix,
  params?: RegimeParamsMap
): RegimeReturnsResult {
  // Use defaults from types if not provided
  const effectiveMatrix = matrix ?? DEFAULT_TRANSITION_MATRIX;
  const effectiveParams = params ?? DEFAULT_REGIME_PARAMS;

  const returns: number[] = [];
  const regimes: MarketRegime[] = [];
  let currentRegime = initialRegime;

  for (let year = 0; year < years; year++) {
    // Record current regime
    regimes.push(currentRegime);

    // Generate return from current regime's distribution
    const { mean, stddev } = effectiveParams[currentRegime];
    const rawReturn = normalRandom(mean, stddev, rng);
    // Floor at -1 (total loss) - cannot lose more than 100%
    const yearReturn = Math.max(-1, rawReturn);
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
 * All assets share the same regime sequence but each asset can have
 * its own regime parameters (mean/stddev per regime).
 *
 * @param years Number of years to generate
 * @param numAssets Number of assets in portfolio
 * @param correlationMatrix Asset correlation matrix (from historical data)
 * @param rng Random number generator
 * @param initialRegime Starting regime
 * @param matrix Transition matrix
 * @param params Shared regime parameters (used if assetRegimeParams not provided)
 * @param assetRegimeParams Optional per-asset regime parameters
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
  assetRegimeParams?: RegimeParamsMap[]
): CorrelatedRegimeReturnsResult {
  const effectiveMatrix = matrix ?? DEFAULT_TRANSITION_MATRIX;
  const effectiveParams = params ?? DEFAULT_REGIME_PARAMS;

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

    if (assetRegimeParams && assetRegimeParams.length === numAssets) {
      // Asset-specific parameters: generate individual returns, then correlate
      // First generate uncorrelated returns for each asset
      const uncorrelated = assetRegimeParams.map(assetParams => {
        const { mean, stddev } = assetParams[regime];
        return normalRandom(mean, stddev, rng);
      });

      // Apply correlation using Cholesky decomposition
      // Note: For simplicity, we scale by target stddev after correlation
      // This is an approximation that preserves correlation structure
      const correlated = correlatedSamples(
        numAssets,
        correlationMatrix,
        rng,
        0, // mean=0 for correlation transform
        1  // stddev=1 for correlation transform
      );

      // Combine: use correlated structure but scale by asset-specific params
      for (let asset = 0; asset < numAssets; asset++) {
        const { mean, stddev } = assetRegimeParams[asset][regime];
        const rawReturn = mean + stddev * correlated[asset];
        // Floor at -1 (total loss) - cannot lose more than 100%
        returns[asset][year] = Math.max(-1, rawReturn);
      }
    } else {
      // Shared parameters (original behavior)
      const { mean, stddev } = effectiveParams[regime];
      const yearReturns = correlatedSamples(
        numAssets,
        correlationMatrix,
        rng,
        mean,
        stddev
      );

      // Assign to each asset (floor at -1 for total loss protection)
      for (let asset = 0; asset < numAssets; asset++) {
        returns[asset][year] = Math.max(-1, yearReturns[asset]);
      }
    }
  }

  return { returns, regimes };
}
