/**
 * Estate Calculations for BBD Strategy
 *
 * Calculates the tax advantages of the Buy-Borrow-Die strategy:
 * - Embedded capital gains (unrealized appreciation)
 * - Stepped-up basis savings (tax avoided at death)
 * - BBD vs Sell comparison
 *
 * Key Tax Concept - Stepped-Up Basis:
 * When a person dies, their assets receive a "stepped-up basis" equal to the
 * fair market value at death. This eliminates all embedded capital gains, so
 * heirs can sell immediately with zero capital gains tax. This is the core
 * tax advantage of the "Die" in Buy-Borrow-Die.
 *
 * Example:
 * - Original purchase (cost basis): $1,000,000
 * - Value at death: $5,000,000
 * - Embedded capital gains: $4,000,000
 * - If sold before death: $4M taxed at 23.8% = $952,000 tax
 * - If held until death: $0 tax (basis steps up to $5M)
 *
 * References:
 * - IRC Section 1014 (Basis of property acquired from a decedent)
 * - IRC Section 1001 (Determination of gain or loss)
 */

import type {
  EstateAnalysis,
  BBDComparison,
  CalculationConfig,
} from './types';
import { DEFAULT_CALCULATION_CONFIG } from './types';

// ============================================================================
// Parameter Types
// ============================================================================

/**
 * Parameters for estate analysis calculation
 */
export interface EstateAnalysisParams {
  /** Portfolio value at end of simulation */
  terminalPortfolioValue: number;
  /** Outstanding loan balance at end of simulation */
  terminalLoanBalance: number;
  /** Original investment amount (cost basis for capital gains) */
  costBasis: number;
  /** Calculation configuration (tax rates, exemptions) */
  config?: CalculationConfig;
}

/**
 * Parameters for BBD comparison calculation
 */
export interface BBDComparisonParams {
  /** Portfolio value at end of simulation */
  terminalPortfolioValue: number;
  /** Outstanding loan balance at end of simulation */
  terminalLoanBalance: number;
  /** Original investment amount (cost basis for capital gains) */
  costBasis: number;
  /** Calculation configuration (tax rates, exemptions) */
  config?: CalculationConfig;
}

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculate embedded capital gains (unrealized appreciation)
 *
 * This represents the profit that would be subject to capital gains tax
 * if the assets were sold.
 *
 * Formula: embeddedGains = currentValue - costBasis
 *
 * @param currentValue - Current market value of assets
 * @param costBasis - Original purchase price (tax basis)
 * @returns Embedded capital gains (unrealized appreciation), minimum 0
 *
 * @example
 * ```typescript
 * // Portfolio worth $5M, originally cost $1M
 * const gains = calculateEmbeddedCapitalGains(5000000, 1000000);
 * // Returns: 4000000 (has $4M in unrealized gains)
 *
 * // Loss scenario: portfolio declined
 * const loss = calculateEmbeddedCapitalGains(800000, 1000000);
 * // Returns: 0 (no gains, but function doesn't return negative)
 * ```
 */
export function calculateEmbeddedCapitalGains(
  currentValue: number,
  costBasis: number
): number {
  const gains = currentValue - costBasis;
  // Return 0 for loss scenarios (negative gains)
  return Math.max(0, gains);
}

/**
 * Calculate stepped-up basis tax savings
 *
 * At death, assets receive a stepped-up basis to fair market value.
 * This eliminates embedded capital gains, saving the heirs from paying
 * capital gains tax on all the appreciation during the decedent's lifetime.
 *
 * Formula: savings = embeddedGains * capitalGainsTaxRate
 *
 * @param embeddedGains - Unrealized capital gains in the portfolio
 * @param capitalGainsTaxRate - Applicable capital gains tax rate (e.g., 0.238)
 * @returns Dollar amount of taxes avoided through stepped-up basis
 *
 * @example
 * ```typescript
 * // $4M in gains at 23.8% tax rate
 * const savings = calculateSteppedUpBasisSavings(4000000, 0.238);
 * // Returns: 952000 (heirs avoid $952k in taxes)
 * ```
 */
export function calculateSteppedUpBasisSavings(
  embeddedGains: number,
  capitalGainsTaxRate: number
): number {
  return embeddedGains * capitalGainsTaxRate;
}

/**
 * Calculate tax if entire portfolio were sold
 *
 * Computes the capital gains tax that would be owed if the portfolio
 * were liquidated at current market value.
 *
 * Formula: tax = max(0, portfolioValue - costBasis) * capitalGainsTaxRate
 *
 * @param portfolioValue - Current market value of portfolio
 * @param costBasis - Original purchase price (tax basis)
 * @param config - Calculation configuration with tax rate
 * @returns Capital gains tax that would be owed on sale
 *
 * @example
 * ```typescript
 * // Sell $5M portfolio with $1M cost basis
 * const tax = calculateTaxIfSold(5000000, 1000000, DEFAULT_CALCULATION_CONFIG);
 * // Returns: 952000 (23.8% of $4M gain)
 *
 * // Loss scenario - no tax owed
 * const noTax = calculateTaxIfSold(800000, 1000000, DEFAULT_CALCULATION_CONFIG);
 * // Returns: 0 (can't have negative tax)
 * ```
 */
