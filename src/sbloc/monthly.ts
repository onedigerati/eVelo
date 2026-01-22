/**
 * SBLOC Monthly Step Functions
 *
 * Provides monthly granularity for SBLOC simulation when monthlyWithdrawal flag is set.
 * This enables more accurate interest accrual and earlier margin call detection.
 *
 * Why monthly compounding matters:
 * - Monthly compounding produces ~0.26% higher effective interest rate than annual
 *   (e.g., 7.4% nominal annual rate = 7.66% effective with monthly compounding)
 * - Interest accrues on withdrawal immediately each month (not deferred to year end)
 * - Margin calls can trigger mid-year at any of 12 monthly checkpoints
 * - More realistic modeling of actual SBLOC behavior
 *
 * Withdrawal timing:
 * - Month-start withdrawal: Withdrawal added to loan BEFORE interest is applied
 * - This matches how most BBD practitioners draw monthly living expenses
 *
 * yearsSinceStart behavior:
 * - Only increments at year boundary (month 11 -> 0 transition)
 * - Individual months do NOT increment yearsSinceStart
 */

import type { SBLOCConfig, SBLOCState, LiquidationEvent } from './types';
import { stepSBLOC, type SBLOCYearResult } from './engine';

/**
 * Convert annual return to 12 equal monthly returns that compound to the same total
 *
 * Uses the compound interest formula in reverse:
 * If annual return is R, then monthly return r satisfies: (1 + r)^12 = 1 + R
 * Therefore: r = (1 + R)^(1/12) - 1
 *
 * @param annualReturn - Annual return as decimal (e.g., 0.10 for 10%)
 * @returns Array of 12 identical monthly returns that compound to the annual return
 *
 * @example
 * ```typescript
 * const monthly = annualToMonthlyReturns(0.10);  // 10% annual
 * // monthly[0] = 0.00797... (~0.797% per month)
 * // Verification: (1 + 0.00797)^12 ≈ 1.10
 *
 * const negative = annualToMonthlyReturns(-0.30);  // -30% annual
 * // negative[0] = -0.02924... (~-2.92% per month)
 * // Verification: (1 - 0.02924)^12 ≈ 0.70
 * ```
 */
export function annualToMonthlyReturns(annualReturn: number): number[] {
  // Formula: monthlyReturn = (1 + annualReturn)^(1/12) - 1
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  return Array(12).fill(monthlyReturn);
}

/**
 * Execute one month of SBLOC simulation
 *
 * Processes a single month step with 1/12 of the annual withdrawal.
 * Interest is applied at monthly frequency on the loan balance.
 *
 * Note: This function creates an adjusted config internally for the monthly step.
 * The caller's config is not modified.
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration (annual values)
 * @param monthlyReturn - Portfolio return for this month (use annualToMonthlyReturns to convert)
 * @param currentYear - Current simulation year (0-indexed)
 * @param currentMonth - Current month within year (0-11)
 * @returns SBLOCYearResult (same type for consistency, represents one month's result)
 *
 * @example
 * ```typescript
 * const config = { annualWithdrawal: 50000, annualInterestRate: 0.074, ... };
 * const state = { loanBalance: 100000, portfolioValue: 500000, ... };
 *
 * // Month 0: first month of year
 * const monthlyReturns = annualToMonthlyReturns(0.10);
 * const result = stepSBLOCMonth(state, config, monthlyReturns[0], 5, 0);
 * // result.withdrawalMade ≈ 4166.67 ($50k / 12)
 * // result.interestCharged = monthly interest on (loanBalance + withdrawal)
 * ```
 */
export function stepSBLOCMonth(
  state: SBLOCState,
  config: SBLOCConfig,
  monthlyReturn: number,
  currentYear: number,
  currentMonth: number
): SBLOCYearResult {
  // Create adjusted config for monthly step
  // - Withdrawal is 1/12 of annual
  // - Interest rate is 1/12 of annual (applied once per month)
  // - Force annual compounding since we're calling stepSBLOC once per month
  const monthlyConfig: SBLOCConfig = {
    ...config,
    annualWithdrawal: config.annualWithdrawal / 12,
    annualInterestRate: config.annualInterestRate / 12,
    compoundingFrequency: 'annual', // Single application of monthly rate
  };

  // Create a temporary state that won't increment yearsSinceStart
  // We'll handle yearsSinceStart at the year boundary
  const tempState: SBLOCState = {
    ...state,
    yearsSinceStart: state.yearsSinceStart,
  };

  // Call stepSBLOC for one month
  // Note: stepSBLOC increments yearsSinceStart, so we'll correct this
  const result = stepSBLOC(tempState, monthlyConfig, monthlyReturn, currentYear);

  // Correct yearsSinceStart - only increment at year boundary (month 11)
  // stepSBLOC already incremented it, so we need to decrement if not month 11
  if (currentMonth < 11) {
    result.newState.yearsSinceStart = state.yearsSinceStart;
  }
  // If currentMonth === 11, keep the increment (year boundary)

  return result;
}

