/**
 * SBLOC Utilization Chart Web Component.
 *
 * Visualizes SBLOC usage percentage over time with percentile bands.
 * Shows how close the borrower gets to maximum borrowing limits.
 *
 * Features:
 * - Percentile lines (P10, P25, P50, P75, P90) showing utilization spread
 * - Fill between bands for visual uncertainty
 * - Reference line at maxBorrowing limit
 * - Y-axis: Percentage (0-200%+)
 * - Legend for percentiles
 * - Color gradient from green (low utilization) to red (high)
 */
import { ChartConfiguration, Plugin } from 'chart.js';
import { BaseChart } from './base-chart';
import { getChartTheme } from './theme';
import { ChartTheme, CHART_ALPHA } from './types';

/**
 * Data structure for SBLOC utilization chart
 */
export interface SBLOCUtilizationChartData {
  /** Year labels for x-axis */
  labels: string[];
  /** P10 utilization (optimistic - lower utilization) */
  p10: number[];
  /** P25 utilization */
  p25: number[];
  /** P50 utilization (median) */
  p50: number[];
  /** P75 utilization */
  p75: number[];
  /** P90 utilization (pessimistic - higher utilization) */
  p90: number[];
  /** Maximum borrowing limit (e.g., 65 for 65%) */
  maxBorrowing: number;
}

/**
 * Web Component for SBLOC utilization chart with percentile bands.
 *
 * Usage:
 * ```html
 * <sbloc-utilization-chart></sbloc-utilization-chart>
 * ```
 *
 * Set data via property:
 * ```typescript
 * const chart = document.querySelector('sbloc-utilization-chart');
 * chart.data = {
 *   labels: ['Year 0', 'Year 5', 'Year 10', 'Year 15', 'Year 20', 'Year 25', 'Year 30'],
 *   p10: [10, 15, 20, 25, 28, 30, 32],
 *   p25: [15, 22, 30, 35, 40, 45, 48],
 *   p50: [20, 30, 40, 48, 55, 58, 60],
 *   p75: [25, 38, 52, 62, 70, 75, 78],
 *   p90: [30, 48, 65, 80, 90, 95, 100],
 *   maxBorrowing: 65,
 * };
 * ```
 */
export class SBLOCUtilizationChart extends BaseChart {
  /** Chart data for utilization */
  private _data: SBLOCUtilizationChartData | null = null;

  /** Set chart data and trigger update */
  set data(value: SBLOCUtilizationChartData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateData(this.buildChartData(value));
      // Update annotation line
      this.chart.options.plugins = this.buildPluginOptions(value.maxBorrowing);
      this.chart.update();
    }
  }

  /** Get current chart data */
  get data(): SBLOCUtilizationChartData | null {
    return this._data;
  }

  /**
   * Public method to set data (alternative to property setter)
   */
  setData(data: SBLOCUtilizationChartData): void {
    this.data = data;
  }

  /**
   * Percentage formatter for Y-axis labels.
   */
  private formatPercent(value: number): string {
    return `${value.toFixed(0)}%`;
  }

  /**
   * Build Chart.js data structure from SBLOCUtilizationChartData.
   * Orders datasets from P90 (top) to P10 (bottom) for proper fill layering.
   */
  private buildChartData(chartData: SBLOCUtilizationChartData) {
    const { labels, p10, p25, p50, p75, p90 } = chartData;
    const alpha = CHART_ALPHA.bandFill;

    // Color scheme: gradient from green (low utilization) to red (high)
    // Note: P10 = low utilization (good) = green
    //       P90 = high utilization (risky) = red
    const colors = {
      p10: '#22c55e',  // green-500 (most optimistic - lowest utilization)
      p25: '#84cc16',  // lime-500
      p50: '#eab308',  // yellow-500 (median)
      p75: '#f97316',  // orange-500
      p90: '#ef4444',  // red-500 (most pessimistic - highest utilization)
    };

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
        // P90 - top line (highest utilization, pessimistic)
        {
          label: 'P90 (High Risk)',
          data: p90,
          borderColor: colors.p90,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P75-P90 fill
        {
          label: 'P75-P90 Range',
          data: p75,
          borderColor: colors.p75,
          backgroundColor: withAlpha(colors.p90, alpha),
          borderWidth: 1,
          fill: '-1',
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P50-P75 fill
        {
          label: 'P50 (Median)',
          data: p50,
          borderColor: colors.p50,
          backgroundColor: withAlpha(colors.p75, alpha),
          borderWidth: 2,
          fill: '-1',
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P25-P50 fill
        {
          label: 'P25-P50 Range',
          data: p25,
          borderColor: colors.p25,
          backgroundColor: withAlpha(colors.p50, alpha),
          borderWidth: 1,
          fill: '-1',
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        // P10-P25 fill
        {
          label: 'P10 (Low Risk)',
          data: p10,
          borderColor: colors.p10,
          backgroundColor: withAlpha(colors.p25, alpha),
          borderWidth: 2,
          borderDash: [5, 5],
          fill: '-1',
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }

  /**
   * Build plugin options including annotation line for max borrowing.
   */
  private buildPluginOptions(maxBorrowing: number) {
    const theme = getChartTheme();

    return {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: theme.text,
          filter: (item: { text?: string }) => {
            const label = item.text || '';
            return !label.includes('Range');
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${this.formatPercent(value)}`;
          },
        },
      },
    };
  }

  /**
   * Create annotation plugin for max borrowing reference line.
   */
  private createAnnotationPlugin(): Plugin {
    const maxBorrowing = this._data?.maxBorrowing || 65;

    return {
      id: 'maxBorrowingLine',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const yScale = chart.scales.y;
        const xScale = chart.scales.x;

        if (!yScale || !xScale) return;

        const y = yScale.getPixelForValue(maxBorrowing);

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#dc2626';  // red-600
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.moveTo(xScale.left, y);
        ctx.lineTo(xScale.right, y);
        ctx.stroke();

        // Add label
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Max Borrowing (${maxBorrowing}%)`, xScale.left + 5, y - 5);
        ctx.restore();
      },
    };
  }

  /**
   * Update dataset colors when theme changes.
   * SBLOC utilization uses risk-based gradient colors (green to red) that work on both themes.
   */
  protected updateDatasetColors(_theme: ChartTheme): void {
    // Risk gradient colors (green-to-red) are designed to work on both light and dark
    // No update needed as these are theme-independent
  }

  /**
   * Returns Chart.js configuration for SBLOC utilization chart.
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

    const maxBorrowing = this._data?.maxBorrowing || 65;

    // Calculate dynamic Y-axis max based on actual data range
    const dataMax = this._data
      ? Math.max(
          ...this._data.p10,
          ...this._data.p25,
          ...this._data.p50,
          ...this._data.p75,
          ...this._data.p90,
          this._data.maxBorrowing
        )
      : 65;

    // Add 15% padding and round up to nearest 5 for clean tick marks
    const paddedMax = dataMax * 1.15;
    const suggestedMax = Math.ceil(paddedMax / 5) * 5;

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
        plugins: this.buildPluginOptions(maxBorrowing),
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
              text: 'Utilization (%)',
              color: theme.text,
            },
            grid: {
              color: theme.grid,
            },
            ticks: {
              color: theme.text,
              callback: (value) =>
                this.formatPercent(value as number),
            },
            min: 0,
            suggestedMax: suggestedMax,
          },
        },
      },
      plugins: [this.createAnnotationPlugin()],
    };
  }
}

// Register the custom element
customElements.define('sbloc-utilization-chart', SBLOCUtilizationChart);
