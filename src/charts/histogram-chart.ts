/**
 * Histogram Chart Web Component
 *
 * Displays terminal net worth distribution as a histogram.
 * Shows spread of simulation outcomes across value ranges (bins).
 *
 * Requirements (VIZ-02):
 * - X-axis: value ranges (bins)
 * - Y-axis: frequency/count
 * - Bar color gradient based on value
 */
import { ChartConfiguration } from 'chart.js';
import { BaseChart } from './base-chart';
import { HistogramData, HistogramBin, DEFAULT_CHART_THEME } from './types';

/**
 * Creates histogram bins from an array of values.
 *
 * @param values - Array of numeric values to bin
 * @param binCount - Number of bins to create (default 20)
 * @returns HistogramData structure with bins and binWidth
 *
 * @example
 * ```typescript
 * const terminalValues = [1000000, 1200000, 950000, 1800000, ...];
 * const histogramData = createHistogramBins(terminalValues, 20);
 * ```
 */
export function createHistogramBins(values: number[], binCount: number = 20): HistogramData {
  if (values.length === 0) {
    return { bins: [], binWidth: 0 };
  }

  // Find min/max
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  // Handle edge case where all values are the same
  if (min === max) {
    return {
      bins: [{ min, max: max + 1, count: values.length }],
      binWidth: 1,
    };
  }

  // Calculate bin width
  const binWidth = (max - min) / binCount;

  // Initialize bins
  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({
      min: min + i * binWidth,
      max: min + (i + 1) * binWidth,
      count: 0,
    });
  }

  // Count values in each bin
  for (const value of values) {
    // Calculate which bin this value belongs to
    let binIndex = Math.floor((value - min) / binWidth);
    // Handle edge case where value equals max (put in last bin)
    if (binIndex >= binCount) {
      binIndex = binCount - 1;
    }
    bins[binIndex].count++;
  }

  return { bins, binWidth };
}

/**
 * Formats a number as compact currency (e.g., "$1.2M")
 */
function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000).toFixed(1)}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

/**
 * Generates bar colors based on position in distribution.
 * Gradient from red (low values) through yellow to green (high values).
 *
 * @param index - Index of the bar
 * @param total - Total number of bars
 * @returns CSS color string
 */
function getHistogramBarColor(index: number, total: number): string {
  const ratio = total > 1 ? index / (total - 1) : 0.5;

  // Gradient: red (0) -> yellow (0.5) -> green (1)
  if (ratio < 0.5) {
    // Red to yellow
    const r = 239; // #ef4444 red component
    const g = Math.round(68 + (234 - 68) * (ratio * 2)); // 68 (red) to 234 (yellow)
    const b = 68;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to green
    const r = Math.round(234 - (234 - 34) * ((ratio - 0.5) * 2)); // 234 (yellow) to 34 (green)
    const g = Math.round(179 + (197 - 179) * ((ratio - 0.5) * 2)); // 179 to 197
    const b = 8 + Math.round((94 - 8) * ((ratio - 0.5) * 2)); // 8 to 94
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Histogram chart component for displaying terminal value distributions.
 *
 * @example
 * ```html
 * <histogram-chart></histogram-chart>
 *
 * <script>
 *   const chart = document.querySelector('histogram-chart');
 *   chart.data = createHistogramBins(terminalValues, 20);
 * </script>
 * ```
 */
export class HistogramChart extends BaseChart {
  /** Histogram data to display */
  public data: HistogramData | null = null;

  protected getChartConfig(): ChartConfiguration {
    const bins = this.data?.bins ?? [];
    const binCount = bins.length;

    // Generate labels (bin ranges)
    const labels = bins.map(
      (bin) => `${formatCompactCurrency(bin.min)} - ${formatCompactCurrency(bin.max)}`
    );

    // Generate colors based on position
    const colors = bins.map((_, index) => getHistogramBarColor(index, binCount));

    // Generate data (counts)
    const data = bins.map((bin) => bin.count);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Frequency',
            data,
            backgroundColor: colors,
            borderColor: colors.map((c) => c.replace('rgb', 'rgba').replace(')', ', 0.8)')),
            borderWidth: 1,
            barPercentage: 1.0, // No gap between bars for histogram look
            categoryPercentage: 1.0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // Hide legend for histogram
          },
          tooltip: {
            callbacks: {
              title: (context) => {
                const index = context[0].dataIndex;
                const bin = bins[index];
                if (!bin) return '';
                return `${formatCompactCurrency(bin.min)} - ${formatCompactCurrency(bin.max)}`;
              },
              label: (context) => {
                const count = context.raw as number;
                return `Count: ${count} iterations`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Terminal Net Worth',
              color: DEFAULT_CHART_THEME.text,
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              color: DEFAULT_CHART_THEME.text,
            },
            grid: {
              display: false,
            },
          },
          y: {
            title: {
              display: true,
              text: 'Iterations',
              color: DEFAULT_CHART_THEME.text,
            },
            ticks: {
              stepSize: 1,
              color: DEFAULT_CHART_THEME.text,
            },
            grid: {
              color: DEFAULT_CHART_THEME.grid,
            },
            beginAtZero: true,
          },
        },
      },
    };
  }

  /**
   * Update histogram with new data.
   * More efficient than re-rendering for data-only changes.
   */
  public setData(data: HistogramData): void {
    this.data = data;
    if (this.chart) {
      const config = this.getChartConfig();
      this.updateData(config.data!);
    } else {
      this.render();
    }
  }
}

// Register custom element
customElements.define('histogram-chart', HistogramChart);
