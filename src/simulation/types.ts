/**
 * Simulation Types
 *
 * Comprehensive type definitions for Monte Carlo simulation with Web Workers.
 * Supports simple bootstrap, block bootstrap, and regime-switching return generation.
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * SBLOC configuration for Monte Carlo simulation
 */
export interface SBLOCSimConfig {
  /** Target LTV ratio for borrowing / max borrowing (e.g., 0.65 for 65%) */
  targetLTV: number;
  /** Interest rate (e.g., 0.07 for 7%) */
  interestRate: number;
  /** Annual withdrawal amount in dollars */
  annualWithdrawal: number;
  /**
   * Annual percentage raise for withdrawals (e.g., 0.03 for 3%)
   *
   * This is equivalent to SBLOCConfig.withdrawalGrowthRate and is used
   * in Monte Carlo simulation. The withdrawal is computed externally:
   * effectiveWithdrawal = annualWithdrawal * (1 + annualWithdrawalRaise)^years
   *
   * Typical values:
   * - 0.00: Fixed withdrawals (no inflation adjustment)
   * - 0.02-0.03: Matches historical inflation (2-3%)
   * - 0.05+: Aggressive lifestyle inflation
   */
  annualWithdrawalRaise: number;
  /** Whether to withdraw monthly (true) or annually (false) */
  monthlyWithdrawal: boolean;
  /** Maintenance margin / warning zone (e.g., 0.50 for 50%) */
  maintenanceMargin: number;
  /** Forced liquidation haircut (e.g., 0.05 for 5%) */
  liquidationHaircut: number;
  /** Initial LOC balance (pre-existing debt) */
  initialLocBalance: number;
}

/**
 * Withdrawal chapter configuration for multi-phase strategies
 *
 * Chapters allow modeling lifestyle changes where withdrawal needs change over time.
 * Common scenarios:
 * - Kids leaving home (reduced expenses)
 * - Mortgage payoff (reduced debt service)
 * - Retirement phases (different spending patterns)
 *
 * Example: Start with $100K/year, reduce 25% at year 15 (Chapter 2), reduce another 25% at year 25 (Chapter 3)
 * - Years 0-14: $100K/year (growing with inflation)
 * - Years 15-24: $75K/year (75% of base)
 * - Years 25+: $56.25K/year (75% of 75% = 56.25% of base)
 */
export interface WithdrawalChapter {
  /** Years after withdrawal start to begin this chapter */
  yearsAfterStart: number;
  /**
   * Reduction percentage (positive = reduce, negative = increase)
   * Examples:
   * - 25 = reduce withdrawals by 25% (multiply by 0.75)
   * - 50 = reduce withdrawals by 50% (multiply by 0.5)
   * - -20 = increase withdrawals by 20% (multiply by 1.2)
   */
  reductionPercent: number;
}

/**
 * Withdrawal chapters configuration
 *
 * IMPORTANT: Reductions are CUMULATIVE. If Chapter 2 reduces by 25% and Chapter 3 reduces by 25%,
 * the final withdrawal is 75% * 75% = 56.25% of the base withdrawal.
 *
 * Each chapter's reduction applies to the CURRENT withdrawal amount (after previous chapters),
 * not to the original base withdrawal.
 */
export interface WithdrawalChaptersConfig {
  /** Whether multi-phase withdrawal is enabled */
  enabled: boolean;
  /** Chapter 2 configuration (first change) */
  chapter2?: WithdrawalChapter;
  /** Chapter 3 configuration (second change) */
  chapter3?: WithdrawalChapter;
}

/**
 * Tax modeling configuration
 */
export interface TaxModelingConfig {
  /** Whether tax modeling is enabled */
  enabled: boolean;
  /** Whether portfolio is in tax-advantaged account (no taxes) */
  taxAdvantaged: boolean;
  /** Average dividend yield (e.g., 0.005 for 0.5%) */
  dividendYield: number;
  /** Ordinary income tax rate for dividends (e.g., 0.37 for 37%) */
  ordinaryTaxRate: number;
  /** Long-term capital gains tax rate (e.g., 0.238 for 23.8%) */
  ltcgTaxRate: number;
}

/**
 * Sell strategy configuration for BBD vs Sell comparison
 */
