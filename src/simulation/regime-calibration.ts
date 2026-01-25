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
import { DEFAULT_REGIME_PARAMS } from './types';

/**
 * Classified returns by regime
 */
export interface ClassifiedReturns {
  bull: number[];
  bear: number[];
  crash: number[];
  recovery: number[];
}

/**
 * Classify historical returns into bull/bear/crash/recovery regimes using percentile thresholds
 *
 * Classification thresholds (based on academic literature):
 * - Crash: Bottom 10% of returns (worst ~3 years out of 30)
 * - Bear: 10th to 30th percentile (next 20%)
 * - Recovery: Positive returns following crash/bear periods (70th to 85th percentile)
 * - Bull: Top 15% and all other positive returns (above 85th percentile and 30th-70th)
 *
 * @param returns Array of historical annual returns (as decimals, e.g., 0.12 for 12%)
 * @returns Object with bull, bear, crash, recovery arrays
 */
export function classifyRegimes(returns: number[]): ClassifiedReturns {
  if (returns.length < 10) {
    throw new Error('Insufficient data for regime classification (minimum 10 observations)');
  }

  // Calculate threshold values
  const crashThreshold = percentile(returns, 10);    // Bottom 10%
  const bearThreshold = percentile(returns, 30);     // 30th percentile
  const recoveryThreshold = percentile(returns, 70); // 70th percentile
  const bullThreshold = percentile(returns, 85);     // 85th percentile

  const bull: number[] = [];
  const bear: number[] = [];
  const crash: number[] = [];
  const recovery: number[] = [];

  // Track previous return to detect recovery periods
  let previousWasNegative = false;

  for (let i = 0; i < returns.length; i++) {
    const r = returns[i];
    const currentIsPositive = r >= 0;

    if (r < crashThreshold) {
      crash.push(r);
      previousWasNegative = true;
    } else if (r < bearThreshold) {
      bear.push(r);
      previousWasNegative = true;
    } else if (r >= bullThreshold) {
      bull.push(r);
      previousWasNegative = false;
    } else if (r >= recoveryThreshold || (currentIsPositive && previousWasNegative)) {
      // Recovery: Strong positive returns OR positive return following negative period
      recovery.push(r);
      previousWasNegative = false;
    } else {
      // Normal bull market (between 30th and 70th percentile)
      bull.push(r);
      previousWasNegative = false;
    }
  }

  return { bull, bear, crash, recovery };
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
    recovery: {
      mean: classified.recovery.length >= minObs ? mean(classified.recovery) : 0.15,
      stddev: classified.recovery.length >= minObs ? stddev(classified.recovery) : 0.20,
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
  const regimes: MarketRegime[] = ['bull', 'bear', 'crash', 'recovery'];
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
    recovery: {
      // Reduce recovery returns (reduce by 2pp)
      mean: historicalParams.recovery.mean - 0.02,
      // Increase recovery volatility by 20%
      stddev: historicalParams.recovery.stddev * 1.20,
    },
  };
}

/**
 * Validation issues found in regime parameters
 */
export interface RegimeValidationIssue {
  /** Type of issue */
  type: 'negative_bull_mean' | 'inverted_hierarchy' | 'extreme_volatility' | 'insufficient_spread';
  /** Human-readable description */
  message: string;
  /** Severity: 'warning' allows use, 'error' triggers fallback */
  severity: 'warning' | 'error';
}

/**
 * Result of regime parameter validation
 */
export interface RegimeValidationResult {
  /** Whether parameters are valid (no errors, warnings OK) */
  isValid: boolean;
  /** List of issues found */
  issues: RegimeValidationIssue[];
  /** Whether fallback to defaults was used */
  usedFallback: boolean;
}

/**
 * Extended calibration result with validation info
 */
export interface CalibratedRegimeResult {
  /** The regime parameters (calibrated or fallback) */
  params: RegimeParamsMap;
  /** Validation result */
  validation: RegimeValidationResult;
}

/**
 * Validate regime parameters for sanity
 *
 * Checks for degenerate parameters that indicate the calibration
 * produced nonsensical results (e.g., negative bull mean, bull worse than bear).
 *
 * @param params Regime parameters to validate
 * @returns Validation result with issues list
 */
