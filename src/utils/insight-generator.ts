/**
 * Insight Generator Utility
 *
 * Generates actionable insights based on simulation results.
 * Analyzes margin call risk, growth assumptions, success rates,
 * and other factors to provide recommendations.
 */
import type { SimulationStatistics, SimulationConfig, MarginCallStats, SBLOCTrajectory } from '../simulation/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Insight type determines the visual styling and importance.
 */
export type InsightType = 'warning' | 'note' | 'action' | 'info';

/**
 * Individual insight with actionable recommendation.
 */
export interface Insight {
  /** Type determines icon color and styling */
  type: InsightType;
  /** Material Design icon name */
  icon: string;
  /** Concise title for the insight */
  title: string;
  /** Detailed message explaining the insight */
  message: string;
  /** Optional actionable recommendation */
  action?: string;
}

/**
 * Consideration type - standard risk factors always shown.
 */
export type ConsiderationType = 'warning' | 'note' | 'action';

/**
 * Important consideration with risk context.
 */
export interface Consideration {
  /** Type determines icon color and styling */
  type: ConsiderationType;
  /** Material Design icon name */
  icon: string;
  /** Risk factor title */
  title: string;
  /** Description or warning text */
  message: string;
  /** Optional action to mitigate */
  action?: string;
  /** Dynamic value if applicable */
  value?: string;
}

/**
 * Configuration for insight generation thresholds.
 */
export interface InsightConfig {
  /** Margin call probability threshold for warning (default: 15%) */
  marginCallWarningThreshold: number;
  /** CAGR threshold considered above average (default: 10%) */
  highGrowthThreshold: number;
  /** Success rate threshold for warning (default: 80%) */
  successRateWarningThreshold: number;
  /** Utilization threshold for warning (default: 70%) */
  highUtilizationThreshold: number;
  /** Utilization warning percent of years (default: 20%) */
  utilizationYearsThreshold: number;
}

/**
 * Input data for insight generation.
 */
export interface InsightGeneratorInput {
  /** Simulation statistics */
  statistics: SimulationStatistics;
  /** Optional margin call statistics */
  marginCallStats?: MarginCallStats[];
  /** Simulation configuration */
  config: SimulationConfig;
  /** Optional SBLOC trajectory for utilization analysis */
  sblocTrajectory?: SBLOCTrajectory;
  /** Calculated CAGR (from UI) */
  cagr?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_INSIGHT_CONFIG: InsightConfig = {
  marginCallWarningThreshold: 15,
  highGrowthThreshold: 0.10, // 10%
  successRateWarningThreshold: 80,
  highUtilizationThreshold: 70,
  utilizationYearsThreshold: 20,
};

// ============================================================================
// Insight Generation
// ============================================================================

/**
 * Generate actionable insights based on simulation results.
 *
 * Analyzes:
 * - Margin call probability
 * - Growth assumptions (CAGR)
 * - Success rate
 * - LTV/utilization over time
 *
 * @param input - Simulation data and configuration
 * @param thresholds - Optional custom thresholds
 * @returns Array of insights sorted by severity
 */
export function generateInsights(
  input: InsightGeneratorInput,
  thresholds: Partial<InsightConfig> = {}
): Insight[] {
  const config = { ...DEFAULT_INSIGHT_CONFIG, ...thresholds };
  const insights: Insight[] = [];

  // Check margin call probability
  if (input.marginCallStats && input.marginCallStats.length > 0) {
    const finalProb = input.marginCallStats[input.marginCallStats.length - 1].cumulativeProbability;
    if (finalProb > config.marginCallWarningThreshold) {
      const withdrawalReduction = Math.ceil(finalProb / 5) * 5; // Round up to nearest 5%
      const cashBuffer = Math.ceil(input.config.initialValue * 0.1 / 10000) * 10000; // 10% rounded to $10K

      insights.push({
        type: 'warning',
        icon: 'warning',
        title: 'Elevated Leverage Risk',
        message: `Your ${finalProb.toFixed(1)}% margin call probability exceeds the typical comfort threshold of ${config.marginCallWarningThreshold}%.`,
        action: `Build $${(cashBuffer / 1000).toFixed(0)}K cash buffer or reduce withdrawals by ${withdrawalReduction}%`,
      });
    }
  }

  // Check CAGR assumption
  if (input.cagr !== undefined && input.cagr > config.highGrowthThreshold) {
    insights.push({
      type: 'note',
      icon: 'trending_up',
      title: 'Above-Average Growth Assumption',
      message: `Your expected ${(input.cagr * 100).toFixed(1)}% CAGR exceeds the historical long-term average of ~10%.`,
      action: 'Consider using Conservative regime mode for more realistic projections',
    });
  }

  // Check success rate
  if (input.statistics.successRate < config.successRateWarningThreshold) {
    insights.push({
      type: 'warning',
      icon: 'error_outline',
      title: 'Success Probability Concern',
      message: `${input.statistics.successRate.toFixed(1)}% of simulations maintained positive net worth, which is below the ${config.successRateWarningThreshold}% threshold.`,
      action: 'Review withdrawal rate or extend time horizon',
    });
  }

  // Check utilization (years above threshold)
  if (input.sblocTrajectory) {
    const yearsAboveThreshold = calculateYearsAboveLTV(
      input.sblocTrajectory,
      input.statistics,
      config.highUtilizationThreshold
    );
    const percentAbove = (yearsAboveThreshold / input.config.timeHorizon) * 100;

    if (percentAbove > config.utilizationYearsThreshold) {
      insights.push({
        type: 'warning',
        icon: 'account_balance',
        title: 'High Credit Utilization',
        message: `Your portfolio spends ${percentAbove.toFixed(0)}% of years above ${config.highUtilizationThreshold}% LTV in the median scenario.`,
        action: 'Consider lower withdrawal or higher starting value',
      });
    }
  }

  // Add return model information if using regime switching
  if (input.config.resamplingMethod === 'regime') {
    insights.push({
      type: 'info',
      icon: 'analytics',
      title: 'Regime-Switching Returns',
      message: 'This simulation uses regime-switching return model which captures bull, bear, and crash market cycles.',
    });
  }

  // Sort by severity: warning > action > note > info
  const severityOrder: Record<InsightType, number> = {
    warning: 0,
    action: 1,
    note: 2,
    info: 3,
  };

  return insights.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]);
}

