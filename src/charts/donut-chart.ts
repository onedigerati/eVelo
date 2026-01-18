/**
 * Donut chart component for portfolio composition visualization.
 * Shows asset allocation as a doughnut chart with percentages.
 */
import { ChartConfiguration, DoughnutController, ArcElement } from 'chart.js';
import { BaseChart } from './base-chart';
import { DonutChartData } from './types';

// Type for doughnut-specific configuration
type DoughnutChartConfiguration = ChartConfiguration<'doughnut'>;

/**
 * Default color palette for donut segments.
 * Designed for up to 5 assets with distinguishable colors.
 */
const DONUT_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#dc2626', // red
  '#9333ea', // purple
  '#ea580c', // orange
];

/**
 * Generate additional colors programmatically for portfolios with > 5 assets.
 * Uses HSL color space for even distribution.
 */
function generateColor(index: number): string {
  // Start after predefined colors, distribute hue evenly
  const hue = ((index - DONUT_COLORS.length) * 137.5) % 360; // Golden angle
  return `hsl(${hue}, 65%, 50%)`;
}

/**
 * Get color for a segment by index, using predefined or generated colors.
 */
function getSegmentColor(index: number, customColor?: string): string {
  if (customColor) {
    return customColor;
  }
  if (index < DONUT_COLORS.length) {
    return DONUT_COLORS[index];
  }
  return generateColor(index);
}

/**
 * Donut chart Web Component for portfolio composition.
 *
 * Usage:
 * ```html
 * <donut-chart></donut-chart>
 * ```
 *
 * Set data via property:
 * ```javascript
 * const chart = document.querySelector('donut-chart');
 * chart.data = {
 *   segments: [
 *     { label: 'Stocks', value: 60 },
 *     { label: 'Bonds', value: 30 },
 *     { label: 'Cash', value: 10 }
 *   ]
 * };
 * ```
 */
export class DonutChart extends BaseChart {
  /** Chart data - set to trigger render */
  private _data: DonutChartData | null = null;

  /** Center text to display (e.g., "Portfolio" or total value) */
  private _centerText: string = 'Portfolio';

  /**
   * Get current chart data.
   */
  get data(): DonutChartData | null {
    return this._data;
  }

  /**
   * Set chart data and update the chart.
   */
  set data(value: DonutChartData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateChartData();
    } else if (value) {
      // If chart not yet created, trigger render
      this.render();
    }
  }

  /**
   * Get center text.
   */
  get centerText(): string {
    return this._centerText;
  }

  /**
   * Set center text displayed in the donut hole.
   */
  set centerText(value: string) {
    this._centerText = value;
    if (this.chart) {
      this.chart.update();
    }
  }

  /**
   * Update chart data without full re-render.
   */
  private updateChartData(): void {
    if (!this.chart || !this._data) return;

    const labels = this._data.segments.map(s => s.label);
    const values = this._data.segments.map(s => s.value);
    const colors = this._data.segments.map((s, i) => getSegmentColor(i, s.color));

    this.updateData({
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2,
      }],
    });
  }

  /**
   * Returns Chart.js doughnut configuration.
   */
  protected getChartConfig(): DoughnutChartConfiguration {
    const data = this._data;
    const labels = data?.segments.map(s => s.label) ?? [];
    const values = data?.segments.map(s => s.value) ?? [];
    const colors = data?.segments.map((s, i) => getSegmentColor(i, s.color)) ?? [];

    // Calculate total for percentage display
    const total = values.reduce((sum, v) => sum + v, 0);

    // Reference to this for plugin closure
    const centerText = this._centerText;

    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              generateLabels: (chart) => {
                const chartData = chart.data;
                if (!chartData.labels || !chartData.datasets[0]) {
                  return [];
                }
                const datasetData = chartData.datasets[0].data as number[];
                const dataTotal = datasetData.reduce((sum, v) => sum + (v as number), 0);

                return chartData.labels.map((label, index) => {
                  const value = datasetData[index] as number;
                  const percentage = dataTotal > 0 ? ((value / dataTotal) * 100).toFixed(1) : '0.0';
                  const bgColors = chartData.datasets[0].backgroundColor as string[];

                  return {
                    text: `${label}: ${percentage}%`,
                    fillStyle: bgColors[index],
                    strokeStyle: '#ffffff',
                    lineWidth: 1,
                    hidden: false,
                    index,
                  };
                });
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const tooltipTotal = (context.dataset.data as number[]).reduce((sum, v) => sum + v, 0);
                const percentage = tooltipTotal > 0 ? ((value / tooltipTotal) * 100).toFixed(1) : '0.0';
                return `${context.label}: ${percentage}%`;
              },
            },
          },
        },
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx, width, height } = chart;
          ctx.save();

          // Calculate center position
          const centerX = width / 2;
          const centerY = height / 2;

          // Draw center text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#1e293b';
          ctx.fillText(centerText, centerX, centerY);

          ctx.restore();
        },
      }],
    };
  }
}

// Register the custom element
customElements.define('donut-chart', DonutChart);