export interface SellStrategyConfig {
  /**
   * Cost basis ratio - fraction of portfolio that is original cost (basis).
   * E.g., 0.4 means 40% basis, 60% embedded gains.
   * Lower ratio = more embedded gains = higher capital gains taxes on sale.
   */
  costBasisRatio: number;
  /**
   * Dividend yield for Sell strategy tax calculation.
   * E.g., 0.02 for 2% annual dividend yield.
   * S&P 500 historical average is ~1.5-2%.
   */
  dividendYield: number;
}

/**
 * Timeline configuration for BBD strategy
 */
export interface TimelineConfig {
  /** Start year for Buy-Borrow-Die strategy */
  startYear: number;
  /** Year to begin withdrawals */
  withdrawalStartYear: number;
}

/**
 * Regime model calibration mode
 */
export type RegimeCalibrationMode = 'historical' | 'conservative';

/**
 * Survivorship bias adjustment by calibration mode
 *
 * Historical return data includes survivorship bias because failed companies
 * are removed from indices. This adjustment accounts for that bias.
 *
 * - Historical (1.5%): Based on empirical studies of survivorship bias in equity markets
 * - Conservative (2.0%): More aggressive adjustment for stress testing
 */
export const SURVIVORSHIP_BIAS: Record<RegimeCalibrationMode, number> = {
  historical: 0.015, // 1.5% annual adjustment
  conservative: 0.020, // 2.0% annual adjustment
};

/**
 * Simulation configuration - controls how Monte Carlo runs
 */
export interface SimulationConfig {
  /** Number of Monte Carlo iterations (1,000 - 100,000) */
  iterations: number;
  /** Time horizon in years (10-50) */
  timeHorizon: number;
  /** Initial portfolio value */
  initialValue: number;
  /** Annual inflation rate (e.g., 0.025 for 2.5%) */
  inflationRate: number;
  /** Whether to adjust results for inflation (real vs nominal) */
  inflationAdjusted: boolean;
  /** Return resampling method */
  resamplingMethod: 'simple' | 'block' | 'regime' | 'fat-tail';
  /** Regime calibration mode (only used when resamplingMethod is 'regime') */
  regimeCalibration?: RegimeCalibrationMode;
  /** Block size for block bootstrap (auto-calculated if not provided) */
  blockSize?: number;
  /** Random seed for reproducibility */
  seed?: string;
  /** Timeline configuration for BBD strategy */
  timeline?: TimelineConfig;
  /** SBLOC configuration (optional - if omitted, no SBLOC simulation) */
  sbloc?: SBLOCSimConfig;
  /** Withdrawal chapters for multi-phase strategy */
  withdrawalChapters?: WithdrawalChaptersConfig;
  /** Tax modeling configuration */
  taxModeling?: TaxModelingConfig;
  /** Sell strategy configuration for BBD vs Sell comparison */
  sellStrategy?: SellStrategyConfig;
}

/**
 * Portfolio configuration for simulation input
 */
export interface PortfolioConfig {
  /** Array of asset configurations */
  assets: AssetConfig[];
  /** Correlation matrix between assets (NxN) */
  correlationMatrix: number[][];
}

/**
 * Individual asset configuration
 */
export interface AssetConfig {
  /** Unique asset identifier */
  id: string;
  /** Portfolio weight (0-1, all weights should sum to 1) */
  weight: number;
  /** Historical annual returns for bootstrap resampling */
  historicalReturns: number[];
  /** Regime-specific parameters (optional, used when resamplingMethod is 'regime') */
  regimeParams?: RegimeParamsMap;
  /** Asset class for fat-tail distribution (optional, used when resamplingMethod is 'fat-tail') */
  assetClass?: AssetClass;
}

// ============================================================================
// Fat-Tail Model Types
// ============================================================================

/**
 * Asset class for fat-tail distribution parameters
 */
export type AssetClass = 'equity_stock' | 'equity_index' | 'commodity' | 'bond';

/**
 * Fat-tail distribution parameters for an asset class
 */
export interface FatTailParams {
  /** Survivorship bias adjustment (e.g., 0.005 for 0.5% annual bias) */
  survivorshipBias: number;
  /** Volatility scaling factor */
  volatilityScaling: number;
  /** Degrees of freedom for Student's t-distribution (lower = fatter tails) */
  degreesOfFreedom: number;
  /** Skew multiplier for asymmetric distributions */
  skewMultiplier: number;
}

