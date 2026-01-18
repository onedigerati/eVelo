/**
 * Type definitions for chart data structures.
 * These interfaces define the data formats consumed by chart components.
 */

/**
 * Data for probability cone/fan charts showing percentile bands over time.
 * Used for portfolio value projections with uncertainty visualization.
 */
export interface ProbabilityConeData {
  /** Array of years (or time periods) on x-axis */
  years: number[];
  /** Percentile bands - each array corresponds to a year */
  bands: {
    p10: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p90: number[];
  };
}

/**
 * Single bin in a histogram distribution.
 */
export interface HistogramBin {
  /** Lower bound of the bin (inclusive) */
  min: number;
  /** Upper bound of the bin (exclusive, except for last bin) */
  max: number;
  /** Count of values in this bin */
  count: number;
}

/**
 * Data for histogram charts showing value distributions.
 * Used for terminal value distributions, return distributions.
 */
export interface HistogramData {
  /** Array of bins with their counts */
  bins: HistogramBin[];
  /** Width of each bin (for uniform binning) */
  binWidth: number;
}

/**
 * Single segment in a donut/pie chart.
 */
export interface DonutSegment {
  /** Display label for this segment */
  label: string;
  /** Numeric value (will be converted to percentage) */
  value: number;
  /** Optional custom color for this segment */
  color?: string;
}

/**
 * Data for donut/pie charts showing portfolio composition.
 * Used for asset allocation visualization.
 */
export interface DonutChartData {
  /** Segments of the donut chart */
  segments: DonutSegment[];
}

/**
 * Data for heatmap/matrix charts showing correlations.
 * Used for asset correlation visualization.
 */
export interface HeatmapData {
  /** Labels for both axes (symmetric matrix) */
  labels: string[];
  /** Correlation matrix values (-1 to 1), row-major order */
  matrix: number[][];
}

/**
 * Data for bar charts.
 * Used for margin call probability by year, comparison charts.
 */
export interface BarChartData {
  /** Labels for each bar (x-axis) */
  labels: string[];
  /** Values for each bar */
  values: number[];
  /** Optional custom colors for each bar */
  colors?: string[];
}

/**
 * Single dataset in a line chart.
 */
export interface LineDataset {
  /** Legend label for this line */
  label: string;
  /** Y-values for each x-point */
  data: number[];
  /** Optional custom color for this line */
  color?: string;
}

/**
 * Data for line charts.
 * Used for SBLOC balance over time, BBD vs Sell comparison.
 */
export interface LineChartData {
  /** Labels for x-axis points */
  labels: string[];
  /** Multiple datasets (lines) on the same chart */
  datasets: LineDataset[];
}

/**
 * Color configuration for chart theming.
 */
export interface ChartTheme {
  /** Primary brand color */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Accent/highlight color */
  accent: string;

  /** Colors for percentile bands */
  percentiles: {
    p90: string;
    p75: string;
    p50: string;
    p25: string;
    p10: string;
  };

  /** Color for positive values (BBD advantage, gains) */
  positive: string;
  /** Color for negative values (losses, deficits) */
  negative: string;

  /** Background color for chart area */
  background: string;
  /** Grid line color */
  grid: string;
  /** Text color for labels and legends */
  text: string;
}

/**
 * Default chart theme with colors optimized for financial visualization.
 *
 * Color scheme rationale:
 * - Percentile bands: green (optimistic p90/p75) to red (pessimistic p10/p25)
 * - Median (p50) in blue for neutral prominence
 * - Positive/negative follow financial conventions (green=good, red=bad)
 */
export const DEFAULT_CHART_THEME: ChartTheme = {
  // Primary palette - blue-based professional look
  primary: '#2563eb',    // blue-600
  secondary: '#64748b',  // slate-500
  accent: '#8b5cf6',     // violet-500

  // Percentile bands: green (optimistic) -> blue (median) -> red (pessimistic)
  percentiles: {
    p90: '#22c55e',      // green-500 (most optimistic)
    p75: '#86efac',      // green-300 (optimistic)
    p50: '#3b82f6',      // blue-500 (median)
    p25: '#fdba74',      // orange-300 (pessimistic)
    p10: '#ef4444',      // red-500 (most pessimistic)
  },

  // Financial positive/negative
  positive: '#16a34a',   // green-600
  negative: '#dc2626',   // red-600

  // Chart canvas
  background: '#ffffff',
  grid: '#e2e8f0',       // slate-200
  text: '#1e293b',       // slate-800
};

/**
 * Alpha (transparency) values for filled areas in charts.
 * Used for percentile bands to allow overlapping visibility.
 */
export const CHART_ALPHA = {
  /** Fill opacity for percentile bands */
  bandFill: 0.3,
  /** Line opacity */
  line: 1.0,
  /** Hover state opacity */
  hover: 0.8,
} as const;
