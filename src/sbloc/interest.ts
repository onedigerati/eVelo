/**
 * SBLOC Interest Accrual Calculations
 *
 * Pure functions for computing interest on securities-backed loans.
 * All calculations follow standard compound interest formulas from
 * CFA Institute financial mathematics.
 *
 * Key formulas:
 * - Simple interest: I = P * r
 * - Compound interest: A = P * (1 + r)^t
 * - Monthly compounding: A = P * (1 + r/12)^(12*t)
 *
 * All functions are pure (no side effects) and return new values
 * rather than mutating inputs.
 */

import type { SBLOCConfig, SBLOCState } from './types';

// ============================================================================
// Core Interest Calculations
// ============================================================================

/**
 * Calculate simple annual interest on a principal amount
 *
 * Formula: I = P * r
 * Where: I = interest, P = principal, r = annual rate
 *
 * @param principal - Loan balance or principal amount
 * @param rate - Annual interest rate as decimal (e.g., 0.074 for 7.4%)
 * @returns Interest amount in dollars
 *
 * @example
 * ```typescript
 * const interest = calculateAnnualInterest(100000, 0.074);
 * // Returns: 7400 ($7,400 annual interest on $100k at 7.4%)
 * ```
 */
export function calculateAnnualInterest(principal: number, rate: number): number {
  // Handle edge cases
  if (principal <= 0 || rate <= 0) {
    return 0;
  }

  return principal * rate;
}

/**
 * Calculate monthly interest on a principal amount
 *
 * Formula: I = P * (r / 12)
 * Where: I = monthly interest, P = principal, r = annual rate
 *
 * @param principal - Loan balance or principal amount
 * @param annualRate - Annual interest rate as decimal (e.g., 0.074 for 7.4%)
 * @returns Monthly interest amount in dollars
 *
 * @example
 * ```typescript
 * const monthlyInterest = calculateMonthlyInterest(100000, 0.074);
 * // Returns: 616.67 ($616.67 monthly interest on $100k at 7.4% annual)
 * ```
 */
export function calculateMonthlyInterest(principal: number, annualRate: number): number {
  // Handle edge cases
  if (principal <= 0 || annualRate <= 0) {
    return 0;
  }

  return principal * (annualRate / 12);
}

// ============================================================================
// State Management Functions
// ============================================================================

/**
 * Apply one period of interest accrual to SBLOC state
 *
 * This is the core function for simulation time stepping. It applies
 * compound interest based on the configured compounding frequency.
 *
 * Formulas:
 * - Annual compounding: newBalance = oldBalance * (1 + rate)
 * - Monthly compounding: newBalance = oldBalance * (1 + rate/12)
 *
 * NOTE: This function applies ONE compounding period, not a full year.
 * For annual compounding, call once per year.
 * For monthly compounding, call 12 times per year.
 *
 * @param state - Current SBLOC state (not mutated)
 * @param config - SBLOC configuration with interest rate and compounding
 * @returns New SBLOC state with updated loan balance and LTV
 *
 * @example
 * ```typescript
 * const config: SBLOCConfig = { annualInterestRate: 0.074, compoundingFrequency: 'annual', ... };
 * const state: SBLOCState = { loanBalance: 100000, portfolioValue: 500000, ... };
 *
 * const newState = accrueInterest(state, config);
 * // newState.loanBalance = 107400 (100000 * 1.074)
 * ```
 */
