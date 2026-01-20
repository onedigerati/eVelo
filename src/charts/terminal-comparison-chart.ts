/**
 * Terminal Comparison Chart Web Component.
 *
 * Visualizes terminal value distributions for BBD vs Sell strategies
 * across different percentiles using grouped bar chart.
 *
 * Features:
 * - Grouped bars at each percentile (P10, P25, P50, P75, P90)
 * - BBD (teal) and Sell (blue) side by side
 * - Legend distinguishing strategies
 * - Y-axis: Currency formatting
 * - Rounded bar corners
 * - Responsive width
 */
import { ChartConfiguration } from 'chart.js';
import { BaseChart } from './base-chart';
import { DEFAULT_CHART_THEME } from './types';

/**
 * Data structure for terminal comparison chart
 */
export interface TerminalComparisonChartData {
  /** Percentile labels: ['10th', '25th', '50th', '75th', '90th'] */
  percentiles: string[];
  /** BBD strategy terminal values at each percentile */
  bbdValues: number[];
  /** Sell strategy terminal values at each percentile */
  sellValues: number[];
}

/**
 * Web Component for terminal value distribution comparison.
 *
 * Usage:
 * ```html
 * <terminal-comparison-chart></terminal-comparison-chart>
 * ```
 *
 * Set data via property:
 * ```typescript
 * const chart = document.querySelector('terminal-comparison-chart');
 * chart.data = {
 *   percentiles: ['10th', '25th', '50th', '75th', '90th'],
 *   bbdValues: [2500000, 4500000, 7500000, 12000000, 18000000],
 *   sellValues: [1500000, 2800000, 4500000, 7000000, 10000000],
 * };
 * ```
 */
export class TerminalComparisonChart extends BaseChart {
  /** Chart data for terminal comparison */
  private _data: TerminalComparisonChartData | null = null;

  /** Set chart data and trigger update */
  set data(value: TerminalComparisonChartData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateData(this.buildChartData(value));
    }
  }

  /** Get current chart data */
  get data(): TerminalComparisonChartData | null {
    return this._data;
  }

  /**
   * Public method to set data (alternative to property setter)
   */
  setData(data: TerminalComparisonChartData): void {
    this.data = data;
  }

  /**
   * Currency formatter for values.
   * Uses compact notation for large values (e.g., $7.5M).
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
   * Build Chart.js data structure from TerminalComparisonChartData.
   */
  private buildChartData(chartData: TerminalComparisonChartData) {
    const { percentiles, bbdValues, sellValues } = chartData;

    // BBD color: teal
    const bbdColor = '#0d9488';  // teal-600
    // Sell color: blue
    const sellColor = '#3b82f6';  // blue-500

    return {
      labels: percentiles,
      datasets: [
        // BBD bars
        {
          label: 'Buy Borrow Die',
          data: bbdValues,
          backgroundColor: bbdColor,
          borderColor: bbdColor,
          borderWidth: 0,
          borderRadius: 4,  // Rounded corners
          borderSkipped: false,
        },
        // Sell bars
        {
          label: 'Sell Assets',
          data: sellValues,
          backgroundColor: sellColor,
          borderColor: sellColor,
          borderWidth: 0,
          borderRadius: 4,  // Rounded corners
          borderSkipped: false,
        },
      ],
    };
  }

  /**
   * Returns Chart.js configuration for terminal comparison chart.
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
      type: 'bar',
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
              pointStyle: 'rect',
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
                  const percent = sellValue > 0 ? ((diff / sellValue) * 100).toFixed(0) : 0;
                  const prefix = diff >= 0 ? '+' : '';
                  return [
                    '',
                    `BBD Advantage: ${prefix}${this.formatCurrency(diff)}`,
                    `(${prefix}${percent}%)`,
                  ];
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
              text: 'Percentile',
              color: theme.text,
            },
            grid: {
              display: false,
            },
            ticks: {
              color: theme.text,
            },
          },
          y: {
            title: {
              display: true,
              text: 'Terminal Value',
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
            beginAtZero: true,
          },
        },
      },
    };
  }
}

// Register the custom element
customElements.define('terminal-comparison-chart', TerminalComparisonChart);