/**
 * Default fat-tail parameters by asset class
 *
 * Based on empirical analysis of tail events and distribution characteristics:
 * - Lower degrees of freedom = fatter tails (more extreme events)
 * - Equity has fatter tails than bonds
 * - Individual stocks have fatter tails than indices
 * - Survivorship bias accounts for delisted/bankrupt companies not in historical data
 */
export const FAT_TAIL_PARAMS: Record<AssetClass, FatTailParams> = {
  equity_stock: {
    survivorshipBias: 0.005,      // 0.5% annual bias
    volatilityScaling: 1.0,
    degreesOfFreedom: 5,          // Fat tails
    skewMultiplier: -0.3,         // Negative skew (crashes worse than rallies)
  },
  equity_index: {
    survivorshipBias: 0.002,      // 0.2% annual bias
    volatilityScaling: 1.0,
    degreesOfFreedom: 7,          // Moderately fat tails
    skewMultiplier: -0.2,         // Slight negative skew
  },
  commodity: {
    survivorshipBias: 0.0,        // No survivorship bias
    volatilityScaling: 1.2,       // Higher volatility
    degreesOfFreedom: 4,          // Very fat tails
    skewMultiplier: 0.0,          // Symmetric
  },
  bond: {
    survivorshipBias: 0.0,        // No survivorship bias
    volatilityScaling: 0.8,       // Lower volatility
    degreesOfFreedom: 10,         // Thinner tails
    skewMultiplier: 0.0,          // Symmetric
  },
};

// ============================================================================
// Regime-Switching Types
// ============================================================================

/**
 * Market regime identifier
 */
export type MarketRegime = 'bull' | 'bear' | 'crash' | 'recovery';

/**
 * Parameters for a single regime's return distribution
 */
export interface RegimeParams {
  /** Expected annual return (e.g., 0.12 for 12%) */
  mean: number;
  /** Annual standard deviation (e.g., 0.12 for 12%) */
  stddev: number;
}

/**
 * Regime parameters for all market states
 */
export type RegimeParamsMap = Record<MarketRegime, RegimeParams>;

/**
 * Transition probabilities from one regime to another
 * Each row must sum to 1
 */
export interface TransitionMatrix {
  /** Transition probabilities from bull market */
  bull: { bull: number; bear: number; crash: number; recovery: number };
  /** Transition probabilities from bear market */
  bear: { bull: number; bear: number; crash: number; recovery: number };
  /** Transition probabilities from crash */
  crash: { bull: number; bear: number; crash: number; recovery: number };
  /** Transition probabilities from recovery */
  recovery: { bull: number; bear: number; crash: number; recovery: number };
}

// ============================================================================
// Progress and Status Types
// ============================================================================

/**
 * Simulation progress for UI updates
 */
