/**
 * Forced Liquidation Module
 *
 * Handles forced asset sales when margin calls cannot be met.
 * In the Buy-Borrow-Die strategy, if LTV exceeds the maximum allowed ratio
 * and no additional collateral is added, assets must be sold to reduce the loan.
 *
 * Key concepts:
 * - Target LTV after liquidation: maintenanceMargin * liquidationTargetMultiplier (configurable)
 * - Default multiplier is 0.8 (80%), providing a 20% safety buffer below maintenance
 * - Liquidation haircut: forced sales incur additional losses (typically 5%)
 * - Portfolio failure: when net worth (portfolio - loan) becomes <= 0
 *
 * Reference formulas (from PortfolioStrategySimulator):
 * - targetLTV = maintenanceMargin * liquidationTargetMultiplier
 * - targetLoc = portfolioValue * targetLTV
 * - excessLoc = locBalance - targetLoc
 * - assetsToSell = excessLoc / (1 - liquidationHaircut)
 * - proceeds = assetsToSell * (1 - haircut)
 */

import type { SBLOCConfig, SBLOCState, LiquidationEvent } from './types';
import { calculateLTV } from './ltv';

// ============================================================================
// Liquidation Calculations
// ============================================================================

/**
 * Result of liquidation amount calculation
 */
export interface LiquidationAmounts {
  /** Dollar amount of assets to sell */
  assetsToSell: number;
  /** Dollar amount that will be applied to loan repayment (after haircut) */
  loanToRepay: number;
  /** Target LTV after liquidation (typically 80% of maintenance margin) */
  targetLTV: number;
}

/**
 * Calculate how much to liquidate to restore safe LTV
 *
 * When LTV exceeds maxLTV, we need to sell assets to bring it back down.
 * The target is not just at maxLTV, but at a configurable fraction of
 * maintenance margin to provide a safety buffer against further declines.
 *
 * Formula derivation:
 * 1. targetLTV = maintenanceMargin * liquidationTargetMultiplier (default 0.8)
 * 2. targetLoanBalance = portfolioValue * targetLTV (where we want to be)
 * 3. excessLoan = currentLoanBalance - targetLoanBalance
 * 4. To repay X in loan, we must sell X / (1 - haircut) in assets
 *    because proceeds = assets * (1 - haircut)
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration
 * @returns Liquidation amounts (zeros if no liquidation needed)
 *
 * @example
 * ```typescript
 * // $1M portfolio, $700k loan (70% LTV), 65% maxLTV, 50% maintenance, 5% haircut
 * const state = {
 *   portfolioValue: 1000000,
 *   loanBalance: 700000,
 *   currentLTV: 0.70,
 *   ...
 * };
 * const config = {
 *   maintenanceMargin: 0.50,
 *   maxLTV: 0.65,
 *   liquidationHaircut: 0.05,
 *   liquidationTargetMultiplier: 0.8,  // Optional, default 0.8
 *   ...
 * };
 *
 * // Target LTV = 50% * 0.8 = 40%
 * // Target loan = $1M * 0.40 = $400k
 * // Excess loan = $700k - $400k = $300k
 * // Assets to sell = $300k / (1 - 0.05) = $315,789.47
 * // Loan repaid = $315,789.47 * 0.95 = $300k
 *
 * calculateLiquidationAmount(state, config);
 * // { assetsToSell: 315789.47, loanToRepay: 300000, targetLTV: 0.40 }
 * ```
 */
export function calculateLiquidationAmount(
  state: SBLOCState,
  config: SBLOCConfig
): LiquidationAmounts {
  // Get multiplier from config with default fallback
  // Default 0.8 provides 20% buffer below maintenance to avoid immediate repeat calls
  let multiplier = config.liquidationTargetMultiplier ?? 0.8;

  // Validate multiplier is reasonable (must be positive and <= 1)
  if (multiplier <= 0 || multiplier > 1) {
    console.warn(
      `Invalid liquidationTargetMultiplier ${multiplier}, using default 0.8. ` +
      `Multiplier must be > 0 and <= 1.`
    );
    multiplier = 0.8;
  }

  // Target LTV = maintenance margin * multiplier
  const targetLTV = config.maintenanceMargin * multiplier;

  // Calculate target loan balance at new LTV
  const targetLoanBalance = state.portfolioValue * targetLTV;

  // How much loan needs to be repaid
  const excessLoan = state.loanBalance - targetLoanBalance;

  // If no excess, no liquidation needed
  if (excessLoan <= 0) {
    return {
      assetsToSell: 0,
      loanToRepay: 0,
      targetLTV,
    };
  }

  // To repay X in loan, we must sell X / (1 - haircut) in assets
  // Because: proceeds = assets * (1 - haircut), so assets = proceeds / (1 - haircut)
  const assetsToSell = excessLoan / (1 - config.liquidationHaircut);

  // Loan repaid is the net proceeds after haircut
  const loanToRepay = assetsToSell * (1 - config.liquidationHaircut);

  return {
    assetsToSell,
    loanToRepay,
    targetLTV,
  };
}