/**
 * Execute one year of SBLOC simulation with optional monthly granularity
 *
 * Wrapper function that orchestrates annual vs monthly simulation mode.
 * When monthlyWithdrawal is false, this is fully backward compatible with stepSBLOC.
 *
 * Backward compatibility guarantee:
 * - stepSBLOCYear(state, config, return, year, false) produces IDENTICAL results
 *   to stepSBLOC(state, config, return, year)
 *
 * Differences when monthlyWithdrawal is true:
 * - Monthly compounding: ~7.66% effective vs 7.4% nominal (for 7.4% annual rate)
 * - Interest accrues on each monthly withdrawal immediately
 * - Margin calls can trigger mid-year (at any of 12 monthly checkpoints)
 * - Total withdrawal amount is the same ($50k/year = 12 x $4,166.67)
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration
 * @param portfolioReturn - Annual return as decimal (will be distributed across 12 months if monthly mode)
 * @param currentYear - Current simulation year (0-indexed)
 * @param monthlyWithdrawal - If true, process 12 monthly substeps; if false, delegate to stepSBLOC
 * @returns SBLOCYearResult with aggregated totals for the year
 *
 * @example
 * ```typescript
 * // Verification: monthlyWithdrawal=false produces identical results to stepSBLOC
 * // const annual = stepSBLOC(state, config, 0.10, year);
 * // const wrapped = stepSBLOCYear(state, config, 0.10, year, false);
 * // assert(annual.newState.loanBalance === wrapped.newState.loanBalance);
 *
 * const config = { annualWithdrawal: 50000, annualInterestRate: 0.074, ... };
 * const state = initializeSBLOCState(config, 1000000);
 *
 * // Annual mode (backward compatible)
 * const annualResult = stepSBLOCYear(state, config, 0.10, 0, false);
 *
 * // Monthly mode (more accurate)
 * const monthlyResult = stepSBLOCYear(state, config, 0.10, 0, true);
 * // monthlyResult will have slightly higher loan balance due to monthly compounding
 * ```
 */
export function stepSBLOCYear(
  state: SBLOCState,
  config: SBLOCConfig,
  portfolioReturn: number,
  currentYear: number,
  monthlyWithdrawal: boolean
): SBLOCYearResult {
  // =========================================================================
  // Backward compatible path: delegate directly to stepSBLOC
  // VALIDATION: This path produces IDENTICAL results to calling stepSBLOC directly
  // - Same parameters passed through unchanged
  // - Returns the EXACT same SBLOCYearResult that stepSBLOC returns
  // - No modifications to state or result
  // =========================================================================
  if (!monthlyWithdrawal) {
    // IDENTICAL call to stepSBLOC - no modifications whatsoever
    // Verification test: stepSBLOCYear(s, c, 0.10, y, false).newState === stepSBLOC(s, c, 0.10, y).newState
    return stepSBLOC(state, config, portfolioReturn, currentYear);
  }

  // =========================================================================
  // Monthly mode: process 12 monthly substeps
  // EXPECTED DIFFERENCES vs annual mode:
  // 1. Monthly compounding: ~7.66% effective vs 7.4% nominal (for 7.4% rate)
  //    - Example: $50k loan at 7.4% annual = $53,700 balance after 1 year
  //    - Monthly: $50k * (1 + 0.074/12)^12 = $53,831 balance after 1 year
  //    - Difference: ~$131 more interest (~0.26% higher effective rate)
  // 2. Interest accrues on withdrawal immediately each month
  //    - Annual: All $50k added at once, interest on full amount
  //    - Monthly: $4,166.67 added each month, interest compounds on partial amounts
  // 3. Margin calls can trigger mid-year (12 checkpoints vs 1)
  //    - More sensitive to intra-year volatility
  // 4. Total withdrawal amount is identical ($50k/year = 12 x $4,166.67)
  // =========================================================================

  // Convert annual return to 12 monthly returns
  const monthlyReturns = annualToMonthlyReturns(portfolioReturn);

  // Initialize aggregation variables
  let currentState = { ...state };
  let totalInterestCharged = 0;
  let totalWithdrawalMade = 0;
  let firstMarginCall = false;
  let firstLiquidationEvent: LiquidationEvent | null = null;
  let portfolioFailed = false;

  // Process each month
  for (let month = 0; month < 12; month++) {
    const monthResult = stepSBLOCMonth(
      currentState,
      config,
      monthlyReturns[month],
      currentYear,
      month
    );

    // Update state for next month
    currentState = monthResult.newState;

    // Accumulate totals
    totalInterestCharged += monthResult.interestCharged;
    totalWithdrawalMade += monthResult.withdrawalMade;

    // Track first margin call
    if (monthResult.marginCallTriggered && !firstMarginCall) {
      firstMarginCall = true;
    }

    // Track first liquidation event
    if (monthResult.liquidationEvent && !firstLiquidationEvent) {
      firstLiquidationEvent = monthResult.liquidationEvent;
    }

    // If portfolio failed, break out of loop
    if (monthResult.portfolioFailed) {
      portfolioFailed = true;
      break;
    }
  }

  // Return aggregated result for the year
  return {
    newState: currentState,
    marginCallTriggered: firstMarginCall,
    liquidationEvent: firstLiquidationEvent,
    portfolioFailed,
    interestCharged: totalInterestCharged,
    withdrawalMade: totalWithdrawalMade,
  };
}
