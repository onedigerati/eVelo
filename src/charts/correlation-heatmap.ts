/**
 * Correlation heatmap component for asset correlation visualization.
 * Shows a matrix of correlation values with color-coded cells.
 */
import { Chart, ChartConfiguration, ScriptableContext } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { BaseChart } from './base-chart';
import { HeatmapData } from './types';

// Ensure matrix components are registered (also done in base-chart, but explicit here)
Chart.register(MatrixController, MatrixElement);

/**
 * Color scale for correlation values.
 * Red (negative) -> White (zero) -> Blue (positive)
 */
const CORRELATION_COLORS = {
  negativeStrong: '#dc2626', // red-600
  negativeLight: '#fca5a5',  // red-300
  neutral: '#ffffff',        // white
  positiveLight: '#93c5fd',  // blue-300
  positiveStrong: '#2563eb', // blue-600
};

/**
 * Interpolate between two hex colors.
 * @param color1 - Start color (hex)
 * @param color2 - End color (hex)
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated hex color
 */
function interpolateHexColor(color1: string, color2: string, t: number): string {
  // Parse hex colors
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  // Interpolate
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get color for a correlation value using the diverging color scale.
 * @param value - Correlation coefficient (-1 to 1)
 * @returns Hex color string
 */
export function interpolateColor(value: number): string {
  // Clamp value to valid range
  const clamped = Math.max(-1, Math.min(1, value));

  if (clamped < -0.5) {
    // Strong negative: -1 to -0.5 -> negativeStrong to negativeLight
    const t = (clamped + 1) / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.negativeStrong, CORRELATION_COLORS.negativeLight, t);
  } else if (clamped < 0) {
    // Light negative: -0.5 to 0 -> negativeLight to neutral
    const t = (clamped + 0.5) / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.negativeLight, CORRELATION_COLORS.neutral, t);
  } else if (clamped < 0.5) {
    // Light positive: 0 to 0.5 -> neutral to positiveLight
    const t = clamped / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.neutral, CORRELATION_COLORS.positiveLight, t);
  } else {
    // Strong positive: 0.5 to 1 -> positiveLight to positiveStrong
    const t = (clamped - 0.5) / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.positiveLight, CORRELATION_COLORS.positiveStrong, t);
  }
}

/**
 * Matrix data point format for chartjs-chart-matrix.
 */
interface MatrixDataPoint {
  x: number;
  y: number;
  v: number;
}

/**
 * Correlation Heatmap Web Component.
 *
 * Usage:
 * ```html
 * <correlation-heatmap></correlation-heatmap>
 * ```
 *
 * Set data via property:
 * ```javascript
 * const heatmap = document.querySelector('correlation-heatmap');
 * heatmap.data = {
 *   labels: ['Stocks', 'Bonds', 'REITs'],
 *   matrix: [
 *     [1.0, -0.3, 0.6],
 *     [-0.3, 1.0, 0.2],
 *     [0.6, 0.2, 1.0]
 *   ]
 * };
 * ```
 */
export class CorrelationHeatmap extends BaseChart {
  /** Chart data - set to trigger render */
  private _data: HeatmapData | null = null;

  /**
   * Get current chart data.
   */
  get data(): HeatmapData | null {
    return this._data;
  }

  /**
   * Set chart data and update the chart.
   */
  set data(value: HeatmapData | null) {
    this._data = value;
    if (this.chart && value) {
      this.updateChartData();
    } else if (value) {
      // If chart not yet created, trigger render
      this.render();
    }
  }

  /**
   * Override styles to ensure proper sizing for matrix.
   */
  protected styles(): string {
    return `
      ${super.styles()}

      .chart-container {
        min-width: 300px;
        min-height: 300px;
      }
    `;
  }

