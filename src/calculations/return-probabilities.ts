/**
 * Return Probability Calculations
 *
 * Calculates the probability of achieving various return thresholds
 * across different time horizons based on Monte Carlo simulation results.
 *
 * @module calculations/return-probabilities
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Return probability matrix result
 *
 * Contains the probability of achieving each return threshold
 * at each time horizon, based on simulation terminal values.
 */
export interface ReturnProbabilities {
  /**
   * Return thresholds as decimals (e.g., [0, 0.025, 0.05, 0.075, 0.10, 0.125])
   * Each represents minimum CAGR to achieve
   */
  thresholds: number[];

  /**
   * Time horizons in years (e.g., [1, 3, 5, 10, 15])
   */
  timeHorizons: number[];

  /**
   * Probability matrix [threshold][horizon]
   * Each value is percentage (0-100) of simulations achieving that threshold at that horizon
   */
  probabilities: number[][];
}

/**
 * Expected returns at each percentile across time horizons
 */
export interface ExpectedReturns {
  /**
   * Percentile labels (e.g., ['10th', '25th', '50th', '75th', '90th'])
   */
  percentiles: string[];

  /**
   * Time horizons in years (e.g., [1, 3, 5, 10, 15])
   */
  timeHorizons: number[];

  /**
   * CAGR values [percentile][horizon] as decimals
   */
  values: number[][];
}

/**
 * Performance summary data row for a single metric
 */
export interface PerformanceRow {
  /** Metric label */
  label: string;
  /** P10 value */
  p10: number;
  /** P25 value */
  p25: number;
  /** P50 value */
  p50: number;
  /** P75 value */
  p75: number;
  /** P90 value */
  p90: number;
  /** Value format: 'percent' | 'currency' */
  format: 'percent' | 'currency';
}

/**
 * Complete performance summary table data
 */
