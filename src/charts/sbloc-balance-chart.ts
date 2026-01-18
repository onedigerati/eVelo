/**
 * SBLOC Balance Line Chart Web Component.
 *
 * Visualizes loan balance trajectory over time with multiple line series.
 * Supports display of:
 * - Loan balance (primary, solid line)
 * - Cumulative withdrawals (dashed line, optional)
 * - Interest accrued (dotted line, optional)
 */
import { ChartConfiguration } from 'chart.js';
import { BaseChart } from './base-chart';
import { LineChartData, DEFAULT_CHART_THEME } from './types';

/**
 * Line styles for different data series.
 */
const LINE_STYLES: { solid: number[]; dashed: number[]; dotted: number[] } = {
  /** Solid line for primary series (loan balance) */
  solid: [],
  /** Dashed line for secondary series (cumulative withdrawals) */
  dashed: [8, 4],
  /** Dotted line for tertiary series (interest accrued) */
  dotted: [2, 4],
};

/**
 * Default colors for line series.
 */
const LINE_COLORS = [
  '#2563eb', // blue - primary (loan balance)
  '#16a34a', // green - secondary (cumulative withdrawals)
  '#dc2626', // red - tertiary (interest accrued)
  '#9333ea', // purple - additional series
  '#ea580c', // orange - additional series
];

/**
 * SBLOC Balance Chart Web Component.
 *
 * Usage:
 * ```html
 * <sbloc-balance-chart></sbloc-balance-chart>
 * ```
 *
 * Set data via property:
 * ```javascript
 * const chart = document.querySelector('sbloc-balance-chart');
 * chart.data = {
 *   labels: ['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
 *   datasets: [
 *     { label: 'Loan Balance', data: [0, 50000, 102500, 157600, 215400, 276100] },
 *     { label: 'Cumulative Withdrawals', data: [0, 50000, 100000, 150000, 200000, 250000] },
 *     { label: 'Interest Accrued', data: [0, 0, 2500, 7600, 15400, 26100] }
 *   ]
 * };
 * ```
 */
export class SBLOCBalanceChart extends BaseChart {
  /** Chart data with line series */
  private _data: LineChartData | null = null;

  /** Set chart data and trigger update */
  set data(value: LineChartData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateData(this.buildChartData(value));
    }
  }

  /** Get current chart data */
  get data(): LineChartData | null {
    return this._data;
  }

  /**
   * Currency formatter for Y-axis labels.
   * Uses compact notation for large values (e.g., $250K).
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
   * Get line style based on dataset index.
   * First dataset is solid, second is dashed, third is dotted.
   */
  private getLineStyle(index: number): number[] {
    if (index === 0) return LINE_STYLES.solid;
    if (index === 1) return LINE_STYLES.dashed;
    return LINE_STYLES.dotted;
  }

  /**
   * Get line color based on dataset index and optional custom color.
   */
  private getLineColor(index: number, customColor?: string): string {
    if (customColor) return customColor;
    return LINE_COLORS[index % LINE_COLORS.length];
  }

  /**
   * Build Chart.js data structure from LineChartData.
   */
  private buildChartData(lineData: LineChartData) {
    const { labels, datasets } = lineData;

    return {
      labels,
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: this.getLineColor(index, dataset.color),
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: this.getLineStyle(index),
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: this.getLineColor(index, dataset.color),
        fill: false,
      })),
    };
  }

  /**
   * Returns Chart.js configuration for SBLOC balance line chart.
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
              usePointStyle: true,
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
              text: 'Amount ($)',
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
customElements.define('sbloc-balance-chart', SBLOCBalanceChart);
