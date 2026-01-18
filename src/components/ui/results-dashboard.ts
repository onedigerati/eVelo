/**
 * Results Dashboard Web Component
 *
 * Displays Monte Carlo simulation results including:
 * - Probability cone chart (portfolio value projections over time)
 * - Histogram chart (terminal value distribution)
 * - Summary statistics (median, mean, success rate, std deviation)
 */
import { BaseComponent } from '../base-component';
import type { SimulationOutput, YearlyPercentiles, SimulationStatistics } from '../../simulation/types';
import type { ProbabilityConeData, HistogramData, HistogramBin, DonutChartData, HeatmapData } from '../../charts/types';
// Import chart components to register them
import '../../charts';

/**
 * Dashboard container with chart components for displaying simulation results.
 *
 * Usage:
 * ```html
 * <results-dashboard id="results"></results-dashboard>
 *
 * <script>
 *   const dashboard = document.querySelector('#results');
 *   dashboard.data = simulationOutput; // SimulationOutput from runSimulation
 * </script>
 * ```
 */
export class ResultsDashboard extends BaseComponent {
  /** Stored simulation result data */
  private _data: SimulationOutput | null = null;

  /** Portfolio weights for donut chart */
  private _portfolioWeights: { symbol: string; weight: number }[] | null = null;

  /** Correlation matrix for heatmap */
  private _correlationMatrix: { labels: string[]; matrix: number[][] } | null = null;

  /**
   * Set simulation data and update all charts/stats.
   */
  set data(value: SimulationOutput | null) {
    this._data = value;
    this.updateCharts();
  }

  /**
   * Get current simulation data.
   */
  get data(): SimulationOutput | null {
    return this._data;
  }

  /**
   * Set portfolio weights for donut chart.
   */
  set portfolioWeights(value: { symbol: string; weight: number }[] | null) {
    this._portfolioWeights = value;
    this.updateCharts();
  }

  /**
   * Get portfolio weights.
   */
  get portfolioWeights(): { symbol: string; weight: number }[] | null {
    return this._portfolioWeights;
  }

  /**
   * Set correlation matrix for heatmap.
   */
  set correlationMatrix(value: { labels: string[]; matrix: number[][] } | null) {
    this._correlationMatrix = value;
    this.updateCharts();
  }

  /**
   * Get correlation matrix.
   */
  get correlationMatrix(): { labels: string[]; matrix: number[][] } | null {
    return this._correlationMatrix;
  }

  protected template(): string {
    return `
      <div class="dashboard-grid">
        <section class="chart-section full-width">
          <h3>Portfolio Projection</h3>
          <div class="chart-container">
            <probability-cone-chart id="cone-chart"></probability-cone-chart>
          </div>
        </section>

        <section class="chart-section">
          <h3>Terminal Value Distribution</h3>
          <div class="chart-container">
            <histogram-chart id="histogram-chart"></histogram-chart>
          </div>
        </section>

        <section class="stats-section">
          <h3>Summary Statistics</h3>
          <div class="stats-grid" id="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Median Value</span>
              <span class="stat-value" id="stat-median">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Success Rate</span>
              <span class="stat-value" id="stat-success">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Mean Value</span>
              <span class="stat-value" id="stat-mean">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Std Deviation</span>
              <span class="stat-value" id="stat-stddev">-</span>
            </div>
          </div>
        </section>

        <section class="chart-section">
          <h3>Portfolio Composition</h3>
          <div class="chart-container square">
            <donut-chart id="donut-chart"></donut-chart>
          </div>
        </section>

        <section class="chart-section">
          <h3>Asset Correlations</h3>
          <div class="chart-container square">
            <correlation-heatmap id="heatmap-chart"></correlation-heatmap>
          </div>
        </section>
      </div>

      <div class="no-data" id="no-data">
        <p>Run a simulation to see results</p>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-lg, 24px);
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .chart-section,
      .stats-section {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
      }

      .chart-section h3,
      .stats-section h3 {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .chart-container {
        height: 400px;
        position: relative;
      }

      .chart-container.square {
        aspect-ratio: 1;
        height: auto;
        min-height: 300px;
      }

      .chart-container probability-cone-chart,
      .chart-container histogram-chart,
      .chart-container donut-chart,
      .chart-container correlation-heatmap {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md, 16px);
      }

      .stat-item {
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-md, 16px);
        text-align: center;
      }

      .stat-label {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        margin-bottom: var(--spacing-xs, 4px);
      }

      .stat-value {
        display: block;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .no-data {
        background: var(--surface-secondary, #f8fafc);
        border: 2px dashed var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-2xl, 48px);
        text-align: center;
        color: var(--text-secondary, #475569);
      }

      .no-data p {
        margin: 0;
        font-size: var(--font-size-base, 1rem);
      }

      /* Hide dashboard grid when no data */
      .dashboard-grid.hidden {
        display: none;
      }

      .no-data.hidden {
        display: none;
      }

      /* Mobile responsive: single column on small screens */
      @media (max-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .chart-container {
          height: 300px;
        }
      }
    `;
  }

