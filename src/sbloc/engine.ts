/**
 * SBLOC Engine - Main Simulation Step Function
 *
 * Integrates all SBLOC components into a single step function that
 * advances the simulation by one year. This is the core function for
 * Monte Carlo simulation of the Buy-Borrow-Die strategy.
 *
 * Year step order (following PortfolioStrategySimulator reference):
 * 1. Apply portfolio return first
 * 2. If year >= startYear: add withdrawal to loan balance
 * 3. Apply interest to loan balance
 * 4. Update LTV
 * 5. Check for margin call
 * 6. If margin call: execute forced liquidation
 * 7. Update warning zone status
 * 8. Return results
 */

import type { SBLOCConfig, SBLOCState, LiquidationEvent } from './types';
import { calculateLTV } from './ltv';
import { detectMarginCall, isInWarningZone } from './margin-call';
import { executeForcedLiquidation } from './liquidation';

// ============================================================================
// State Initialization
// ============================================================================

/**
 * Initialize SBLOC state for simulation
 *
 * Creates the starting state for a BBD strategy simulation.
 * Optionally allows starting with an existing loan balance.
 *
 * @param config - SBLOC configuration
 * @param initialPortfolioValue - Starting portfolio value
 * @param initialLoanBalance - Starting loan balance (default: 0)
 * @returns Initial SBLOC state ready for simulation
 *
 * @example
 * ```typescript
 * const config = { maintenanceMargin: 0.50, maxLTV: 0.65, ... };
 *
 * // Start with $1M portfolio, no loan
 * const state = initializeSBLOCState(config, 1000000);
 * // { loanBalance: 0, portfolioValue: 1000000, currentLTV: 0, inWarningZone: false, yearsSinceStart: 0 }
 *
 * // Start with existing $200k loan
 * const withLoan = initializeSBLOCState(config, 1000000, 200000);
 * // { loanBalance: 200000, portfolioValue: 1000000, currentLTV: 0.20, inWarningZone: false, yearsSinceStart: 0 }
 * ```
 */
export function initializeSBLOCState(
  config: SBLOCConfig,
  initialPortfolioValue: number,
  initialLoanBalance: number = 0
): SBLOCState {
  const loanBalance = initialLoanBalance;
  const portfolioValue = initialPortfolioValue;
  const currentLTV = calculateLTV(loanBalance, portfolioValue);

  // Create initial state
  const state: SBLOCState = {
    loanBalance,
    portfolioValue,
    currentLTV,
    inWarningZone: false,
    yearsSinceStart: 0,
  };

  // Check if starting in warning zone
  state.inWarningZone = isInWarningZone(state, config);

  return state;
}

// ============================================================================
// Simulation Step Result
// ============================================================================

/**
 * Result of one year step in SBLOC simulation
 */
export interface SBLOCYearResult {
  /** Updated SBLOC state after the year */
  newState: SBLOCState;
  /** Whether a margin call was triggered this year */
  marginCallTriggered: boolean;
  /** Liquidation event details if liquidation occurred, null otherwise */
  liquidationEvent: LiquidationEvent | null;
  /** Whether the portfolio failed (net worth <= 0) */
  portfolioFailed: boolean;
  /** Interest charged this year */
  interestCharged: number;
  /** Withdrawal made this year (0 if before startYear) */
  withdrawalMade: number;
}

// ============================================================================
// Main Simulation Step
// ============================================================================

/**
 * Advance SBLOC simulation by one year
 *
 * This is the main simulation function that models one year of the
 * Buy-Borrow-Die strategy. It applies market returns, withdrawals,
 * interest, and handles margin calls.
 *
 * Step order:
 * 1. Apply portfolio return first
 * 2. If currentYear >= startYear: add annual withdrawal to loan
 * 3. Apply interest to loan balance (annual compounding)
 * 4. Update LTV
 * 5. Check for margin call
 * 6. If margin call: execute forced liquidation
 * 7. Update warning zone status
 * 8. Return comprehensive results
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration
 * @param portfolioReturn - Annual return as decimal (e.g., 0.10 for 10%)
 * @param currentYear - Current simulation year (0-indexed)
 * @returns Year result with new state and events
 *
 * @example
 * ```typescript
 * const config = {
 *   annualInterestRate: 0.074,
 *   maxLTV: 0.65,
 *   maintenanceMargin: 0.50,
 *   liquidationHaircut: 0.05,
 *   annualWithdrawal: 50000,
 *   compoundingFrequency: 'annual',
 *   startYear: 0
 * };
 *
 * const state = {
 *   loanBalance: 0,
 *   portfolioValue: 1000000,
 *   currentLTV: 0,
 *   inWarningZone: false,
 *   yearsSinceStart: 0
 * };
 *
 * // Year 1: 10% return, withdraw $50k, accrue interest
 * const result = stepSBLOC(state, config, 0.10, 0);
 *
 * // Portfolio: $1M * 1.10 = $1.1M
 * // Withdrawal: $50k added to loan
 * // Interest: $50k * 1.074 = $53,700
 * // LTV: $53,700 / $1.1M = 4.88%
 *
 * // result.newState.portfolioValue = 1100000
 * // result.newState.loanBalance = 53700
 * // result.interestCharged = 3700
 * // result.withdrawalMade = 50000
 * // result.marginCallTriggered = false
 *
 * // After bad year (-30% return)
 * const afterCrash = stepSBLOC(result.newState, config, -0.30, 1);
 * // Portfolio: $1.1M * 0.70 = $770k
 * // Check if margin call needed...
 * ```
 */
