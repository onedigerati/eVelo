/**
 * Regime Calibration Module
 *
 * Derives regime-switching parameters from historical return data
 * using threshold-based classification (not MLE/EM algorithm).
 *
 * Based on: Lunde & Timmermann (2004), Pagan & Sossounov (2003)
 */

import { mean, stddev, percentile } from '../math';
import type { RegimeParamsMap, MarketRegime, RegimeCalibrationMode } from './types';

/**
 * Classified returns by regime
 */
export interface ClassifiedReturns {
  bull: number[];
  bear: number[];
  crash: number[];
}

/**
 * Classify historical returns into bull/bear/crash regimes using percentile thresholds
 *
 * Classification thresholds (based on academic literature):
 * - Crash: Bottom 10% of returns (worst ~3 years out of 30)
 * - Bear: Next 20% (10th to 30th percentile)
 * - Bull: Top 70% (above 30th percentile)
 *
 * @param returns Array of historical annual returns (as decimals, e.g., 0.12 for 12%)
 * @returns Object with bull, bear, crash arrays
 */
export function classifyRegimes(returns: number[]): ClassifiedReturns {
  if (returns.length < 10) {
    throw new Error('Insufficient data for regime classification (minimum 10 observations)');
  }

  // Calculate threshold values
  const crashThreshold = percentile(returns, 10);  // Bottom 10%
  const bearThreshold = percentile(returns, 30);   // Next 20%

  const bull: number[] = [];
  const bear: number[] = [];
  const crash: number[] = [];

  for (const r of returns) {
    if (r < crashThreshold) {
      crash.push(r);
    } else if (r < bearThreshold) {
      bear.push(r);
    } else {
      bull.push(r);
    }
  }

  return { bull, bear, crash };
}

/**
 * Estimate regime parameters (mean, stddev) from classified returns
 *
 * @param classified Classified returns from classifyRegimes()
 * @returns Regime parameters map with mean/stddev for each regime
 */
export function estimateRegimeParams(classified: ClassifiedReturns): RegimeParamsMap {
  // Ensure each regime has enough observations
  const minObs = 2; // Need at least 2 for stddev

  return {
    bull: {
      mean: classified.bull.length >= minObs ? mean(classified.bull) : 0.10,
      stddev: classified.bull.length >= minObs ? stddev(classified.bull) : 0.12,
    },
    bear: {
      mean: classified.bear.length >= minObs ? mean(classified.bear) : -0.05,
      stddev: classified.bear.length >= minObs ? stddev(classified.bear) : 0.15,
    },
    crash: {
      mean: classified.crash.length >= minObs ? mean(classified.crash) : -0.25,
      stddev: classified.crash.length >= minObs ? stddev(classified.crash) : 0.30,
    },
  };
}

/**
 * Calibrate regime model from historical returns
 *
 * Complete calibration workflow: historical data -> regime parameters
 * This is the main entry point for deriving asset-specific regime parameters.
 *
 * @param historicalReturns Array of historical annual returns
 * @returns Regime parameters derived from the data
 */
export function calibrateRegimeModel(historicalReturns: number[]): RegimeParamsMap {
  const classified = classifyRegimes(historicalReturns);
  return estimateRegimeParams(classified);
}

/**
 * Calculate portfolio-level regime parameters from multiple assets
 *
 * Derives weighted regime parameters for a portfolio based on:
 * - Individual asset regime parameters
 * - Portfolio weights
 * - Asset correlation matrix
 *
 * @param assetParams Array of regime parameters (one per asset)
 * @param weights Array of portfolio weights (must sum to 1)
 * @param correlationMatrix NxN correlation matrix
 * @returns Portfolio-level regime parameters
 */
