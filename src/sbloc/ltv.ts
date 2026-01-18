/**
 * LTV (Loan-to-Value) Calculation Module
 *
 * Utilities for calculating loan-to-value ratios, maximum borrowing capacity,
 * and credit availability for securities-backed lending.
 *
 * LTV is the fundamental risk metric for SBLOC:
 * - Higher LTV = more leverage = higher risk
 * - Brokerages set maxLTV limits to protect against default
 * - Different asset classes have different LTV limits based on volatility
 */

import type { SBLOCConfig, SBLOCState, LTVByAssetClass } from './types';

// ============================================================================
// Core LTV Calculations
// ============================================================================

/**
 * Calculate current Loan-to-Value ratio
 *
 * LTV = Loan Balance / Collateral Value
 *
 * @param loanBalance - Current outstanding loan amount
 * @param collateralValue - Current market value of pledged securities
 * @returns LTV ratio as decimal (e.g., 0.50 for 50%)
 *
 * @example
 * ```typescript
 * // $500k loan against $1M portfolio
 * calculateLTV(500000, 1000000); // 0.50 (50%)
 *
 * // $650k loan against $1M portfolio (at max)
 * calculateLTV(650000, 1000000); // 0.65 (65%)
 *
 * // Edge cases
 * calculateLTV(0, 1000000);      // 0 (no loan)
 * calculateLTV(0, 0);            // 0 (no loan, no collateral)
 * calculateLTV(500000, 0);       // Infinity (loan with no collateral)
 * ```
 */
export function calculateLTV(loanBalance: number, collateralValue: number): number {
  // No loan means zero LTV
  if (loanBalance === 0) {
    return 0;
  }

  // Loan exists but no collateral - undefined/infinite LTV
  if (collateralValue <= 0) {
    return Infinity;
  }

  return loanBalance / collateralValue;
}

/**
 * Calculate maximum borrowing amount for given collateral and LTV limit
 *
 * Max Borrowing = Collateral Value * Max LTV
 *
 * @param collateralValue - Current market value of pledged securities
 * @param maxLTV - Maximum allowed LTV ratio (e.g., 0.65 for 65%)
 * @returns Maximum borrowable amount in dollars
 *
 * @example
 * ```typescript
 * // $1M portfolio at 65% max LTV
 * calculateMaxBorrowing(1000000, 0.65); // 650000
 *
 * // $500k portfolio at 50% max LTV
 * calculateMaxBorrowing(500000, 0.50);  // 250000
 *
 * // Conservative bond portfolio at 85% max LTV
 * calculateMaxBorrowing(1000000, 0.85); // 850000
 * ```
 */
export function calculateMaxBorrowing(collateralValue: number, maxLTV: number): number {
  if (collateralValue <= 0 || maxLTV <= 0) {
    return 0;
  }

  return collateralValue * maxLTV;
}

// ============================================================================
// Weighted LTV for Multi-Asset Portfolios
// ============================================================================

/**
 * Asset holding with value and asset class
 */
export interface AssetHolding {
  /** Market value of this holding */
  value: number;
  /** Asset classification determining LTV limit */
  assetClass: 'equity' | 'bond' | 'cash';
}

/**
 * Portfolio structure for multi-asset LTV calculation
 */
export interface Portfolio {
  /** Array of asset holdings */
  assets: AssetHolding[];
}

/**
 * Calculate effective (weighted average) LTV limit for a multi-asset portfolio
 *
 * Each asset class has a different LTV limit. The effective limit is the
 * value-weighted average across all holdings.
 *
 * Formula: Sum(asset_value * asset_ltv_limit) / Sum(asset_value)
 *
 * @param portfolio - Portfolio with assets by class
 * @param ltvLimits - LTV limits for each asset class
 * @returns Effective LTV limit as decimal
 *
 * @example
 * ```typescript
 * const portfolio = {
 *   assets: [
 *     { value: 800000, assetClass: 'equity' },  // $800k stocks
 *     { value: 200000, assetClass: 'bond' }     // $200k bonds
 *   ]
 * };
 *
 * const limits = { equities: 0.50, bonds: 0.90, cash: 0.95 };
 *
 * // Effective LTV = ($800k * 0.50 + $200k * 0.90) / $1M
 * //              = ($400k + $180k) / $1M
 * //              = 0.58 (58%)
 * getEffectiveLTV(portfolio, limits); // 0.58
 * ```
 */