export function calculateTaxIfSold(
  portfolioValue: number,
  costBasis: number,
  config: CalculationConfig = DEFAULT_CALCULATION_CONFIG
): number {
  const gain = Math.max(0, portfolioValue - costBasis);
  return gain * config.capitalGainsTaxRate;
}

// ============================================================================
// Composite Analysis Functions
// ============================================================================

/**
 * Calculate complete estate analysis
 *
 * Provides a comprehensive view of the estate position at end of BBD strategy:
 * - Net estate value (portfolio minus loan)
 * - Embedded capital gains
 * - Tax savings from stepped-up basis
 * - Estate tax exemption threshold for context
 *
 * @param params - Estate analysis parameters
 * @returns Complete EstateAnalysis object
 *
 * @example
 * ```typescript
 * const analysis = calculateEstateAnalysis({
 *   terminalPortfolioValue: 5000000,
 *   terminalLoanBalance: 800000,
 *   costBasis: 1000000,
 *   config: DEFAULT_CALCULATION_CONFIG
 * });
 *
 * // Returns:
 * // {
 * //   terminalPortfolioValue: 5000000,
 * //   terminalLoanBalance: 800000,
 * //   netEstate: 4200000,          // $5M - $800k loan
 * //   embeddedCapitalGains: 4000000, // $5M - $1M basis
 * //   steppedUpBasisSavings: 952000, // $4M * 23.8%
 * //   estateTaxExemption: 13990000
 * // }
 * ```
 */
export function calculateEstateAnalysis(
  params: EstateAnalysisParams
): EstateAnalysis {
  const {
    terminalPortfolioValue,
    terminalLoanBalance,
    costBasis,
    config = DEFAULT_CALCULATION_CONFIG,
  } = params;

  // Calculate net estate (what heirs actually receive after loan payoff)
  const netEstate = terminalPortfolioValue - terminalLoanBalance;

  // Calculate embedded gains (appreciation since purchase)
  const embeddedCapitalGains = calculateEmbeddedCapitalGains(
    terminalPortfolioValue,
    costBasis
  );

  // Calculate tax savings from stepped-up basis
  const steppedUpBasisSavings = calculateSteppedUpBasisSavings(
    embeddedCapitalGains,
    config.capitalGainsTaxRate
  );

  return {
    terminalPortfolioValue,
    terminalLoanBalance,
    netEstate,
    embeddedCapitalGains,
    steppedUpBasisSavings,
    estateTaxExemption: config.estateTaxExemption,
  };
}

/**
 * Calculate BBD vs Sell strategy comparison
 *
 * Compares the final estate value under two strategies:
 *
 * 1. BBD Strategy (Buy-Borrow-Die):
 *    - Never sell assets
 *    - Borrow against portfolio for spending (SBLOC)
 *    - At death: heirs inherit portfolio with stepped-up basis
 *    - Heirs pay off loan from portfolio value
 *    - Net estate = Portfolio - Loan
 *
 * 2. Sell Strategy (Traditional):
 *    - Sell assets as needed for spending
 *    - Pay capital gains tax on each sale
 *    - No loan to repay
 *    - Net estate = Portfolio - Taxes Paid
 *
 * The comparison shows the "BBD advantage" - how much more wealth
 * is preserved by avoiding capital gains taxes through borrowing.
 *
 * Note: This is a simplified comparison. In reality:
 * - BBD pays interest on loans (reducing portfolio value over time)
 * - Sell strategy pays taxes earlier (money has less time to grow)
 * - The optimal strategy depends on interest rates, returns, and time horizon
 *
 * @param params - BBD comparison parameters
 * @returns BBDComparison showing advantage of BBD strategy
 *
 * @example
 * ```typescript
 * const comparison = calculateBBDComparison({
 *   terminalPortfolioValue: 5000000,
 *   terminalLoanBalance: 800000,
 *   costBasis: 1000000,
 *   config: DEFAULT_CALCULATION_CONFIG
 * });
 *
 * // Returns:
 * // {
 * //   bbdNetEstate: 4200000,       // $5M - $800k loan
 * //   sellNetEstate: 4048000,      // $5M - $952k taxes
 * //   bbdAdvantage: 152000,        // BBD beats sell by $152k
 * //   taxesPaidIfSold: 952000      // Would have paid $952k in taxes
 * // }
 * ```
 */
export function calculateBBDComparison(
  params: BBDComparisonParams
): BBDComparison {
  const {
    terminalPortfolioValue,
    terminalLoanBalance,
    costBasis,
    config = DEFAULT_CALCULATION_CONFIG,
  } = params;

  // BBD Strategy: Portfolio minus loan balance
  // Heirs inherit portfolio, pay off loan, keep the rest
  const bbdNetEstate = terminalPortfolioValue - terminalLoanBalance;

  // Calculate taxes that would have been paid if selling
  const taxesPaidIfSold = calculateTaxIfSold(
    terminalPortfolioValue,
    costBasis,
    config
  );

  // Sell Strategy: Portfolio minus taxes paid
  // No loan, but had to pay capital gains taxes
  const sellNetEstate = terminalPortfolioValue - taxesPaidIfSold;

  // BBD advantage = difference in net estate
  // Positive = BBD is better, Negative = selling is better
  const bbdAdvantage = bbdNetEstate - sellNetEstate;

  return {
    bbdNetEstate,
    sellNetEstate,
    bbdAdvantage,
    taxesPaidIfSold,
  };
}