  protected override afterRender(): void {
    // Initial state: show no-data message
    this.updateCharts();
  }

  /**
   * Update charts and stats when data changes.
   */
  private updateCharts(): void {
    const noData = this.$('#no-data') as HTMLElement;
    const grid = this.$('.dashboard-grid') as HTMLElement;

    if (!this._data) {
      noData?.classList.remove('hidden');
      grid?.classList.add('hidden');
      return;
    }

    noData?.classList.add('hidden');
    grid?.classList.remove('hidden');

    // Update probability cone chart
    const cone = this.$('#cone-chart') as HTMLElement & { data: ProbabilityConeData | null };
    if (cone) {
      cone.data = this.transformToConeData(this._data.yearlyPercentiles);
    }

    // Update histogram chart
    const histogram = this.$('#histogram-chart') as HTMLElement & { setData(data: HistogramData): void };
    if (histogram) {
      histogram.setData(this.transformToHistogramData(this._data.terminalValues));
    }

    // Update summary statistics
    this.updateStats(this._data.statistics);

    // Update donut chart (portfolio composition)
    const donut = this.$('#donut-chart') as HTMLElement & { data: DonutChartData | null };
    if (donut && this._portfolioWeights) {
      donut.data = {
        segments: this._portfolioWeights.map(p => ({
          label: p.symbol,
          value: p.weight
        }))
      };
    }

    // Update correlation heatmap
    const heatmap = this.$('#heatmap-chart') as HTMLElement & { data: HeatmapData | null };
    if (heatmap && this._correlationMatrix) {
      heatmap.data = this._correlationMatrix;
    }
  }

  /**
   * Transform YearlyPercentiles array to ProbabilityConeData for chart.
   */
  private transformToConeData(percentiles: YearlyPercentiles[]): ProbabilityConeData {
    return {
      years: percentiles.map(p => p.year),
      bands: {
        p10: percentiles.map(p => p.p10),
        p25: percentiles.map(p => p.p25),
        p50: percentiles.map(p => p.p50),
        p75: percentiles.map(p => p.p75),
        p90: percentiles.map(p => p.p90)
      }
    };
  }

  /**
   * Transform Float64Array terminal values to HistogramData for chart.
   * Creates bins for distribution visualization.
   */
  private transformToHistogramData(values: Float64Array): HistogramData {
    const arr = Array.from(values);

    // Handle empty or single-value arrays
    if (arr.length === 0) {
      return { bins: [], binWidth: 0 };
    }

    const min = Math.min(...arr);
    const max = Math.max(...arr);

    // Handle edge case where all values are the same
    if (min === max) {
      return {
        bins: [{ min, max: max + 1, count: arr.length }],
        binWidth: 1
      };
    }

    const binCount = 20;
    const binWidth = (max - min) / binCount;

    // Initialize bins
    const bins: HistogramBin[] = [];
    for (let i = 0; i < binCount; i++) {
      bins.push({
        min: min + i * binWidth,
        max: min + (i + 1) * binWidth,
        count: 0
      });
    }

    // Count values in each bin
    for (const v of arr) {
      const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
      bins[binIndex].count++;
    }

    return { bins, binWidth };
  }

  /**
   * Update summary statistics display.
   */
  private updateStats(stats: SimulationStatistics): void {
    const format = (n: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(n);

    const median = this.$('#stat-median');
    const success = this.$('#stat-success');
    const mean = this.$('#stat-mean');
    const stddev = this.$('#stat-stddev');

    if (median) median.textContent = format(stats.median);
    if (success) success.textContent = `${stats.successRate.toFixed(1)}%`;
    if (mean) mean.textContent = format(stats.mean);
    if (stddev) stddev.textContent = format(stats.stddev);
  }
}

// Register the custom element
customElements.define('results-dashboard', ResultsDashboard);
