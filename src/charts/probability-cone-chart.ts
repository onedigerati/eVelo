/**
 * Probability Cone Chart Web Component.
 *
 * Visualizes portfolio value projections with percentile bands over time.
 * Shows uncertainty via filled areas between percentile lines.
 *
 * Percentile bands:
 * - P90 (green): Most optimistic - 90th percentile
 * - P75 (light green): Optimistic - 75th percentile
 * - P50 (blue): Median - 50th percentile
 * - P25 (orange): Pessimistic - 25th percentile
 * - P10 (red): Most pessimistic - 10th percentile
 */
import { ChartConfiguration } from 'chart.js';
import { BaseChart } from './base-chart';
import {
  ProbabilityConeData,
  DEFAULT_CHART_THEME,
  CHART_ALPHA,
} from './types';

/**
 * Web Component for probability cone/fan charts.
 *
 * Usage:
 * ```html
 * <probability-cone-chart></probability-cone-chart>
 * ```
 *
 * Set data via property:
 * ```typescript
 * const chart = document.querySelector('probability-cone-chart');
 * chart.data = {
 *   years: [0, 1, 2, 3, 4, 5],
 *   bands: {
 *     p10: [100000, 95000, 90000, 85000, 80000, 75000],
 *     p25: [100000, 102000, 105000, 108000, 110000, 115000],
 *     p50: [100000, 107000, 115000, 123000, 132000, 141000],
 *     p75: [100000, 112000, 125000, 140000, 157000, 175000],
 *     p90: [100000, 118000, 140000, 165000, 195000, 230000],
 *   }
 * };
 * ```
 */
export class ProbabilityConeChart extends BaseChart {
  /** Chart data with percentile bands */
  private _data: ProbabilityConeData | null = null;

  /** Set chart data and trigger update */
  set data(value: ProbabilityConeData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateData(this.buildChartData(value));
    }
  }

  /** Get current chart data */
  get data(): ProbabilityConeData | null {
    return this._data;
  }

  /**
   * Currency formatter for Y-axis labels.
   * Uses compact notation for large values (e.g., $1.5M).
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  /**
   * Build Chart.js data structure from ProbabilityConeData.
   * Creates layered datasets for filled band visualization.
   */
  private buildChartData(coneData: ProbabilityConeData) {
    const { years, bands } = coneData;
    const labels = years.map((y) => `Year ${y}`);
    const alpha = CHART_ALPHA.bandFill;
    const theme = DEFAULT_CHART_THEME;

    // Helper to add alpha to hex color
    const withAlpha = (hex: string, a: number): string => {
      const alpha256 = Math.round(a * 255)
        .toString(16)
        .padStart(2, '0');
      return hex + alpha256;
    };

    return {
      labels,
      datasets: [
        // P90 upper boundary - dashed line
        {
          label: 'P90 (Optimistic)',
          data: bands.p90,
          borderColor: theme.percentiles.p90,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P90-P75 fill area
        {
          label: 'P75-P90 Range',
          data: bands.p75,
          borderColor: theme.percentiles.p75,
          backgroundColor: withAlpha(theme.percentiles.p90, alpha),
          borderWidth: 1,
          fill: '-1', // Fill to previous dataset (P90)
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P75-P50 fill area
        {
          label: 'P50-P75 Range',
          data: bands.p50,
          borderColor: theme.percentiles.p50,
          backgroundColor: withAlpha(theme.percentiles.p75, alpha),
          borderWidth: 2,
          fill: '-1', // Fill to previous dataset (P75)
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P50-P25 fill area
        {
          label: 'P25-P50 Range',
          data: bands.p25,
          borderColor: theme.percentiles.p25,
          backgroundColor: withAlpha(theme.percentiles.p25, alpha),
          borderWidth: 1,
          fill: '-1', // Fill to previous dataset (P50)
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P25-P10 fill area
        {
          label: 'P10-P25 Range',
          data: bands.p10,
          borderColor: theme.percentiles.p10,
          backgroundColor: withAlpha(theme.percentiles.p10, alpha),
          borderWidth: 2,
          borderDash: [5, 5],
          fill: '-1', // Fill to previous dataset (P25)
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }

  /**
   * Returns Chart.js configuration for probability cone chart.
   */
  protected getChartConfig(): ChartConfiguration {
    const theme = DEFAULT_CHART_THEME;
    const emptyData = {
      labels: [],
      datasets: [],
    };

    const chartData = this._data
      ? this.buildChartData(this._data)
      : emptyData;

    return {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: theme.text,
              // Filter out fill-only datasets from legend
              filter: (item) => {
                const label = item.text || '';
                return !label.includes('Range');
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${this.formatCurrency(value)}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Year',
              color: theme.text,
            },
            grid: {
              color: theme.grid,
            },
            ticks: {
              color: theme.text,
            },
          },
          y: {
            title: {
              display: true,
              text: 'Portfolio Value',
              color: theme.text,
            },
            grid: {
              color: theme.grid,
            },
            ticks: {
              color: theme.text,
              callback: (value) =>
                this.formatCurrency(value as number),
            },
          },
        },
      },
    };
  }
}

// Register the custom element
customElements.define('probability-cone-chart', ProbabilityConeChart);