export function calculatePortfolioRegimeParams(
  assetParams: RegimeParamsMap[],
  weights: number[],
  correlationMatrix: number[][]
): RegimeParamsMap {
  const regimes: MarketRegime[] = ['bull', 'bear', 'crash'];
  const result = {} as RegimeParamsMap;

  for (const regime of regimes) {
    // Weighted average return
    const portfolioMean = assetParams.reduce(
      (sum, params, i) => sum + params[regime].mean * weights[i],
      0
    );

    // Portfolio variance using correlation matrix
    let portfolioVariance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        portfolioVariance +=
          weights[i] * weights[j] *
          assetParams[i][regime].stddev *
          assetParams[j][regime].stddev *
          correlationMatrix[i][j];
      }
    }

    result[regime] = {
      mean: portfolioMean,
      stddev: Math.sqrt(Math.max(0, portfolioVariance)),
    };
  }

  return result;
}

/**
 * Apply conservative stress-testing adjustments to regime parameters
 *
 * Conservative adjustments based on Federal Reserve stress test methodology:
 * - Bull: Reduce mean by 1 stddev (or 1pp min), increase volatility 15%
 * - Bear: Reduce mean by 2pp, increase volatility 20%
 * - Crash: Reduce mean by 3pp, increase volatility 25%
 *
 * The rationale:
 * - Lower returns account for possibility of worse-than-historical outcomes
 * - Higher volatility increases uncertainty bands
 * - More aggressive adjustment for negative regimes (crash > bear > bull)
 *
 * @param historicalParams Regime parameters from historical calibration
 * @returns Adjusted parameters for conservative simulation
 */
export function applyConservativeAdjustment(
  historicalParams: RegimeParamsMap
): RegimeParamsMap {
  return {
    bull: {
      // Reduce mean by 1 stddev (minimum 1 percentage point)
      mean: historicalParams.bull.mean - Math.max(0.01, historicalParams.bull.stddev),
      // Increase volatility by 15%
      stddev: historicalParams.bull.stddev * 1.15,
    },
    bear: {
      // Make bear returns more negative (reduce by 2pp)
      mean: historicalParams.bear.mean - 0.02,
      // Increase bear volatility by 20%
      stddev: historicalParams.bear.stddev * 1.20,
    },
    crash: {
      // Make crashes worse (reduce by 3pp)
      mean: historicalParams.crash.mean - 0.03,
      // Increase crash volatility by 25%
      stddev: historicalParams.crash.stddev * 1.25,
    },
  };
}

/**
 * Calibrate regime model with explicit mode selection
 *
 * Main entry point for regime calibration that respects the user's
 * calibration mode preference (historical or conservative).
 *
 * @param historicalReturns Array of historical annual returns
 * @param mode Calibration mode: 'historical' for actual data, 'conservative' for stress-adjusted
 * @returns Regime parameters appropriate for the selected mode
 */
export function calibrateRegimeModelWithMode(
  historicalReturns: number[],
  mode: RegimeCalibrationMode
): RegimeParamsMap {
  // Step 1: Derive historical parameters from data
  const historicalParams = calibrateRegimeModel(historicalReturns);

  // Step 2: Apply mode-specific adjustment
  if (mode === 'conservative') {
    return applyConservativeAdjustment(historicalParams);
  }

  return historicalParams;
}

/**
 * Expected behavior verification (development reference):
 *
 * Given historical params:
 *   bull: { mean: 0.12, stddev: 0.12 }
 *   bear: { mean: -0.05, stddev: 0.15 }
 *   crash: { mean: -0.25, stddev: 0.30 }
 *
 * Conservative adjustment produces:
 *   bull: { mean: 0.00, stddev: 0.138 }  // -0.12 (1 stddev), +15%
 *   bear: { mean: -0.07, stddev: 0.18 }  // -0.02 (2pp), +20%
 *   crash: { mean: -0.28, stddev: 0.375 } // -0.03 (3pp), +25%
 *
 * Net effect:
 * - Bull regime mean drops from +12% to 0%
 * - All regimes have higher volatility
 * - Expected long-term return is lower in conservative mode
 */