/**
 * Calculate the dollar amount lost to liquidation haircut
 *
 * When assets are force-liquidated, they're sold at a discount.
 * This function calculates the loss.
 *
 * @param assetsLiquidated - Gross dollar amount of assets sold
 * @param haircutRate - Haircut percentage as decimal (e.g., 0.05 for 5%)
 * @returns Dollar amount lost to haircut
 *
 * @example
 * ```typescript
 * // $200k liquidated at 5% haircut
 * calculateHaircutLoss(200000, 0.05); // 10000 ($10k loss)
 *
 * // $315,789.47 liquidated at 5% haircut
 * calculateHaircutLoss(315789.47, 0.05); // 15789.47
 * ```
 */
export function calculateHaircutLoss(assetsLiquidated: number, haircutRate: number): number {
  if (assetsLiquidated <= 0 || haircutRate <= 0) {
    return 0;
  }

  return assetsLiquidated * haircutRate;
}

// ============================================================================
// Liquidation Execution
// ============================================================================

/**
 * Result of executing forced liquidation
 */
export interface LiquidationResult {
  /** Updated SBLOC state after liquidation */
  newState: SBLOCState;
  /** Details of the liquidation event */
  event: LiquidationEvent;
  /** True if portfolio failed (net worth <= 0) */
  portfolioFailed: boolean;
}

/**
 * Execute forced liquidation to reduce LTV after margin call
 *
 * Liquidation Process:
 * 1. Calculate target LTV = maintenanceMargin * liquidationTargetMultiplier
 * 2. Determine excess loan (amount above target)
 * 3. Calculate assets to sell (accounting for haircut)
 * 4. Sell assets, reduce loan, update state
 *
 * The haircut represents forced-sale discount (typically 5%).
 * The multiplier controls how aggressively we deleverage (default 0.8 = 20% buffer).
 *
 * This is the main liquidation function that:
 * 1. Calculates how much to liquidate
 * 2. Reduces portfolio value by assets sold
 * 3. Reduces loan balance by proceeds (after haircut)
 * 4. Recalculates LTV
 * 5. Checks if portfolio failed
 *
 * Pure function - does not mutate input state.
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration
 * @param year - Current simulation year (for event tracking)
 * @returns New state, liquidation event details, and failure flag
 *
 * @example
 * ```typescript
 * // $1M portfolio, $700k loan (70% LTV), needs liquidation
 * const state = {
 *   portfolioValue: 1000000,
 *   loanBalance: 700000,
 *   currentLTV: 0.70,
 *   inWarningZone: false,
 *   yearsSinceStart: 5
 * };
 * const config = {
 *   maintenanceMargin: 0.50,
 *   maxLTV: 0.65,
 *   liquidationHaircut: 0.05,
 *   ...
 * };
 *
 * const result = executeForcedLiquidation(state, config, 5);
 *
 * // result.newState.portfolioValue = 1000000 - 315789.47 = 684210.53
 * // result.newState.loanBalance = 700000 - 300000 = 400000
 * // result.newState.currentLTV = 400000 / 684210.53 = 0.585
 * // result.portfolioFailed = false (net worth = 684210.53 - 400000 = 284210.53 > 0)
 *
 * // result.event = {
 * //   year: 5,
 * //   assetsLiquidated: 315789.47,
 * //   haircut: 15789.47,
 * //   loanRepaid: 300000,
 * //   newLoanBalance: 400000,
 * //   newPortfolioValue: 684210.53
 * // }
 * ```
 */
