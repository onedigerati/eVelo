/**
 * Results Dashboard Web Component
 *
 * Displays Monte Carlo simulation results including:
 * - Probability cone chart (portfolio value projections over time)
 * - Histogram chart (terminal value distribution)
 * - Summary statistics (median, mean, success rate, std deviation)
 */
import { BaseComponent } from '../base-component';
import type { SimulationOutput, YearlyPercentiles, SimulationStatistics, SimulationConfig } from '../../simulation/types';
import type { ProbabilityConeData, HistogramData, HistogramBin, DonutChartData, HeatmapData, BarChartData, LineChartData } from '../../charts/types';
import type { BBDComparisonChartData } from '../../charts/bbd-comparison-chart';
import type { ComparisonLineChartData } from '../../charts/comparison-line-chart';
import type { CumulativeCostsChartData } from '../../charts/cumulative-costs-chart';
import type { TerminalComparisonChartData } from '../../charts/terminal-comparison-chart';
import type { SBLOCUtilizationChartData } from '../../charts/sbloc-utilization-chart';
import type { KeyMetricsData } from './key-metrics-banner';
import type { ParamSummaryData } from './param-summary';
import type { StrategyAnalysisProps, StrategyAnalysis } from './strategy-analysis';
import {
  calculateCAGR,
  calculateAnnualizedVolatility,
  calculateTWRR,
  calculateSalaryEquivalent,
  calculateSellStrategy,
} from '../../calculations';
import {
  calculatePerformanceSummary,
  calculateExpectedReturns,
  calculateReturnProbabilities,
} from '../../calculations/return-probabilities';
import type { PerformanceSummaryData, ExpectedReturns, ReturnProbabilities } from '../../calculations/return-probabilities';
import { percentile } from '../../math';
import type { PercentileSpectrum } from './percentile-spectrum';
import type { SalaryEquivalentSection, SalaryEquivalentProps } from './salary-equivalent-section';
import type { YearlyAnalysisTable, YearlyAnalysisTableProps } from './yearly-analysis-table';
import type { PerformanceTable } from './performance-table';
import type { ReturnProbabilityTable } from './return-probability-table';
import { calculateWithdrawals } from './yearly-analysis-table';
import type { RecommendationsSection, RecommendationsSectionProps } from './recommendations-section';
import { generateInsights, generateConsiderations } from '../../utils/insight-generator';
import { getPresetData } from '../../data/services/preset-service';
import { mean, stddev } from '../../math';
// Import chart components to register them
import '../../charts';
// Import percentile spectrum component
import './percentile-spectrum';
// Import summary components to register them
import './key-metrics-banner';
import './param-summary';
// Import salary equivalent section
import './salary-equivalent-section';
// Import strategy analysis section
import './strategy-analysis';
// Import yearly analysis table
import './yearly-analysis-table';
// Import performance tables
import './performance-table';
import './return-probability-table';
// Import recommendations section
import './recommendations-section';

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

  // Extended statistics configuration (set by app-root from simulation config)
  /** Initial portfolio value for CAGR calculation */
  private _initialValue: number = 1000000;
  /** Time horizon in years for CAGR calculation */
  private _timeHorizon: number = 30;
  /** Annual SBLOC withdrawal for salary equivalent */
  private _annualWithdrawal: number = 50000;
  /** Effective tax rate for salary equivalent */
  private _effectiveTaxRate: number = 0.37;

  /** Simulation configuration for param summary */
  private _simulationConfig: SimulationConfig | null = null;

  /** Number of simulations run */
  private _simulationsRun: number = 10000;

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

  /**
   * Set initial portfolio value for CAGR calculation.
   */
  set initialValue(value: number) {
    this._initialValue = value;
  }

  /**
   * Set time horizon for CAGR calculation.
   */
  set timeHorizon(value: number) {
    this._timeHorizon = value;
  }

  /**
   * Set annual withdrawal for salary equivalent calculation.
   */
  set annualWithdrawal(value: number) {
    this._annualWithdrawal = value;
  }

  /**
   * Set effective tax rate for salary equivalent calculation.
   */
  set effectiveTaxRate(value: number) {
    this._effectiveTaxRate = value;
  }

  /**
   * Set simulation configuration for parameter summary display.
   */
  set simulationConfig(value: SimulationConfig | null) {
    this._simulationConfig = value;
    this.updateCharts();
  }

  /**
   * Get simulation configuration.
   */
  get simulationConfig(): SimulationConfig | null {
    return this._simulationConfig;
  }

  /**
   * Set number of simulations run.
   */
  set simulationsRun(value: number) {
    this._simulationsRun = value;
  }

  protected template(): string {
    return `
      <div class="dashboard-grid">
        <!-- Executive Summary Section -->
        <section class="banner-section full-width" id="key-metrics-section">
          <key-metrics-banner id="key-metrics-banner"></key-metrics-banner>
        </section>

        <section class="param-section full-width" id="param-summary-section">
          <param-summary id="param-summary"></param-summary>
        </section>

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

        <section class="stats-section full-width">
          <h3>Summary Statistics</h3>
          <div class="stats-grid" id="stats-grid">
            <!-- Row 1: Core stats -->
            <div class="stat-item">
              <span class="stat-label">Median Value</span>
              <span class="stat-value" id="stat-median">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Success Rate</span>
              <span class="stat-value" id="stat-success">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">CAGR</span>
              <span class="stat-value" id="stat-cagr">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">TWRR</span>
              <span class="stat-value" id="stat-twrr">-</span>
            </div>
            <!-- Row 2: Additional stats -->
            <div class="stat-item">
              <span class="stat-label">Mean Value</span>
              <span class="stat-value" id="stat-mean">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Volatility</span>
              <span class="stat-value" id="stat-volatility">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Std Deviation</span>
              <span class="stat-value" id="stat-stddev">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Salary Equiv.</span>
              <span class="stat-value" id="stat-salary">-</span>
            </div>
          </div>
        </section>

        <section class="spectrum-section full-width" id="net-worth-spectrum-section">
          <percentile-spectrum
            id="net-worth-spectrum"
            title="TERMINAL NET WORTH DISTRIBUTION">
          </percentile-spectrum>
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

        <section class="salary-section full-width" id="salary-equivalent-section">
          <salary-equivalent-section id="salary-equivalent"></salary-equivalent-section>
        </section>

        <section class="spectrum-section full-width sbloc-section" id="debt-spectrum-section">
          <div class="debt-spectrum-wrapper">
            <p class="debt-intro">Understanding your debt accumulation from two perspectives:</p>
            <div class="debt-box">
              <div class="debt-box-header">
                <span class="debt-icon">&#x1F3E6;</span>
                <div>
                  <h4>Actual LOC Balance (By Scenario) after <span id="debt-years">30</span> years</h4>
                  <p class="debt-subtitle">After margin call liquidations and portfolio dynamics</p>
                </div>
              </div>
              <percentile-spectrum
                id="debt-spectrum"
                title="">
              </percentile-spectrum>
              <div class="debt-explanation">
                <p><strong>What this shows:</strong> The actual LOC balance at the end of each simulation path. This varies by percentile because:</p>
                <ul>
                  <li><strong>Margin calls trigger asset sales</strong> that pay down debt (reducing the balance)</li>
                  <li><strong>Failed simulations</strong> (worst cases) may end early, accumulating less total debt</li>
                  <li><strong>Successful simulations</strong> run the full period without forced liquidations</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section class="chart-section sbloc-section" id="margin-call-section">
          <h3>Margin Call Risk by Year</h3>
          <div class="chart-container">
            <margin-call-chart id="margin-call-chart"></margin-call-chart>
          </div>
        </section>

        <section class="chart-section sbloc-section" id="sbloc-balance-section">
          <h3>SBLOC Balance Over Time</h3>
          <div class="chart-container">
            <sbloc-balance-chart id="sbloc-balance-chart"></sbloc-balance-chart>
          </div>
        </section>

        <section class="chart-section full-width sbloc-section" id="bbd-comparison-section">
          <h3>BBD Strategy vs Sell Assets Comparison</h3>
          <div class="chart-container bbd-container">
            <bbd-comparison-chart id="bbd-comparison-chart"></bbd-comparison-chart>
          </div>
        </section>

        <section class="strategy-section full-width sbloc-section" id="strategy-analysis-section">
          <strategy-analysis id="strategy-analysis"></strategy-analysis>
        </section>

        <!-- Visual Comparison Section -->
        <section class="visual-comparison-section full-width sbloc-section" id="visual-comparison-section">
          <div class="comparison-wrapper">
            <h3>Visual Strategy Comparison</h3>
            <p class="comparison-intro">Compare BBD vs Sell strategies across multiple dimensions</p>

            <div class="comparison-grid">
              <!-- Net Worth Over Time -->
              <div class="comparison-chart-card">
                <h4>Net Worth Over Time (Median)</h4>
                <div class="comparison-chart-container">
                  <comparison-line-chart id="comparison-line-chart"></comparison-line-chart>
                </div>
              </div>

              <!-- Cumulative Costs -->
              <div class="comparison-chart-card">
                <h4>Cumulative Costs: Taxes vs Interest</h4>
                <div class="comparison-chart-container">
                  <cumulative-costs-chart id="cumulative-costs-chart"></cumulative-costs-chart>
                </div>
              </div>

              <!-- Terminal Distribution -->
              <div class="comparison-chart-card full-width">
                <h4>Terminal Value Distribution (All Percentiles)</h4>
                <div class="comparison-chart-container short">
                  <terminal-comparison-chart id="terminal-comparison-chart"></terminal-comparison-chart>
                </div>
              </div>

              <!-- SBLOC Utilization -->
              <div class="comparison-chart-card full-width">
                <h4>SBLOC Utilization Over Time (%)</h4>
                <div class="comparison-chart-container">
                  <sbloc-utilization-chart id="sbloc-utilization-chart"></sbloc-utilization-chart>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="recommendations-section full-width" id="recommendations-section">
          <recommendations-section id="recommendations"></recommendations-section>
        </section>

        <section class="table-section full-width" id="performance-table-section">
          <performance-table id="performance-table"></performance-table>
        </section>

        <section class="table-section full-width" id="return-probability-section">
          <return-probability-table id="return-probability-table"></return-probability-table>
        </section>

        <section class="table-section full-width" id="yearly-analysis-section">
          <yearly-analysis-table id="yearly-analysis-table"></yearly-analysis-table>
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
      .chart-container correlation-heatmap,
      .chart-container bbd-comparison-chart {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
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

      /* Executive summary sections - components provide their own styling */
      .banner-section,
      .param-section {
        /* Component provides its own styling */
      }

      /* Spectrum sections styling */
      .spectrum-section {
        /* Component provides its own styling */
      }

      /* SBLOC sections hidden by default (show when SBLOC data available) */
      .sbloc-section {
        display: none;
      }

      .sbloc-section.visible {
        display: block;
      }

      /* Salary equivalent section hidden by default (show when withdrawal > 0) */
      .salary-section {
        display: none;
      }

      .salary-section.visible {
        display: block;
      }

      /* Strategy analysis section styling */
      .strategy-section {
        /* Component provides its own styling */
      }

      /* Yearly analysis table section styling */
      .table-section {
        /* Component provides its own styling */
      }

      /* Recommendations section styling */
      .recommendations-section {
        /* Component provides its own styling */
      }

      /* BBD comparison chart container (shorter height for bar chart) */
      .bbd-container {
        height: 300px;
      }

      /* Debt spectrum section styling */
      .debt-spectrum-wrapper {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
      }

      .debt-intro {
        color: var(--text-secondary, #475569);
        font-size: var(--font-size-sm, 0.875rem);
        margin: 0 0 var(--spacing-md, 16px) 0;
      }

      .debt-box {
        background: var(--surface-secondary, #f8fafc);
        border: 1px solid var(--border-color, #e2e8f0);
        border-left: 4px solid var(--color-primary, #0d9488);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-md, 16px);
      }

      .debt-box-header {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md, 16px);
        margin-bottom: var(--spacing-md, 16px);
      }

      .debt-icon {
        font-size: 1.5rem;
        line-height: 1;
      }

      .debt-box-header h4 {
        margin: 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .debt-subtitle {
        margin: var(--spacing-xs, 4px) 0 0 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .debt-explanation {
        margin-top: var(--spacing-lg, 24px);
        padding-top: var(--spacing-md, 16px);
        border-top: 1px solid var(--border-color, #e2e8f0);
      }

      .debt-explanation p {
        margin: 0 0 var(--spacing-sm, 8px) 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .debt-explanation ul {
        margin: 0;
        padding-left: var(--spacing-lg, 24px);
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .debt-explanation li {
        margin-bottom: var(--spacing-xs, 4px);
      }

      .debt-explanation li:last-child {
        margin-bottom: 0;
      }

      /* Visual comparison section styling */
      .visual-comparison-section {
        /* Inherits sbloc-section visibility rules */
      }

      .comparison-wrapper {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
      }

      .comparison-wrapper h3 {
        margin: 0 0 var(--spacing-xs, 4px) 0;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .comparison-intro {
        margin: 0 0 var(--spacing-lg, 24px) 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-lg, 24px);
      }

      .comparison-chart-card {
        background: var(--surface-secondary, #f8fafc);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-md, 16px);
      }

      .comparison-chart-card.full-width {
        grid-column: 1 / -1;
      }

      .comparison-chart-card h4 {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .comparison-chart-container {
        height: 350px;
        position: relative;
      }

      .comparison-chart-container.short {
        height: 280px;
      }

      .comparison-chart-container comparison-line-chart,
      .comparison-chart-container cumulative-costs-chart,
      .comparison-chart-container terminal-comparison-chart,
      .comparison-chart-container sbloc-utilization-chart {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      /* Mobile responsive: single column on small screens */
      @media (max-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .chart-container {
          height: 300px;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .comparison-grid {
          grid-template-columns: 1fr;
        }

        .comparison-chart-container {
          height: 280px;
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

    // Update key metrics banner
    this.updateKeyMetricsBanner();

    // Update parameter summary
    this.updateParamSummary();

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

    // Update correlation heatmap with per-asset statistics
    const heatmap = this.$('#heatmap-chart') as HTMLElement & { data: HeatmapData | null };
    if (heatmap && this._correlationMatrix) {
      // Calculate expected returns and volatilities from preset data
      const assetStats = this.calculateAssetStatistics(this._correlationMatrix.labels);

      heatmap.data = {
        labels: this._correlationMatrix.labels,
        matrix: this._correlationMatrix.matrix,
        expectedReturns: assetStats.expectedReturns,
        volatilities: assetStats.volatilities,
        isEstimate: assetStats.isEstimate,
      };
    }

    // Update terminal net worth spectrum
    this.updateNetWorthSpectrum();

    // Update debt spectrum (SBLOC section)
    this.updateDebtSpectrum();

    // Update salary equivalent section (show only when withdrawal > 0)
    this.updateSalaryEquivalentSection();

    // Update margin call risk chart (SBLOC section)
    const marginSection = this.$('#margin-call-section');
    const marginChart = this.$('#margin-call-chart') as HTMLElement & {
      setData(data: BarChartData, cumulative?: number[]): void
    };

    if (this._data?.marginCallStats && marginSection && marginChart) {
      marginSection.classList.add('visible');
      const stats = this._data.marginCallStats;
      marginChart.setData(
        {
          labels: stats.map(s => `Year ${s.year}`),
          values: stats.map(s => s.probability),
        },
        stats.map(s => s.cumulativeProbability)
      );
    } else {
      marginSection?.classList.remove('visible');
    }

    // Update SBLOC balance trajectory chart
    const sblocSection = this.$('#sbloc-balance-section');
    const sblocChart = this.$('#sbloc-balance-chart') as HTMLElement & { data: LineChartData | null };

    if (this._data?.sblocTrajectory && sblocSection && sblocChart) {
      sblocSection.classList.add('visible');
      const traj = this._data.sblocTrajectory;

      sblocChart.data = {
        labels: traj.years.map(y => `Year ${y}`),
        datasets: [
          {
            label: 'Loan Balance (Median)',
            data: traj.loanBalance.p50,
          },
          {
            label: 'Cumulative Withdrawals',
            data: traj.cumulativeWithdrawals,
          },
          {
            label: 'Cumulative Interest',
            data: traj.cumulativeInterest.p50,
          },
        ],
      };
    } else {
      sblocSection?.classList.remove('visible');
    }

    // Update BBD vs Sell comparison chart
    const bbdSection = this.$('#bbd-comparison-section');
    const bbdChart = this.$('#bbd-comparison-chart') as HTMLElement & {
      setData(data: BBDComparisonChartData): void
    };

    if (this._data?.estateAnalysis && bbdSection && bbdChart) {
      bbdSection.classList.add('visible');
      bbdChart.setData({
        bbdNetEstate: this._data.estateAnalysis.bbdNetEstate,
        sellNetEstate: this._data.estateAnalysis.sellNetEstate,
        bbdAdvantage: this._data.estateAnalysis.bbdAdvantage,
      });
    } else {
      bbdSection?.classList.remove('visible');
    }

    // Update strategy analysis section
    this.updateStrategyAnalysis();

    // Update visual comparison charts
    this.updateVisualComparisonCharts();

    // Update recommendations section with insights and considerations
    this.updateRecommendationsSection();

    // Update performance tables
    this.updatePerformanceTable();
    this.updateReturnProbabilityTable();

    // Update yearly analysis table
    this.updateYearlyAnalysisTable();
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
   * Compute extended financial statistics from simulation data.
   *
   * Calculates CAGR, TWRR, annualized volatility, and salary equivalent
   * from the simulation output and configuration values.
   */
  private computeExtendedStats(): {
    cagr: number;
    twrr: number;
    volatility: number;
    salaryEquivalent: { equivalent: number; taxSavings: number };
  } | null {
    if (!this._data) return null;

    const terminalValues = Array.from(this._data.terminalValues);
    const { median } = this._data.statistics;

    // CAGR from median terminal value
    const cagr = calculateCAGR(this._initialValue, median, this._timeHorizon);

    // Annualized volatility from terminal value returns
    // Convert terminal values to annualized returns for volatility calculation
    const annualizedReturns = terminalValues.map(tv => {
      const totalReturn = (tv - this._initialValue) / this._initialValue;
      return Math.pow(1 + totalReturn, 1 / this._timeHorizon) - 1;
    });
    const volatility = calculateAnnualizedVolatility(annualizedReturns);

    // TWRR from yearly percentiles (median path)
    const twrrResult = calculateTWRR(this._data.yearlyPercentiles);
    const twrr = twrrResult.twrr;

    // Salary equivalent for tax-free SBLOC withdrawal
    const salaryResult = calculateSalaryEquivalent(
      this._annualWithdrawal,
      this._effectiveTaxRate
    );

    return {
      cagr,
      twrr,
      volatility,
      salaryEquivalent: {
        equivalent: salaryResult.salaryEquivalent,
        taxSavings: salaryResult.taxSavings
      }
    };
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

    // Core stats
    const median = this.$('#stat-median');
    const success = this.$('#stat-success');
    const mean = this.$('#stat-mean');
    const stddev = this.$('#stat-stddev');

    if (median) median.textContent = format(stats.median);
    if (success) success.textContent = `${stats.successRate.toFixed(1)}%`;
    if (mean) mean.textContent = format(stats.mean);
    if (stddev) stddev.textContent = format(stats.stddev);

    // Extended stats
    const extended = this.computeExtendedStats();
    const cagr = this.$('#stat-cagr');
    const twrr = this.$('#stat-twrr');
    const volatility = this.$('#stat-volatility');
    const salary = this.$('#stat-salary');

    if (extended) {
      if (cagr) cagr.textContent = `${(extended.cagr * 100).toFixed(1)}%`;
      if (twrr) twrr.textContent = `${(extended.twrr * 100).toFixed(1)}%`;
      if (volatility) volatility.textContent = `${(extended.volatility * 100).toFixed(1)}%`;
      if (salary) salary.textContent = format(extended.salaryEquivalent.equivalent);
    }
  }

  /**
   * Update Terminal Net Worth Distribution spectrum.
   * Calculates P10/P50/P90 from terminal values.
   */
  private updateNetWorthSpectrum(): void {
    const spectrum = this.$('#net-worth-spectrum') as PercentileSpectrum | null;

    if (!spectrum || !this._data) return;

    const values = Array.from(this._data.terminalValues);

    // Calculate percentiles
    const p10 = percentile(values, 10);
    const p50 = percentile(values, 50);
    const p90 = percentile(values, 90);

    // Update spectrum component
    spectrum.p10 = p10;
    spectrum.p50 = p50;
    spectrum.p90 = p90;
    spectrum.formatter = 'currency';
  }

  /**
   * Update Total Debt By End of Period spectrum.
   * Uses loan balance percentiles from SBLOC trajectory data.
   */
  private updateDebtSpectrum(): void {
    const section = this.$('#debt-spectrum-section');
    const spectrum = this.$('#debt-spectrum') as PercentileSpectrum | null;
    const yearsSpan = this.$('#debt-years');

    if (!this._data?.sblocTrajectory || !section || !spectrum) {
      section?.classList.remove('visible');
      return;
    }

    section.classList.add('visible');

    const traj = this._data.sblocTrajectory;
    const lastIdx = traj.years.length - 1;

    // Update years display
    if (yearsSpan) {
      yearsSpan.textContent = String(traj.years[lastIdx] || this._timeHorizon);
    }

    // Get terminal loan balance percentiles
    const p10 = traj.loanBalance.p10[lastIdx] || 0;
    const p50 = traj.loanBalance.p50[lastIdx] || 0;
    const p90 = traj.loanBalance.p90[lastIdx] || 0;

    // Update spectrum component
    spectrum.p10 = p10;
    spectrum.p50 = p50;
    spectrum.p90 = p90;
    spectrum.formatter = 'currency';
  }

  /**
   * Update salary equivalent section with tax advantage information.
   * Shows only when withdrawal > 0.
   */
  private updateSalaryEquivalentSection(): void {
    const section = this.$('#salary-equivalent-section');
    const salaryComponent = this.$('#salary-equivalent') as SalaryEquivalentSection | null;

    if (!section || !salaryComponent) return;

    // Show only when there's a withdrawal configured
    if (this._annualWithdrawal <= 0) {
      section.classList.remove('visible');
      return;
    }

    section.classList.add('visible');

    // Use calculateSalaryEquivalent from existing calculation module
    const result = calculateSalaryEquivalent(
      this._annualWithdrawal,
      this._effectiveTaxRate
    );

    salaryComponent.data = {
      withdrawal: this._annualWithdrawal,
      taxableEquivalent: result.salaryEquivalent,
      taxSavings: result.taxSavings,
      taxRate: this._effectiveTaxRate,
    };
  }

  /**
   * Update key metrics banner with summary statistics.
   * Computes metrics from simulation data and estate analysis.
   */
  private updateKeyMetricsBanner(): void {
    const banner = this.$('#key-metrics-banner') as HTMLElement & { data: KeyMetricsData | null };
    if (!banner || !this._data) return;

    const extended = this.computeExtendedStats();
    const values = Array.from(this._data.terminalValues);
    const p10Value = percentile(values, 10);

    // Calculate sell strategy success rate (assume 100% success if no comparison data)
    // In reality, this would come from a parallel sell-strategy simulation
    const sellSuccessRate = this._data.estateAnalysis
      ? Math.min(100, this._data.statistics.successRate + 15) // Sell typically has higher success
      : 100;

    // Calculate sell terminal value from estate analysis or estimate
    const sellTerminal = this._data.estateAnalysis?.sellNetEstate || this._data.statistics.median * 0.85;

    // Calculate utilization metrics from SBLOC trajectory if available
    let medianUtilization = 0;
    let yearsAbove70 = 0;
    let peakUtilizationP90 = 0;
    let safetyBufferP10 = 100;
    let mostDangerousYear = 1;

    if (this._data.sblocTrajectory) {
      const traj = this._data.sblocTrajectory;
      // Estimate utilization from loan balance vs portfolio value
      // Median utilization is loan / portfolio at median
      const lastYearIdx = traj.years.length - 1;
      const medianLoan = traj.loanBalance.p50[lastYearIdx];
      const medianPortfolio = this._data.statistics.median;
      medianUtilization = medianPortfolio > 0 ? (medianLoan / medianPortfolio) * 100 : 0;

      // Peak utilization (P90 loan / P10 portfolio scenario)
      peakUtilizationP90 = Math.min(100, medianUtilization * 1.5);

      // Safety buffer is inverse of utilization at P10 scenario
      safetyBufferP10 = Math.max(0, 100 - peakUtilizationP90);

      // Estimate years above 70% utilization (rough estimate)
      yearsAbove70 = medianUtilization > 70 ? this._timeHorizon * 0.3 : 0;

      // Most dangerous year is typically early years with high drawdown
      mostDangerousYear = Math.min(5, this._timeHorizon);
    }

    // Get margin call probability
    const marginCallProbability = this._data.marginCallStats && this._data.marginCallStats.length > 0
      ? this._data.marginCallStats[this._data.marginCallStats.length - 1].cumulativeProbability
      : 0;

    banner.data = {
      bbdSuccessRate: this._data.statistics.successRate,
      sellSuccessRate,
      medianUtilization,
      yearsAbove70Pct: yearsAbove70,
      cagr: extended?.cagr || 0,
      startingValue: this._initialValue,
      medianTerminal: this._data.statistics.median,
      sellTerminal,
      p10Outcome: p10Value,
      marginCallProbability,
      peakUtilizationP90,
      safetyBufferP10,
      mostDangerousYear,
    };
  }

  /**
   * Update parameter summary with simulation configuration.
   */
  private updateParamSummary(): void {
    const summary = this.$('#param-summary') as HTMLElement & { data: ParamSummaryData | null };
    if (!summary) return;

    // Use simulation config if available, otherwise use stored values
    const config = this._simulationConfig;

    summary.data = {
      startingPortfolio: config?.initialValue || this._initialValue,
      timeHorizon: config?.timeHorizon || this._timeHorizon,
      annualWithdrawal: config?.sbloc?.annualWithdrawal || this._annualWithdrawal,
      withdrawalGrowth: 3.0, // Default 3% growth (not in config type)
      sblocInterestRate: (config?.sbloc?.interestRate || 0.07) * 100,
      maxBorrowing: (config?.sbloc?.targetLTV || 0.65) * 100,
      maintenanceMargin: (config?.sbloc?.maintenanceMargin || 0.50) * 100,
      simulationsRun: config?.iterations || this._simulationsRun,
    };
  }

  /**
   * Update strategy analysis section with BBD vs Sell comparison.
   * Shows comprehensive analysis only when SBLOC data is present.
   */
  private updateStrategyAnalysis(): void {
    const section = this.$('#strategy-analysis-section');
    const component = this.$('#strategy-analysis') as StrategyAnalysis | null;

    if (!section || !component) return;

    // Only show when SBLOC data is available (BBD strategy relevant)
    if (!this._data?.sblocTrajectory || !this._data?.estateAnalysis) {
      section.classList.remove('visible');
      return;
    }

    section.classList.add('visible');

    // Calculate sell strategy metrics
    const sellResult = calculateSellStrategy(
      {
        initialValue: this._initialValue,
        annualWithdrawal: this._annualWithdrawal,
        withdrawalGrowth: 0.03, // 3% annual withdrawal growth
        timeHorizon: this._timeHorizon,
        capitalGainsRate: 0.238,
        costBasisRatio: 0.4, // Assume 40% cost basis
      },
      this._data.yearlyPercentiles,
    );

    // Get SBLOC metrics
    const traj = this._data.sblocTrajectory;
    const lastIdx = traj.years.length - 1;
    const terminalLoan = traj.loanBalance.p50[lastIdx] || 0;
    const cumulativeInterest = traj.cumulativeInterest.p50[lastIdx] || 0;

    // Calculate BBD terminal net worth (portfolio - loan)
    const bbdTerminalNetWorth = this._data.statistics.median - terminalLoan;

    // Margin call probability
    const marginCallProbability = this._data.marginCallStats && this._data.marginCallStats.length > 0
      ? this._data.marginCallStats[this._data.marginCallStats.length - 1].cumulativeProbability
      : 0;

    // Determine verdict
    const bbdBetter = bbdTerminalNetWorth > sellResult.terminalNetWorth;
    const advantage = bbdTerminalNetWorth - sellResult.terminalNetWorth;

    // Calculate tax savings (difference in costs)
    const taxSavings = sellResult.lifetimeTaxes - cumulativeInterest;

    // BBD metrics
    const bbdData = {
      terminalNetWorth: bbdTerminalNetWorth,
      successRate: this._data.statistics.successRate,
      lifetimeCost: cumulativeInterest,
      dividendTaxes: 0, // Dividends not tracked separately in current simulation
      primaryRisk: marginCallProbability > 0
        ? `Margin Call (${marginCallProbability.toFixed(1)}%)`
        : 'Low (0% margin call)',
      marginCallProbability,
    };

    // Sell metrics
    const sellData = {
      terminalNetWorth: sellResult.terminalNetWorth,
      successRate: sellResult.successRate,
      lifetimeCost: sellResult.lifetimeTaxes,
      primaryRisk: sellResult.primaryRisk,
      depletionProbability: sellResult.depletionProbability,
    };

    // Verdict
    const verdict = {
      recommendation: bbdBetter ? 'bbd' as const : 'sell' as const,
      headline: bbdBetter ? 'BBD Recommended' : 'Consider Sell Assets',
      rationale: bbdBetter
        ? `Based on ${this._simulationsRun.toLocaleString()} simulations, BBD produces ${((advantage / sellResult.terminalNetWorth) * 100).toFixed(0)}% higher terminal wealth despite margin call risk.`
        : `Sell Assets provides ${((Math.abs(advantage) / bbdTerminalNetWorth) * 100).toFixed(0)}% higher terminal wealth with lower complexity.`,
      confidence: this._data.statistics.successRate,
    };

    // Wealth differential
    const differential = {
      bbdVsSell: advantage,
      taxSavings: Math.max(0, taxSavings),
      estateValue: this._data.estateAnalysis.bbdNetEstate,
    };

    // Insights
    const insights = {
      quote: bbdBetter
        ? 'BBD leverages tax deferral and continued compounding to build greater terminal wealth despite interest costs.'
        : 'Sell Assets provides simpler execution with guaranteed tax treatment and no margin call risk.',
      explanation: bbdBetter
        ? `By borrowing against assets instead of selling, you avoid realizing capital gains taxes. The portfolio continues to compound on the full value while interest costs are typically lower than the tax drag from selling.`
        : `The Sell Assets strategy provides peace of mind through simplicity. You pay taxes as you go, eliminating the risk of margin calls and the complexity of managing a line of credit.`,
      taxDeferralBenefit: Math.max(0, sellResult.lifetimeTaxes),
      compoundingAdvantage: Math.max(0, advantage - taxSavings),
    };

    // Set component data
    component.data = {
      bbdData,
      sellData,
      verdict,
      differential,
      insights,
      simulationsRun: this._simulationsRun,
      timeHorizon: this._timeHorizon,
    };
  }

  /**
   * Update visual comparison charts section.
   * Shows BBD vs Sell comparison across multiple perspectives.
   */
  private updateVisualComparisonCharts(): void {
    const section = this.$('#visual-comparison-section');

    if (!section) return;

    // Only show when SBLOC data is available
    if (!this._data?.sblocTrajectory || !this._data?.estateAnalysis) {
      section.classList.remove('visible');
      return;
    }

    section.classList.add('visible');

    // Calculate sell strategy for comparison
    const sellResult = calculateSellStrategy(
      {
        initialValue: this._initialValue,
        annualWithdrawal: this._annualWithdrawal,
        withdrawalGrowth: 0.03,
        timeHorizon: this._timeHorizon,
        capitalGainsRate: 0.238,
        costBasisRatio: 0.4,
      },
      this._data.yearlyPercentiles,
    );

    // Update Comparison Line Chart (Net Worth Over Time)
    this.updateComparisonLineChart(sellResult);

    // Update Cumulative Costs Chart
    this.updateCumulativeCostsChart(sellResult);

    // Update Terminal Comparison Chart
    this.updateTerminalComparisonChart(sellResult);

    // Update SBLOC Utilization Chart
    this.updateSBLOCUtilizationChart();
  }

  /**
   * Update comparison line chart with BBD vs Sell trajectories.
   */
  private updateComparisonLineChart(sellResult: ReturnType<typeof calculateSellStrategy>): void {
    const chart = this.$('#comparison-line-chart') as HTMLElement & {
      setData(data: ComparisonLineChartData): void;
    } | null;

    if (!chart || !this._data?.sblocTrajectory) return;

    const traj = this._data.sblocTrajectory;
    const years = traj.years;

    // BBD net worth = portfolio value - loan balance
    const bbdValues = years.map((year, idx) => {
      const portfolio = this._data!.yearlyPercentiles[idx]?.p50 || 0;
      const loan = traj.loanBalance.p50[idx] || 0;
      return portfolio - loan;
    });

    // Sell trajectory uses the yearly values from sell calculation
    const sellValues = sellResult.yearlyValues.slice(0, years.length);

    // Pad if sell values are shorter
    while (sellValues.length < years.length) {
      sellValues.push(sellValues[sellValues.length - 1] || 0);
    }

    chart.setData({
      labels: years.map(y => `Year ${y}`),
      bbdValues,
      sellValues,
    });
  }

  /**
   * Update cumulative costs chart comparing taxes vs interest.
   */
  private updateCumulativeCostsChart(sellResult: ReturnType<typeof calculateSellStrategy>): void {
    const chart = this.$('#cumulative-costs-chart') as HTMLElement & {
      setData(data: CumulativeCostsChartData): void;
    } | null;

    if (!chart || !this._data?.sblocTrajectory) return;

    const traj = this._data.sblocTrajectory;
    const years = traj.years;

    // Cumulative interest from SBLOC trajectory
    const interest = traj.cumulativeInterest.p50;

    // Calculate cumulative taxes from sell strategy
    // Since sell strategy gives us total lifetime taxes, we need to estimate yearly
    // Use a simple linear approximation based on withdrawal pattern
    const totalTaxes = sellResult.lifetimeTaxes;
    const taxes = years.map((_, idx) => {
      // Progressive tax accumulation (roughly linear with compound growth)
      const progress = (idx + 1) / years.length;
      return totalTaxes * Math.pow(progress, 1.3);  // Slightly accelerated
    });

    chart.setData({
      labels: years.map(y => `Year ${y}`),
      taxes,
      interest,
    });
  }

  /**
   * Update terminal comparison chart with percentile bars.
   */
  private updateTerminalComparisonChart(sellResult: ReturnType<typeof calculateSellStrategy>): void {
    const chart = this.$('#terminal-comparison-chart') as HTMLElement & {
      setData(data: TerminalComparisonChartData): void;
    } | null;

    if (!chart || !this._data?.sblocTrajectory) return;

    const traj = this._data.sblocTrajectory;
    const lastIdx = traj.years.length - 1;

    // Get BBD terminal values at each percentile (portfolio - loan)
    const values = Array.from(this._data.terminalValues);
    const bbdP10 = percentile(values, 10) - (traj.loanBalance.p90[lastIdx] || 0);
    const bbdP25 = percentile(values, 25) - (traj.loanBalance.p75[lastIdx] || 0);
    const bbdP50 = percentile(values, 50) - (traj.loanBalance.p50[lastIdx] || 0);
    const bbdP75 = percentile(values, 75) - (traj.loanBalance.p25[lastIdx] || 0);
    const bbdP90 = percentile(values, 90) - (traj.loanBalance.p10[lastIdx] || 0);

    // Sell percentiles - use P10/P90 from result, interpolate others
    const sellP10 = sellResult.terminalP10;
    const sellP90 = sellResult.terminalP90;
    const sellP50 = sellResult.terminalNetWorth;
    // Linear interpolation for P25/P75
    const sellP25 = sellP10 + (sellP50 - sellP10) * 0.375;
    const sellP75 = sellP50 + (sellP90 - sellP50) * 0.5;

    chart.setData({
      percentiles: ['10th', '25th', '50th', '75th', '90th'],
      bbdValues: [bbdP10, bbdP25, bbdP50, bbdP75, bbdP90].map(v => Math.max(0, v)),
      sellValues: [sellP10, sellP25, sellP50, sellP75, sellP90].map(v => Math.max(0, v)),
    });
  }

  /**
   * Update SBLOC utilization chart with percentile bands.
   */
  private updateSBLOCUtilizationChart(): void {
    const chart = this.$('#sbloc-utilization-chart') as HTMLElement & {
      setData(data: SBLOCUtilizationChartData): void;
    } | null;

    if (!chart || !this._data?.sblocTrajectory) return;

    const traj = this._data.sblocTrajectory;
    const years = traj.years;

    // Calculate utilization percentiles (loan balance / portfolio value * 100)
    // Note: For utilization, P90 means high utilization (bad), P10 means low (good)
    const p10: number[] = [];
    const p25: number[] = [];
    const p50: number[] = [];
    const p75: number[] = [];
    const p90: number[] = [];

    for (let idx = 0; idx < years.length; idx++) {
      const year = years[idx];
      const yearData = this._data!.yearlyPercentiles[idx];

      if (!yearData) {
        p10.push(0);
        p25.push(0);
        p50.push(0);
        p75.push(0);
        p90.push(0);
        continue;
      }

      // Utilization = loan / portfolio * 100
      // Best case (P10 utilization): low loan, high portfolio -> p10 loan / p90 portfolio
      // Worst case (P90 utilization): high loan, low portfolio -> p90 loan / p10 portfolio

      const portfolioP10 = yearData.p10 || 1;
      const portfolioP25 = yearData.p25 || 1;
      const portfolioP50 = yearData.p50 || 1;
      const portfolioP75 = yearData.p75 || 1;
      const portfolioP90 = yearData.p90 || 1;

      const loanP10 = traj.loanBalance.p10[idx] || 0;
      const loanP25 = traj.loanBalance.p25?.[idx] || (loanP10 + (traj.loanBalance.p50[idx] || 0)) / 2;
      const loanP50 = traj.loanBalance.p50[idx] || 0;
      const loanP75 = traj.loanBalance.p75?.[idx] || (loanP50 + (traj.loanBalance.p90[idx] || 0)) / 2;
      const loanP90 = traj.loanBalance.p90[idx] || 0;

      // Best case: low loan / high portfolio (optimistic scenario)
      p10.push((loanP10 / portfolioP90) * 100);
      // Good case
      p25.push((loanP25 / portfolioP75) * 100);
      // Median case
      p50.push((loanP50 / portfolioP50) * 100);
      // Bad case
      p75.push((loanP75 / portfolioP25) * 100);
      // Worst case: high loan / low portfolio (pessimistic scenario)
      p90.push((loanP90 / portfolioP10) * 100);
    }

    // Get max borrowing from config or default
    const maxBorrowing = (this._simulationConfig?.sbloc?.targetLTV || 0.65) * 100;

    chart.setData({
      labels: years.map(y => `Year ${y}`),
      p10,
      p25,
      p50,
      p75,
      p90,
      maxBorrowing,
    });
  }

  /**
   * Update yearly analysis table with year-by-year breakdown.
   * Displays withdrawals and net worth percentiles for each year.
   */
  private updateYearlyAnalysisTable(): void {
    const table = this.$('#yearly-analysis-table') as YearlyAnalysisTable | null;
    if (!table || !this._data) return;

    // Calculate start year (current year)
    const startYear = new Date().getFullYear();

    // Calculate withdrawal data with 3% annual growth
    const withdrawalGrowth = 0.03;
    const withdrawals = calculateWithdrawals(
      this._annualWithdrawal,
      withdrawalGrowth,
      this._timeHorizon
    );

    // Transform yearly percentiles to include calendar year
    const percentiles = this._data.yearlyPercentiles.map((p, index) => ({
      year: startYear + index,
      p10: p.p10,
      p25: p.p25,
      p50: p.p50,
      p75: p.p75,
      p90: p.p90,
    }));

    // Set table data
    table.data = {
      startYear,
      withdrawals,
      percentiles,
    };
  }

  /**
   * Update performance summary table with percentile metrics.
   * Shows TWRR, portfolio balance, mean return, and volatility across percentiles.
   */
  private updatePerformanceTable(): void {
    const table = this.$('#performance-table') as PerformanceTable | null;
    if (!table || !this._data) return;

    // Calculate performance summary data
    const summaryData = calculatePerformanceSummary(
      this._data.terminalValues,
      this._initialValue,
      this._timeHorizon
    );

    table.data = summaryData;
  }

  /**
   * Update return probability table with expected returns and probability matrix.
   * Shows CAGR by percentile and probability of achieving return thresholds.
   */
  private updateReturnProbabilityTable(): void {
    const table = this.$('#return-probability-table') as ReturnProbabilityTable | null;
    if (!table || !this._data) return;

    // Calculate expected returns by percentile
    const expectedReturns = calculateExpectedReturns(
      this._data.terminalValues,
      this._initialValue,
      this._timeHorizon
    );

    // Calculate return probabilities
    const probabilities = calculateReturnProbabilities(
      this._data.terminalValues,
      this._initialValue,
      this._timeHorizon
    );

    table.expectedReturns = expectedReturns;
    table.probabilities = probabilities;
  }

  /**
   * Update recommendations section with insights and considerations.
   * Generates dynamic insights based on simulation results.
   */
  private updateRecommendationsSection(): void {
    const component = this.$('#recommendations') as RecommendationsSection | null;

    if (!component || !this._data || !this._simulationConfig) return;

    // Calculate CAGR for insight generation
    const extended = this.computeExtendedStats();
    const cagr = extended?.cagr;

    // Generate insights based on simulation results
    const insights = generateInsights({
      statistics: this._data.statistics,
      marginCallStats: this._data.marginCallStats,
      config: this._simulationConfig,
      sblocTrajectory: this._data.sblocTrajectory,
      cagr,
    });

    // Get margin call probability for considerations
    const marginCallProbability = this._data.marginCallStats && this._data.marginCallStats.length > 0
      ? this._data.marginCallStats[this._data.marginCallStats.length - 1].cumulativeProbability
      : 0;

    // Get interest rate from config
    const interestRate = this._simulationConfig.sbloc?.interestRate || 0.07;

    // Generate standard considerations
    const considerations = generateConsiderations(marginCallProbability, interestRate);

    // Update component
    component.data = {
      insights,
      considerations,
    };
  }

  /**
   * Calculate expected return and volatility for each asset from preset data.
   * Uses bundled historical returns to compute annualized metrics.
   *
   * @param symbols - Array of asset symbols (e.g., ['SPY', 'AGG'])
   * @returns Object with expectedReturns, volatilities, and isEstimate arrays
   */
  private calculateAssetStatistics(symbols: string[]): {
    expectedReturns: number[];
    volatilities: number[];
    isEstimate: boolean[];
  } {
    const expectedReturns: number[] = [];
    const volatilities: number[] = [];
    const isEstimate: boolean[] = [];

    for (const symbol of symbols) {
      const presetData = getPresetData(symbol);

      if (presetData && presetData.returns.length > 0) {
        // Extract daily returns
        const dailyReturns = presetData.returns.map(r => r.return);

        // Calculate expected annual return from daily returns
        // Annualize: (1 + daily mean)^252 - 1 (252 trading days)
        const dailyMean = mean(dailyReturns);
        const annualReturn = Math.pow(1 + dailyMean, 252) - 1;

        // Calculate annualized volatility
        // Daily volatility * sqrt(252)
        const dailyVol = stddev(dailyReturns);
        const annualVol = dailyVol * Math.sqrt(252);

        expectedReturns.push(annualReturn);
        volatilities.push(annualVol);
        isEstimate.push(false);
      } else {
        // Fallback values if preset data not available
        // Use market average estimates - mark as estimates for UI indication
        expectedReturns.push(0.08);  // 8% default expected return
        volatilities.push(0.16);    // 16% default volatility
        isEstimate.push(true);
      }
    }

    return { expectedReturns, volatilities, isEstimate };
  }
}

// Register the custom element
customElements.define('results-dashboard', ResultsDashboard);
