/**
 * Comparison Line Chart Web Component.
 *
 * Visualizes BBD vs Sell strategy net worth trajectories over time.
 * Two lines showing median path for each strategy with fill between
 * to highlight the difference (advantage/disadvantage).
 *
 * Features:
 * - Two lines: BBD (teal/green), Sell (blue)
 * - Fill between lines to show difference
 * - Legend showing both strategies
 * - Y-axis: Currency formatting
 * - X-axis: Years
 * - Tooltips showing both values
 */
import { ChartConfiguration } from 'chart.js';
import { BaseChart } from './base-chart';
import { getChartTheme } from './theme';
import { ChartTheme, CHART_ALPHA } from './types';

/**
 * Data structure for comparison line chart
 */
export interface ComparisonLineChartData {
  /** Year labels for x-axis */
  labels: string[];
  /** BBD strategy median net worth values */
  bbdValues: number[];
  /** Sell strategy median net worth values */
  sellValues: number[];
}

/**
 * Web Component for BBD vs Sell comparison line chart.
 *
 * Usage:
 * ```html
 * <comparison-line-chart></comparison-line-chart>
 * ```
 *
 * Set data via property:
 * ```typescript
 * const chart = document.querySelector('comparison-line-chart');
 * chart.data = {
 *   labels: ['Year 0', 'Year 5', 'Year 10', 'Year 15', 'Year 20', 'Year 25', 'Year 30'],
 *   bbdValues: [1000000, 1400000, 1960000, 2744000, 3842000, 5378000, 7530000],
 *   sellValues: [1000000, 1200000, 1440000, 1728000, 2074000, 2488000, 2986000],
 * };
 * ```
 */
export class ComparisonLineChart extends BaseChart {
  /** Chart data for comparison */
  private _data: ComparisonLineChartData | null = null;

  /** Set chart data and trigger update */
  set data(value: ComparisonLineChartData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateData(this.buildChartData(value));
    }
  }

  /** Get current chart data */
  get data(): ComparisonLineChartData | null {
    return this._data;
  }

  /**
   * Public method to set data (alternative to property setter)
   */
  setData(data: ComparisonLineChartData): void {
    this.data = data;
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
   * Build Chart.js data structure from ComparisonLineChartData.
   */
  private buildChartData(chartData: ComparisonLineChartData) {
    const { labels, bbdValues, sellValues } = chartData;
    const alpha = CHART_ALPHA.bandFill;

    // BBD color: teal/green
    const bbdColor = '#0d9488';  // teal-600
    // Sell color: blue
    const sellColor = '#3b82f6';  // blue-500

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
        // BBD strategy line
        {
          label: 'Buy Borrow Die',
          data: bbdValues,
          borderColor: bbdColor,
          backgroundColor: withAlpha(bbdColor, alpha),
          borderWidth: 3,
          fill: '1',  // Fill to next dataset (Sell)
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: bbdColor,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
        // Sell strategy line
        {
          label: 'Sell Assets',
          data: sellValues,
          borderColor: sellColor,
          backgroundColor: 'transparent',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: sellColor,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }

  /**
   * Update dataset colors when theme changes.
   * Comparison chart uses fixed BBD/Sell colors that work on both themes.
   */
  protected updateDatasetColors(_theme: ChartTheme): void {
    // BBD (teal) and Sell (blue) colors are designed to work on both light and dark
    // No update needed as these are theme-independent
  }

  /**
   * Returns Chart.js configuration for comparison line chart.
   */
  protected getChartConfig(): ChartConfiguration {
    const theme = getChartTheme();
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
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${this.formatCurrency(value)}`;
              },
              afterBody: (tooltipItems) => {
                if (tooltipItems.length >= 2) {
                  const bbdValue = tooltipItems[0].parsed.y;
                  const sellValue = tooltipItems[1].parsed.y;
                  const diff = bbdValue - sellValue;
                  const prefix = diff >= 0 ? '+' : '';
                  return `Difference: ${prefix}${this.formatCurrency(diff)}`;
                }
                return '';
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
              text: 'Net Worth',
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
customElements.define('comparison-line-chart', ComparisonLineChart);
