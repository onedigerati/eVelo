/**
 * Margin Call Probability Analysis
 *
 * Calculates per-year and cumulative margin call probability from
 * Monte Carlo simulation results. This helps users understand:
 *
 * - When is BBD strategy most at risk? (early vs late years)
 * - What's the probability of ever experiencing a margin call?
 * - How does risk accumulate over the simulation horizon?
 *
 * Key distinction:
 * - Per-year probability: P(margin call in year Y)
 * - Cumulative probability: P(margin call by year Y) = P(at least one call in years 1..Y)
 *
 * The cumulative probability always increases monotonically because
 * once a margin call has occurred, it cannot "un-occur."
 *
 * @module calculations/margin-call-probability
 */

import type { MarginCallEvent } from '../sbloc/types';
import type { MarginCallProbability } from './types';

/**
 * Internal tracker for margin call event aggregation
 *
 * Tracks which iterations experienced margin calls in which years.
 * Note: One iteration can have margin calls in multiple years.
 */
interface MarginCallTracker {
  /**
   * Count of iterations with margin call in each year
   * Key: year number, Value: number of iterations with call in that year
   */
  yearCounts: Map<number, number>;

  /**
   * Count of iterations that had at least one margin call by each year
   * Key: year number, Value: number of iterations with any call by that year
   */
  cumulativeCounts: Map<number, number>;

  /** Total number of simulation iterations */
  totalIterations: number;
}

/**
 * Aggregate margin call events from simulation results
 *
 * Processes the nested array of margin call events (one array per iteration)
 * to count how many iterations experienced margin calls in each year.
 *
 * Important: This counts iterations, not events. If one iteration has
 * margin calls in years 3, 5, and 7, each year is counted once for that
 * iteration, and the cumulative count for year 7 includes that iteration.
 *
 * @param events - Array of margin call event arrays (one per simulation iteration)
 * @param totalIterations - Total number of simulation iterations
 * @returns Aggregated tracker with year counts and cumulative counts
 *
 * @example
 * ```typescript
 * // 1000 iterations, each with their margin call events (if any)
 * const tracker = aggregateMarginCallEvents(allEvents, 1000);
 * console.log(tracker.yearCounts.get(5)); // Number of iterations with call in year 5
 * ```
 */
export function aggregateMarginCallEvents(
  events: MarginCallEvent[][],
  totalIterations: number
): MarginCallTracker {
  const yearCounts = new Map<number, number>();
  const iterationFirstCallYear = new Map<number, number>(); // iteration index -> first call year

  // Process each iteration's events
  for (let i = 0; i < events.length; i++) {
    const iterationEvents = events[i];
    if (!iterationEvents || iterationEvents.length === 0) {
      continue;
    }

    // Track unique years with margin calls in this iteration
    const yearsWithCallsInIteration = new Set<number>();
    let earliestCallYear = Infinity;

    for (const event of iterationEvents) {
      yearsWithCallsInIteration.add(event.year);
      if (event.year < earliestCallYear) {
        earliestCallYear = event.year;
      }
    }

    // Increment per-year counts
    for (const year of yearsWithCallsInIteration) {
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }

    // Track when this iteration first had a margin call (for cumulative)
    if (earliestCallYear !== Infinity) {
      iterationFirstCallYear.set(i, earliestCallYear);
    }
  }

  // Calculate cumulative counts (iterations with any call by year Y)
  const cumulativeCounts = new Map<number, number>();

  // Find max year across all events
  let maxYear = 0;
  for (const year of yearCounts.keys()) {
    if (year > maxYear) maxYear = year;
  }

  // For each year, count iterations that had their first call by that year
  for (let year = 1; year <= maxYear; year++) {
    let count = 0;
    for (const [, firstCallYear] of iterationFirstCallYear) {
      if (firstCallYear <= year) {
        count++;
      }
    }
    cumulativeCounts.set(year, count);
  }

  return {
    yearCounts,
    cumulativeCounts,
    totalIterations,
  };
}

/**
 * Calculate margin call probability by year from aggregated tracker
 *
 * Converts raw counts into probability percentages:
 * - Per-year probability = (iterations with call in year Y / total) × 100
 * - Cumulative probability = (iterations with any call by year Y / total) × 100
 *
 * The cumulative probability is monotonically increasing (or flat).
 * It represents: "What's the chance I'll have experienced at least one
 * margin call by the end of year Y?"
 *
 * @param tracker - Aggregated margin call tracker from aggregateMarginCallEvents
 * @param timeHorizon - Number of years to analyze (1 to timeHorizon)
 * @returns Array of per-year probability objects
 *
 * @example
 * ```typescript
 * const probs = calculateMarginCallProbability(tracker, 30);
 * console.log(probs[4]); // { year: 5, probability: 2.3, cumulativeProbability: 8.7 }
 * ```
 */
export function calculateMarginCallProbability(
  tracker: MarginCallTracker,
  timeHorizon: number
): MarginCallProbability[] {
  const result: MarginCallProbability[] = [];

  // Track running cumulative for proper monotonic increase
  let runningCumulative = 0;

  for (let year = 1; year <= timeHorizon; year++) {
    const yearCount = tracker.yearCounts.get(year) || 0;
    const cumulativeCount = tracker.cumulativeCounts.get(year) || 0;

    // Per-year probability
    const probability = (yearCount / tracker.totalIterations) * 100;

    // Cumulative probability (ensure monotonically increasing)
    const calculatedCumulative = (cumulativeCount / tracker.totalIterations) * 100;
    runningCumulative = Math.max(runningCumulative, calculatedCumulative);

    result.push({
      year,
      probability,
      cumulativeProbability: runningCumulative,
    });
  }

  return result;
}

/**
 * Calculate margin call risk from raw simulation events
 *
 * Main entry point combining aggregation and probability calculation.
 * Use this function for external callers - it handles the full pipeline.
 *
 * @param events - Array of margin call event arrays (one per simulation iteration)
 * @param totalIterations - Total number of simulation iterations
 * @param timeHorizon - Number of years to analyze
 * @returns Array of per-year margin call probability objects
 *
 * @example
 * ```typescript
 * // After running 10,000 iterations of BBD simulation
 * const marginCallRisk = calculateMarginCallRisk(
 *   allMarginCallEvents,
 *   10000,
 *   30  // 30-year horizon
 * );
 *
 * // Find peak risk year
 * const peakRisk = marginCallRisk.reduce((max, yr) =>
 *   yr.probability > max.probability ? yr : max
 * );
 * console.log(`Highest risk in year ${peakRisk.year}: ${peakRisk.probability.toFixed(1)}%`);
 *
 * // Show cumulative risk at end of horizon
 * const finalYear = marginCallRisk[marginCallRisk.length - 1];
 * console.log(`${finalYear.cumulativeProbability.toFixed(1)}% chance of margin call over 30 years`);
 * ```
 */
export function calculateMarginCallRisk(
  events: MarginCallEvent[][],
  totalIterations: number,
  timeHorizon: number
): MarginCallProbability[] {
  // Handle edge case: no iterations
  if (totalIterations <= 0) {
    return Array.from({ length: timeHorizon }, (_, i) => ({
      year: i + 1,
      probability: 0,
      cumulativeProbability: 0,
    }));
  }

  // Handle edge case: no events provided
  if (!events || events.length === 0) {
    return Array.from({ length: timeHorizon }, (_, i) => ({
      year: i + 1,
      probability: 0,
      cumulativeProbability: 0,
    }));
  }

  const tracker = aggregateMarginCallEvents(events, totalIterations);
  return calculateMarginCallProbability(tracker, timeHorizon);
}
