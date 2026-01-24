/**
 * Configuration Types for Financial Calculations
 *
 * Type definitions for all configurable calculation parameters used across
 * the BBD strategy simulation. These types provide strong typing and
 * documentation for values that were previously hardcoded throughout the codebase.
 *
 * @module config/types
 */

// ============================================================================
// Sell Strategy Configuration
// ============================================================================

/**
 * Configuration for Sell Assets Strategy calculations.
 *
 * Controls how the Sell strategy simulation calculates capital gains taxes,
 * dividend taxes, and cost basis tracking when liquidating portfolio assets.
 *
 * @remarks
 * All rate values are expressed as decimals (e.g., 0.238 for 23.8%).
 * Valid range for all rates: 0 to 1 (0% to 100%).
 *
 * @example
 * ```typescript
 * const config: SellCalculationConfig = {
 *   costBasisRatio: 0.4,      // 40% basis, 60% embedded gains
 *   dividendYield: 0.02,      // 2% annual dividend yield
 *   dividendTaxRate: 0.238,   // 23.8% tax on qualified dividends
 *   capitalGainsRate: 0.238,  // 23.8% long-term capital gains rate
 * };
 * ```
 */
export interface SellCalculationConfig {
  /**
   * Cost basis as a fraction of current portfolio value.
   *
   * Represents what portion of the portfolio is original investment (basis)
   * versus appreciation (gains). A ratio of 0.4 means 40% basis, 60% gains.
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0.4 (40% basis, typical for 15-20 year holding period)
   * - Source: Reasonable assumption based on historical S&P 500 returns
   * - Lower values = more embedded gains = higher tax burden on sales
   */
  costBasisRatio: number;

  /**
   * Annual dividend yield as a decimal.
   *
   * Expected annual dividend income as a percentage of portfolio value.
   * Used to calculate dividend tax liability in Sell strategy.
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0.02 (2%)
   * - Source: S&P 500 historical dividend yield averages 1.5-2%
   * - Data: S&P Global historical dividend data
   */
  dividendYield: number;

  /**
   * Tax rate applied to dividend income.
   *
   * For qualified dividends (held > 60 days), uses same rate as
   * long-term capital gains. Unqualified dividends taxed as ordinary income.
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0.238 (23.8%, same as capital gains for high earners)
   * - Source: IRS qualified dividend rules (IRC Section 1(h))
   * - Note: Simulation assumes all dividends are qualified
   */
  dividendTaxRate: number;

  /**
   * Long-term capital gains tax rate.
   *
   * Tax rate applied to gains when selling appreciated assets held > 1 year.
   * For high-income earners, includes Net Investment Income Tax (NIIT).
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0.238 (20% LTCG + 3.8% NIIT for income > $250k MFJ)
   * - Source: IRS 2025 tax brackets and NIIT thresholds
   * - Lower brackets: 0% (< $94,050 MFJ) or 15% ($94,050 - $583,750 MFJ)
   */
  capitalGainsRate: number;
}

// ============================================================================
// Tax Configuration
// ============================================================================

/**
 * Configuration for tax calculations across all strategies.
 *
 * Centralizes tax-related parameters used in both BBD and Sell strategy
 * calculations, including estate tax considerations.
 *
 * @remarks
 * All rate values are expressed as decimals (e.g., 0.238 for 23.8%).
 * Dollar values are in USD.
 *
 * @example
 * ```typescript
 * const config: TaxCalculationConfig = {
 *   federalCapitalGainsRate: 0.238,
 *   stateCapitalGainsRate: 0.133,     // California rate
 *   effectiveCapitalGainsRate: 0.371, // Combined federal + state
 *   dividendTaxRate: 0.238,
 *   estateTaxExemption: 13990000,     // 2025 federal exemption
 * };
 * ```
 */
export interface TaxCalculationConfig {
  /**
   * Federal long-term capital gains tax rate.
   *
   * Federal tax rate on gains from assets held > 1 year.
   * For high earners, includes NIIT (Net Investment Income Tax).
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0.238 (20% + 3.8% NIIT)
   * - Source: IRS 2025 tax brackets
   * - 2025 brackets: 0% (< $94,050 MFJ), 15% ($94,050-$583,750), 20% (> $583,750)
   * - NIIT: 3.8% additional tax on investment income if MAGI > $250k MFJ
   */
  federalCapitalGainsRate: number;