export function stepSBLOC(
  state: SBLOCState,
  config: SBLOCConfig,
  portfolioReturn: number,
  currentYear: number
): SBLOCYearResult {
  // Start with a copy of current state
  let newPortfolioValue = state.portfolioValue;
  let newLoanBalance = state.loanBalance;
  let interestCharged = 0;
  let withdrawalMade = 0;

  // Step 1: Apply portfolio return first
  // Floor at 0 - portfolio value cannot go negative (even with -100% return)
  newPortfolioValue = Math.max(0, newPortfolioValue * (1 + portfolioReturn));

  // Step 2: If withdrawals have started, add annual withdrawal to loan
  if (currentYear >= config.startYear) {
    withdrawalMade = config.annualWithdrawal;
    newLoanBalance += withdrawalMade;
  }

  // =========================================================================
  // Step 3: Apply interest to loan balance
  // =========================================================================
  //
  // Interest compounding determines how frequently interest is calculated and
  // added to the principal. This affects the effective annual rate (EAR).
  //
  // ANNUAL COMPOUNDING (compoundingFrequency === 'annual'):
  //   - Interest calculated once per year on current balance
  //   - Formula: newBalance = balance * (1 + nominalRate)
  //   - Effective Annual Rate (EAR) = nominalRate
  //   - Example: $100,000 at 7.4% nominal = $107,400 after 1 year
  //              Interest charged = $7,400
  //
  // MONTHLY COMPOUNDING (compoundingFrequency === 'monthly'):
  //   - Interest calculated 12 times per year at (nominalRate / 12)
  //   - Formula: newBalance = balance * (1 + r/12)^12
  //   - Effective Annual Rate (EAR) = (1 + r/12)^12 - 1
  //   - For 7.4% nominal: EAR = (1 + 0.074/12)^12 - 1 = 7.66%
  //   - Example: $100,000 at 7.4% nominal with monthly compounding
  //              = $100,000 * (1.00617)^12 = $107,660 after 1 year
  //              Interest charged = $7,660 (vs $7,400 annual = $260 more)
  //
  // WHY THIS MATTERS FOR BBD STRATEGY:
  //   - Most real SBLOCs use daily or monthly compounding
  //   - Monthly compounding increases debt faster than annual
  //   - Over 30 years at 7.4%, monthly vs annual compounding on $1M:
  //     * Annual:  $1M * (1.074)^30   = $8.5M
  //     * Monthly: $1M * (1.0766)^30  = $9.2M (8% higher debt)
  //   - Conservative users should select monthly compounding
  //
  // Interest is calculated on the balance AFTER withdrawal is added.
  // This models the typical scenario where withdrawal happens first in a period.
  //
  if (newLoanBalance > 0 && config.annualInterestRate > 0) {
    if (config.compoundingFrequency === 'annual') {
      // Annual compounding: interest calculated once per year
      // EAR = nominalRate (no compounding effect)
      interestCharged = newLoanBalance * config.annualInterestRate;
      newLoanBalance = newLoanBalance * (1 + config.annualInterestRate);
    } else {
      // Monthly compounding: (1 + r/12)^12 applied over 12 iterations
      // EAR = (1 + r/12)^12 - 1 ≈ nominalRate + 0.26% for 7.4% nominal
      const monthlyRate = config.annualInterestRate / 12;
      const startBalance = newLoanBalance;
      for (let month = 0; month < 12; month++) {
        newLoanBalance = newLoanBalance * (1 + monthlyRate);
      }
      interestCharged = newLoanBalance - startBalance;
    }
  }

  // Step 4: Update LTV
  let newLTV = calculateLTV(newLoanBalance, newPortfolioValue);

  // Create intermediate state for margin call check
  let newState: SBLOCState = {
    loanBalance: newLoanBalance,
    portfolioValue: newPortfolioValue,
    currentLTV: newLTV,
    inWarningZone: false,
    yearsSinceStart: state.yearsSinceStart + 1,
  };

  // Step 5: Check for margin call
  const marginCall = detectMarginCall(newState, config);
  const marginCallTriggered = marginCall !== null;

  // Step 6: If margin call, execute forced liquidation
  let liquidationEvent: LiquidationEvent | null = null;
  let portfolioFailed = false;

  if (marginCallTriggered) {
    const liquidationResult = executeForcedLiquidation(newState, config, currentYear);
    newState = liquidationResult.newState;
    liquidationEvent = liquidationResult.event;
    portfolioFailed = liquidationResult.portfolioFailed;

    // Update values from liquidation result
    newPortfolioValue = newState.portfolioValue;
    newLoanBalance = newState.loanBalance;
    newLTV = newState.currentLTV;
  }

  // Step 7: Update warning zone status
  newState.inWarningZone = isInWarningZone(newState, config);

  // Ensure yearsSinceStart is updated
  newState.yearsSinceStart = state.yearsSinceStart + 1;

  // Check for portfolio failure even without liquidation
  // (portfolio could have crashed below loan balance)
  if (!portfolioFailed) {
    const netWorth = newState.portfolioValue - newState.loanBalance;
    portfolioFailed = netWorth <= 0;
  }

  return {
    newState,
    marginCallTriggered,
    liquidationEvent,
    portfolioFailed,
    interestCharged,
    withdrawalMade,
  };
}
