/**
 * Core Financial Metrics
 *
 * CFA-standard financial metrics for Monte Carlo simulation results:
 * - CAGR (Compound Annual Growth Rate)
 * - Annualized volatility
 * - Percentile extraction
 * - Success rate calculation
 * - Aggregate metrics summary
 *
 * These metrics are computed from SimulationOutput data and provide
 * the primary quantitative measures for evaluating BBD strategy outcomes.
 */

import { mean, stddev, percentile } from '../math';
import type { SimulationConfig, SimulationOutput } from '../simulation/types';
import type { MetricsSummary, PercentileDistribution } from './types';

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 *
 * CAGR measures the geometric mean annual growth rate of an investment
 * assuming profits are reinvested at the end of each period.
 *
 * **Monte Carlo Context:**
 * In Monte Carlo simulations, CAGR is typically calculated using the MEDIAN
 * terminal value (P50), not the mean. This is intentional because:
 * - Median is more robust to extreme outliers in simulation results
 * - Median represents the "typical" outcome a user would experience
 * - Mean can be skewed by extreme positive scenarios due to compounding
 *
 * For mean-based CAGR (less common), use calculateMeanCAGR().
 *
 * Formula: CAGR = (endValue / startValue)^(1/years) - 1
 *
 * @param startValue - Initial investment value
 * @param endValue - Final investment value (typically median terminal value)
 * @param years - Time period in years
 * @returns Annual growth rate as decimal (e.g., 0.0718 for 7.18%)
 *
 * @example
 * ```typescript
 * // $1M growing to $2M over 10 years
 * calculateCAGR(1000000, 2000000, 10);  // ≈ 0.0718 (7.18%)
 *
 * // $1M growing to $1M (no growth)
 * calculateCAGR(1000000, 1000000, 10);  // 0
 *
 * // $1M declining to $500K over 5 years
 * calculateCAGR(1000000, 500000, 5);    // ≈ -0.129 (-12.9%)
 * ```
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  // Edge case: invalid inputs
  if (years <= 0) {
    return NaN;
  }
  if (startValue <= 0) {
    return NaN;
  }

  // Edge case: zero or negative end value
  if (endValue <= 0) {
    return -1; // -100% is the minimum possible CAGR (total loss)
  }

  // Standard CAGR formula
  const ratio = endValue / startValue;
  const cagr = Math.pow(ratio, 1 / years) - 1;

  return cagr;
}

/**
 * Calculate CAGR using the mean (average) terminal value
 *
 * This calculates CAGR from the arithmetic mean of terminal values rather
 * than the median. Useful for scenarios where you want to account for
 * the full distribution including extreme positive outcomes.
 *
 * **Important:** Mean-based CAGR will typically be HIGHER than median-based
 * CAGR in Monte Carlo simulations because positive compounding creates
 * right-skewed distributions with extreme high values.
 *
 * @param startValue - Initial investment value
 * @param terminalValues - Array of terminal values from simulation
 * @param years - Time period in years
 * @returns Annual growth rate as decimal based on mean terminal value
 *
 * @example
 * ```typescript
 * const terminals = new Float64Array([800000, 1200000, 1500000, 2000000, 5000000]);
 * // Mean = 2,100,000 (skewed by 5M outlier)
 * // Median = 1,500,000
 * calculateMeanCAGR(1000000, terminals, 10);  // Higher than median CAGR
 * ```
 */
export function calculateMeanCAGR(
  startValue: number,
  terminalValues: Float64Array | number[],
  years: number
): number {
  if (terminalValues.length === 0) {
    return NaN;
  }

  // Calculate mean terminal value
  const meanTerminal = mean(Array.from(terminalValues));

  // Use standard CAGR formula with mean
  return calculateCAGR(startValue, meanTerminal, years);
}

/**
 * Calculate annualized volatility from a series of returns
 *
 * Volatility is the standard deviation of returns, representing
 * the dispersion of outcomes around the mean.
 *
 * Note: Input should be annual returns for annualized volatility.
 * If input is monthly returns, multiply result by sqrt(12).
 *
 * @param returns - Array of period returns as decimals
 * @returns Standard deviation of returns (e.g., 0.16 for 16% volatility)
 *
 * @example
 * ```typescript
 * // Returns with high volatility
 * calculateAnnualizedVolatility([0.20, -0.15, 0.25, -0.10, 0.18]);
 *
 * // Returns with low volatility
 * calculateAnnualizedVolatility([0.05, 0.06, 0.04, 0.05, 0.06]);
 * ```
 */