export function validateRegimeParams(params: RegimeParamsMap): RegimeValidationResult {
  const issues: RegimeValidationIssue[] = [];

  // Check 1: Bull mean should be positive
  // A negative bull mean means even "good" times lose money - likely bad data
  if (params.bull.mean < 0) {
    issues.push({
      type: 'negative_bull_mean',
      message: `Bull mean is negative (${(params.bull.mean * 100).toFixed(1)}%). Asset likely has poor/insufficient historical data.`,
      severity: 'error',
    });
  }

  // Check 2: Regime hierarchy should be bull > bear > crash for means
  if (params.bull.mean <= params.bear.mean) {
    issues.push({
      type: 'inverted_hierarchy',
      message: `Bull mean (${(params.bull.mean * 100).toFixed(1)}%) <= bear mean (${(params.bear.mean * 100).toFixed(1)}%). Regime ordering is inverted.`,
      severity: 'error',
    });
  }
  if (params.bear.mean <= params.crash.mean) {
    issues.push({
      type: 'inverted_hierarchy',
      message: `Bear mean (${(params.bear.mean * 100).toFixed(1)}%) <= crash mean (${(params.crash.mean * 100).toFixed(1)}%). Regime ordering is inverted.`,
      severity: 'warning', // Less severe - crash/bear can be close
    });
  }

  // Check 3: Extreme volatility (stddev > 80% is suspicious)
  const maxReasonableStddev = 0.80;
  if (params.bull.stddev > maxReasonableStddev) {
    issues.push({
      type: 'extreme_volatility',
      message: `Bull stddev is extreme (${(params.bull.stddev * 100).toFixed(1)}% > 80%). Data may be unreliable.`,
      severity: 'error',
    });
  }
  if (params.bear.stddev > maxReasonableStddev) {
    issues.push({
      type: 'extreme_volatility',
      message: `Bear stddev is extreme (${(params.bear.stddev * 100).toFixed(1)}% > 80%).`,
      severity: 'warning',
    });
  }

  // Check 4: Insufficient spread between regimes (all too similar)
  const bullBearSpread = params.bull.mean - params.bear.mean;
  if (bullBearSpread < 0.05) { // Less than 5% difference
    issues.push({
      type: 'insufficient_spread',
      message: `Bull/bear spread is only ${(bullBearSpread * 100).toFixed(1)}%. Regimes may not be meaningfully different.`,
      severity: 'warning',
    });
  }

  // Determine if valid (no errors)
  const hasErrors = issues.some(i => i.severity === 'error');

  return {
    isValid: !hasErrors,
    issues,
    usedFallback: false,
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
  const result = calibrateRegimeModelWithValidation(historicalReturns, mode);
  return result.params;
}

/**
 * Calibrate regime model with validation and fallback
 *
 * Enhanced calibration that validates results and falls back to
 * sensible defaults when calibration produces degenerate parameters.
 *
 * @param historicalReturns Array of historical annual returns
 * @param mode Calibration mode
 * @param assetId Optional asset identifier for logging
 * @returns Calibration result with params and validation info
 */
export function calibrateRegimeModelWithValidation(
  historicalReturns: number[],
  mode: RegimeCalibrationMode,
  assetId?: string
): CalibratedRegimeResult {
  // Step 1: Derive historical parameters from data
  const historicalParams = calibrateRegimeModel(historicalReturns);

  // Step 2: Apply mode-specific adjustment
  const adjustedParams = mode === 'conservative'
    ? applyConservativeAdjustment(historicalParams)
    : historicalParams;

  // Step 3: Validate the parameters
  const validation = validateRegimeParams(adjustedParams);

  // Step 4: If invalid, fall back to defaults
  if (!validation.isValid) {
    const assetLabel = assetId || 'Asset';
    console.warn(
      `[Regime Calibration] ${assetLabel}: Degenerate parameters detected, using defaults.`,
      validation.issues.map(i => i.message)
    );

    // Use DEFAULT_REGIME_PARAMS (imported at top)
    const fallbackParams = mode === 'conservative'
      ? applyConservativeAdjustment(DEFAULT_REGIME_PARAMS)
      : DEFAULT_REGIME_PARAMS;

    return {
      params: fallbackParams,
      validation: {
        ...validation,
        usedFallback: true,
      },
    };
  }

  // Log warnings even if valid
  if (validation.issues.length > 0) {
    const assetLabel = assetId || 'Asset';
    console.warn(
      `[Regime Calibration] ${assetLabel}: Warnings:`,
      validation.issues.map(i => i.message)
    );
  }

  return {
    params: adjustedParams,
    validation,
  };
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
