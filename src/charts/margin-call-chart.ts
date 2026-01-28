/**
 * Margin Call Probability Chart Web Component
 *
 * Displays margin call probability by year as a bar chart.
 * Shows annual probability with optional cumulative line overlay.
 *
 * Requirements (VIZ-05):
 * - X-axis: simulation years
 * - Y-axis: probability percentage (0-100%)
 * - Bar colors based on risk level (green->yellow->orange->red)
 * - Optional cumulative probability line
 */
import { ChartConfiguration } from 'chart.js';
import { BaseChart } from './base-chart';
import { getChartTheme } from './theme';
import { BarChartData, ChartTheme } from './types';

/**
 * Risk color thresholds for margin call probability.
 * Based on risk perception:
 * - 0-5%: Low risk (green)
 * - 5-15%: Moderate risk (yellow)
 * - 15-30%: Elevated risk (orange)
 * - 30%+: High risk (red)
 */
const RISK_COLORS = {
  low: '#22c55e',      // green-500
  moderate: '#eab308', // yellow-500
  elevated: '#f97316', // orange-500
  high: '#ef4444',     // red-500
} as const;

/**
 * Get risk-based color for a probability value.
 *
 * @param probability - Probability percentage (0-100)
 * @returns CSS color string
 */
function getRiskColor(probability: number): string {
  if (probability < 5) {
    return RISK_COLORS.low;
  } else if (probability < 15) {
    return RISK_COLORS.moderate;
  } else if (probability < 30) {
    return RISK_COLORS.elevated;
  } else {
    return RISK_COLORS.high;
  }
}

/**
 * Margin call probability chart component.
 *
 * Shows annual margin call probability by year with color coding
 * based on risk level. Optionally shows cumulative probability line.
 *
 * @example
 * ```html
 * <margin-call-chart></margin-call-chart>
 *
 * <script>
 *   const chart = document.querySelector('margin-call-chart');
 *   chart.data = {
 *     labels: ['Year 1', 'Year 2', 'Year 3', ...],
 *     values: [0.5, 1.2, 2.1, ...]  // Annual probabilities
 *   };
 *   chart.cumulativeData = [0.5, 1.7, 3.8, ...];  // Cumulative probabilities
 * </script>
 * ```
 */
export class MarginCallChart extends BaseChart {
  /** Annual margin call probability data */
  public data: BarChartData | null = null;

  /** Optional cumulative probability data for line overlay */
  public cumulativeData?: number[];

  protected getChartConfig(): ChartConfiguration {
    const data = this.data;
    const labels = data?.labels ?? [];
    const values = data?.values ?? [];
    const cumulative = this.cumulativeData;

    // Generate year labels if not provided
    const yearLabels = labels.length > 0
      ? labels
      : values.map((_, i) => `Year ${i + 1}`);

    // Generate colors based on risk level for each bar
    const barColors = values.map((v) => getRiskColor(v));

    // Build datasets array
    const datasets: ChartConfiguration['data']['datasets'] = [
      {
        type: 'bar' as const,
        label: 'Annual Probability',
        data: values,
        backgroundColor: barColors,
        borderColor: barColors.map((c) => c), // Same as background
        borderWidth: 1,
        order: 2, // Bars behind line
      },
    ];

    // Add cumulative line if data provided
    const theme = getChartTheme();
    if (cumulative && cumulative.length > 0) {
      datasets.push({
        type: 'line' as const,
        label: 'Cumulative Probability',
        data: cumulative,
        borderColor: theme.primary,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: theme.primary,
        tension: 0.1, // Slight curve
        order: 1, // Line in front of bars
      });
    }

    return {
      type: 'bar', // Primary type is bar
      data: {
        labels: yearLabels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: cumulative !== undefined && cumulative.length > 0,
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const datasetLabel = context.dataset.label;

                if (datasetLabel === 'Cumulative Probability') {
                  return `Cumulative: ${value.toFixed(1)}%`;
                }

                // For annual probability, also show cumulative if available
                const yearIndex = context.dataIndex;
                const cumulativeValue = cumulative?.[yearIndex];
                const annualText = `Annual: ${value.toFixed(1)}%`;

                if (cumulativeValue !== undefined) {
                  return [annualText, `Cumulative: ${cumulativeValue.toFixed(1)}%`];
                }
                return annualText;
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
            ticks: {
              color: theme.text,
            },
            grid: {
              display: false,
            },
          },
          y: {
            title: {
              display: true,
              text: 'Probability (%)',
              color: theme.text,
            },
            ticks: {
              callback: (value) => `${value}%`,
              color: theme.text,
            },
            grid: {
              color: theme.grid,
            },
            beginAtZero: true,
            max: this.calculateYAxisMax(values, cumulative),
          },
        },
      },
    };
  }

  /**
   * Calculate appropriate Y-axis maximum.
   * Uses 100 if any value exceeds 80%, otherwise auto-scales.
   */
  private calculateYAxisMax(
    values: number[],
    cumulative?: number[]
  ): number | undefined {
    const allValues = [...values, ...(cumulative ?? [])];
    const maxValue = Math.max(...allValues, 0);

    // If any value exceeds 80%, cap at 100
    if (maxValue > 80) {
      return 100;
    }

    // Otherwise let Chart.js auto-scale
    return undefined;
  }

  /**
   * Update dataset colors when theme changes.
   * Risk-based bar colors are theme-independent, but cumulative line uses theme.primary.
   */
  protected updateDatasetColors(theme: ChartTheme): void {
    if (!this.chart) return;

    // Update cumulative line color if present
    const cumulativeDataset = this.chart.data.datasets.find(
      (d) => d.label === 'Cumulative Probability'
    );
    if (cumulativeDataset) {
      cumulativeDataset.borderColor = theme.primary;
      // Cast to access line-specific properties
      (cumulativeDataset as { pointBackgroundColor?: string }).pointBackgroundColor = theme.primary;
    }
  }

  /**
   * Update chart with new data.
   * More efficient than re-rendering for data-only changes.
   */
  public setData(data: BarChartData, cumulativeData?: number[]): void {
    this.data = data;
    this.cumulativeData = cumulativeData;

    if (this.chart) {
      const config = this.getChartConfig();
      this.updateData(config.data!);
    } else {
      this.render();
    }
  }
}

// Register custom element
customElements.define('margin-call-chart', MarginCallChart);
