/**
 * Default Configuration Values for Financial Calculations
 *
 * Centralized default values for all calculation parameters. These values
 * represent reasonable defaults based on IRS rules, historical market data,
 * and brokerage policies. Users should adjust based on their specific situation.
 *
 * Sources are documented inline for each value.
 *
 * @module config/calculation-defaults
 */

import type {
  SellCalculationConfig,
  TaxCalculationConfig,
  SBLOCCalculationConfig,
} from './types';

// ============================================================================
// Sell Strategy Defaults
// ============================================================================

/**
 * Default Sell Strategy Configuration
 *
 * These values represent typical assumptions for taxable brokerage accounts
 * held by high-net-worth individuals using the Sell Assets strategy.
 *
 * @remarks
 * Users should adjust based on their specific situation:
 * - Actual cost basis from their brokerage statements
 * - Portfolio dividend yield based on holdings
 * - Tax bracket based on income level
 *
 * @example
 * ```typescript
 * import { DEFAULT_SELL_CONFIG } from '@/config';
 *
 * const config = {
 *   ...DEFAULT_SELL_CONFIG,
 *   costBasisRatio: 0.3,  // Override: 30% basis (more embedded gains)
 * };
 * ```
 */
export const DEFAULT_SELL_CONFIG: SellCalculationConfig = {
  /**
   * Cost basis as fraction of portfolio value.
   *
   * 40% basis = 60% embedded gains. This is typical for a portfolio
   * held 15-20 years with average market returns.
   *
   * Source: Reasonable assumption for long-held diversified portfolio
   * - S&P 500 ~10% annualized return over 20 years would result in
   *   original investment being ~15% of current value
   * - 40% is conservative (assumes some rebalancing, additions, etc.)
   */
  costBasisRatio: 0.4,

  /**
   * Annual dividend yield.
   *
   * 2% matches S&P 500 historical average dividend yield.
   * Range typically 1.5-2.5% depending on market conditions.
   *
   * Source: S&P Global historical dividend data
   * - 2023-2024 S&P 500 dividend yield: ~1.4-1.6%
   * - Historical average (1950-2024): ~3% (higher in past decades)
   * - Modern era (2000-2024): ~2%
   */
  dividendYield: 0.02,

  /**
   * Tax rate for qualified dividends.
   *
   * Uses same rate as long-term capital gains (23.8% with NIIT).
   * Assumes all dividends are qualified (held > 60 days).
   *
   * Source: IRS qualified dividend rules
   * - IRC Section 1(h)(11) - qualified dividends taxed at LTCG rates
   * - 20% base rate + 3.8% NIIT for high earners
   */
  dividendTaxRate: 0.238,

  /**
   * Long-term capital gains + NIIT for high earners.
   *
   * 20% LTCG rate + 3.8% NIIT = 23.8% total federal rate.
   * Applies to single filers > $200k, MFJ > $250k MAGI.
   *
   * Source: IRS 2025 tax brackets
   * - Long-term capital gains: 0%/15%/20% based on income
   * - Net Investment Income Tax: 3.8% (IRC Section 1411)
   * - 20% + 3.8% = 23.8% for high earners (> $583,750 MFJ)
   */
  capitalGainsRate: 0.238,
};

// ============================================================================
// Tax Configuration Defaults
// ============================================================================

/**
 * Default Tax Configuration
 *
 * Federal tax parameters for 2025. State taxes default to 0 -
 * users should add their state rate for accurate projections.
 *
 * @remarks
 * Estate tax exemption is critical for BBD strategy analysis.
 * The stepped-up basis benefit at death is a key advantage.
 *
 * @example
 * ```typescript
 * import { DEFAULT_TAX_CONFIG } from '@/config';
 *
 * const californiaConfig = {
 *   ...DEFAULT_TAX_CONFIG,
 *   stateCapitalGainsRate: 0.133,  // California top rate
 *   effectiveCapitalGainsRate: 0.238 + 0.133,  // 37.1% combined
 * };
 * ```
 */
