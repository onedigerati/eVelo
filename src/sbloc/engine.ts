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
import { validateSBLOCState, SBLOCStateValidationError } from './validation';

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

  // Validate initial state
  try {
    validateSBLOCState(state, config);
  } catch (error) {
    if (error instanceof SBLOCStateValidationError) {
      console.warn('Initial SBLOC state validation warning:', error.message);
    }
    throw error; // Re-throw for initial state (shouldn't happen with valid inputs)
  }

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
  /** Dividend tax borrowed this year (BBD advantage: borrow to pay taxes) */
  dividendTaxBorrowed: number;
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
 * Withdrawal growth:
 * - If config.withdrawalGrowthRate is set, withdrawals grow annually
 * - Year 0 withdrawal = annualWithdrawal
 * - Year N withdrawal = annualWithdrawal * (1 + withdrawalGrowthRate)^N
 * - This models inflation-adjusted spending to maintain purchasing power
 *
 * Note: When used via Monte Carlo simulation (monte-carlo.ts), withdrawal
 * growth is computed externally via SBLOCSimConfig.annualWithdrawalRaise
 * and passed as an already-adjusted annualWithdrawal. Set withdrawalGrowthRate
 * to 0 (or omit it) in that case to avoid double-applying growth.
 *
 * Step order:
 * 1. Apply portfolio return first
 * 2. If currentYear >= startYear: calculate withdrawal with growth, add to loan
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
 *   withdrawalGrowthRate: 0.03, // 3% annual growth
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
 * // Year 0: 10% return, withdraw $50k (no growth yet)
 * const result = stepSBLOC(state, config, 0.10, 0);
 * // Withdrawal: $50k * (1.03)^0 = $50,000
 *
 * // Year 10 example:
 * // Withdrawal: $50k * (1.03)^10 = $67,195
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
  let dividendTaxBorrowed = 0;

  // Step 1: Apply portfolio return first
  // Floor at 0 - portfolio value cannot go negative (even with -100% return)
  newPortfolioValue = Math.max(0, newPortfolioValue * (1 + portfolioReturn));

  // Step 1.5: Apply dividend tax via SBLOC borrowing (BBD advantage)
  // This happens BEFORE withdrawals but AFTER returns.
  // Order of operations per reference: returns → dividend tax → withdrawals → interest → margin call
  //
  // CRITICAL: BBD borrows to pay dividend taxes (portfolio stays whole).
  // Sell strategy must liquidate to pay the same taxes (reduces compound growth).
  // This is a major BBD advantage over Sell strategy.
  const dividendYield = config.dividendYield ?? 0;
  const dividendTaxRate = config.dividendTaxRate ?? 0;
  if (dividendYield > 0 && dividendTaxRate > 0) {
    const dividendIncome = newPortfolioValue * dividendYield;
    dividendTaxBorrowed = dividendIncome * dividendTaxRate;
    newLoanBalance += dividendTaxBorrowed; // Borrow to pay taxes (true BBD)
  }

  // Step 2: If withdrawals have started, calculate withdrawal with growth and add to loan
  // Withdrawal growth models inflation-adjusted spending to maintain purchasing power.
  // Year 0 (first withdrawal year) = annualWithdrawal
  // Year N = annualWithdrawal * (1 + withdrawalGrowthRate)^N
  //
  // NOTE: When used via Monte Carlo simulation (monte-carlo.ts), withdrawal growth
  // is computed externally and passed as an already-adjusted annualWithdrawal.
  // In that case, withdrawalGrowthRate should be 0 or undefined to avoid double-applying.
  if (currentYear >= config.startYear) {
    const yearsOfWithdrawals = currentYear - config.startYear;
    const growthRate = config.withdrawalGrowthRate ?? 0;
    withdrawalMade = config.annualWithdrawal * Math.pow(1 + growthRate, yearsOfWithdrawals);
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
    const balanceBeforeInterest = newLoanBalance;

    if (config.compoundingFrequency === 'annual') {
      // Annual compounding: interest calculated once per year
      // EAR = nominalRate (no compounding effect)
      interestCharged = newLoanBalance * config.annualInterestRate;
      newLoanBalance = newLoanBalance * (1 + config.annualInterestRate);
    } else {
      // Monthly compounding: (1 + r/12)^12 using Math.pow for performance
      // EAR = (1 + r/12)^12 - 1 ≈ nominalRate + 0.26% for 7.4% nominal
      const monthlyRate = config.annualInterestRate / 12;
      const compoundFactor = Math.pow(1 + monthlyRate, 12);
      interestCharged = newLoanBalance * (compoundFactor - 1);
      newLoanBalance = newLoanBalance * compoundFactor;
    }

    // Debug logging for interest compounding verification (development only)
    // Enable by setting window.DEBUG_SBLOC_INTEREST = true in browser console
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { DEBUG_SBLOC_INTEREST?: boolean }).DEBUG_SBLOC_INTEREST &&
      currentYear === 0 // Only log first year to avoid spam
    ) {
      const nominalRate = config.annualInterestRate;
      const effectiveRate = interestCharged / balanceBeforeInterest;
      console.log('[SBLOC Interest Debug]', {
        year: currentYear,
        compoundingFrequency: config.compoundingFrequency,
        nominalRate: `${(nominalRate * 100).toFixed(2)}%`,
        effectiveRate: `${(effectiveRate * 100).toFixed(4)}%`,
        balanceBeforeInterest: balanceBeforeInterest.toFixed(2),
        interestCharged: interestCharged.toFixed(2),
        balanceAfterInterest: newLoanBalance.toFixed(2),
        expectedDifference:
          config.compoundingFrequency === 'monthly'
            ? `EAR should be ~${((Math.pow(1 + nominalRate / 12, 12) - 1) * 100).toFixed(2)}%`
            : 'EAR equals nominal rate',
      });
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

  // Step 8: Skip per-step validation for performance (300k+ calls avoided)
  // Validation is done once at simulation end if needed
  // Invalid states (NaN) are caught by portfolioFailed check above

  return {
    newState,
    marginCallTriggered,
    liquidationEvent,
    portfolioFailed,
    interestCharged,
    withdrawalMade,
    dividendTaxBorrowed,
  };
}