/**
 * Calculate the number of years where median utilization exceeds threshold.
 */
function calculateYearsAboveLTV(
  trajectory: SBLOCTrajectory,
  statistics: SimulationStatistics,
  threshold: number
): number {
  let yearsAbove = 0;

  // Estimate utilization from median loan balance and portfolio value
  // This is an approximation as we don't have per-year portfolio percentiles directly
  const avgPortfolioGrowth = Math.pow(statistics.median / (trajectory.loanBalance.p50[0] || 1), 1 / trajectory.years.length);

  for (let i = 0; i < trajectory.years.length; i++) {
    const loan = trajectory.loanBalance.p50[i] || 0;
    // Estimate portfolio value at this year (rough approximation)
    const estimatedPortfolio = (trajectory.loanBalance.p50[0] || statistics.mean) * Math.pow(avgPortfolioGrowth, i);
    const utilization = estimatedPortfolio > 0 ? (loan / estimatedPortfolio) * 100 : 0;

    if (utilization > threshold) {
      yearsAbove++;
    }
  }

  return yearsAbove;
}

// ============================================================================
// Standard Considerations
// ============================================================================

/**
 * Generate standard considerations that are always displayed.
 * These are common risk factors users should be aware of.
 *
 * @param marginCallProb - Margin call probability (0-100)
 * @param interestRate - SBLOC interest rate (0-1)
 * @returns Array of considerations
 */
export function generateConsiderations(
  marginCallProb: number = 0,
  interestRate: number = 0.07
): Consideration[] {
  return [
    {
      type: 'warning',
      icon: 'warning',
      title: 'Margin Call Risk',
      message: marginCallProb > 0
        ? `${marginCallProb.toFixed(1)}% cumulative probability over the simulation period.`
        : 'No margin calls projected in this scenario.',
      value: `${marginCallProb.toFixed(1)}%`,
    },
    {
      type: 'warning',
      icon: 'swap_vert',
      title: 'Sequence of Returns Risk',
      message: 'Poor returns early in retirement can significantly impact long-term outcomes even if average returns meet expectations.',
    },
    {
      type: 'note',
      icon: 'trending_up',
      title: 'Interest Rate Sensitivity',
      message: `Current model assumes ${(interestRate * 100).toFixed(1)}% interest rate. A 1% increase could add significant costs over the horizon.`,
    },
    {
      type: 'note',
      icon: 'psychology',
      title: 'Behavioral Factors',
      message: 'Market volatility may trigger emotional decisions that deviate from the optimal strategy, impacting actual returns.',
    },
    {
      type: 'note',
      icon: 'gavel',
      title: 'Regulatory Risk',
      message: 'Tax laws and SBLOC regulations may change over time. The stepped-up basis benefit could be modified or eliminated.',
    },
    {
      type: 'action',
      icon: 'water_drop',
      title: 'Liquidity Constraints',
      message: 'SBLOC availability may be restricted during market stress when you need it most.',
      action: 'Maintain 6-12 months of expenses in accessible cash reserve',
    },
  ];
}

/**
 * Get Material icon name for insight type.
 */
export function getInsightIcon(type: InsightType): string {
  switch (type) {
    case 'warning':
      return 'warning';
    case 'note':
      return 'info';
    case 'action':
      return 'check_circle';
    case 'info':
      return 'lightbulb';
  }
}

/**
 * Get CSS color variable for insight type.
 */
export function getInsightColor(type: InsightType | ConsiderationType): string {
  switch (type) {
    case 'warning':
      return 'var(--color-warning, #f59e0b)';
    case 'note':
      return 'var(--color-info, #3b82f6)';
    case 'action':
      return 'var(--color-success, #22c55e)';
    case 'info':
      return 'var(--text-secondary, #6b7280)';
  }
}