export function calculateAnnualizedVolatility(
  returns: number[] | Float64Array
): number {
  // Handle empty array
  if (returns.length === 0) {
    return 0;
  }

  // Handle single value (no variance possible)
  if (returns.length === 1) {
    return 0;
  }

  // Convert Float64Array to regular array if needed
  const returnsArray = returns instanceof Float64Array
    ? Array.from(returns)
    : returns;

  // Calculate sample standard deviation
  return stddev(returnsArray);
}

/**
 * Extract standard percentiles from simulation terminal values
 *
 * Returns P10, P25, P50 (median), P75, P90 for communicating
 * the range of simulation outcomes.
 *
 * Interpretation:
 * - p10: 10% of outcomes are worse than this
 * - p50: Half of outcomes are above, half below (median)
 * - p90: Only 10% of outcomes are better than this
 *
 * @param values - Terminal portfolio values from simulation
 * @returns Object with all 5 percentile values
 *
 * @example
 * ```typescript
 * const terminalValues = [950000, 1100000, 1500000, 2000000, 2800000];
 * extractPercentiles(terminalValues);
 * // Returns { p10: ~990k, p25: ~1200k, p50: ~1500k, p75: ~2100k, p90: ~2600k }
 * ```
 */
export function extractPercentiles(
  values: number[] | Float64Array
): PercentileDistribution {
  // Handle empty array
  if (values.length === 0) {
    return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
  }

  // Convert Float64Array to regular array for sorting
  const valuesArray = values instanceof Float64Array
    ? Array.from(values)
    : values;

  return {
    p10: percentile(valuesArray, 10),
    p25: percentile(valuesArray, 25),
    p50: percentile(valuesArray, 50),
    p75: percentile(valuesArray, 75),
    p90: percentile(valuesArray, 90),
  };
}

/**
 * Calculate success rate from simulation terminal values
 *
 * Success is defined as ending above the initial portfolio value.
 * This is the probability that the BBD strategy preserves principal.
 *
 * Formula: successRate = (count where terminal > initial) / total * 100
 *
 * @param terminalValues - Terminal portfolio values from simulation
 * @param initialValue - Starting portfolio value
 * @returns Success rate as percentage (0-100)
 *
 * @example
 * ```typescript
 * // 4 out of 5 iterations ended above initial
 * const terminals = new Float64Array([1200000, 900000, 1500000, 1800000, 2000000]);
 * calculateSuccessRate(terminals, 1000000);  // 80
 * ```
 */
export function calculateSuccessRate(
  terminalValues: Float64Array,
  initialValue: number
): number {
  if (terminalValues.length === 0) {
    return 0;
  }

  let successCount = 0;
  for (let i = 0; i < terminalValues.length; i++) {
    if (terminalValues[i] > initialValue) {
      successCount++;
    }
  }

  return (successCount / terminalValues.length) * 100;
}

/**
 * Calculate complete metrics summary from simulation output
 *
 * Orchestrates all individual metric calculations into a single
 * comprehensive summary for display to users.
 *
 * This is the primary entry point for analyzing simulation results.
 *
 * @param output - SimulationOutput from Monte Carlo worker
 * @param config - SimulationConfig with initial values and time horizon
 * @returns Complete MetricsSummary with all metrics
 *
 * @example
 * ```typescript
 * const output: SimulationOutput = await runSimulation(config);
 * const summary = calculateMetricsSummary(output, config);
 *
 * console.log(`CAGR: ${(summary.cagr * 100).toFixed(2)}%`);
 * console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
 * console.log(`Median Outcome: $${summary.percentiles.p50.toLocaleString()}`);
 * ```
 */
export function calculateMetricsSummary(
  output: SimulationOutput,
  config: SimulationConfig
): MetricsSummary {
  // Extract percentiles from terminal values
  const percentiles = extractPercentiles(output.terminalValues);

  // Calculate CAGR from initial value to median terminal value
  const cagr = calculateCAGR(
    config.initialValue,
    percentiles.p50,
    config.timeHorizon
  );

  // Calculate volatility from terminal values
  // Convert to returns relative to initial value for meaningful volatility
  const terminalReturns: number[] = [];
  for (let i = 0; i < output.terminalValues.length; i++) {
    // Calculate total return for each iteration
    const totalReturn = (output.terminalValues[i] - config.initialValue) / config.initialValue;
    // Annualize the total return to get annual return proxy
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / config.timeHorizon) - 1;
    terminalReturns.push(annualizedReturn);
  }
  const annualizedVolatility = calculateAnnualizedVolatility(terminalReturns);

  // Use pre-calculated success rate from statistics if available,
  // otherwise calculate from terminal values
  const successRate = output.statistics?.successRate !== undefined
    ? output.statistics.successRate
    : calculateSuccessRate(output.terminalValues, config.initialValue);

  return {
    cagr,
    annualizedVolatility,
    successRate,
    percentiles,
  };
}
