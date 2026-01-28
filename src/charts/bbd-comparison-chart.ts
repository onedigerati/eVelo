/**
 * BBD vs Sell Comparison Chart Web Component
 *
 * Displays side-by-side comparison of BBD strategy vs traditional sell strategy.
 * Shows net estate values and the BBD advantage.
 *
 * Requirements (VIZ-07):
 * - Side-by-side grouped bar comparison
 * - Shows net estate values for both strategies
 * - Annotation showing BBD advantage
 */
import { ChartConfiguration, Chart } from 'chart.js';
import { BaseChart } from './base-chart';
import { getChartTheme } from './theme';
import { ChartTheme } from './types';

/**
 * Data structure for BBD comparison chart.
 */
export interface BBDComparisonChartData {
  /** Net estate value using BBD strategy */
  bbdNetEstate: number;
  /** Net estate value if assets were sold */
  sellNetEstate: number;
  /** Dollar advantage of BBD over sell (bbdNetEstate - sellNetEstate) */
  bbdAdvantage: number;
  /** Optional breakdown of taxes and loan */
  breakdown?: {
    /** Taxes saved via stepped-up basis */
    taxes: number;
    /** Outstanding loan balance at death */
    loan: number;
  };
}

/**
 * Get strategy colors based on current theme.
 */
function getStrategyColors() {
  const theme = getChartTheme();
  return {
    bbd: theme.primary,         // Blue for BBD
    sell: '#6b7280',            // Gray for Sell (works on both themes)
    advantage: theme.positive,  // Green for advantage
    negative: theme.negative,   // Red for negative
    text: theme.text,
    secondary: theme.secondary,
    grid: theme.grid,
  };
}

/**
 * Format a number as currency with compact notation.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format a number as full currency without compact notation.
 */
function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * BBD vs Sell comparison chart component.
 *
 * Shows net estate values for BBD strategy vs traditional sell strategy
 * with annotation showing the advantage.
 *
 * @example
 * ```html
 * <bbd-comparison-chart></bbd-comparison-chart>
 *
 * <script>
 *   const chart = document.querySelector('bbd-comparison-chart');
 *   chart.data = {
 *     bbdNetEstate: 4200000,
 *     sellNetEstate: 3600000,
 *     bbdAdvantage: 600000,
 *     breakdown: { taxes: 833000, loan: 800000 }
 *   };
 * </script>
 * ```
 */
export class BBDComparisonChart extends BaseChart {
  /** Comparison data to display */
  public data: BBDComparisonChartData | null = null;

  /**
   * Update dataset colors when theme changes.
   * BBD comparison uses theme.primary for BBD bar and theme.positive for advantage.
   */
  protected updateDatasetColors(theme: ChartTheme): void {
    if (!this.chart) return;
    const dataset = this.chart.data.datasets[0];
    if (dataset) {
      dataset.backgroundColor = [theme.primary, '#6b7280'];
      dataset.borderColor = [theme.primary, '#6b7280'];
    }
  }

  protected getChartConfig(): ChartConfiguration {
    const data = this.data;
    const bbdValue = data?.bbdNetEstate ?? 0;
    const sellValue = data?.sellNetEstate ?? 0;
    const advantage = data?.bbdAdvantage ?? 0;

    // Get theme-aware colors
    const strategyColors = getStrategyColors();

    // Labels for the two bars
    const labels = ['BBD Strategy', 'Sell Strategy'];
    const values = [bbdValue, sellValue];
    const colors = [strategyColors.bbd, strategyColors.sell];

    // Store advantage for the plugin
    const advantageValue = advantage;
    const advantageFormatted = formatFullCurrency(Math.abs(advantage));
    const advantageSign = advantage >= 0 ? '+' : '-';
    const advantageLabel = advantage >= 0 ? 'BBD Advantage' : 'Sell Advantage';

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Estate Value',
            data: values,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
            barPercentage: 0.6,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // Single dataset, no legend needed
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const label = context.label;
                const lines = [`Net Estate: ${formatFullCurrency(value)}`];

                // Add breakdown info if available
                if (data?.breakdown && label === 'BBD Strategy') {
                  lines.push(`Loan Balance: ${formatFullCurrency(data.breakdown.loan)}`);
                  lines.push(`Taxes Avoided: ${formatFullCurrency(data.breakdown.taxes)}`);
                }

                if (label === 'Sell Strategy' && data?.breakdown) {
                  lines.push(`Taxes Paid: ${formatFullCurrency(data.breakdown.taxes)}`);
                }

                return lines;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: strategyColors.text,
              font: {
                weight: 'bold',
              },
            },
          },
          y: {
            title: {
              display: true,
              text: 'Net Estate Value',
              color: strategyColors.text,
            },
            ticks: {
              callback: (value) => formatCurrency(value as number),
              color: strategyColors.text,
            },
            grid: {
              color: strategyColors.grid,
            },
            beginAtZero: true,
          },
        },
      },
      plugins: [
        {
          id: 'advantageAnnotation',
          afterDraw: (chart: Chart) => {
            if (advantageValue === 0) return;

            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales.x || !scales.y) return;

            const meta = chart.getDatasetMeta(0);
            if (!meta.data || meta.data.length < 2) return;

            // Get bar positions
            const bbdBar = meta.data[0];
            const sellBar = meta.data[1];

            // Get top of the higher bar for annotation placement
            const bbdTop = bbdBar.y;
            const sellTop = sellBar.y;
            const higherTop = Math.min(bbdTop, sellTop);

            // Draw annotation above bars
            ctx.save();

            // Position annotation centered above both bars
            const centerX = (bbdBar.x + sellBar.x) / 2;
            const annotationY = higherTop - 30;

            // Get current theme colors for annotation
            const annotationColors = getStrategyColors();

            // Draw advantage text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle =
              advantage >= 0
                ? annotationColors.advantage
                : annotationColors.negative;

            ctx.fillText(
              `${advantageSign}${advantageFormatted}`,
              centerX,
              annotationY
            );

            // Draw label below the value
            ctx.font = '11px sans-serif';
            ctx.fillStyle = annotationColors.text;
            ctx.fillText(advantageLabel, centerX, annotationY + 16);

            // Draw connecting line between bar tops
            ctx.beginPath();
            ctx.strokeStyle = annotationColors.secondary;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            // Draw bracket from BBD bar top to Sell bar top
            const bracketY = higherTop - 10;
            ctx.moveTo(bbdBar.x, bbdTop);
            ctx.lineTo(bbdBar.x, bracketY);
            ctx.lineTo(sellBar.x, bracketY);
            ctx.lineTo(sellBar.x, sellTop);
            ctx.stroke();

            ctx.restore();
          },
        },
      ],
    };
  }

  /**
   * Update chart with new data.
   * More efficient than re-rendering for data-only changes.
   */
  public setData(data: BBDComparisonChartData): void {
    this.data = data;

    if (this.chart) {
      // Need full re-render for plugin to update
      this.chart.destroy();
      this.chart = null;
      this.render();
    } else {
      this.render();
    }
  }
}

// Register custom element
customElements.define('bbd-comparison-chart', BBDComparisonChart);
