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
import { DEFAULT_CHART_THEME } from './types';

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
 * Strategy colors for the comparison.
 */
const STRATEGY_COLORS = {
  bbd: DEFAULT_CHART_THEME.primary,     // Blue for BBD
  sell: '#6b7280',                       // Gray for Sell
  advantage: DEFAULT_CHART_THEME.positive, // Green for advantage
} as const;

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

  protected getChartConfig(): ChartConfiguration {
    const data = this.data;
    const bbdValue = data?.bbdNetEstate ?? 0;
    const sellValue = data?.sellNetEstate ?? 0;
    const advantage = data?.bbdAdvantage ?? 0;

    // Labels for the two bars
    const labels = ['BBD Strategy', 'Sell Strategy'];
    const values = [bbdValue, sellValue];
    const colors = [STRATEGY_COLORS.bbd, STRATEGY_COLORS.sell];

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
              color: DEFAULT_CHART_THEME.text,
              font: {
                weight: 'bold',
              },
            },
          },
          y: {
            title: {
              display: true,
              text: 'Net Estate Value',
              color: DEFAULT_CHART_THEME.text,
            },
            ticks: {
              callback: (value) => formatCurrency(value as number),
              color: DEFAULT_CHART_THEME.text,
            },
            grid: {
              color: DEFAULT_CHART_THEME.grid,
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

            // Draw advantage text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle =
              advantage >= 0
                ? STRATEGY_COLORS.advantage
                : DEFAULT_CHART_THEME.negative;

            ctx.fillText(
              `${advantageSign}${advantageFormatted}`,
              centerX,
              annotationY
            );

            // Draw label below the value
            ctx.font = '11px sans-serif';
            ctx.fillStyle = DEFAULT_CHART_THEME.text;
            ctx.fillText(advantageLabel, centerX, annotationY + 16);

            // Draw connecting line between bar tops
            ctx.beginPath();
            ctx.strokeStyle = DEFAULT_CHART_THEME.secondary;
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
