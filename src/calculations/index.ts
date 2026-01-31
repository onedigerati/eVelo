/**
 * Financial Calculations Module
 *
 * Barrel export for all financial calculation functions used in BBD strategy
 * simulation and analysis. This module provides:
 *
 * - Core metrics (CAGR, volatility, percentiles, success rate)
 * - TWRR (Time-Weighted Rate of Return)
 * - Margin call probability analysis
 * - Estate analysis and BBD tax advantages
 * - Salary equivalent calculations
 *
 * Usage:
 * ```typescript
 * import {
 *   calculateMetricsSummary,
 *   calculateTWRR,
 *   calculateMarginCallRisk,
 *   calculateEstateAnalysis,
 *   calculateSalaryEquivalent,
 *   DEFAULT_CALCULATION_CONFIG
 * } from '@/calculations';
 * ```
 *
 * @module calculations
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Core metrics types
  MetricsSummary,
  PercentileDistribution,

  // Margin call types
  MarginCallProbability,

  // TWRR types
  TWRRResult,

  // Estate analysis types
  EstateAnalysis,
  BBDComparison,

  // Salary equivalent types
  SalaryEquivalent,

  // Configuration types
  CalculationConfig,
} from './types';

// Export default configuration
export { DEFAULT_CALCULATION_CONFIG } from './types';

// ============================================================================
// Core Metrics
// ============================================================================

export {
  calculateCAGR,
  calculateAnnualizedVolatility,
  terminalValuesToAnnualizedReturns,
  extractPercentiles,
  calculateSuccessRate,
  calculateMetricsSummary,
} from './metrics';

// ============================================================================
// Time-Weighted Rate of Return (TWRR)
// ============================================================================

export {
  calculateTWRR,
  calculatePeriodReturn,
  chainReturns,
} from './twrr';

// ============================================================================
// Margin Call Probability
// ============================================================================

export {
  calculateMarginCallRisk,
  aggregateMarginCallEvents,
} from './margin-call-probability';

// ============================================================================
// Estate Calculations
// ============================================================================

export {
  calculateEstateAnalysis,
  calculateBBDComparison,
  calculateSteppedUpBasisSavings,
  calculateEmbeddedCapitalGains,
  calculateTaxIfSold,
} from './estate';

// Also export parameter types from estate module
export type { EstateAnalysisParams, BBDComparisonParams } from './estate';

// ============================================================================
// Salary Equivalent
// ============================================================================

export { calculateSalaryEquivalent } from './salary-equivalent';

// ============================================================================
// Sell Strategy
// ============================================================================

export {
  calculateSellStrategy,
  type SellStrategyResult,
  type SellStrategyConfig,
} from './sell-strategy';

// ============================================================================
// Return Probabilities
// ============================================================================

export {
  calculateReturnProbabilities,
  calculateExpectedReturns,
  calculatePerformanceSummary,
  DEFAULT_THRESHOLDS,
  DEFAULT_TIME_HORIZONS,
  DEFAULT_INFLATION_RATE,
  type ReturnProbabilities,
  type ExpectedReturns,
  type PerformanceRow,
  type PerformanceSummaryData,
} from './return-probabilities';
