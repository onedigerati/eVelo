/**
 * Utils Module - Barrel Export
 *
 * Utility functions and helpers for the application.
 */

// Insight Generator
export {
  generateInsights,
  generateConsiderations,
  getInsightIcon,
  getInsightColor,
  DEFAULT_INSIGHT_CONFIG,
  type Insight,
  type InsightType,
  type Consideration,
  type ConsiderationType,
  type InsightConfig,
  type InsightGeneratorInput,
} from './insight-generator';

// Delta Calculations
export {
  calculateDelta,
  computeComparisonMetrics,
  type DeltaMetrics,
  type DeltaDirection,
  type ComparisonMetrics,
} from './delta-calculations';