  /**
   * State capital gains tax rate.
   *
   * State-level tax on capital gains. Varies significantly by state.
   * Some states have no income tax (FL, TX, NV, etc.).
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0 (assumes no state tax; user should adjust)
   * - Examples: CA = 13.3%, NY = 8.82%, TX/FL/NV = 0%
   * - Source: State tax authority rate schedules
   */
  stateCapitalGainsRate: number;

  /**
   * Combined effective capital gains tax rate.
   *
   * Total tax rate combining federal and state. Can be set explicitly
   * or computed as federal + state.
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0.238 (federal only, assumes no state tax)
   * - Computation: federalCapitalGainsRate + stateCapitalGainsRate
   * - Can be overridden for special situations
   */
  effectiveCapitalGainsRate: number;

  /**
   * Tax rate for dividend income.
   *
   * Rate applied to dividend income. For qualified dividends, same as
   * long-term capital gains. For ordinary dividends, ordinary income rates.
   *
   * @remarks
   * - Range: 0 to 1
   * - Default: 0.238 (assumes qualified dividends for high earners)
   * - Source: IRS qualified dividend rules
   */
  dividendTaxRate: number;

  /**
   * Federal estate tax exemption amount.
   *
   * Amount of estate value exempt from federal estate tax.
   * Critical for BBD strategy's stepped-up basis benefit calculation.
   *
   * @remarks
   * - Unit: USD
   * - Default: 13,990,000 (2025 federal exemption)
   * - Source: IRS 2025 estate tax exemption (indexed for inflation)
   * - Note: Exemption scheduled to sunset to ~$7M in 2026 without legislation
   * - Portability: Married couples can combine for ~$28M exemption
   */
  estateTaxExemption: number;
}

// ============================================================================
// SBLOC Calculation Configuration
// ============================================================================

/**
 * Configuration for SBLOC (Securities-Backed Line of Credit) calculations.
 *
 * Controls parameters specific to the SBLOC engine's margin call and
 * liquidation logic, separate from the user-facing SBLOC config.
 *
 * @remarks
 * These are calculation parameters, not user inputs. They control internal
 * algorithm behavior for margin management.
 *
 * @example
 * ```typescript
 * const config: SBLOCCalculationConfig = {
 *   liquidationTargetMultiplier: 0.8,  // Target 80% of maintenance after liquidation
 *   warningZoneBuffer: 0.1,            // Warning starts 10% below maintenance
 *   minPortfolioValue: 0,              // No floor on portfolio calculations
 * };
 * ```
 */
export interface SBLOCCalculationConfig {
  /**
   * Multiplier for target LTV after forced liquidation.
   *
   * After a margin call triggers liquidation, the algorithm targets
   * this fraction of the maintenance margin to provide a safety buffer
   * and prevent immediate repeat margin calls.
   *
   * @remarks
   * - Range: 0 to 1 (practical range: 0.7 to 0.9)
   * - Default: 0.8 (target 80% of maintenance margin)
   * - Example: If maintenance margin is 50%, target LTV = 50% * 0.8 = 40%
   * - Source: Best practice for avoiding margin call cascade
   * - Higher values = less buffer = higher risk of repeat calls
   */
  liquidationTargetMultiplier: number;

  /**
   * Buffer percentage below maintenance margin for warning zone.
   *
   * The warning zone starts when LTV exceeds (maintenanceMargin - buffer).
   * Provides early warning before actual margin call threshold.
   *
   * @remarks
   * - Range: 0 to 1 (practical range: 0.05 to 0.15)
   * - Default: 0.1 (warning starts 10% below maintenance)
   * - Example: If maintenance is 50%, warning starts at 40% LTV
   * - Higher values = earlier warnings = more conservative alerts
   */
  warningZoneBuffer: number;

  /**
   * Minimum portfolio value floor for calculations.
   *
   * Prevents division by zero and handles edge cases in calculations.
   * Portfolio values below this are treated as depleted.
   *
   * @remarks
   * - Unit: USD
   * - Default: 0
   * - Can be set to small positive value (e.g., 1000) for numerical stability
   */
  minPortfolioValue: number;
}
