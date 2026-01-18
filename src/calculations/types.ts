/**
 * Financial Calculation Types
 *
 * Type definitions for Phase 5 financial calculations including:
 * - Core metrics (CAGR, volatility, percentiles, success rate)
 * - Margin call probability analysis
 * - Time-weighted return calculations
 * - Estate analysis for BBD strategy
 * - BBD vs Sell comparison
 * - Salary equivalent calculations
 */

// ============================================================================
// Core Metrics Types
// ============================================================================

/**
 * Percentile distribution of terminal portfolio values
 *
 * Standard percentile buckets for communicating simulation outcome ranges:
 * - p10: Pessimistic scenario (10% of outcomes worse)
 * - p25: Below average scenario
 * - p50: Median (typical) scenario
 * - p75: Above average scenario
 * - p90: Optimistic scenario (10% of outcomes better)
 */
export interface PercentileDistribution {
  /** 10th percentile - pessimistic outcome */
  p10: number;
  /** 25th percentile - below average outcome */
  p25: number;
  /** 50th percentile - median outcome */
  p50: number;
  /** 75th percentile - above average outcome */
  p75: number;
  /** 90th percentile - optimistic outcome */
  p90: number;
}

/**
 * Aggregate metrics summary from simulation results
 *
 * These are the primary metrics displayed to users evaluating their BBD strategy:
 * - CAGR: Expected compound growth rate
 * - Volatility: Risk measure (standard deviation of returns)
 * - Success Rate: Probability of positive outcome
 * - Percentiles: Distribution of terminal values
 *
 * @example
 * ```typescript
 * const summary: MetricsSummary = {
 *   cagr: 0.0718,           // 7.18% annual growth
 *   annualizedVolatility: 0.16,  // 16% volatility
 *   successRate: 94.5,      // 94.5% success rate
 *   percentiles: {
 *     p10: 850000,
 *     p25: 1200000,
 *     p50: 1800000,
 *     p75: 2600000,
 *     p90: 3500000
 *   }
 * };
 * ```
 */
export interface MetricsSummary {
  /**
   * Compound Annual Growth Rate as decimal
   *
   * Formula: CAGR = (endValue / startValue)^(1/years) - 1
   *
   * @example 0.0718 represents 7.18% annual growth
   */
  cagr: number;

  /**
   * Annualized volatility (standard deviation of returns)
   *
   * Measures dispersion of terminal values around the mean.
   * Higher volatility = wider range of outcomes.
   *
   * @example 0.16 represents 16% annualized volatility
   */
  annualizedVolatility: number;

  /**
   * Percentage of iterations ending above initial value (0-100)
   *
   * Probability that portfolio value at end of simulation
   * exceeds the starting value.
   *
   * @example 94.5 means 94.5% of simulations were "successful"
   */
  successRate: number;

  /** Distribution of terminal portfolio values across percentiles */
  percentiles: PercentileDistribution;
}

// ============================================================================
// Margin Call Analysis Types
// ============================================================================

/**
 * Per-year margin call probability analysis
 *
 * Tracks probability of margin call events year-by-year,
 * enabling users to understand when BBD strategy risk is highest.
 *
 * @example
 * ```typescript
 * const yearRisk: MarginCallProbability = {
 *   year: 5,
 *   probability: 2.3,        // 2.3% chance of margin call in year 5
 *   cumulativeProbability: 8.7  // 8.7% chance by end of year 5
 * };
 * ```
 */
export interface MarginCallProbability {
  /** Simulation year (1-based) */
  year: number;

  /**
   * Probability of margin call in this specific year (0-100)
   * Independent probability, not cumulative
   */
  probability: number;

  /**
   * Cumulative probability of margin call by end of this year (0-100)
   * P(margin call in year 1 OR year 2 OR ... OR this year)
   */
  cumulativeProbability: number;
}

// ============================================================================
// Time-Weighted Return Types
// ============================================================================

/**
 * Time-Weighted Rate of Return (TWRR) calculation result
 *
 * TWRR eliminates the impact of external cash flows (withdrawals/deposits)
 * to measure pure investment performance. Essential for BBD strategy
 * since annual withdrawals would distort simple return calculations.
 *
 * Formula: TWRR = (Product of (1 + period returns))^(1/years) - 1
 *
 * @example
 * ```typescript
 * const twrrResult: TWRRResult = {
 *   twrr: 0.0856,              // 8.56% annualized return
 *   periodReturns: [0.12, -0.05, 0.15, 0.08],  // Per-year returns
 *   cumulativeReturn: 0.324    // 32.4% total return
 * };
 * ```
 */
export interface TWRRResult {
  /**
   * Annualized time-weighted rate of return as decimal
   * Geometric mean of period returns
   */
  twrr: number;

  /**
   * Individual period returns (typically annual)
   * Each value is the return for that period as decimal
   */
  periodReturns: number[];

  /**
   * Total cumulative return over all periods
   * Formula: Product of (1 + each period return) - 1
   */
  cumulativeReturn: number;
}

// ============================================================================
// Estate Analysis Types
// ============================================================================

/**
 * BBD Estate Analysis at death/simulation end
 *
 * Calculates the estate position under BBD strategy including:
 * - Net estate value (portfolio minus outstanding loan)
 * - Embedded capital gains and step-up basis benefits
 * - Estate tax exemption context
 *
 * Key BBD insight: At death, cost basis "steps up" to market value,
 * eliminating embedded capital gains tax - the "Die" benefit.
 *
 * @example
 * ```typescript
 * const estate: EstateAnalysis = {
 *   terminalPortfolioValue: 5000000,
 *   terminalLoanBalance: 800000,
 *   netEstate: 4200000,
 *   embeddedCapitalGains: 3500000,   // $3.5M unrealized gains
 *   steppedUpBasisSavings: 833000,   // Tax avoided at 23.8%
 *   estateTaxExemption: 13990000     // 2025 exemption
 * };
 * ```
 */
