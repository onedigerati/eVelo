/**
 * Sell Strategy Calculations
 *
 * Calculates Sell Assets strategy outcomes for comparison against BBD strategy.
 * The Sell strategy involves liquidating portfolio assets annually to fund withdrawals,
 * paying capital gains taxes on the appreciated portion of each sale.
 *
 * @module calculations/sell-strategy
 */

import type { YearlyPercentiles } from '../simulation/types';
import { percentile as calcPercentile } from '../math';

// ============================================================================
// Types
// ============================================================================

/**
 * Sell strategy simulation result for comparison with BBD
 */
export interface SellStrategyResult {
  /** Terminal net worth at median (P50) outcome */
  terminalNetWorth: number;
  /** Success rate - percentage of scenarios not depleted (0-100) */
  successRate: number;
  /** Cumulative lifetime capital gains taxes paid */
  lifetimeTaxes: number;
  /** Cumulative lifetime dividend taxes paid (Sell strategy only) */
  lifetimeDividendTaxes: number;
  /** Total lifetime taxes (capital gains + dividends) */
  totalLifetimeTaxes: number;
  /** Primary risk description with percentage */
  primaryRisk: string;
  /** Terminal wealth at P10 (pessimistic) scenario */
  terminalP10: number;
  /** Terminal wealth at P90 (optimistic) scenario */
  terminalP90: number;
  /** Per-year portfolio values (median path) */
  yearlyValues: number[];
  /** Depletion probability (inverse of success rate) */
  depletionProbability: number;
}

/**
 * Configuration for sell strategy calculation
 */
export interface SellStrategyConfig {
  /** Initial portfolio value */
  initialValue: number;
  /** Annual withdrawal amount */
  annualWithdrawal: number;
  /** Annual withdrawal growth rate (e.g., 0.03 for 3%) */
  withdrawalGrowth: number;
  /** Time horizon in years */
  timeHorizon: number;
  /** Capital gains tax rate (default: 0.238 for 23.8%) */
  capitalGainsRate?: number;
  /** Initial cost basis as fraction of portfolio (default: 0.4 for 40%) */
  costBasisRatio?: number;

  // Dividend tax configuration
  /**
   * Annual dividend yield as decimal (default: 0.02 for 2%)
   * S&P 500 historical average is ~1.5-2%
   */
  dividendYield?: number;
  /**
   * Dividend tax rate as decimal (default: 0.238 for 23.8%)
   * Uses capital gains rate for qualified dividends
   * Note: For simplicity, treating all dividends as qualified
   */
  dividendTaxRate?: number;
}

// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Calculate Sell Assets strategy outcomes from BBD simulation data.
 *
 * Uses the yearly percentiles from BBD simulation to project what would happen
 * if the investor sold assets each year instead of borrowing.
 *
 * Key differences from BBD:
 * - No loan, no interest accrual
 * - Capital gains taxes paid on each sale
 * - Dividend taxes paid from portfolio (BBD borrows to pay dividends)
 * - Portfolio depletes faster due to combined tax drag
 * - No stepped-up basis benefit at death
 *
 * Order of operations per year (matches reference):
 * 1. Dividend income generates tax liability, paid from portfolio
 * 2. Withdrawal + capital gains tax reduces portfolio
 * 3. Market returns applied to reduced portfolio
 *
 * @param config - Sell strategy configuration including dividend tax params
 * @param yearlyPercentiles - Portfolio percentiles from BBD simulation (for growth rates)
 * @returns Sell strategy result with all metrics including dividend taxes
 *
 * @example
 * ```typescript
 * const result = calculateSellStrategy({
 *   initialValue: 5000000,
 *   annualWithdrawal: 200000,
 *   withdrawalGrowth: 0.03,
 *   timeHorizon: 30,
 * }, yearlyPercentiles);
 *
 * console.log(`Sell Terminal: $${result.terminalNetWorth.toLocaleString()}`);
 * console.log(`Success Rate: ${result.successRate}%`);
 * console.log(`Lifetime Taxes: $${result.lifetimeTaxes.toLocaleString()}`);
 * ```
 */