export function accrueInterest(state: SBLOCState, config: SBLOCConfig): SBLOCState {
  // Handle edge case: no loan balance
  if (state.loanBalance <= 0) {
    return { ...state };
  }

  // Handle edge case: zero interest rate
  if (config.annualInterestRate <= 0) {
    return { ...state };
  }

  // Calculate new balance based on compounding frequency
  let newLoanBalance: number;

  if (config.compoundingFrequency === 'annual') {
    // Annual compounding: multiply by (1 + rate)
    newLoanBalance = state.loanBalance * (1 + config.annualInterestRate);
  } else {
    // Monthly compounding: multiply by (1 + rate/12)
    newLoanBalance = state.loanBalance * (1 + config.annualInterestRate / 12);
  }

  // Calculate new LTV
  const newLTV = state.portfolioValue > 0
    ? newLoanBalance / state.portfolioValue
    : state.portfolioValue === 0 && newLoanBalance > 0
      ? Infinity
      : 0;

  // Determine if in warning zone (between maintenance margin and max LTV)
  const inWarningZone = newLTV >= config.maintenanceMargin && newLTV < config.maxLTV;

  // Return new state (immutable pattern)
  return {
    ...state,
    loanBalance: newLoanBalance,
    currentLTV: newLTV,
    inWarningZone,
  };
}

// ============================================================================
// Projection Functions
// ============================================================================

/**
 * Project loan balance after N years with compound interest and withdrawals
 *
 * Models the BBD strategy where annual withdrawals are added to the loan
 * balance, then interest accrues on the total.
 *
 * Formula for each year:
 * newBalance = (oldBalance + annualWithdrawal) * (1 + rate)
 *
 * This is useful for "what if" projections showing how the loan grows
 * over time before any market returns or margin calls are considered.
 *
 * @param config - SBLOC configuration with rate and withdrawal amount
 * @param years - Number of years to project
 * @param initialBalance - Starting loan balance (default: 0)
 * @returns Projected loan balance after N years
 *
 * @example
 * ```typescript
 * const config: SBLOCConfig = {
 *   annualInterestRate: 0.074,
 *   annualWithdrawal: 50000,
 *   compoundingFrequency: 'annual',
 *   ...
 * };
 *
 * // Year 1: (0 + 50000) * 1.074 = 53,700
 * const year1 = projectLoanBalance(config, 1);
 *
 * // Year 2: (53700 + 50000) * 1.074 = 111,373.80
 * const year2 = projectLoanBalance(config, 2);
 *
 * // 100k starting balance at 7.4% annual for 1 year:
 * // (100000 + 50000) * 1.074 = 161,100
 * const withInitial = projectLoanBalance(config, 1, 100000);
 * ```
 */
export function projectLoanBalance(
  config: SBLOCConfig,
  years: number,
  initialBalance: number = 0
): number {
  // Handle edge cases
  if (years <= 0) {
    return initialBalance;
  }

  let balance = initialBalance;
  const rate = config.annualInterestRate;
  const withdrawal = config.annualWithdrawal;

  // Annual compounding model
  if (config.compoundingFrequency === 'annual') {
    for (let year = 0; year < years; year++) {
      // Add withdrawal, then apply interest
      balance = (balance + withdrawal) * (1 + rate);
    }
  } else {
    // Monthly compounding: apply monthly rate 12 times per year
    const monthlyRate = rate / 12;
    for (let year = 0; year < years; year++) {
      // Add withdrawal at start of year
      balance = balance + withdrawal;
      // Compound monthly for 12 months
      for (let month = 0; month < 12; month++) {
        balance = balance * (1 + monthlyRate);
      }
    }
  }

  return balance;
}

/**
 * Calculate effective annual rate from monthly compounding
 *
 * Formula: EAR = (1 + r/12)^12 - 1
 * Where: r = nominal annual rate
 *
 * Useful for comparing annual vs monthly compounding scenarios.
 *
 * @param nominalAnnualRate - Nominal annual interest rate
 * @returns Effective annual rate accounting for monthly compounding
 *
 * @example
 * ```typescript
 * const ear = effectiveAnnualRate(0.074);
 * // Returns: 0.0766 (7.66% effective vs 7.4% nominal)
 * ```
 */
export function effectiveAnnualRate(nominalAnnualRate: number): number {
  if (nominalAnnualRate <= 0) {
    return 0;
  }

  return Math.pow(1 + nominalAnnualRate / 12, 12) - 1;
}