export interface EstateAnalysis {
  /**
   * Final portfolio market value at death/simulation end
   */
  terminalPortfolioValue: number;

  /**
   * Outstanding SBLOC loan balance at death
   * Includes principal + all accrued interest
   */
  terminalLoanBalance: number;

  /**
   * Net estate value passed to heirs
   * Formula: terminalPortfolioValue - terminalLoanBalance
   */
  netEstate: number;

  /**
   * Unrealized capital gains embedded in portfolio
   * Formula: currentValue - costBasis
   * These gains are eliminated via stepped-up basis at death
   */
  embeddedCapitalGains: number;

  /**
   * Dollar value of taxes saved via stepped-up basis
   * Formula: embeddedCapitalGains * capitalGainsTaxRate
   * This is the "Die" advantage in BBD strategy
   */
  steppedUpBasisSavings: number;

  /**
   * Current estate tax exemption threshold
   * For context on whether estate taxes would apply
   */
  estateTaxExemption: number;
}

// ============================================================================
// BBD vs Sell Comparison Types
// ============================================================================

/**
 * BBD Strategy vs Traditional Sell comparison
 *
 * Quantifies the advantage of BBD (never selling, borrowing instead)
 * versus traditional approach of selling assets and paying taxes.
 *
 * @example
 * ```typescript
 * const comparison: BBDComparison = {
 *   bbdNetEstate: 4200000,      // Estate using BBD
 *   sellNetEstate: 3600000,     // Estate if sold and paid taxes
 *   bbdAdvantage: 600000,       // BBD saves $600k
 *   taxesPaidIfSold: 833000     // Taxes avoided via BBD
 * };
 * ```
 */
export interface BBDComparison {
  /**
   * Net estate value using BBD strategy
   * (Portfolio - Loan) with stepped-up basis benefit
   */
  bbdNetEstate: number;

  /**
   * Net estate value if assets were sold to fund spending
   * After paying capital gains taxes and potentially estate taxes
   */
  sellNetEstate: number;

  /**
   * Dollar advantage of BBD over sell strategy
   * Formula: bbdNetEstate - sellNetEstate
   * Positive value means BBD is superior
   */
  bbdAdvantage: number;

  /**
   * Total taxes that would be paid under sell strategy
   * Includes capital gains taxes triggered by selling
   * May include estate taxes if above exemption
   */
  taxesPaidIfSold: number;
}

// ============================================================================
// Salary Equivalent Types
// ============================================================================

/**
 * Tax-free withdrawal equivalent to pre-tax salary
 *
 * BBD withdrawals (SBLOC draws) are not taxable income since
 * they're loans, not sales. This calculates the equivalent
 * pre-tax salary needed to match the withdrawal spending power.
 *
 * @example
 * ```typescript
 * const equivalent: SalaryEquivalent = {
 *   annualWithdrawal: 100000,      // $100k SBLOC draw
 *   salaryEquivalent: 158730,      // Need $158k salary for same after-tax
 *   effectiveTaxRate: 0.37,        // At 37% tax bracket
 *   taxSavings: 58730              // Annual tax savings
 * };
 * ```
 */
export interface SalaryEquivalent {
  /**
   * Annual SBLOC draw amount (tax-free)
   * This is the actual spending money received
   */
  annualWithdrawal: number;

  /**
   * Pre-tax salary required for equivalent after-tax income
   * Formula: annualWithdrawal / (1 - effectiveTaxRate)
   */
  salaryEquivalent: number;

  /**
   * Effective tax rate used for comparison
   * Combines federal + state income taxes
   */
  effectiveTaxRate: number;

  /**
   * Annual tax savings from BBD vs taxable income
   * Formula: salaryEquivalent - annualWithdrawal
   */
  taxSavings: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configurable parameters for financial calculations
 *
 * These tax rates and thresholds vary by jurisdiction and change over time.
 * Defaults are US federal rates as of 2025.
 *
 * @example
 * ```typescript
 * const config: CalculationConfig = {
 *   capitalGainsTaxRate: 0.238,      // 20% + 3.8% NIIT
 *   estateTaxExemption: 13990000,    // 2025 exemption
 *   effectiveIncomeTaxRate: 0.37     // Top federal bracket
 * };
 * ```
 */
export interface CalculationConfig {
  /**
   * Federal long-term capital gains tax rate as decimal
   *
   * For high-income individuals: 20% + 3.8% Net Investment Income Tax
   * Default: 0.238 (23.8%)
   */
  capitalGainsTaxRate: number;

  /**
   * Federal estate tax exemption threshold
   *
   * Estates below this value pay no federal estate tax.
   * Default: $13,990,000 (2025 indexed amount)
   */
  estateTaxExemption: number;

  /**
   * Effective income tax rate for salary equivalent calculation
   *
   * Combined federal + state rate for high earners.
   * Default: 0.37 (37% top federal bracket)
   */
  effectiveIncomeTaxRate: number;
}

// ============================================================================
// Default Constants
// ============================================================================

/**
 * Default calculation configuration with 2025 US federal rates
 *
 * These defaults assume high-net-worth individual subject to:
 * - Maximum long-term capital gains rate (20% + 3.8% NIIT)
 * - 2025 estate tax exemption (indexed for inflation)
 * - Top marginal income tax bracket (37%)
 */
export const DEFAULT_CALCULATION_CONFIG: CalculationConfig = {
  capitalGainsTaxRate: 0.238,        // 20% + 3.8% NIIT
  estateTaxExemption: 13990000,      // 2025 exemption
  effectiveIncomeTaxRate: 0.37,      // Top federal bracket
};