export function calculateSellStrategy(
  config: SellStrategyConfig,
  yearlyPercentiles: YearlyPercentiles[],
): SellStrategyResult {
  // Validate percentile data completeness
  if (yearlyPercentiles.length < config.timeHorizon) {
    console.warn(
      `Sell strategy: yearlyPercentiles length (${yearlyPercentiles.length}) ` +
      `is less than timeHorizon (${config.timeHorizon}). Results may be incomplete.`
    );
  }

  const {
    initialValue,
    annualWithdrawal,
    withdrawalGrowth,
    timeHorizon,
    capitalGainsRate = 0.238,
    costBasisRatio = 0.4,  // Assume 40% cost basis (60% embedded gain)
  } = config;

  // Extract dividend config with defaults
  const dividendYield = config.dividendYield ?? 0.02;  // 2% default
  const dividendTaxRate = config.dividendTaxRate ?? capitalGainsRate;  // Use cap gains rate

  // Extract growth rates from yearly percentiles (using median path)
  const growthRates = extractGrowthRates(yearlyPercentiles);

  // Run Monte Carlo-style simulation for sell strategy
  // Using the percentile distribution to create multiple scenarios
  const scenarios = runSellScenarios(
    initialValue,
    annualWithdrawal,
    withdrawalGrowth,
    timeHorizon,
    capitalGainsRate,
    costBasisRatio,
    yearlyPercentiles,
    dividendYield,
    dividendTaxRate,
  );

  // Calculate success rate (scenarios not depleted)
  const successCount = scenarios.filter(s => !s.depleted).length;
  const successRate = (successCount / scenarios.length) * 100;
  const depletionProbability = 100 - successRate;

  // Extract terminal values
  const terminalValues = scenarios.map(s => s.terminalValue);

  // Calculate percentiles of terminal values
  const terminalP10 = calcPercentile(terminalValues, 10);
  const terminalP50 = calcPercentile(terminalValues, 50);
  const terminalP90 = calcPercentile(terminalValues, 90);

  // Calculate median lifetime taxes
  const lifetimeTaxesArray = scenarios.map(s => s.totalTaxes);
  const lifetimeTaxes = calcPercentile(lifetimeTaxesArray, 50);

  // Calculate median dividend taxes
  const dividendTaxesArray = scenarios.map(s => s.totalDividendTaxes);
  const lifetimeDividendTaxes = calcPercentile(dividendTaxesArray, 50);

  // Determine primary risk
  const primaryRisk = depletionProbability > 0
    ? `Portfolio Depletion (${depletionProbability.toFixed(1)}%)`
    : 'Low (0% depletion)';

  // Get median yearly values for trajectory visualization
  const yearlyValues = extractMedianPath(scenarios);

  return {
    terminalNetWorth: terminalP50,
    successRate,
    lifetimeTaxes,
    lifetimeDividendTaxes,
    totalLifetimeTaxes: lifetimeTaxes + lifetimeDividendTaxes,
    primaryRisk,
    terminalP10,
    terminalP90,
    yearlyValues,
    depletionProbability,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Scenario result from sell simulation
 */
interface SellScenario {
  terminalValue: number;
  totalTaxes: number;
  totalDividendTaxes: number;
  depleted: boolean;
  yearlyValues: number[];
}

/**
 * Run multiple sell scenarios using percentile bands
 */
function runSellScenarios(
  initialValue: number,
  annualWithdrawal: number,
  withdrawalGrowth: number,
  timeHorizon: number,
  capitalGainsRate: number,
  costBasisRatio: number,
  yearlyPercentiles: YearlyPercentiles[],
  dividendYield: number,
  dividendTaxRate: number,
): SellScenario[] {
  const scenarios: SellScenario[] = [];

  // Create scenarios for different percentile paths
  const percentileKeys = ['p10', 'p25', 'p50', 'p75', 'p90'] as const;

  for (const percentileKey of percentileKeys) {
    const scenario = runSingleSellScenario(
      initialValue,
      annualWithdrawal,
      withdrawalGrowth,
      timeHorizon,
      capitalGainsRate,
      costBasisRatio,
      yearlyPercentiles,
      percentileKey,
      dividendYield,
      dividendTaxRate,
    );
    scenarios.push(scenario);
  }

  // Also run interpolated scenarios for smoother distribution
  // P5, P15, P35, P65, P85, P95 approximations
  const interpolatedScenarios = runInterpolatedScenarios(
    initialValue,
    annualWithdrawal,
    withdrawalGrowth,
    timeHorizon,
    capitalGainsRate,
    costBasisRatio,
    yearlyPercentiles,
    dividendYield,
    dividendTaxRate,
  );
  scenarios.push(...interpolatedScenarios);

  return scenarios;
}

/**
 * Run a single sell scenario using a specific percentile path
 *
 * Order of operations (matches reference implementation):
 * 1. Withdrawal + capital gains tax reduces portfolio
 * 2. Market returns applied to reduced portfolio
 * This order is less favorable to Sell strategy than applying returns first.
 */
function runSingleSellScenario(
  initialValue: number,
  annualWithdrawal: number,
  withdrawalGrowth: number,
  timeHorizon: number,
  capitalGainsRate: number,
  costBasisRatio: number,
  yearlyPercentiles: YearlyPercentiles[],
  percentileKey: 'p10' | 'p25' | 'p50' | 'p75' | 'p90',
  dividendYield: number,
  dividendTaxRate: number,
): SellScenario {
  let portfolioValue = initialValue;
  let costBasis = initialValue * costBasisRatio;
  let currentWithdrawal = annualWithdrawal;
  let totalTaxes = 0;
  let totalDividendTaxes = 0;
  let depleted = false;
  const yearlyValues: number[] = [initialValue];

  for (let year = 1; year <= timeHorizon; year++) {
    if (portfolioValue <= 0) {
      depleted = true;
      yearlyValues.push(0);
      continue;
    }

    // 1. DIVIDEND TAX FIRST (before withdrawal)
    // Dividend taxes reduce portfolio (in Sell strategy, unlike BBD which borrows to pay)
    if (dividendYield > 0) {
      const dividendIncome = portfolioValue * dividendYield;
      const dividendTax = dividendIncome * dividendTaxRate;
      totalDividendTaxes += dividendTax;
      portfolioValue -= dividendTax;

      if (portfolioValue <= 0) {
        depleted = true;
        yearlyValues.push(0);
        continue;
      }
    }

    // 2. WITHDRAWAL + CAPITAL GAINS TAX
    // Calculate withdrawal with inflation adjustment
    const adjustedWithdrawal = currentWithdrawal;
    currentWithdrawal *= (1 + withdrawalGrowth);

    if (adjustedWithdrawal >= portfolioValue) {
      // Full depletion
      totalTaxes += calculateCapitalGainsTax(
        portfolioValue,
        portfolioValue * (costBasis / portfolioValue),
        capitalGainsRate
      );
      portfolioValue = 0;
      depleted = true;
      yearlyValues.push(0);
      continue;
    }

    // Calculate taxes on sale
    const saleAmount = adjustedWithdrawal;
    const basisSold = costBasis * (saleAmount / portfolioValue);
    const gain = saleAmount - basisSold;
    const tax = gain > 0 ? gain * capitalGainsRate : 0;
    totalTaxes += tax;

    // ============================================================================
    // Gross-Up Tax Calculation
    // ============================================================================
    //
    // When withdrawing from a taxable portfolio, you must sell MORE than the
    // desired withdrawal amount to cover taxes on gains.
    //
    // FORMULA: grossSale = withdrawal + capitalGainsTax
    //
    // Where:
    //   capitalGainsTax = (saleAmount - basisSold) * taxRate
    //   basisSold = costBasis * (saleAmount / portfolioValue)
    //   gain = saleAmount - basisSold
    //
    // The gross-up accounts for:
    // 1. The amount you actually want to receive (withdrawal)
    // 2. The taxes due on the gains portion of what you sell
    //
    // EXAMPLE:
    // - Portfolio: $1,000,000 (60% gain, 40% basis)
    // - Withdrawal needed: $100,000
    // - Sell $100,000 worth of assets
    // - Basis portion: $100,000 * 0.4 = $40,000
    // - Gain portion: $100,000 - $40,000 = $60,000
    // - Tax on gain: $60,000 * 0.238 = $14,280
    // - Gross sale needed: $100,000 + $14,280 = $114,280
    //
    // The portfolio is reduced by the GROSS amount ($114,280), not just
    // the withdrawal amount, because you must liquidate extra to pay taxes.
    // ============================================================================

    // Net withdrawal needs (gross up for taxes)
    const grossSale = saleAmount + tax;  // = withdrawal + capitalGainsTax

    if (grossSale >= portfolioValue) {
      // Depleted after accounting for taxes
      portfolioValue = 0;
      depleted = true;
      yearlyValues.push(0);
      continue;
    }

    // Update portfolio and cost basis
    const saleFraction = grossSale / portfolioValue;
    portfolioValue -= grossSale;
    costBasis *= (1 - saleFraction);

    // 3. GROWTH APPLIED TO REDUCED PORTFOLIO
    // Get growth rate from BBD simulation for this year
    const yearData = yearlyPercentiles[year];
    const prevYearData = yearlyPercentiles[year - 1];

    if (!yearData || !prevYearData) {
      // Fallback: use average historical growth
      console.warn(
        `Sell strategy: Missing percentile data for year ${year}. ` +
        `Using fallback 7% growth rate.`
      );
      const growthRate = 0.07;
      portfolioValue *= (1 + growthRate);
    } else {
      // Calculate growth rate from percentile data
      const prevValue = prevYearData[percentileKey];
      const currValue = yearData[percentileKey];
      const growthRate = prevValue > 0 ? (currValue - prevValue) / prevValue : 0;

      // Apply growth to portfolio
      portfolioValue *= (1 + growthRate);
    }

    yearlyValues.push(portfolioValue);
  }

  return {
    terminalValue: portfolioValue,
    totalTaxes,
    totalDividendTaxes,
    depleted,
    yearlyValues,
  };
}

/**
 * Run interpolated scenarios for smoother distribution
 */
function runInterpolatedScenarios(
  initialValue: number,
  annualWithdrawal: number,
  withdrawalGrowth: number,
  timeHorizon: number,
  capitalGainsRate: number,
  costBasisRatio: number,
  yearlyPercentiles: YearlyPercentiles[],
  dividendYield: number,
  dividendTaxRate: number,
): SellScenario[] {
  const scenarios: SellScenario[] = [];

  // Create interpolated paths between percentiles
  const interpolations = [
    { lower: 'p10' as const, upper: 'p25' as const, weight: 0.5 },  // ~P17
    { lower: 'p25' as const, upper: 'p50' as const, weight: 0.5 },  // ~P37
    { lower: 'p50' as const, upper: 'p75' as const, weight: 0.5 },  // ~P62
    { lower: 'p75' as const, upper: 'p90' as const, weight: 0.5 },  // ~P82
  ];

  for (const interp of interpolations) {
    const scenario = runInterpolatedScenario(
      initialValue,
      annualWithdrawal,
      withdrawalGrowth,
      timeHorizon,
      capitalGainsRate,
      costBasisRatio,
      yearlyPercentiles,
      interp.lower,
      interp.upper,
      interp.weight,
      dividendYield,
      dividendTaxRate,
    );
    scenarios.push(scenario);
  }

  return scenarios;
}

/**
 * Run scenario interpolating between two percentile paths
 */
function runInterpolatedScenario(
  initialValue: number,
  annualWithdrawal: number,
  withdrawalGrowth: number,
  timeHorizon: number,
  capitalGainsRate: number,
  costBasisRatio: number,
  yearlyPercentiles: YearlyPercentiles[],
  lowerKey: 'p10' | 'p25' | 'p50' | 'p75' | 'p90',
  upperKey: 'p10' | 'p25' | 'p50' | 'p75' | 'p90',
  weight: number,
  dividendYield: number,
  dividendTaxRate: number,
): SellScenario {
  let portfolioValue = initialValue;
  let costBasis = initialValue * costBasisRatio;
  let currentWithdrawal = annualWithdrawal;
  let totalTaxes = 0;
  let totalDividendTaxes = 0;
  let depleted = false;
  const yearlyValues: number[] = [initialValue];

  for (let year = 1; year <= timeHorizon; year++) {
    if (portfolioValue <= 0) {
      depleted = true;
      yearlyValues.push(0);
      continue;
    }

    // 1. DIVIDEND TAX FIRST (before withdrawal)
    if (dividendYield > 0) {
      const dividendIncome = portfolioValue * dividendYield;
      const dividendTax = dividendIncome * dividendTaxRate;
      totalDividendTaxes += dividendTax;
      portfolioValue -= dividendTax;

      if (portfolioValue <= 0) {
        depleted = true;
        yearlyValues.push(0);
        continue;
      }
    }

    // 2. WITHDRAWAL + CAPITAL GAINS TAX
    const adjustedWithdrawal = currentWithdrawal;
    currentWithdrawal *= (1 + withdrawalGrowth);

    if (adjustedWithdrawal >= portfolioValue) {
      totalTaxes += calculateCapitalGainsTax(
        portfolioValue,
        portfolioValue * (costBasis / portfolioValue),
        capitalGainsRate
      );
      portfolioValue = 0;
      depleted = true;
      yearlyValues.push(0);
      continue;
    }

    const saleAmount = adjustedWithdrawal;
    const basisSold = costBasis * (saleAmount / portfolioValue);
    const gain = saleAmount - basisSold;
    const tax = gain > 0 ? gain * capitalGainsRate : 0;
    totalTaxes += tax;

    // Gross-up calculation: withdrawal + tax (see detailed comment in runSingleSellScenario)
    const grossSale = saleAmount + tax;

    if (grossSale >= portfolioValue) {
      portfolioValue = 0;
      depleted = true;
      yearlyValues.push(0);
      continue;
    }

    const saleFraction = grossSale / portfolioValue;
    portfolioValue -= grossSale;
    costBasis *= (1 - saleFraction);

    // 3. GROWTH APPLIED TO REDUCED PORTFOLIO
    const yearData = yearlyPercentiles[year];
    const prevYearData = yearlyPercentiles[year - 1];

    if (!yearData || !prevYearData) {
      console.warn(
        `Sell strategy (interpolated): Missing percentile data for year ${year}. ` +
        `Using fallback 7% growth rate.`
      );
      const growthRate = 0.07;
      portfolioValue *= (1 + growthRate);
    } else {
      // Interpolate between two percentile paths
      const lowerPrev = prevYearData[lowerKey];
      const lowerCurr = yearData[lowerKey];
      const upperPrev = prevYearData[upperKey];
      const upperCurr = yearData[upperKey];

      const prevValue = lowerPrev + (upperPrev - lowerPrev) * weight;
      const currValue = lowerCurr + (upperCurr - lowerCurr) * weight;
      const growthRate = prevValue > 0 ? (currValue - prevValue) / prevValue : 0;

      portfolioValue *= (1 + growthRate);
    }

    yearlyValues.push(portfolioValue);
  }

  return {
    terminalValue: portfolioValue,
    totalTaxes,
    totalDividendTaxes,
    depleted,
    yearlyValues,
  };
}

/**
 * Calculate capital gains tax on a sale
 */
function calculateCapitalGainsTax(
  saleAmount: number,
  costBasis: number,
  taxRate: number,
): number {
  const gain = saleAmount - costBasis;
  return gain > 0 ? gain * taxRate : 0;
}

// ============================================================================
// Return Derivation
// ============================================================================
//
// The Sell strategy derives market returns from BBD simulation percentiles.
// This ensures both strategies experience identical market conditions for
// comparison purposes.
//
// Approach:
// - For each percentile path (P10, P25, P50, P75, P90), extract year-over-year
//   growth rates from the BBD portfolio values
// - Apply these same growth rates to the Sell portfolio (after accounting for
//   dividend taxes, withdrawals, and capital gains taxes)
//
// This creates a fair comparison where BBD advantage comes purely from:
// 1. Tax deferral (no capital gains on withdrawals)
// 2. Compound growth on full portfolio (no reduction from taxes)
// 3. Stepped-up basis at death
//
// And NOT from different market return assumptions.
// ============================================================================

/**
 * Extract year-over-year growth rates from BBD simulation percentile data.
 *
 * This function calculates the annual growth rate for each percentile path
 * by comparing consecutive years in the BBD simulation results. These growth
 * rates are then applied to the Sell strategy portfolio, ensuring both
 * strategies experience identical market return sequences.
 *
 * Formula: growth_rate = (value_year_N - value_year_N-1) / value_year_N-1
 *
 * Note: The function extracts from median (P50) path but individual scenario
 * functions apply growth rates from their respective percentile paths (P10,
 * P25, P50, P75, P90) to ensure consistent comparison at each percentile level.
 *
 * @param yearlyPercentiles - Array of percentile values by year from BBD simulation
 * @returns Array of annual growth rates (one per year transition)
 *
 * @example
 * ```typescript
 * // If BBD P50 goes from $5M (year 1) to $5.35M (year 2)
 * // Growth rate = (5.35M - 5M) / 5M = 0.07 (7%)
 * const rates = extractGrowthRates(yearlyPercentiles);
 * // rates[0] = 0.07 for year 1->2 transition
 * ```
 */
function extractGrowthRates(yearlyPercentiles: YearlyPercentiles[]): number[] {
  const rates: number[] = [];

  for (let i = 1; i < yearlyPercentiles.length; i++) {
    const prev = yearlyPercentiles[i - 1].p50;
    const curr = yearlyPercentiles[i].p50;
    const rate = prev > 0 ? (curr - prev) / prev : 0;
    rates.push(rate);
  }

  return rates;
}

/**
 * Extract median path from scenarios
 */
function extractMedianPath(scenarios: SellScenario[]): number[] {
  if (scenarios.length === 0) return [];

  const maxLength = Math.max(...scenarios.map(s => s.yearlyValues.length));
  const medianPath: number[] = [];

  for (let i = 0; i < maxLength; i++) {
    const values = scenarios
      .map(s => s.yearlyValues[i])
      .filter(v => v !== undefined);
    medianPath.push(calcPercentile(values, 50));
  }

  return medianPath;
}
