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
 * Simulation configuration - controls how Monte Carlo runs
 */
export interface SimulationConfig {
  /** Number of Monte Carlo iterations (1,000 - 100,000) */
  iterations: number;
  /** Time horizon in years (10-50) */
  timeHorizon: number;
  /** Initial portfolio value */
  initialValue: number;
  /** Annual inflation rate (e.g., 0.03 for 3%) */
  inflationRate: number;
  /** Whether to adjust results for inflation (real vs nominal) */
  inflationAdjusted: boolean;
  /** Return resampling method */
  resamplingMethod: 'simple' | 'block' | 'regime';
  /** Block size for block bootstrap (auto-calculated if not provided) */
  blockSize?: number;
  /** Random seed for reproducibility */
  seed?: string;
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
}

// ============================================================================
// Regime-Switching Types
// ============================================================================

/**
 * Market regime identifier
 */
export type MarketRegime = 'bull' | 'bear' | 'crash';

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
  bull: { bull: number; bear: number; crash: number };
  /** Transition probabilities from bear market */
  bear: { bull: number; bear: number; crash: number };
  /** Transition probabilities from crash */
  crash: { bull: number; bear: number; crash: number };
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
 * Complete simulation output from worker
 */
export interface SimulationOutput {
  /** Terminal values for all iterations (one per iteration) */
  terminalValues: Float64Array;
  /** Percentiles for each year of the simulation */
  yearlyPercentiles: YearlyPercentiles[];
  /** Aggregate statistics across all iterations */
  statistics: SimulationStatistics;
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
}

// ============================================================================
// Default Constants
// ============================================================================

/**
 * Default transition matrix based on historical S&P 500 regime analysis
 *
 * Source: Hamilton (1989) regime-switching model literature
 *
 * - Bull markets are persistent (97% stay bull)
 * - Bear markets have some persistence but can recover
 * - Crashes are short-lived and transition to bear or bull
 */
export const DEFAULT_TRANSITION_MATRIX: TransitionMatrix = {
  // From Bull: 97% stay bull, 2.5% to bear, 0.5% to crash
  bull: { bull: 0.97, bear: 0.025, crash: 0.005 },
  // From Bear: 3% to bull, 95% stay bear, 2% to crash
  bear: { bull: 0.03, bear: 0.95, crash: 0.02 },
  // From Crash: 10% to bull, 30% to bear, 60% stay crash
  crash: { bull: 0.10, bear: 0.30, crash: 0.60 },
};

/**
 * Default regime parameters based on historical S&P 500 data
 *
 * These are annualized return and volatility estimates for each regime:
 * - Bull: Strong positive returns, low volatility
 * - Bear: Negative returns, elevated volatility
 * - Crash: Sharp negative returns, very high volatility
 */
export const DEFAULT_REGIME_PARAMS: RegimeParamsMap = {
  bull: { mean: 0.12, stddev: 0.12 },   // 12% return, 12% vol
  bear: { mean: -0.08, stddev: 0.20 },  // -8% return, 20% vol
  crash: { mean: -0.30, stddev: 0.35 }, // -30% return, 35% vol
};