export function getEffectiveLTV(portfolio: Portfolio, ltvLimits: LTVByAssetClass): number {
  if (!portfolio.assets || portfolio.assets.length === 0) {
    return 0;
  }

  let totalBorrowingPower = 0;
  let totalPortfolioValue = 0;

  for (const asset of portfolio.assets) {
    if (asset.value <= 0) {
      continue;
    }

    // Map asset class to LTV limit
    let limit: number;
    switch (asset.assetClass) {
      case 'equity':
        limit = ltvLimits.equities;
        break;
      case 'bond':
        limit = ltvLimits.bonds;
        break;
      case 'cash':
        limit = ltvLimits.cash;
        break;
      default:
        // Unknown asset class gets most conservative limit
        limit = ltvLimits.equities;
    }

    totalBorrowingPower += asset.value * limit;
    totalPortfolioValue += asset.value;
  }

  if (totalPortfolioValue <= 0) {
    return 0;
  }

  return totalBorrowingPower / totalPortfolioValue;
}

// ============================================================================
// Borrowing Limit Checks
// ============================================================================

/**
 * Check if current state is within borrowing limits
 *
 * Returns true if current LTV is below the maximum allowed LTV.
 * This is the primary safety check before allowing additional borrowing.
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration with maxLTV
 * @returns true if within limits, false if at or over limit
 *
 * @example
 * ```typescript
 * const state = { loanBalance: 400000, portfolioValue: 1000000, currentLTV: 0.40, ... };
 * const config = { maxLTV: 0.65, ... };
 *
 * isWithinBorrowingLimit(state, config); // true (40% < 65%)
 *
 * const atLimit = { loanBalance: 650000, portfolioValue: 1000000, currentLTV: 0.65, ... };
 * isWithinBorrowingLimit(atLimit, config); // false (65% >= 65%)
 * ```
 */
export function isWithinBorrowingLimit(state: SBLOCState, config: SBLOCConfig): boolean {
  return state.currentLTV < config.maxLTV;
}

/**
 * Calculate available credit (remaining borrowing capacity)
 *
 * Available Credit = (Portfolio Value * Max LTV) - Loan Balance
 *
 * This represents how much more can be borrowed before hitting the LTV limit.
 * Returns 0 if already at or over the limit.
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration with maxLTV
 * @returns Available credit in dollars (minimum 0)
 *
 * @example
 * ```typescript
 * const state = { loanBalance: 400000, portfolioValue: 1000000, currentLTV: 0.40, ... };
 * const config = { maxLTV: 0.65, ... };
 *
 * // Max borrowing = $1M * 0.65 = $650k
 * // Available = $650k - $400k = $250k
 * calculateAvailableCredit(state, config); // 250000
 *
 * // At limit
 * const atLimit = { loanBalance: 650000, portfolioValue: 1000000, ... };
 * calculateAvailableCredit(atLimit, config); // 0
 *
 * // Over limit (margin call territory)
 * const overLimit = { loanBalance: 700000, portfolioValue: 1000000, ... };
 * calculateAvailableCredit(overLimit, config); // 0 (clamped, not negative)
 * ```
 */
export function calculateAvailableCredit(state: SBLOCState, config: SBLOCConfig): number {
  const maxBorrowing = calculateMaxBorrowing(state.portfolioValue, config.maxLTV);
  const available = maxBorrowing - state.loanBalance;

  // Cannot have negative available credit
  return Math.max(0, available);
}