export interface SimulationProgress {
  /** Completion percentage (0-100) */
  percent: number;
  /** Current iteration number */
  currentIteration: number;
  /** Simulation status */
  status: 'running' | 'complete' | 'cancelled';
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Aggregated SBLOC trajectory data (percentiles across iterations)
 */
export interface SBLOCTrajectory {
  /** Years array (1-indexed) */
  years: number[];
  /** Loan balance percentiles by year */
  loanBalance: {
    p10: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p90: number[];
  };
  /** Cumulative withdrawals by year */
  cumulativeWithdrawals: number[];
  /** Cumulative interest paid (median) by year */
  cumulativeInterest: {
    p50: number[];
  };
}

/**
 * Margin call statistics by year
 */
export interface MarginCallStats {
  /** Simulation year (1-based) */
  year: number;
  /** Probability of margin call in this year (0-100) */
  probability: number;
  /** Cumulative probability by this year (0-100) */
  cumulativeProbability: number;
}

/**
 * Estate analysis data for BBD comparison
 */
export interface EstateAnalysis {
  /** Median BBD net estate (portfolio - loan) */
  bbdNetEstate: number;
  /** Median sell strategy net estate (portfolio - taxes) */
  sellNetEstate: number;
  /** BBD advantage (positive means BBD is better) */
  bbdAdvantage: number;
  /** Median dividend taxes borrowed by BBD (in loan at death, forgiven by step-up) */
  medianDividendTaxesBorrowed?: number;
}

/**
 * Debug statistics for SBLOC simulation diagnostics
 */
export interface SBLOCDebugStats {
  /** Distribution of margin call counts across iterations */
  marginCallDistribution: {
    noMarginCalls: number;
    oneMarginCall: number;
    twoMarginCalls: number;
    threeOrMore: number;
    maxMarginCalls: number;
  };
  /** Haircut losses from forced liquidations */
  haircutLosses: {
    median: number;
    mean: number;
    max: number;
  };
  /** Total interest charged over simulation */
  interestCharged: {
    median: number;
    mean: number;
  };
  /** Total dividend taxes borrowed (BBD advantage: borrow vs liquidate) */
  dividendTaxesBorrowed: {
    median: number;
    mean: number;
    max: number;
  };
  /** Final gross portfolio values (before loan subtraction) */
  finalGrossPortfolio: {
    median: number;
    mean: number;
  };
  /** Portfolio returns (cumulative over simulation period) */
  portfolioReturns?: {
    median: number;
    mean: number;
    p10: number;
    p90: number;
  };
  /** Failure analysis */
  failureAnalysis?: {
    totalFailed: number;
    totalSucceeded: number;
    medianFailureYear: number;
    avgFailureYear: number;
    successfulAvgReturn: number;
    failedAvgReturn: number;
  };
  /** Per-asset regime parameters used in simulation */
  regimeParameters?: {
    assetId: string;
    bull: { mean: number; stddev: number };
    bear: { mean: number; stddev: number };
    crash: { mean: number; stddev: number };
    recovery: { mean: number; stddev: number };
    /** Whether fallback to defaults was used due to degenerate calibration */
    usedFallback?: boolean;
    /** Validation issues found during calibration */
    validationIssues?: string[];
  }[];
  /** Calibration mode used */
  calibrationMode?: 'historical' | 'conservative';
  /** Per-asset fat-tail parameters used in simulation */
  fatTailParameters?: {
    assetId: string;
    assetClass: AssetClass;
    degreesOfFreedom: number;
    skewMultiplier: number;
    survivorshipBias: number;
    volatilityScaling: number;
  }[];
  /**
   * Path-coherent percentile extraction info (Phase 23-09)
   * Shows which simulation index represents each percentile line
   */
  pathCoherentPercentiles?: {
    /** Simulation index for P10 (poor outcome) */
    p10SimIndex: number;
    /** Terminal value of P10 simulation */
    p10TerminalValue: number;
    /** Simulation index for P50 (median outcome) */
    p50SimIndex: number;
    /** Terminal value of P50 simulation */
    p50TerminalValue: number;
    /** Simulation index for P90 (good outcome) */
    p90SimIndex: number;
    /** Terminal value of P90 simulation */
    p90TerminalValue: number;
  };
}

/**
 * Sell strategy output integrated with Monte Carlo simulation.
 * Uses same market returns as BBD iterations for fair comparison.
 */
export interface SellStrategyOutput {
  /** Terminal portfolio values across all iterations */
  terminalValues: number[];
  /** Success rate - percentage where terminal > initial (0-100) */
  successRate: number;
  /** Percentile values of terminal outcomes */
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  /** Tax metrics */
  taxes: {
    /** Median lifetime capital gains taxes */
    medianCapitalGains: number;
    /** Median lifetime dividend taxes */
    medianDividend: number;
    /** Median total taxes (capital gains + dividend) */
    medianTotal: number;
  };
  /** Depletion probability (percentage reaching zero) */
  depletionProbability: number;
  /** Yearly percentiles across all iterations */
  yearlyPercentiles: YearlyPercentiles[];
}

/**
 * Complete simulation output from worker
 */
export interface SimulationOutput {
  /** Terminal values for all iterations (one per iteration) */
  terminalValues: Float64Array;
  /** Percentiles for each year of the simulation */
  yearlyPercentiles: YearlyPercentiles[];
  /** Aggregate statistics across all iterations */
  statistics: SimulationStatistics;
  /** SBLOC trajectory data (only present if sbloc config provided) */
  sblocTrajectory?: SBLOCTrajectory;
  /** Margin call statistics by year */
  marginCallStats?: MarginCallStats[];
  /** Estate analysis data for BBD comparison */
  estateAnalysis?: EstateAnalysis;
  /** Debug statistics for SBLOC diagnostics */
  debugStats?: SBLOCDebugStats;
  /** Sell strategy output (only present if sellStrategy config provided) */
  sellStrategy?: SellStrategyOutput;
}

/**
 * Percentile values for a specific year
 */
export interface YearlyPercentiles {
  /** Year number (0 = start, 1 = end of year 1, etc.) */
  year: number;
  /** 10th percentile value */
  p10: number;
  /** 25th percentile value */
  p25: number;
  /** 50th percentile (median) value */
  p50: number;
  /** 75th percentile value */
  p75: number;
  /** 90th percentile value */
  p90: number;
}

/**
 * Aggregate statistics from simulation
 */
export interface SimulationStatistics {
  /** Mean terminal value */
  mean: number;
  /** Median terminal value */
  median: number;
  /** Standard deviation of terminal values */
  stddev: number;
  /** Percentage of iterations ending above initial value (0-100) */
  successRate: number;
  // Extended metrics (computed post-simulation in UI layer)
  /** Compound Annual Growth Rate from initial to median terminal value */
  cagr?: number;
  /** Time-Weighted Rate of Return from median yearly path */
  twrr?: number;
  /** Annualized volatility from terminal value returns */
  annualizedVolatility?: number;
}

// ============================================================================
// Default Constants
// ============================================================================

/**
 * Default transition matrix based on historical S&P 500 regime analysis
 *
 * 4-regime model (bull, bear, crash, recovery) from reference application.
 * Recovery regime captures the post-crash rebound period before returning to normal bull markets.
 *
 * Key transitions:
 * - Bull markets are persistent (96.5% stay bull)
 * - Bear markets can recover or crash
 * - Crashes typically transition to recovery (70%)
 * - Recovery transitions back to bull markets (80%)
 */
export const DEFAULT_TRANSITION_MATRIX: TransitionMatrix = {
  // From Bull: 96.5% stay bull, 2.5% to bear, 0.5% to crash, 0.5% to recovery (rare)
  bull: { bull: 0.965, bear: 0.025, crash: 0.005, recovery: 0.005 },
  // From Bear: 3% to bull, 92% stay bear, 2% to crash, 3% to recovery
  bear: { bull: 0.03, bear: 0.92, crash: 0.02, recovery: 0.03 },
  // From Crash: 5% to bull, 20% to bear, 5% stay crash, 70% to recovery
  crash: { bull: 0.05, bear: 0.20, crash: 0.05, recovery: 0.70 },
  // From Recovery: 80% to bull, 5% to bear, 5% to crash, 10% stay recovery
  recovery: { bull: 0.80, bear: 0.05, crash: 0.05, recovery: 0.10 },
};

/**
 * Conservative transition matrix for stress testing
 *
 * Assumptions:
 * - Lower bull persistence (more likely to transition out)
 * - Higher bear persistence (harder to escape downturns)
 * - Higher crash probability from all states
 * - Slower recovery to bull (longer time in recovery regime)
 */
export const CONSERVATIVE_TRANSITION_MATRIX: TransitionMatrix = {
  // From Bull: 94% stay bull, 4% to bear, 1.5% to crash, 0.5% to recovery
  bull: { bull: 0.94, bear: 0.04, crash: 0.015, recovery: 0.005 },
  // From Bear: 2% to bull, 94% stay bear, 3% to crash, 1% to recovery
  bear: { bull: 0.02, bear: 0.94, crash: 0.03, recovery: 0.01 },
  // From Crash: 2% to bull, 25% to bear, 10% stay crash, 63% to recovery
  crash: { bull: 0.02, bear: 0.25, crash: 0.10, recovery: 0.63 },
  // From Recovery: 70% to bull, 10% to bear, 5% to crash, 15% stay recovery
  recovery: { bull: 0.70, bear: 0.10, crash: 0.05, recovery: 0.15 },
};

/**
 * Default regime parameters based on historical S&P 500 data
 *
 * These are annualized return and volatility estimates for each regime:
 * - Bull: Strong positive returns, moderate volatility
 * - Bear: Negative returns, elevated volatility
 * - Crash: Sharp negative returns, very high volatility
 * - Recovery: Strong positive returns following crash, high volatility
 */
export const DEFAULT_REGIME_PARAMS: RegimeParamsMap = {
  bull: { mean: 0.12, stddev: 0.12 },      // 12% return, 12% vol
  bear: { mean: -0.08, stddev: 0.20 },     // -8% return, 20% vol
  crash: { mean: -0.30, stddev: 0.35 },    // -30% return, 35% vol
  recovery: { mean: 0.20, stddev: 0.25 },  // 20% return, 25% vol
};