export const DEFAULT_TAX_CONFIG: TaxCalculationConfig = {
  /**
   * Federal long-term capital gains rate including NIIT.
   *
   * 20% base LTCG rate + 3.8% NIIT for high-income investors.
   *
   * Source: IRS 2025 capital gains brackets
   * - 0%: Single < $47,025, MFJ < $94,050
   * - 15%: Single $47,025-$518,900, MFJ $94,050-$583,750
   * - 20%: Above thresholds
   * - NIIT: 3.8% additional for MAGI > $200k single / $250k MFJ
   */
  federalCapitalGainsRate: 0.238,

  /**
   * State capital gains tax rate.
   *
   * Default: 0 (assumes no state income tax)
   * Users should update based on their state.
   *
   * Common state rates:
   * - California: 13.3% (highest)
   * - New York: 8.82%
   * - New Jersey: 10.75%
   * - Texas/Florida/Nevada/Washington: 0%
   */
  stateCapitalGainsRate: 0,

  /**
   * Combined effective capital gains rate (federal + state).
   *
   * Default matches federal rate (assumes no state tax).
   * Should be federalCapitalGainsRate + stateCapitalGainsRate.
   */
  effectiveCapitalGainsRate: 0.238,

  /**
   * Dividend tax rate for qualified dividends.
   *
   * Same as LTCG rate for qualified dividends.
   *
   * Source: IRC Section 1(h)(11)
   */
  dividendTaxRate: 0.238,

  /**
   * Federal estate tax exemption (2025).
   *
   * $13.99 million per individual in 2025.
   * Critical for BBD strategy's stepped-up basis benefit.
   *
   * Source: IRS estate tax exemption (indexed annually)
   * - 2024: $13.61 million
   * - 2025: $13.99 million (projected)
   * - Note: Scheduled to sunset to ~$7M in 2026 without legislation
   * - Portability: Married couples can combine (~$28M in 2025)
   */
  estateTaxExemption: 13990000,
};

// ============================================================================
// SBLOC Calculation Defaults
// ============================================================================

/**
 * Default SBLOC Calculation Configuration
 *
 * Internal parameters for the SBLOC engine's margin management algorithms.
 * These are not user-facing inputs but control calculation behavior.
 *
 * @remarks
 * The liquidation target multiplier (0.8) is a best practice to avoid
 * margin call cascades. After forced liquidation, targeting 80% of
 * maintenance margin provides headroom for continued market volatility.
 *
 * @example
 * ```typescript
 * import { DEFAULT_SBLOC_CALC_CONFIG } from '@/config';
 *
 * // More conservative liquidation target
 * const conservativeConfig = {
 *   ...DEFAULT_SBLOC_CALC_CONFIG,
 *   liquidationTargetMultiplier: 0.7,  // Target 70% of maintenance
 * };
 * ```
 */
export const DEFAULT_SBLOC_CALC_CONFIG: SBLOCCalculationConfig = {
  /**
   * Target LTV after liquidation = maintenance * 0.8
   *
   * When margin call forces asset liquidation, the algorithm sells
   * enough to bring LTV down to 80% of maintenance margin.
   *
   * Example: If maintenance margin is 50%, target LTV = 50% * 0.8 = 40%
   *
   * Source: Best practice for margin management
   * - Provides 20% buffer below maintenance to prevent cascade
   * - Balances safety vs. preserving portfolio value
   */
  liquidationTargetMultiplier: 0.8,

  /**
   * Warning zone buffer (10% below maintenance).
   *
   * Warning zone starts when LTV exceeds (maintenance - 10%).
   * Provides early warning before margin call triggers.
   *
   * Example: If maintenance is 50%, warning starts at 40% LTV
   */
  warningZoneBuffer: 0.1,

  /**
   * Minimum portfolio value floor.
   *
   * Default 0 allows tracking to zero (depletion).
   * Can be set to small value for numerical stability if needed.
   */
  minPortfolioValue: 0,
};
