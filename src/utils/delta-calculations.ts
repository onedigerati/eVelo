/**
 * Delta Calculations
 *
 * Utilities for computing metric deltas between simulations for comparison mode.
 */

import type { SimulationOutput, SimulationStatistics } from '../simulation/types';

/**
 * Direction of change between previous and current values
 */
export type DeltaDirection = 'up' | 'down' | 'neutral';

/**
 * Delta metrics for a single value comparison
 */
export interface DeltaMetrics {
  /** Absolute difference (current - previous) */
  absolute: number;
  /** Percentage change from previous value */
  percentChange: number;
  /** Direction of change (with floating-point tolerance) */
  direction: DeltaDirection;
}

/**
 * Comprehensive comparison metrics for simulation outputs
 */
export interface ComparisonMetrics {
  /** Final value delta (median terminal value) */
  finalValue: DeltaMetrics;
  /** Success rate delta */
  successRate: DeltaMetrics;
  /** Maximum drawdown delta (optional) */
  maxDrawdown?: DeltaMetrics;
  /** CAGR delta (optional) */
  cagr?: DeltaMetrics;
  /** Margin call probability delta (optional, SBLOC only) */
  marginCallProbability?: DeltaMetrics;
}

/**
 * Floating point threshold for neutral direction detection
 */
const NEUTRAL_THRESHOLD = 0.001;

/**
 * Calculate delta metrics between previous and current values
 *
 * @param previous - Previous value (baseline)
 * @param current - Current value (new)
 * @returns Delta metrics with absolute difference, percent change, and direction
 */
export function calculateDelta(previous: number, current: number): DeltaMetrics {
  const absolute = current - previous;

  // Calculate percent change with zero-handling
  let percentChange: number;
  if (previous !== 0) {
    percentChange = (absolute / Math.abs(previous)) * 100;
  } else {
    // When previous is 0, percent change is either 100% (if current > 0) or 0% (if current is also 0)
    percentChange = current !== 0 ? 100 : 0;
  }

  // Determine direction with floating-point tolerance
  let direction: DeltaDirection;
  if (absolute > NEUTRAL_THRESHOLD) {
    direction = 'up';
  } else if (absolute < -NEUTRAL_THRESHOLD) {
    direction = 'down';
  } else {
    direction = 'neutral';
  }

  return {
    absolute,
    percentChange,
    direction,
  };
}

/**
 * Compute comprehensive comparison metrics between two simulation outputs
 *
 * Handles optional fields gracefully (CAGR, margin call stats).
 *
 * @param previous - Previous simulation output (baseline)
 * @param current - Current simulation output (new)
 * @returns Comparison metrics for key performance indicators
 */
export function computeComparisonMetrics(
  previous: SimulationOutput,
  current: SimulationOutput
): ComparisonMetrics {
  const metrics: ComparisonMetrics = {
    // Final value (median terminal value)
    finalValue: calculateDelta(
      previous.statistics.median,
      current.statistics.median
    ),

    // Success rate
    successRate: calculateDelta(
      previous.statistics.successRate,
      current.statistics.successRate
    ),
  };

  // Optional: CAGR (if available in both)
  if (
    previous.statistics.cagr !== undefined &&
    current.statistics.cagr !== undefined
  ) {
    metrics.cagr = calculateDelta(
      previous.statistics.cagr,
      current.statistics.cagr
    );
  }

  // Optional: Margin call probability (if SBLOC simulation)
  if (previous.marginCallStats && current.marginCallStats) {
    // Use cumulative probability at final year
    const prevCumulative =
      previous.marginCallStats[previous.marginCallStats.length - 1]
        ?.cumulativeProbability ?? 0;
    const currCumulative =
      current.marginCallStats[current.marginCallStats.length - 1]
        ?.cumulativeProbability ?? 0;

    metrics.marginCallProbability = calculateDelta(
      prevCumulative,
      currCumulative
    );
  }

  return metrics;
}
