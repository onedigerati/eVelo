/**
 * Time-Weighted Rate of Return (TWRR) Calculations
 *
 * TWRR is the CFA-standard methodology for measuring portfolio performance
 * that eliminates the impact of external cash flows (deposits/withdrawals).
 *
 * This is essential for BBD strategy evaluation because:
 * - Annual SBLOC withdrawals would distort simple return calculations
 * - TWRR measures pure investment performance independent of timing
 * - Allows fair comparison between different withdrawal strategies
 *
 * Formula Reference (CFA Institute):
 * TWRR = [(1 + R₁)(1 + R₂)...(1 + Rₙ)]^(1/n) - 1
 *
 * Where Rᵢ = (Ending Value - Beginning Value) / Beginning Value for period i
 *
 * @module calculations/twrr
 */

import type { YearlyPercentiles } from '../simulation/types';
import type { TWRRResult } from './types';

/**
 * Calculate single-period return
 *
 * Formula: (endValue - startValue) / startValue
 *
 * @param startValue - Value at start of period
 * @param endValue - Value at end of period
 * @returns Period return as decimal (0.05 = 5%), or NaN if startValue <= 0
 *
 * @example
 * ```typescript
 * calculatePeriodReturn(100000, 110000); // 0.10 (10% gain)
 * calculatePeriodReturn(100000, 90000);  // -0.10 (10% loss)
 * calculatePeriodReturn(0, 100000);      // NaN (invalid start)
 * ```
 */
export function calculatePeriodReturn(startValue: number, endValue: number): number {
  if (startValue <= 0) {
    return NaN;
  }
  return (endValue - startValue) / startValue;
}

/**
 * Chain multiple period returns into a cumulative return
 *
 * Formula: ∏(1 + Rᵢ) - 1 for all periods i
 *
 * This geometric linking preserves the compounding nature of returns:
 * - A 10% gain followed by a 10% loss ≠ 0%
 * - (1.10)(0.90) - 1 = -0.01 = -1% (correct answer)
 *
 * @param periodReturns - Array of period returns as decimals
 * @returns Total cumulative return as decimal, or 0 for empty array
 *
 * @example
 * ```typescript
 * chainReturns([0.10, 0.05, -0.03]); // (1.10)(1.05)(0.97) - 1 = 0.1203
 * chainReturns([]);                  // 0
 * ```
 */
export function chainReturns(periodReturns: number[]): number {
  if (periodReturns.length === 0) {
    return 0;
  }

  let cumulativeGrowth = 1;
  for (const r of periodReturns) {
    cumulativeGrowth *= (1 + r);
  }

  return cumulativeGrowth - 1;
}

/**
 * Convert cumulative return to annualized rate
 *
 * Formula: (1 + totalReturn)^(1/periods) - 1
 *
 * This is the geometric mean annual return - the constant annual return
 * that would produce the same cumulative result.
 *
 * @param totalReturn - Cumulative return as decimal (0.50 = 50% total)
 * @param periods - Number of periods (typically years)
 * @returns Annualized return as decimal, or NaN if periods <= 0
 *
 * @example
 * ```typescript
 * annualizeReturn(0.50, 5);   // ~0.0845 (8.45% per year for 50% over 5 years)
 * annualizeReturn(0.21, 2);   // 0.10 (10% per year: 1.10² = 1.21)
 * annualizeReturn(-0.30, 3);  // ~-0.1132 (annual rate for 30% loss over 3 years)
 * ```
 */
export function annualizeReturn(totalReturn: number, periods: number): number {
  if (periods <= 0) {
    return NaN;
  }

  // Handle edge case where total return is -100% (complete loss)
  if (totalReturn <= -1) {
    return -1; // -100% annual return means total loss
  }

  return Math.pow(1 + totalReturn, 1 / periods) - 1;
}

/**
 * Calculate Time-Weighted Rate of Return from yearly percentile data
 *
 * TWRR (Time-Weighted Rate of Return) is the CFA-standard metric that
 * measures portfolio performance independent of external cash flows.
 *
 * **Current Implementation: Median Path Only**
 *
 * This function calculates TWRR using only the median (P50) simulation path.
 * This provides a single representative return figure, but has limitations:
 *
 * Limitations:
 * - Shows only one path from the distribution (median)
 * - Does not capture the range of possible TWRR outcomes
 * - P10/P90 scenarios could have very different TWRR values
 *
 * Future Enhancement:
 * Consider adding calculateTWRRDistribution() that returns:
 * - TWRR at P10 (pessimistic scenario)
 * - TWRR at P50 (median scenario) - current implementation
 * - TWRR at P90 (optimistic scenario)
 *
 * This would provide users with a range of TWRR outcomes consistent
 * with how we display terminal value distributions.
 *
 * Process:
 * 1. Extract median (p50) values from each year as representative values
 * 2. Calculate period returns between consecutive years
 * 3. Chain period returns to get cumulative return
 * 4. Annualize to get TWRR
 *
 * Why median (p50)?
 * - Represents the "typical" simulation outcome
 * - More robust than mean to extreme outliers
 * - Standard reporting convention in wealth management
 *
 * @param yearlyPercentiles - Array of yearly percentile data from simulation
 * @returns Complete TWRR result with annualized rate, period returns, and cumulative
 *
 * @example
 * ```typescript
 * const result = calculateTWRR(simulationOutput.yearlyPercentiles);
 * console.log(`Annualized return: ${(result.twrr * 100).toFixed(2)}%`);
 * console.log(`Total return: ${(result.cumulativeReturn * 100).toFixed(2)}%`);
 * ```
 */
export function calculateTWRR(yearlyPercentiles: YearlyPercentiles[]): TWRRResult {
  // Handle edge cases
  if (yearlyPercentiles.length === 0) {
    return {
      twrr: 0,
      periodReturns: [],
      cumulativeReturn: 0,
    };
  }

  if (yearlyPercentiles.length === 1) {
    return {
      twrr: 0,
      periodReturns: [],
      cumulativeReturn: 0,
    };
  }

  // Sort by year to ensure correct ordering
  const sorted = [...yearlyPercentiles].sort((a, b) => a.year - b.year);

  // Calculate period returns between consecutive years using median (p50)
  const periodReturns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const startValue = sorted[i - 1].p50;
    const endValue = sorted[i].p50;
    const periodReturn = calculatePeriodReturn(startValue, endValue);

    // Handle invalid period returns (NaN from zero/negative start values)
    if (isNaN(periodReturn)) {
      // If we hit an invalid period, return what we have so far
      break;
    }

    periodReturns.push(periodReturn);
  }

  // Handle case where all periods were invalid
  if (periodReturns.length === 0) {
    return {
      twrr: 0,
      periodReturns: [],
      cumulativeReturn: 0,
    };
  }

  // Chain returns to get cumulative
  const cumulativeReturn = chainReturns(periodReturns);

  // Annualize to get TWRR
  const twrr = annualizeReturn(cumulativeReturn, periodReturns.length);

  return {
    twrr: isNaN(twrr) ? 0 : twrr,
    periodReturns,
    cumulativeReturn,
  };
}