  /**
   * Update chart data without full re-render.
   */
  private updateChartData(): void {
    if (!this.chart || !this._data) return;

    const matrixData = this.flattenMatrix(this._data.matrix);

    this.updateData({
      labels: this._data.labels,
      datasets: [{
        label: 'Correlation',
        data: matrixData,
        backgroundColor: (ctx: ScriptableContext<'matrix'>) => {
          const point = ctx.dataset.data[ctx.dataIndex] as MatrixDataPoint;
          return point ? interpolateColor(point.v) : '#ffffff';
        },
        borderColor: '#e5e7eb',
        borderWidth: 1,
        width: ({ chart }) => (chart.chartArea?.width ?? 300) / this._data!.labels.length - 1,
        height: ({ chart }) => (chart.chartArea?.height ?? 300) / this._data!.labels.length - 1,
      }],
    });
  }

  /**
   * Flatten 2D correlation matrix to array of points.
   */
  private flattenMatrix(matrix: number[][]): MatrixDataPoint[] {
    const points: MatrixDataPoint[] = [];

    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        points.push({
          x: col,
          y: row,
          v: matrix[row][col],
        });
      }
    }

    return points;
  }

  /**
   * Returns Chart.js matrix configuration.
   */
  protected getChartConfig(): ChartConfiguration<'matrix'> {
    const data = this._data;
    const labels = data?.labels ?? [];
    const matrixData = data ? this.flattenMatrix(data.matrix) : [];
    const numAssets = labels.length || 1;

    // Store reference for plugins
    const heatmapData = this._data;

    return {
      type: 'matrix',
      data: {
        labels,
        datasets: [{
          label: 'Correlation',
          data: matrixData,
          backgroundColor: (ctx: ScriptableContext<'matrix'>) => {
            const point = ctx.dataset.data[ctx.dataIndex] as MatrixDataPoint;
            return point ? interpolateColor(point.v) : '#ffffff';
          },
          borderColor: '#e5e7eb',
          borderWidth: 1,
          width: ({ chart }) => (chart.chartArea?.width ?? 300) / numAssets - 1,
          height: ({ chart }) => (chart.chartArea?.height ?? 300) / numAssets - 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            type: 'category',
            labels,
            position: 'top',
            grid: {
              display: false,
            },
            ticks: {
              display: true,
            },
          },
          y: {
            type: 'category',
            labels,
            offset: true,
            grid: {
              display: false,
            },
            ticks: {
              display: true,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: () => '',
              label: (context) => {
                const point = context.raw as MatrixDataPoint;
                if (!heatmapData) return '';
                const xLabel = heatmapData.labels[point.x];
                const yLabel = heatmapData.labels[point.y];
                return `${yLabel} vs ${xLabel}: ${point.v.toFixed(2)}`;
              },
            },
          },
        },
      },
      plugins: [{
        id: 'cellLabels',
        afterDatasetsDraw: (chart) => {
          const { ctx } = chart;
          const dataset = chart.data.datasets[0];
          const meta = chart.getDatasetMeta(0);

          if (!meta.data || !heatmapData) return;

          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 12px sans-serif';

          meta.data.forEach((element, index) => {
            const point = dataset.data[index] as MatrixDataPoint;
            if (!point) return;

            // Get element center - cast to access getCenterPoint method
            const matrixElement = element as unknown as { getCenterPoint: () => { x: number; y: number } };
            const { x, y } = matrixElement.getCenterPoint();

            // Choose text color based on background brightness
            const bgColor = interpolateColor(point.v);
            const brightness = parseInt(bgColor.slice(1, 3), 16) * 0.299 +
                              parseInt(bgColor.slice(3, 5), 16) * 0.587 +
                              parseInt(bgColor.slice(5, 7), 16) * 0.114;

            ctx.fillStyle = brightness > 186 ? '#1e293b' : '#ffffff';
            ctx.fillText(point.v.toFixed(2), x, y);
          });

          ctx.restore();
        },
      }],
    };
  }
}

// Register the custom element
customElements.define('correlation-heatmap', CorrelationHeatmap);