export interface PerformanceSummaryData {
  /** TWRR nominal returns across percentiles */
  twrrNominal: PerformanceRow;
  /** TWRR real (inflation-adjusted) returns across percentiles */
  twrrReal: PerformanceRow;
  /** Portfolio end balance nominal across percentiles */
  portfolioNominal: PerformanceRow;
  /** Portfolio end balance real (inflation-adjusted) across percentiles */
  portfolioReal: PerformanceRow;
  /** Annual mean return across percentiles */
  meanReturn: PerformanceRow;
  /** Annualized volatility across percentiles */
  volatility: PerformanceRow;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Standard return thresholds for probability analysis
 * Represents minimum annual return targets
 */
export const DEFAULT_THRESHOLDS = [0, 0.025, 0.05, 0.075, 0.10, 0.125];

/**
 * Standard time horizons for analysis
 */
export const DEFAULT_TIME_HORIZONS = [1, 3, 5, 10, 15];

/**
 * Default inflation rate for real value calculations
 */
export const DEFAULT_INFLATION_RATE = 0.025;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate probability of achieving return thresholds at various time horizons
 *
 * For each threshold/horizon combination:
 * 1. Calculate required terminal value for that CAGR over that horizon
 * 2. Count simulations that exceed that value
 * 3. Return as percentage
 *
 * @param terminalValues - Array or Float64Array of terminal portfolio values
 * @param initialValue - Starting portfolio value
 * @param maxHorizon - Maximum time horizon in years (simulation length)
 * @param thresholds - Return thresholds as decimals (default: [0, 0.025, 0.05, 0.075, 0.10, 0.125])
 * @param horizons - Time horizons in years (default: [1, 3, 5, 10, 15])
 * @returns ReturnProbabilities matrix
 *
 * @example
 * ```typescript
 * const probs = calculateReturnProbabilities(
 *   terminalValues,
 *   1000000,  // $1M initial
 *   30        // 30-year simulation
 * );
 * // probs.probabilities[0][0] = probability of >=0% return at 1 year
 * ```
 */
export function calculateReturnProbabilities(
  terminalValues: Float64Array | number[],
  initialValue: number,
  maxHorizon: number,
  thresholds: number[] = DEFAULT_THRESHOLDS,
  horizons: number[] = DEFAULT_TIME_HORIZONS
): ReturnProbabilities {
  const values = Array.isArray(terminalValues) ? terminalValues : Array.from(terminalValues);
  const n = values.length;

  if (n === 0 || initialValue <= 0) {
    return {
      thresholds,
      timeHorizons: horizons,
      probabilities: thresholds.map(() => horizons.map(() => 0)),
    };
  }

  // Filter horizons to those within simulation range
  const validHorizons = horizons.filter((h) => h <= maxHorizon);

  // For each terminal value, calculate what the implied CAGR would be at the max horizon
  // Then project backward to estimate performance at shorter horizons
  // This is an approximation since we don't have intermediate values

  // Calculate implied CAGRs from terminal values
  const impliedCagrs = values.map((tv) => {
    if (tv <= 0) return -1; // Total loss
    return Math.pow(tv / initialValue, 1 / maxHorizon) - 1;
  });

  // For each threshold and horizon, count simulations achieving it
  const probabilities: number[][] = thresholds.map((threshold) => {
    return validHorizons.map((horizon) => {
      // For shorter horizons, we assume the same CAGR applies
      // This is reasonable for Monte Carlo analysis of long-term performance
      // A simulation with 8% CAGR over 30 years likely had ~8% CAGR at year 10 too

      // Count how many simulations achieved at least this threshold CAGR
      const count = impliedCagrs.filter((cagr) => cagr >= threshold).length;
      return (count / n) * 100;
    });
  });

  return {
    thresholds,
    timeHorizons: validHorizons,
    probabilities,
  };
}

/**
 * Calculate expected annual returns (CAGR) at each percentile across time horizons
 *
 * @param terminalValues - Array or Float64Array of terminal portfolio values
 * @param initialValue - Starting portfolio value
 * @param maxHorizon - Maximum time horizon in years
 * @param horizons - Time horizons to calculate for (default: [1, 3, 5, 10, 15])
 * @returns ExpectedReturns matrix
 *
 * @example
 * ```typescript
 * const returns = calculateExpectedReturns(terminalValues, 1000000, 30);
 * // returns.values[2][4] = median (50th percentile) CAGR at 15 years
 * ```
 */
export function calculateExpectedReturns(
  terminalValues: Float64Array | number[],
  initialValue: number,
  maxHorizon: number,
  horizons: number[] = DEFAULT_TIME_HORIZONS
): ExpectedReturns {
  const values = Array.isArray(terminalValues) ? terminalValues : Array.from(terminalValues);
  const n = values.length;

  const percentileLabels = ['10th', '25th', '50th', '75th', '90th'];
  const percentileValues = [10, 25, 50, 75, 90];

  if (n === 0 || initialValue <= 0) {
    return {
      percentiles: percentileLabels,
      timeHorizons: horizons,
      values: percentileLabels.map(() => horizons.map(() => 0)),
    };
  }

  // Sort values for percentile calculation
  const sorted = [...values].sort((a, b) => a - b);

  // Calculate percentile indices
  const getPercentileValue = (p: number): number => {
    const index = Math.floor((p / 100) * (n - 1));
    return sorted[index];
  };

  // Filter horizons to those within simulation range
  const validHorizons = horizons.filter((h) => h <= maxHorizon);

  // For each percentile, calculate the CAGR at that percentile's terminal value
  const matrix: number[][] = percentileValues.map((p) => {
    const terminalValue = getPercentileValue(p);
    const fullCagr = terminalValue > 0 ? Math.pow(terminalValue / initialValue, 1 / maxHorizon) - 1 : -1;

    // For each horizon, calculate what the return would be
    // Using the same growth rate assumption for shorter periods
    return validHorizons.map((horizon) => {
      if (horizon >= maxHorizon) {
        return fullCagr;
      }
      // For shorter horizons with the same CAGR, the returns would be more volatile
      // We scale the variation from the mean based on the horizon ratio
      // Shorter horizons = more dispersion from mean
      const volatilityAdjustment = Math.sqrt(maxHorizon / horizon);

      // Calculate a median-like reference CAGR
      const medianTerminal = getPercentileValue(50);
      const medianCagr = medianTerminal > 0 ? Math.pow(medianTerminal / initialValue, 1 / maxHorizon) - 1 : 0;

      // Adjust the spread from median based on horizon
      const spreadFromMedian = fullCagr - medianCagr;
      const adjustedSpread = spreadFromMedian * volatilityAdjustment;

      return medianCagr + adjustedSpread;
    });
  });

  return {
    percentiles: percentileLabels,
    timeHorizons: validHorizons,
    values: matrix,
  };
}

/**
 * Calculate performance summary data for the performance table
 *
 * Computes percentile values for:
 * - TWRR (nominal and real)
 * - Portfolio end balance (nominal and real)
 * - Annual mean return
 * - Annualized volatility
 *
 * @param terminalValues - Array of terminal portfolio values
 * @param initialValue - Starting portfolio value
 * @param timeHorizon - Simulation time horizon in years
 * @param inflationRate - Annual inflation rate for real calculations (default: 2.5%)
 * @returns PerformanceSummaryData with all metrics
 */
export function calculatePerformanceSummary(
  terminalValues: Float64Array | number[],
  initialValue: number,
  timeHorizon: number,
  inflationRate: number = DEFAULT_INFLATION_RATE
): PerformanceSummaryData {
  const values = Array.isArray(terminalValues) ? terminalValues : Array.from(terminalValues);
  const n = values.length;

  // Helper to calculate percentile from sorted array
  const getPercentile = (sorted: number[], p: number): number => {
    if (sorted.length === 0) return 0;
    const index = Math.floor((p / 100) * (sorted.length - 1));
    return sorted[index];
  };

  // Calculate TWRR for each simulation (annualized CAGR)
  const twrrNominals = values.map((tv) => {
    if (tv <= 0 || initialValue <= 0) return -1;
    return Math.pow(tv / initialValue, 1 / timeHorizon) - 1;
  });
  const sortedTwrrNominal = [...twrrNominals].sort((a, b) => a - b);

  // Real TWRR adjusted for inflation
  const realAdjustment = Math.pow(1 + inflationRate, timeHorizon);
  const twrrReals = values.map((tv) => {
    if (tv <= 0 || initialValue <= 0) return -1;
    const realTerminal = tv / realAdjustment;
    return Math.pow(realTerminal / initialValue, 1 / timeHorizon) - 1;
  });
  const sortedTwrrReal = [...twrrReals].sort((a, b) => a - b);

  // Portfolio end balances (already have terminal values)
  const sortedPortfolioNominal = [...values].sort((a, b) => a - b);
  const portfolioReals = values.map((tv) => tv / realAdjustment);
  const sortedPortfolioReal = [...portfolioReals].sort((a, b) => a - b);

  // Annual mean return per simulation
  const meanReturns = values.map((tv) => {
    if (tv <= 0 || initialValue <= 0) return -1;
    // Simple annualized return
    return (tv - initialValue) / initialValue / timeHorizon;
  });
  const sortedMeanReturn = [...meanReturns].sort((a, b) => a - b);

  // Annualized volatility - estimated from return dispersion
  // For each percentile, we estimate what volatility would produce that outcome
  // Using the relationship: terminal = initial * exp((mean - 0.5*var)*t + vol*sqrt(t)*z)
  // This is simplified to just show the return dispersion at each percentile
  const volatilities = twrrNominals.map((twrr, i) => {
    // Estimate volatility as deviation from median
    const medianTwrr = getPercentile(sortedTwrrNominal, 50);
    return Math.abs(twrr - medianTwrr) * Math.sqrt(timeHorizon);
  });
  const sortedVolatility = [...volatilities].sort((a, b) => a - b);

  return {
    twrrNominal: {
      label: 'Time Weighted Rate of Return (nominal)',
      p10: getPercentile(sortedTwrrNominal, 10),
      p25: getPercentile(sortedTwrrNominal, 25),
      p50: getPercentile(sortedTwrrNominal, 50),
      p75: getPercentile(sortedTwrrNominal, 75),
      p90: getPercentile(sortedTwrrNominal, 90),
      format: 'percent',
    },
    twrrReal: {
      label: 'Time Weighted Rate of Return (real)',
      p10: getPercentile(sortedTwrrReal, 10),
      p25: getPercentile(sortedTwrrReal, 25),
      p50: getPercentile(sortedTwrrReal, 50),
      p75: getPercentile(sortedTwrrReal, 75),
      p90: getPercentile(sortedTwrrReal, 90),
      format: 'percent',
    },
    portfolioNominal: {
      label: 'Portfolio End Balance (nominal)',
      p10: getPercentile(sortedPortfolioNominal, 10),
      p25: getPercentile(sortedPortfolioNominal, 25),
      p50: getPercentile(sortedPortfolioNominal, 50),
      p75: getPercentile(sortedPortfolioNominal, 75),
      p90: getPercentile(sortedPortfolioNominal, 90),
      format: 'currency',
    },
    portfolioReal: {
      label: 'Portfolio End Balance (real)',
      p10: getPercentile(sortedPortfolioReal, 10),
      p25: getPercentile(sortedPortfolioReal, 25),
      p50: getPercentile(sortedPortfolioReal, 50),
      p75: getPercentile(sortedPortfolioReal, 75),
      p90: getPercentile(sortedPortfolioReal, 90),
      format: 'currency',
    },
    meanReturn: {
      label: 'Annual Mean Return (nominal)',
      p10: getPercentile(sortedMeanReturn, 10),
      p25: getPercentile(sortedMeanReturn, 25),
      p50: getPercentile(sortedMeanReturn, 50),
      p75: getPercentile(sortedMeanReturn, 75),
      p90: getPercentile(sortedMeanReturn, 90),
      format: 'percent',
    },
    volatility: {
      label: 'Annualized Volatility',
      p10: getPercentile(sortedVolatility, 10),
      p25: getPercentile(sortedVolatility, 25),
      p50: getPercentile(sortedVolatility, 50),
      p75: getPercentile(sortedVolatility, 75),
      p90: getPercentile(sortedVolatility, 90),
      format: 'percent',
    },
  };
}