export function executeForcedLiquidation(
  state: SBLOCState,
  config: SBLOCConfig,
  year?: number
): LiquidationResult {
  // Calculate liquidation amounts
  const { assetsToSell, loanToRepay, targetLTV } = calculateLiquidationAmount(state, config);

  // If no liquidation needed, return unchanged state
  if (assetsToSell <= 0) {
    const currentLTV = calculateLTV(state.loanBalance, state.portfolioValue);
    return {
      newState: { ...state },
      event: {
        year: year ?? state.yearsSinceStart,
        assetsLiquidated: 0,
        haircut: 0,
        loanRepaid: 0,
        newLoanBalance: state.loanBalance,
        newPortfolioValue: state.portfolioValue,
      },
      portfolioFailed: state.portfolioValue - state.loanBalance <= 0,
    };
  }

  // Calculate haircut loss
  const haircut = calculateHaircutLoss(assetsToSell, config.liquidationHaircut);

  // Cap assetsToSell at portfolio value - can't sell more than you have
  // If loan exceeds portfolio value, sell everything and apply proceeds to loan
  const actualAssetsToSell = Math.min(assetsToSell, state.portfolioValue);
  const actualLoanToRepay = actualAssetsToSell * (1 - config.liquidationHaircut);

  // Update values
  const newPortfolioValue = Math.max(0, state.portfolioValue - actualAssetsToSell);
  const newLoanBalance = Math.max(0, state.loanBalance - actualLoanToRepay);

  // Recalculate LTV
  const newLTV = calculateLTV(newLoanBalance, newPortfolioValue);

  // Check for warning zone
  const inWarningZone = newLTV >= config.maintenanceMargin && newLTV < config.maxLTV;

  // Check if portfolio failed (net worth <= 0)
  const netWorth = newPortfolioValue - newLoanBalance;
  const portfolioFailed = netWorth <= 0;

  // Create new state (immutable)
  const newState: SBLOCState = {
    ...state,
    portfolioValue: newPortfolioValue,
    loanBalance: newLoanBalance,
    currentLTV: newLTV,
    inWarningZone,
  };

  // Create liquidation event
  const event: LiquidationEvent = {
    year: year ?? state.yearsSinceStart,
    assetsLiquidated: actualAssetsToSell,
    haircut: calculateHaircutLoss(actualAssetsToSell, config.liquidationHaircut),
    loanRepaid: actualLoanToRepay,
    newLoanBalance,
    newPortfolioValue,
  };

  return {
    newState,
    event,
    portfolioFailed,
  };
}

// ============================================================================
// Recovery Checks
// ============================================================================

/**
 * Check if portfolio can recover from margin call
 *
 * A portfolio cannot recover if liquidating ALL assets still wouldn't
 * cover the loan balance. This represents terminal failure.
 *
 * Formula: Can't recover if portfolioValue * (1 - haircut) < loanBalance
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration
 * @returns true if recovery is possible, false if terminal failure
 *
 * @example
 * ```typescript
 * // Recoverable: $1M portfolio, $700k loan (can pay off)
 * // Net proceeds if all sold: $1M * 0.95 = $950k > $700k
 * const recoverable = { portfolioValue: 1000000, loanBalance: 700000, ... };
 * canRecoverFromMarginCall(recoverable, { liquidationHaircut: 0.05, ... }); // true
 *
 * // Unrecoverable: $800k portfolio, $800k loan
 * // Net proceeds if all sold: $800k * 0.95 = $760k < $800k
 * const terminal = { portfolioValue: 800000, loanBalance: 800000, ... };
 * canRecoverFromMarginCall(terminal, { liquidationHaircut: 0.05, ... }); // false
 *
 * // Also unrecoverable: $500k portfolio, $600k loan
 * // Net proceeds: $500k * 0.95 = $475k < $600k
 * const underwater = { portfolioValue: 500000, loanBalance: 600000, ... };
 * canRecoverFromMarginCall(underwater, { liquidationHaircut: 0.05, ... }); // false
 * ```
 */
export function canRecoverFromMarginCall(state: SBLOCState, config: SBLOCConfig): boolean {
  // No loan = always recoverable
  if (state.loanBalance <= 0) {
    return true;
  }

  // No portfolio = can't recover if there's a loan
  if (state.portfolioValue <= 0) {
    return false;
  }

  // Maximum possible proceeds from selling everything
  const maxProceeds = state.portfolioValue * (1 - config.liquidationHaircut);

  // Can recover if max proceeds covers loan
  return maxProceeds >= state.loanBalance;
}
