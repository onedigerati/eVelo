/**
 * Cumulative Costs Chart Web Component.
 *
 * Visualizes cumulative costs comparison: Taxes (Sell strategy) vs Interest (BBD strategy).
 * Area chart showing cost accumulation over time.
 *
 * Features:
 * - Two filled areas: Taxes (red/coral), Interest (green)
 * - Semi-transparent fills for visual clarity
 * - Legend distinguishing both cost types
 * - Y-axis: Currency formatting
 * - X-axis: Years
 * - Tooltips showing cost comparison
 */
import { ChartConfiguration } from 'chart.js';
import { BaseChart } from './base-chart';
import { DEFAULT_CHART_THEME, CHART_ALPHA } from './types';

/**
 * Data structure for cumulative costs chart
 */
export interface CumulativeCostsChartData {
  /** Year labels for x-axis */
  labels: string[];
  /** Sell strategy cumulative capital gains taxes */
  taxes: number[];
  /** BBD cumulative interest costs */
  interest: number[];
}

/**
 * Web Component for cumulative costs comparison chart.
 *
 * Usage:
 * ```html
 * <cumulative-costs-chart></cumulative-costs-chart>
 * ```
 *
 * Set data via property:
 * ```typescript
 * const chart = document.querySelector('cumulative-costs-chart');
 * chart.data = {
 *   labels: ['Year 0', 'Year 5', 'Year 10', 'Year 15', 'Year 20', 'Year 25', 'Year 30'],
 *   taxes: [0, 50000, 120000, 210000, 320000, 450000, 600000],
 *   interest: [0, 35000, 85000, 150000, 230000, 330000, 450000],
 * };
 * ```
 */
export class CumulativeCostsChart extends BaseChart {
  /** Chart data for costs comparison */
  private _data: CumulativeCostsChartData | null = null;

  /** Set chart data and trigger update */
  set data(value: CumulativeCostsChartData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateData(this.buildChartData(value));
    }
  }

  /** Get current chart data */
  get data(): CumulativeCostsChartData | null {
    return this._data;
  }

  /**
   * Public method to set data (alternative to property setter)
   */
  setData(data: CumulativeCostsChartData): void {
    this.data = data;
  }

  /**
   * Currency formatter for Y-axis labels.
   * Uses compact notation for large values (e.g., $150K).
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
   * Build Chart.js data structure from CumulativeCostsChartData.
   */
  private buildChartData(chartData: CumulativeCostsChartData) {
    const { labels, taxes, interest } = chartData;
    const alpha = 0.5;  // Higher opacity for area fill visibility

    // Taxes color: coral/red
    const taxColor = '#ef4444';  // red-500
    // Interest color: teal/green
    const interestColor = '#0d9488';  // teal-600

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
        // Taxes area (Sell strategy cost)
        {
          label: 'Capital Gains Taxes (Sell)',
          data: taxes,
          borderColor: taxColor,
          backgroundColor: withAlpha(taxColor, alpha),
          borderWidth: 2,
          fill: 'origin',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: taxColor,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
        // Interest area (BBD strategy cost)
        {
          label: 'Cumulative Interest (BBD)',
          data: interest,
          borderColor: interestColor,
          backgroundColor: withAlpha(interestColor, alpha),
          borderWidth: 2,
          fill: 'origin',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: interestColor,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }

  /**
   * Returns Chart.js configuration for cumulative costs chart.
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
              pointStyle: 'rect',  // Rectangle for area charts
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
                  const taxValue = tooltipItems[0].parsed.y;
                  const interestValue = tooltipItems[1].parsed.y;
                  const savings = taxValue - interestValue;
                  if (savings > 0) {
                    return `BBD Saves: ${this.formatCurrency(savings)}`;
                  } else if (savings < 0) {
                    return `Sell Saves: ${this.formatCurrency(Math.abs(savings))}`;
                  }
                  return 'Cost Equal';
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
              text: 'Cumulative Cost',
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
customElements.define('cumulative-costs-chart', CumulativeCostsChart);
