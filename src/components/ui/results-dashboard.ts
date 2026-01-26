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
import type { ProbabilityConeData, HistogramData, HistogramBin, HeatmapData, BarChartData, LineChartData } from '../../charts/types';
import type { BBDComparisonChartData } from '../../charts/bbd-comparison-chart';
import type { ComparisonLineChartData } from '../../charts/comparison-line-chart';
import type { CumulativeCostsChartData } from '../../charts/cumulative-costs-chart';
import type { TerminalComparisonChartData } from '../../charts/terminal-comparison-chart';
import type { SBLOCUtilizationChartData } from '../../charts/sbloc-utilization-chart';
import type { KeyMetricsData } from './key-metrics-banner';
import type { ParamSummaryData, PortfolioAsset } from './param-summary';
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
// Import sell yearly analysis table
import './sell-yearly-analysis-table';
import type { SellYearlyAnalysisTable, SellYearlyAnalysisTableProps } from './sell-yearly-analysis-table';
// Import performance tables
import './performance-table';
import './return-probability-table';
// Import recommendations section
import './recommendations-section';
// Import portfolio visualization card
import './portfolio-viz-card';

/** Portfolio color palette for consistent asset colors */
const PORTFOLIO_COLORS = [
  '#0d9488', // teal
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // cyan
  '#f97316', // orange
];

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

        <section class="chart-section full-width">
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
              <span class="stat-label">Median CAGR</span>
              <span class="stat-value" id="stat-cagr">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">TWRR (Median)</span>
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

        <!-- Portfolio visualization now integrated into param-summary above -->
        <!-- <section class="portfolio-viz-section full-width">
          <portfolio-viz-card id="portfolio-viz-card"></portfolio-viz-card>
        </section> -->

        <section class="chart-section full-width">
          <h3>Asset Correlations</h3>
          <div class="correlation-container">
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

        <section class="table-section full-width sbloc-section" id="sell-yearly-analysis-section">
          <sell-yearly-analysis-table id="sell-yearly-analysis-table"></sell-yearly-analysis-table>
        </section>
      </div>

      <!-- Debug Panel (development only) -->
      <section class="debug-section" id="debug-section">
        <div class="debug-header">
          <button class="debug-toggle" id="debug-toggle">
            <span class="debug-toggle-icon">▶</span>
            Debug Panel
          </button>
          <button class="debug-copy hidden" id="debug-copy" title="Copy to clipboard">
            📋 Copy
          </button>
        </div>
        <div class="debug-content hidden" id="debug-content">
          <pre id="debug-output"></pre>
        </div>
      </section>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        max-width: 100%;
        overflow-x: hidden;
      }

      /* Shadow DOM reset - global box-sizing doesn't penetrate */
      *, *::before, *::after {
        box-sizing: border-box;
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
        transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    border-color 0.3s ease;
      }

      .chart-section:hover,
      .stats-section:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
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

      .correlation-container {
        /* No fixed height - let table determine size */
      }

      .chart-container probability-cone-chart,
      .chart-container histogram-chart,
      .chart-container donut-chart,
      .chart-container correlation-heatmap,
      .chart-container bbd-comparison-chart,
      .chart-container margin-call-chart,
      .chart-container sbloc-balance-chart {
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
        transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    border-color 0.3s ease;
      }

      .stat-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md, 0 4px 12px rgba(26, 36, 36, 0.08));
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

      /* Portfolio visualization section - component provides its own styling */
      .portfolio-viz-section {
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
        transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    border-color 0.3s ease;
      }

      .debt-spectrum-wrapper:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
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
        transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    border-color 0.3s ease;
      }

      .comparison-wrapper:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
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
        transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1),
                    border-color 0.3s ease;
      }

      .comparison-chart-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
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

      /* Reduced motion support - disable animations for users who prefer reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .chart-section,
        .stats-section,
        .stat-item,
        .comparison-chart-card,
        .debt-spectrum-wrapper,
        .comparison-wrapper {
          transition: none;
        }

        .chart-section:hover,
        .stats-section:hover,
        .stat-item:hover,
        .comparison-chart-card:hover,
        .debt-spectrum-wrapper:hover,
        .comparison-wrapper:hover {
          transform: none;
        }
      }

      /* Mobile responsive: single column on small screens */
      @media (max-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
          gap: var(--spacing-md, 16px);
        }

        .chart-section,
        .stats-section {
          padding: var(--spacing-md, 16px);
        }

        .chart-section h3,
        .stats-section h3 {
          font-size: var(--font-size-base, 1rem);
          margin-bottom: var(--spacing-sm, 8px);
        }

        .chart-container {
          height: 280px;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-sm, 8px);
        }

        .stat-item {
          padding: var(--spacing-sm, 8px);
        }

        .stat-label {
          font-size: 0.75rem;
        }

        .stat-value {
          font-size: var(--font-size-base, 1rem);
        }

        .correlation-container {
          /* Allow table to scroll horizontally */
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .comparison-grid {
          grid-template-columns: 1fr;
          gap: var(--spacing-md, 16px);
        }

        .comparison-wrapper {
          padding: var(--spacing-md, 16px);
        }

        .comparison-wrapper h3 {
          font-size: var(--font-size-base, 1rem);
        }

        .comparison-chart-card {
          padding: var(--spacing-sm, 8px);
        }

        .comparison-chart-card h4 {
          font-size: var(--font-size-sm, 0.875rem);
          margin-bottom: var(--spacing-sm, 8px);
        }

        .comparison-chart-container {
          height: 250px;
        }

        .comparison-chart-container.short {
          height: 220px;
        }

        .bbd-container {
          height: 250px;
        }

        /* Debt spectrum section mobile adjustments */
        .debt-spectrum-wrapper {
          padding: var(--spacing-md, 16px);
        }

        .debt-box {
          padding: var(--spacing-sm, 8px);
        }

        .debt-box-header {
          gap: var(--spacing-sm, 8px);
        }

        .debt-box-header h4 {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .debt-explanation {
          margin-top: var(--spacing-md, 16px);
          padding-top: var(--spacing-sm, 8px);
        }

        .debt-explanation p,
        .debt-explanation ul {
          font-size: 0.75rem;
        }
      }

      /* Debug section styling */
      .debug-section {
        margin-top: var(--spacing-xl, 32px);
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        overflow: hidden;
      }

      .debug-header {
        display: flex;
        align-items: center;
        background: var(--surface-secondary, #f8fafc);
      }

      .debug-toggle {
        flex: 1;
        padding: var(--spacing-md, 16px);
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--text-secondary, #475569);
        text-align: left;
      }

      .debug-toggle:hover {
        background: var(--surface-tertiary, #f1f5f9);
      }

      .debug-toggle-icon {
        transition: transform 0.2s ease;
      }

      .debug-toggle.expanded .debug-toggle-icon {
        transform: rotate(90deg);
      }

      .debug-copy {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        margin-right: var(--spacing-sm, 8px);
        background: var(--color-primary, #0d9488);
        color: white;
        border: none;
        border-radius: var(--radius-md, 6px);
        cursor: pointer;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        transition: background 0.2s ease;
      }

      .debug-copy:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .debug-copy.copied {
        background: #22c55e;
      }

      .debug-copy.hidden {
        display: none;
      }

      .debug-content {
        padding: var(--spacing-md, 16px);
        max-height: 600px;
        overflow: auto;
        background: #1e293b;
      }

      .debug-content.hidden {
        display: none;
      }

      #debug-output {
        margin: 0;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 11px;
        line-height: 1.5;
        color: #e2e8f0;
        white-space: pre-wrap;
        word-break: break-word;
      }

      /* Extra small screens */
      @media (max-width: 480px) {
        .chart-container {
          height: 240px;
        }

        .stats-grid {
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-xs, 4px);
        }

        .stat-item {
          padding: var(--spacing-xs, 4px);
        }

        .stat-label {
          font-size: 0.65rem;
        }

        .stat-value {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .comparison-chart-container {
          height: 220px;
        }

        .comparison-chart-container.short {
          height: 200px;
        }

        .bbd-container {
          height: 220px;
        }
      }
    `;
  }

  protected override afterRender(): void {
    // Initial state: show no-data message
    this.updateCharts();

    // Setup debug panel toggle
    const toggle = this.$('#debug-toggle');
    const content = this.$('#debug-content');
    const copyBtn = this.$('#debug-copy');

    if (toggle && content && copyBtn) {
      toggle.addEventListener('click', () => {
        const isExpanded = toggle.classList.toggle('expanded');
        content.classList.toggle('hidden');
        // Show/hide copy button based on panel state
        if (isExpanded) {
          copyBtn.classList.remove('hidden');
        } else {
          copyBtn.classList.add('hidden');
        }
      });

      // Copy button handler
      copyBtn.addEventListener('click', async () => {
        const output = this.$('#debug-output');
        if (output) {
          try {
            await navigator.clipboard.writeText(output.textContent || '');
            copyBtn.textContent = '✓ Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.textContent = '📋 Copy';
              copyBtn.classList.remove('copied');
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
            copyBtn.textContent = '❌ Failed';
            setTimeout(() => {
              copyBtn.textContent = '📋 Copy';
            }, 2000);
          }
        }
      });
    }
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

    // Portfolio visualization now integrated into param-summary (updateParamSummary handles this)

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

    if (this._data?.estateAnalysis && this._data?.sblocTrajectory && bbdSection && bbdChart) {
      bbdSection.classList.add('visible');

      // Calculate correct sell strategy terminal value using the actual sell simulation
      // The estateAnalysis.sellNetEstate is incorrect because it uses BBD portfolio value
      const timeHorizon = this.getEffectiveTimeHorizon();
      const initialValue = this.getEffectiveInitialValue();
      const percentilesWithYear0 = [
        {
          year: 0,
          p10: initialValue,
          p25: initialValue,
          p50: initialValue,
          p75: initialValue,
          p90: initialValue,
        },
        ...this._data.yearlyPercentiles,
      ];

      const sellResult = calculateSellStrategy(
        {
          initialValue,
          annualWithdrawal: this.getEffectiveAnnualWithdrawal(),
          withdrawalGrowth: this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03,
          timeHorizon,
          capitalGainsRate: this._simulationConfig?.taxModeling?.ltcgTaxRate ?? 0.238,
          costBasisRatio: this.getEffectiveCostBasisRatio(),
          dividendYield: this.getEffectiveSellDividendYield(),
        },
        percentilesWithYear0,
      );

      // Use BBD net estate from simulation, but correct sell terminal value
      const bbdNetEstate = this._data.estateAnalysis.bbdNetEstate;
      const sellNetEstate = sellResult.terminalNetWorth;
      const bbdAdvantage = bbdNetEstate - sellNetEstate;

      bbdChart.setData({
        bbdNetEstate,
        sellNetEstate,
        bbdAdvantage,
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

    // Update Sell strategy yearly analysis table
    this.updateSellYearlyAnalysisTable();

    // Update debug panel with raw data
    this.updateDebugPanel();
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

    // Use config values with fallbacks to instance variables
    const initialValue = this._simulationConfig?.initialValue ?? this._initialValue;
    const timeHorizon = this._simulationConfig?.timeHorizon ?? this._timeHorizon;

    const terminalValues = Array.from(this._data.terminalValues);
    const { median } = this._data.statistics;

    // CAGR from median terminal value
    const cagr = calculateCAGR(initialValue, median, timeHorizon);

    // Annualized volatility from terminal value returns
    // Convert terminal values to annualized returns for volatility calculation
    const annualizedReturns = terminalValues.map(tv => {
      const totalReturn = (tv - initialValue) / initialValue;
      return Math.pow(1 + totalReturn, 1 / timeHorizon) - 1;
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
   *
   * NOTE: For SBLOC simulations, terminalValues already contains NET WORTH
   * (portfolio - loan). The simulation engine converts these values in post-processing.
   * We do NOT subtract loan balance here to avoid double-subtraction.
   */
  private updateNetWorthSpectrum(): void {
    const spectrum = this.$('#net-worth-spectrum') as PercentileSpectrum | null;

    if (!spectrum || !this._data) return;

    // terminalValues already contains NET WORTH for SBLOC simulations
    // (converted in monte-carlo.ts post-processing step)
    const values = Array.from(this._data.terminalValues);

    // Calculate percentiles directly - these are already net worth
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

    // Get annual withdrawal from config (primary) or fallback to instance variable
    // This handles timing issues where simulationConfig is set after annualWithdrawal setter
    const annualWithdrawal = this._simulationConfig?.sbloc?.annualWithdrawal ?? this._annualWithdrawal;

    // Show only when there's a withdrawal configured
    if (annualWithdrawal <= 0) {
      section.classList.remove('visible');
      return;
    }

    section.classList.add('visible');

    // Use calculateSalaryEquivalent from existing calculation module
    const result = calculateSalaryEquivalent(
      annualWithdrawal,
      this._effectiveTaxRate
    );

    salaryComponent.data = {
      withdrawal: annualWithdrawal,
      taxableEquivalent: result.salaryEquivalent,
      taxSavings: result.taxSavings,
      taxRate: this._effectiveTaxRate,
    };
  }

  /**
   * Get the effective time horizon from simulation config or fallback.
   */
  private getEffectiveTimeHorizon(): number {
    return this._simulationConfig?.timeHorizon ?? this._timeHorizon;
  }

  /**
   * Get the effective initial value from simulation config or fallback.
   */
  private getEffectiveInitialValue(): number {
    return this._simulationConfig?.initialValue ?? this._initialValue;
  }

  /**
   * Get the effective annual withdrawal from simulation config or fallback.
   */
  private getEffectiveAnnualWithdrawal(): number {
    return this._simulationConfig?.sbloc?.annualWithdrawal ?? this._annualWithdrawal;
  }

  /**
   * Get the effective cost basis ratio from simulation config or fallback.
   * Default: 0.4 (40% basis, 60% embedded gains)
   */
  private getEffectiveCostBasisRatio(): number {
    return this._simulationConfig?.sellStrategy?.costBasisRatio ?? 0.4;
  }

  /**
   * Get the effective dividend yield for Sell strategy from simulation config or fallback.
   * Default: 0.02 (2% annual dividend yield)
   */
  private getEffectiveSellDividendYield(): number {
    return this._simulationConfig?.sellStrategy?.dividendYield ?? 0.02;
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
    const p10PortfolioValue = percentile(values, 10);

    // Get effective configuration values
    const timeHorizon = this.getEffectiveTimeHorizon();
    const initialValue = this.getEffectiveInitialValue();

    // Calculate sell strategy metrics using actual simulation
    let sellSuccessRate = 100;
    let sellTerminal = this._data.statistics.median * 0.85; // Fallback estimate

    if (this._data.sblocTrajectory && this._data.yearlyPercentiles.length > 0) {
      // Year 0 represents the portfolio state at simulation start.
      // All percentiles equal the initial value since no returns have occurred.
      // This allows growth rate calculation for year 1: (year1Value - initialValue) / initialValue
      const percentilesWithYear0 = [
        {
          year: 0,
          p10: initialValue,
          p25: initialValue,
          p50: initialValue,
          p75: initialValue,
          p90: initialValue,
        },
        ...this._data.yearlyPercentiles,
      ];

      // Calculate actual sell strategy result
      const sellResult = calculateSellStrategy(
        {
          initialValue,
          annualWithdrawal: this.getEffectiveAnnualWithdrawal(),
          withdrawalGrowth: this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03,
          timeHorizon,
          capitalGainsRate: this._simulationConfig?.taxModeling?.ltcgTaxRate ?? 0.238,
          costBasisRatio: this.getEffectiveCostBasisRatio(),
          dividendYield: this.getEffectiveSellDividendYield(),
        },
        percentilesWithYear0,
      );
      sellSuccessRate = sellResult.successRate;
      sellTerminal = sellResult.terminalNetWorth;
    } else if (this._data.estateAnalysis) {
      // Use estate analysis as fallback (one-time sale calculation)
      sellTerminal = this._data.estateAnalysis.sellNetEstate;
      // Estimate success rate based on BBD success (sell typically has similar or slightly higher)
      sellSuccessRate = Math.min(100, this._data.statistics.successRate + 5);
    }

    // Calculate utilization metrics from SBLOC trajectory if available
    let medianUtilization = 0;
    let yearsAbove70 = 0;
    let peakUtilizationP90 = 0;
    let safetyBufferP10 = 100;
    let mostDangerousYear = 1;

    if (this._data.sblocTrajectory) {
      const traj = this._data.sblocTrajectory;
      const lastYearIdx = traj.years.length - 1;
      const medianLoan = traj.loanBalance.p50[lastYearIdx];

      // For utilization calculation, we need GROSS portfolio value, not net worth
      // Gross portfolio = net worth + loan balance
      // statistics.median is already net worth for SBLOC simulations
      const medianNetWorth = this._data.statistics.median;
      const medianGrossPortfolio = medianNetWorth + medianLoan;

      // Utilization = loan / gross portfolio
      medianUtilization = medianGrossPortfolio > 0 ? (medianLoan / medianGrossPortfolio) * 100 : 0;

      // Peak utilization (P90 loan / P10 portfolio scenario)
      peakUtilizationP90 = Math.min(100, medianUtilization * 1.5);

      // Safety buffer is inverse of utilization at P10 scenario
      safetyBufferP10 = Math.max(0, 100 - peakUtilizationP90);

      // Estimate years above 70% utilization (rough estimate)
      yearsAbove70 = medianUtilization > 70 ? timeHorizon * 0.3 : 0;

      // Most dangerous year is typically early years with high drawdown
      mostDangerousYear = Math.min(5, timeHorizon);
    }

    // Get margin call probability
    const marginCallProbability = this._data.marginCallStats && this._data.marginCallStats.length > 0
      ? this._data.marginCallStats[this._data.marginCallStats.length - 1].cumulativeProbability
      : 0;

    // Terminal NET WORTH values - statistics.median and p10PortfolioValue are ALREADY net worth
    // for SBLOC simulations (converted in monte-carlo.ts post-processing)
    const medianTerminalNetWorth = this._data.statistics.median;
    const p10NetWorth = p10PortfolioValue;

    banner.data = {
      bbdSuccessRate: this._data.statistics.successRate,
      sellSuccessRate,
      medianUtilization,
      yearsAbove70Pct: yearsAbove70,
      cagr: extended?.cagr || 0,
      startingValue: initialValue,
      medianTerminal: medianTerminalNetWorth,
      sellTerminal,
      p10Outcome: p10NetWorth,
      marginCallProbability,
      peakUtilizationP90,
      safetyBufferP10,
      mostDangerousYear,
      timeHorizon,
    };
  }

  /**
   * Update parameter summary with simulation configuration and portfolio assets.
   */
  private updateParamSummary(): void {
    const summary = this.$('#param-summary') as HTMLElement & {
      data: ParamSummaryData | null;
      portfolioAssets: PortfolioAsset[];
    };
    if (!summary) return;

    // Use simulation config if available, otherwise use stored values
    const config = this._simulationConfig;

    summary.data = {
      startingPortfolio: config?.initialValue || this._initialValue,
      timeHorizon: config?.timeHorizon || this._timeHorizon,
      annualWithdrawal: config?.sbloc?.annualWithdrawal || this._annualWithdrawal,
      withdrawalGrowth: (config?.sbloc?.annualWithdrawalRaise ?? 0.03) * 100, // Convert from decimal to percentage
      sblocInterestRate: (config?.sbloc?.interestRate || 0.07) * 100,
      maxBorrowing: (config?.sbloc?.targetLTV || 0.65) * 100,
      maintenanceMargin: (config?.sbloc?.maintenanceMargin || 0.50) * 100,
      simulationsRun: config?.iterations || this._simulationsRun,
    };

    // Pass portfolio assets for visualization
    if (this._portfolioWeights) {
      summary.portfolioAssets = this._portfolioWeights.map((p, idx) => {
        const preset = getPresetData(p.symbol);
        return {
          symbol: p.symbol,
          name: preset?.name || p.symbol,
          weight: p.weight, // Already in 0-100 format from portfolio-composition
          color: PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length],
        };
      });
    }
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

    // Get effective configuration values
    const timeHorizon = this.getEffectiveTimeHorizon();
    const initialValue = this.getEffectiveInitialValue();

    // Year 0 represents the portfolio state at simulation start.
    // All percentiles equal the initial value since no returns have occurred.
    // This allows growth rate calculation for year 1: (year1Value - initialValue) / initialValue
    const percentilesWithYear0 = [
      {
        year: 0,
        p10: initialValue,
        p25: initialValue,
        p50: initialValue,
        p75: initialValue,
        p90: initialValue,
      },
      ...this._data.yearlyPercentiles,
    ];

    // Calculate sell strategy metrics
    const sellResult = calculateSellStrategy(
      {
        initialValue,
        annualWithdrawal: this.getEffectiveAnnualWithdrawal(),
        withdrawalGrowth: this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03,
        timeHorizon,
        capitalGainsRate: this._simulationConfig?.taxModeling?.ltcgTaxRate ?? 0.238,
        costBasisRatio: this.getEffectiveCostBasisRatio(),
        dividendYield: this.getEffectiveSellDividendYield(),
      },
      percentilesWithYear0,
    );

    // Get SBLOC metrics
    const traj = this._data.sblocTrajectory;
    const lastIdx = traj.years.length - 1;
    const terminalLoan = traj.loanBalance.p50[lastIdx] || 0;
    const cumulativeInterest = traj.cumulativeInterest.p50[lastIdx] || 0;

    // statistics.median is ALREADY net worth for SBLOC simulations
    // (converted in monte-carlo.ts post-processing)
    const bbdTerminalNetWorth = this._data.statistics.median;

    // Margin call probability
    const marginCallProbability = this._data.marginCallStats && this._data.marginCallStats.length > 0
      ? this._data.marginCallStats[this._data.marginCallStats.length - 1].cumulativeProbability
      : 0;

    // Determine verdict
    const bbdBetter = bbdTerminalNetWorth > sellResult.terminalNetWorth;
    const advantage = bbdTerminalNetWorth - sellResult.terminalNetWorth;

    // Calculate tax savings (difference in costs)
    const taxSavings = sellResult.lifetimeTaxes - cumulativeInterest;

    // Calculate BBD dividend taxes
    // In BBD strategy, the portfolio still generates dividends that are taxable income
    // Qualified dividends are taxed at LTCG rates (same as capital gains)
    // NOTE: yearlyPercentiles contains NET WORTH, need to add loan balance to get GROSS portfolio
    const dividendYield = this.getEffectiveSellDividendYield();
    const dividendTaxRate = this._simulationConfig?.taxModeling?.ltcgTaxRate ?? 0.238;
    let bbdDividendTaxes = 0;

    if (dividendYield > 0) {
      // Sum dividend taxes over all years using median GROSS portfolio values
      // Year 0 has no dividends (just the starting value)
      for (let yearIdx = 0; yearIdx < this._data.yearlyPercentiles.length; yearIdx++) {
        const yearData = this._data.yearlyPercentiles[yearIdx];
        const loanBalance = traj.loanBalance.p50[yearIdx] || 0;
        // Reconstruct gross portfolio = net worth + loan
        const grossPortfolio = yearData.p50 + loanBalance;
        const yearlyDividends = grossPortfolio * dividendYield;
        bbdDividendTaxes += yearlyDividends * dividendTaxRate;
      }
    }

    // BBD metrics
    const bbdData = {
      terminalNetWorth: bbdTerminalNetWorth,
      successRate: this._data.statistics.successRate,
      lifetimeCost: cumulativeInterest + bbdDividendTaxes,
      dividendTaxes: bbdDividendTaxes,
      primaryRisk: marginCallProbability > 0
        ? `Margin Call (${marginCallProbability.toFixed(1)}%)`
        : 'Low (0% margin call)',
      marginCallProbability,
    };

    // Sell metrics
    const sellData = {
      terminalNetWorth: sellResult.terminalNetWorth,
      successRate: sellResult.successRate,
      lifetimeCost: sellResult.totalLifetimeTaxes,
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
      simulationsRun: this._simulationConfig?.iterations ?? this._simulationsRun,
      timeHorizon,
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

    // Get effective configuration values
    const timeHorizon = this.getEffectiveTimeHorizon();
    const initialValue = this.getEffectiveInitialValue();

    // Year 0 represents the portfolio state at simulation start.
    // All percentiles equal the initial value since no returns have occurred.
    // This allows growth rate calculation for year 1: (year1Value - initialValue) / initialValue
    const percentilesWithYear0 = [
      {
        year: 0,
        p10: initialValue,
        p25: initialValue,
        p50: initialValue,
        p75: initialValue,
        p90: initialValue,
      },
      ...this._data.yearlyPercentiles,
    ];

    // Calculate sell strategy for comparison
    const sellResult = calculateSellStrategy(
      {
        initialValue,
        annualWithdrawal: this.getEffectiveAnnualWithdrawal(),
        withdrawalGrowth: this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03,
        timeHorizon,
        capitalGainsRate: this._simulationConfig?.taxModeling?.ltcgTaxRate ?? 0.238,
        costBasisRatio: this.getEffectiveCostBasisRatio(),
        dividendYield: this.getEffectiveSellDividendYield(),
      },
      percentilesWithYear0,
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
   *
   * NOTE: For SBLOC simulations, yearlyPercentiles already contains NET WORTH
   * (portfolio - loan). We use these values directly without additional subtraction.
   */
  private updateComparisonLineChart(sellResult: ReturnType<typeof calculateSellStrategy>): void {
    const chart = this.$('#comparison-line-chart') as HTMLElement & {
      setData(data: ComparisonLineChartData): void;
    } | null;

    if (!chart || !this._data?.sblocTrajectory) return;

    const traj = this._data.sblocTrajectory;
    const years = traj.years;

    // yearlyPercentiles already contains NET WORTH for SBLOC simulations
    // (converted in monte-carlo.ts during iteration)
    const bbdValues = years.map((year, idx) => {
      return this._data!.yearlyPercentiles[idx]?.p50 || 0;
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
   *
   * NOTE: For SBLOC simulations, terminalValues already contains NET WORTH
   * (portfolio - loan). We use these values directly without additional subtraction.
   */
  private updateTerminalComparisonChart(sellResult: ReturnType<typeof calculateSellStrategy>): void {
    const chart = this.$('#terminal-comparison-chart') as HTMLElement & {
      setData(data: TerminalComparisonChartData): void;
    } | null;

    if (!chart || !this._data?.sblocTrajectory) return;

    // terminalValues already contains NET WORTH for SBLOC simulations
    // (converted in monte-carlo.ts post-processing step)
    const values = Array.from(this._data.terminalValues);
    const bbdP10 = percentile(values, 10);
    const bbdP25 = percentile(values, 25);
    const bbdP50 = percentile(values, 50);
    const bbdP75 = percentile(values, 75);
    const bbdP90 = percentile(values, 90);

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
   *
   * NOTE: For SBLOC simulations, yearlyPercentiles contains NET WORTH (portfolio - loan).
   * To calculate utilization (loan / gross portfolio), we need to reconstruct gross portfolio:
   * gross portfolio = net worth + loan balance
   */
  private updateSBLOCUtilizationChart(): void {
    const chart = this.$('#sbloc-utilization-chart') as HTMLElement & {
      setData(data: SBLOCUtilizationChartData): void;
    } | null;

    if (!chart || !this._data?.sblocTrajectory) return;

    const traj = this._data.sblocTrajectory;
    const years = traj.years;

    // Calculate utilization percentiles (loan balance / GROSS portfolio value * 100)
    // yearlyPercentiles contains NET WORTH, so we reconstruct gross portfolio:
    // gross portfolio = net worth + loan
    //
    // Note: For utilization, P90 means high utilization (bad), P10 means low (good)
    const p10: number[] = [];
    const p25: number[] = [];
    const p50: number[] = [];
    const p75: number[] = [];
    const p90: number[] = [];

    for (let idx = 0; idx < years.length; idx++) {
      const yearData = this._data!.yearlyPercentiles[idx];

      if (!yearData) {
        p10.push(0);
        p25.push(0);
        p50.push(0);
        p75.push(0);
        p90.push(0);
        continue;
      }

      // yearData contains NET WORTH percentiles
      const netWorthP10 = yearData.p10;
      const netWorthP25 = yearData.p25;
      const netWorthP50 = yearData.p50;
      const netWorthP75 = yearData.p75;
      const netWorthP90 = yearData.p90;

      const loanP10 = traj.loanBalance.p10[idx] || 0;
      const loanP25 = traj.loanBalance.p25?.[idx] || (loanP10 + (traj.loanBalance.p50[idx] || 0)) / 2;
      const loanP50 = traj.loanBalance.p50[idx] || 0;
      const loanP75 = traj.loanBalance.p75?.[idx] || (loanP50 + (traj.loanBalance.p90[idx] || 0)) / 2;
      const loanP90 = traj.loanBalance.p90[idx] || 0;

      // Reconstruct GROSS portfolio = net worth + loan
      // For utilization calculation, we pair:
      // - Best case (low utilization): low loan with high net worth scenario
      // - Worst case (high utilization): high loan with low net worth scenario
      const grossP90 = netWorthP90 + loanP10;  // Best case: high NW, low loan
      const grossP75 = netWorthP75 + loanP25;
      const grossP50 = netWorthP50 + loanP50;  // Median case
      const grossP25 = netWorthP25 + loanP75;
      const grossP10 = netWorthP10 + loanP90;  // Worst case: low NW, high loan

      // Cap utilization at 200% to avoid chart distortion when portfolio approaches zero.
      // Above 100% means "underwater" (loan > portfolio); >200% provides no additional insight.
      const MAX_UTILIZATION = 200;

      // Utilization = loan / gross portfolio * 100
      // Best case (P10 utilization): low loan / high gross portfolio
      p10.push(Math.min(grossP90 > 0 ? (loanP10 / grossP90) * 100 : 0, MAX_UTILIZATION));
      // Good case
      p25.push(Math.min(grossP75 > 0 ? (loanP25 / grossP75) * 100 : 0, MAX_UTILIZATION));
      // Median case
      p50.push(Math.min(grossP50 > 0 ? (loanP50 / grossP50) * 100 : 0, MAX_UTILIZATION));
      // Bad case
      p75.push(Math.min(grossP25 > 0 ? (loanP75 / grossP25) * 100 : 0, MAX_UTILIZATION));
      // Worst case (P90 utilization): high loan / low gross portfolio
      p90.push(Math.min(grossP10 > 0 ? (loanP90 / grossP10) * 100 : MAX_UTILIZATION, MAX_UTILIZATION));
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
   *
   * When SBLOC data is available, the cumulative column shows actual loan balance
   * (principal + accrued interest) from the simulation. Otherwise, it shows
   * synthetic cumulative principal withdrawals.
   */
  private updateYearlyAnalysisTable(): void {
    const table = this.$('#yearly-analysis-table') as YearlyAnalysisTable | null;
    if (!table || !this._data) return;

    // Calculate start year (current year)
    const startYear = new Date().getFullYear();

    // Calculate withdrawal data with user-specified annual growth
    const withdrawalGrowth = this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0;
    const withdrawals = calculateWithdrawals(
      this.getEffectiveAnnualWithdrawal(),
      withdrawalGrowth,
      this._timeHorizon
    );

    // When SBLOC trajectory data is available, use actual loan balances (principal + interest)
    // for the cumulative column instead of synthetic principal-only sums
    const hasSBLOCData = !!this._data.sblocTrajectory;
    if (hasSBLOCData) {
      const loanBalances = this._data.sblocTrajectory!.loanBalance.p50;
      // Replace synthetic cumulative with actual loan balance from simulation
      // This includes both principal borrowed AND accrued interest
      withdrawals.cumulative = loanBalances.slice(0, this._timeHorizon);
    }

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
      isSBLOCLoanBalance: hasSBLOCData,
    };
  }

  /**
   * Update Sell strategy yearly analysis table with year-by-year breakdown.
   * Displays withdrawals, cumulative taxes, and portfolio percentiles.
   * Only shows when SBLOC data is present (comparison mode relevant).
   */
  private updateSellYearlyAnalysisTable(): void {
    const section = this.$('#sell-yearly-analysis-section');
    const table = this.$('#sell-yearly-analysis-table') as SellYearlyAnalysisTable | null;

    if (!section || !table) return;

    // Only show when SBLOC data is available (BBD vs Sell comparison relevant)
    if (!this._data?.sblocTrajectory) {
      section.classList.remove('visible');
      return;
    }

    section.classList.add('visible');

    // Get effective configuration values
    const timeHorizon = this.getEffectiveTimeHorizon();
    const initialValue = this.getEffectiveInitialValue();

    // Year 0 represents the portfolio state at simulation start.
    const percentilesWithYear0 = [
      {
        year: 0,
        p10: initialValue,
        p25: initialValue,
        p50: initialValue,
        p75: initialValue,
        p90: initialValue,
      },
      ...this._data.yearlyPercentiles,
    ];

    // Calculate sell strategy result with full yearly data
    const annualWithdrawal = this.getEffectiveAnnualWithdrawal();
    const sellResult = calculateSellStrategy(
      {
        initialValue,
        annualWithdrawal,
        withdrawalGrowth: this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03,
        timeHorizon,
        capitalGainsRate: this._simulationConfig?.taxModeling?.ltcgTaxRate ?? 0.238,
        costBasisRatio: this.getEffectiveCostBasisRatio(),
        dividendYield: this.getEffectiveSellDividendYield(),
      },
      percentilesWithYear0,
    );

    // Calculate start year (current year)
    const startYear = new Date().getFullYear();

    // Calculate withdrawal data with user-specified annual growth
    const withdrawalGrowth = this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03;
    const withdrawals = calculateWithdrawals(
      annualWithdrawal,
      withdrawalGrowth,
      timeHorizon
    );

    // Transform sell result yearly percentiles to include calendar year
    // Skip year 0 (initial value) to align with display starting from year 1
    const percentiles = sellResult.yearlyPercentiles.slice(1).map((p, index) => ({
      year: startYear + index,
      p10: p.p10,
      p25: p.p25,
      p50: p.p50,
      p75: p.p75,
      p90: p.p90,
    }));

    // Get cumulative taxes (skip year 0)
    const cumulativeTaxes = sellResult.cumulativeTaxes.slice(1);

    // Set table data
    table.data = {
      startYear,
      withdrawals,
      cumulativeTaxes,
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
   * Uses bundled historical annual returns to compute metrics.
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
        // Extract annual returns (preset data is already annual, not daily)
        const annualReturns = presetData.returns.map(r => r.return);

        // Calculate expected annual return as arithmetic mean
        const annualReturn = mean(annualReturns);

        // Calculate annualized volatility as standard deviation of annual returns
        const annualVol = stddev(annualReturns);

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

  /**
   * Update debug panel with raw simulation data.
   * Outputs key data points for debugging anomalous results.
   */
  private updateDebugPanel(): void {
    const output = this.$('#debug-output');
    if (!output) return;

    if (!this._data) {
      output.textContent = 'No simulation data available.';
      return;
    }

    const data = this._data;
    const config = this._simulationConfig;
    const traj = data.sblocTrajectory;
    const estate = data.estateAnalysis;
    const stats = data.statistics;
    const extended = this.computeExtendedStats();

    // Sample terminal values (first 20 and stats)
    const terminalArr = Array.from(data.terminalValues);
    const terminalSample = terminalArr.slice(0, 20);
    const terminalNegativeCount = terminalArr.filter(v => v < 0).length;
    const terminalZeroCount = terminalArr.filter(v => v === 0).length;
    const terminalMin = Math.min(...terminalArr);
    const terminalMax = Math.max(...terminalArr);

    // Build debug output
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    SIMULATION DEBUG DATA');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    // Configuration
    lines.push('▸ CONFIGURATION');
    lines.push(`  Initial Value:      $${(config?.initialValue ?? this._initialValue).toLocaleString()}`);
    lines.push(`  Time Horizon:       ${config?.timeHorizon ?? this._timeHorizon} years`);
    lines.push(`  Annual Withdrawal:  $${(config?.sbloc?.annualWithdrawal ?? this._annualWithdrawal).toLocaleString()}`);
    lines.push(`  Withdrawal Growth:  ${((config?.sbloc?.annualWithdrawalRaise ?? 0.03) * 100).toFixed(1)}%`);
    lines.push(`  SBLOC Interest:     ${((config?.sbloc?.interestRate ?? 0.07) * 100).toFixed(2)}%`);
    lines.push(`  Target LTV:         ${((config?.sbloc?.targetLTV ?? 0.65) * 100).toFixed(0)}%`);
    lines.push(`  Maint. Margin:      ${((config?.sbloc?.maintenanceMargin ?? 0.50) * 100).toFixed(0)}%`);
    lines.push(`  Iterations:         ${config?.iterations?.toLocaleString() ?? 'N/A'}`);
    lines.push('');

    // Phase 23: Methodology Configuration
    lines.push('▸ METHODOLOGY (Phase 23 Alignment)');
    const resamplingMethod = config?.resamplingMethod ?? 'simple';
    const methodLabels: Record<string, string> = {
      'simple': 'Simple Bootstrap (correlated year sampling)',
      'block': 'Block Bootstrap (correlated, preserves autocorrelation)',
      'regime': '4-Regime Switching (bull/bear/crash/recovery)',
      'fat-tail': 'Fat-Tail Model (Student\'s t-distribution)',
    };
    lines.push(`  Return Model:       ${methodLabels[resamplingMethod] || resamplingMethod}`);

    // Regime-specific info
    if (resamplingMethod === 'regime') {
      const calibMode = config?.regimeCalibration ?? 'historical';
      const biasAmount = calibMode === 'conservative' ? '2.0%' : '1.5%';
      lines.push(`  Calibration Mode:   ${calibMode} (survivorship bias: ${biasAmount})`);
    }

    // Withdrawal chapters
    if (config?.withdrawalChapters?.enabled) {
      const ch = config.withdrawalChapters;
      lines.push(`  Withdrawal Chapters: ENABLED`);
      if (ch.chapter2) {
        lines.push(`    Chapter 2: -${ch.chapter2.reductionPercent}% at year ${ch.chapter2.yearsAfterStart} after withdrawals start`);
      }
      if (ch.chapter3) {
        lines.push(`    Chapter 3: -${ch.chapter3.reductionPercent}% at year ${ch.chapter3.yearsAfterStart} after withdrawals start`);
      }
      // Calculate cumulative reduction
      let cumMult = 1.0;
      if (ch.chapter2) cumMult *= (1 - ch.chapter2.reductionPercent / 100);
      if (ch.chapter3) cumMult *= (1 - ch.chapter3.reductionPercent / 100);
      lines.push(`    Cumulative:  Final withdrawal = ${(cumMult * 100).toFixed(1)}% of base`);
    } else {
      lines.push(`  Withdrawal Chapters: disabled`);
    }

    // Tax modeling for BBD dividend borrowing
    if (config?.taxModeling?.enabled && !config.taxModeling.taxAdvantaged) {
      lines.push(`  BBD Dividend Tax:   BORROWING enabled`);
      lines.push(`    Yield: ${(config.taxModeling.dividendYield * 100).toFixed(1)}%, Rate: ${(config.taxModeling.ordinaryTaxRate * 100).toFixed(0)}%`);
    } else {
      lines.push(`  BBD Dividend Tax:   disabled (tax-advantaged or off)`);
    }
    lines.push('');

    // Raw Statistics
    lines.push('▸ RAW STATISTICS (from simulation)');
    lines.push(`  stats.median:       $${stats.median.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    lines.push(`  stats.mean:         $${stats.mean.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    lines.push(`  stats.stddev:       $${stats.stddev.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    lines.push(`  stats.successRate:  ${stats.successRate.toFixed(2)}%`);
    lines.push('');

    // Extended Statistics
    lines.push('▸ COMPUTED EXTENDED STATS');
    lines.push(`  CAGR (median):      ${extended ? (extended.cagr * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`  TWRR (median):      ${extended ? (extended.twrr * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push(`  Volatility:         ${extended ? (extended.volatility * 100).toFixed(2) + '%' : 'N/A'}`);
    lines.push('');

    // Terminal Values Analysis
    const hasSBLOC = !!traj;
    lines.push(`▸ TERMINAL VALUES ANALYSIS ${hasSBLOC ? '(NET WORTH = portfolio - loan)' : '(GROSS PORTFOLIO)'}`);
    lines.push(`  Count:              ${terminalArr.length.toLocaleString()}`);
    lines.push(`  Min:                $${terminalMin.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    lines.push(`  Max:                $${terminalMax.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
    lines.push(`  Negative count:     ${terminalNegativeCount} (${((terminalNegativeCount / terminalArr.length) * 100).toFixed(2)}%)`);
    lines.push(`  Zero count:         ${terminalZeroCount} (${((terminalZeroCount / terminalArr.length) * 100).toFixed(2)}%)`);
    lines.push(`  Sample (first 20):  [${terminalSample.map(v => v.toFixed(0)).join(', ')}]`);
    lines.push('');

    // Yearly Percentiles (first and last few years)
    lines.push(`▸ YEARLY PERCENTILES ${hasSBLOC ? '(NET WORTH = portfolio - loan)' : '(GROSS PORTFOLIO)'}`);
    const percLen = data.yearlyPercentiles.length;
    const percToShow = [...data.yearlyPercentiles.slice(0, 3), ...data.yearlyPercentiles.slice(-3)];
    percToShow.forEach((p, idx) => {
      const label = `Year ${p.year}`;
      lines.push(`  ${label}: P10=$${p.p10.toFixed(0)} | P50=$${p.p50.toFixed(0)} | P90=$${p.p90.toFixed(0)}`);
    });
    if (percLen > 6) {
      lines.push(`  ... (${percLen - 6} more years)`);
    }
    lines.push('');

    // SBLOC Trajectory
    if (traj) {
      lines.push('▸ SBLOC TRAJECTORY');
      const lastIdx = traj.years.length - 1;
      lines.push(`  Years tracked:      ${traj.years.length} (Year ${traj.years[0]} to Year ${traj.years[lastIdx]})`);
      lines.push('');
      lines.push('  LOAN BALANCE (by percentile):');
      lines.push(`    Year 1  - P10: $${(traj.loanBalance.p10[0] || 0).toFixed(0)} | P50: $${(traj.loanBalance.p50[0] || 0).toFixed(0)} | P90: $${(traj.loanBalance.p90[0] || 0).toFixed(0)}`);
      lines.push(`    Year ${traj.years[lastIdx]} - P10: $${(traj.loanBalance.p10[lastIdx] || 0).toFixed(0)} | P50: $${(traj.loanBalance.p50[lastIdx] || 0).toFixed(0)} | P90: $${(traj.loanBalance.p90[lastIdx] || 0).toFixed(0)}`);
      lines.push('');
      lines.push('  CUMULATIVE WITHDRAWALS:');
      lines.push(`    Year 1:  $${(traj.cumulativeWithdrawals[0] || 0).toFixed(0)}`);
      lines.push(`    Year ${traj.years[lastIdx]}: $${(traj.cumulativeWithdrawals[lastIdx] || 0).toFixed(0)}`);
      lines.push('');
      lines.push('  CUMULATIVE INTEREST (P50):');
      lines.push(`    Year 1:  $${(traj.cumulativeInterest.p50[0] || 0).toFixed(0)}`);
      lines.push(`    Year ${traj.years[lastIdx]}: $${(traj.cumulativeInterest.p50[lastIdx] || 0).toFixed(0)}`);
      lines.push('');

      // GROSS PORTFOLIO = Net Worth + Loan (reconstructed for debugging)
      const lastYearPerc = data.yearlyPercentiles[lastIdx];
      if (lastYearPerc) {
        lines.push('  GROSS PORTFOLIO (Net Worth + Loan) at Year 15:');
        // yearlyPercentiles contains NET WORTH, add loan to get gross portfolio
        const grossP10 = lastYearPerc.p10 + (traj.loanBalance.p90[lastIdx] || 0);
        const grossP50 = lastYearPerc.p50 + (traj.loanBalance.p50[lastIdx] || 0);
        const grossP90 = lastYearPerc.p90 + (traj.loanBalance.p10[lastIdx] || 0);
        lines.push(`    P10 Gross: $${grossP10.toFixed(0)} = $${lastYearPerc.p10.toFixed(0)} (NW P10) + $${(traj.loanBalance.p90[lastIdx] || 0).toFixed(0)} (loan P90)`);
        lines.push(`    P50 Gross: $${grossP50.toFixed(0)} = $${lastYearPerc.p50.toFixed(0)} (NW P50) + $${(traj.loanBalance.p50[lastIdx] || 0).toFixed(0)} (loan P50)`);
        lines.push(`    P90 Gross: $${grossP90.toFixed(0)} = $${lastYearPerc.p90.toFixed(0)} (NW P90) + $${(traj.loanBalance.p10[lastIdx] || 0).toFixed(0)} (loan P10)`);
        lines.push('');
      }

      // Utilization calculation (loan / GROSS portfolio)
      lines.push('  UTILIZATION % (Loan / Gross Portfolio):');
      for (const yearIdx of [0, Math.floor(lastIdx / 2), lastIdx]) {
        const yp = data.yearlyPercentiles[yearIdx];
        if (yp) {
          const loan = traj.loanBalance.p50[yearIdx] || 0;
          // yp.p50 is NET WORTH, gross = net worth + loan
          const grossPortfolio = yp.p50 + loan;
          const util = grossPortfolio > 0 ? (loan / grossPortfolio) * 100 : 0;
          lines.push(`    Year ${traj.years[yearIdx]}: ${util.toFixed(1)}% = $${loan.toFixed(0)} / $${grossPortfolio.toFixed(0)} (gross)`);
        }
      }
      lines.push('');
    } else {
      lines.push('▸ SBLOC TRAJECTORY: Not available');
      lines.push('');
    }

    // Margin Call Stats
    if (data.marginCallStats && data.marginCallStats.length > 0) {
      lines.push('▸ MARGIN CALL STATISTICS');
      const mcStats = data.marginCallStats;
      lines.push(`  Years tracked:      ${mcStats.length}`);
      lines.push('');
      lines.push('  PROBABILITY BY YEAR:');
      // Show first 5, last 3
      const mcToShow = [...mcStats.slice(0, 5), ...mcStats.slice(-3)];
      mcToShow.forEach((mc, idx) => {
        lines.push(`    Year ${mc.year}: ${mc.probability.toFixed(2)}% (cumulative: ${mc.cumulativeProbability.toFixed(2)}%)`);
      });
      if (mcStats.length > 8) {
        lines.push(`    ... (${mcStats.length - 8} more years)`);
      }
      lines.push('');
    } else {
      lines.push('▸ MARGIN CALL STATISTICS: Not available');
      lines.push('');
    }

    // Estate Analysis
    if (estate) {
      lines.push('▸ ESTATE ANALYSIS (from simulation)');
      lines.push(`  bbdNetEstate:       $${estate.bbdNetEstate.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`  sellNetEstate:      $${estate.sellNetEstate.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`  bbdAdvantage:       $${estate.bbdAdvantage.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push('');
    } else {
      lines.push('▸ ESTATE ANALYSIS: Not available');
      lines.push('');
    }

    // Key Metrics Calculation Check
    lines.push('▸ KEY METRICS CALCULATION CHECK');
    const initialValue = config?.initialValue ?? this._initialValue;
    const timeHorizon = config?.timeHorizon ?? this._timeHorizon;
    const medianTerminal = stats.median;  // This is NET WORTH for SBLOC simulations

    // CAGR formula: (terminal / initial)^(1/years) - 1
    // For SBLOC, medianTerminal is already NET WORTH
    const cagrCalc = medianTerminal > 0
      ? Math.pow(medianTerminal / initialValue, 1 / timeHorizon) - 1
      : -1;  // -100% for negative net worth
    lines.push(`  CAGR Check (using ${hasSBLOC ? 'NET WORTH' : 'GROSS PORTFOLIO'}):`);
    lines.push(`    Formula: (terminal/initial)^(1/years) - 1`);
    lines.push(`    = ($${medianTerminal.toFixed(0)} / $${initialValue.toFixed(0)})^(1/${timeHorizon}) - 1`);
    lines.push(`    = ${medianTerminal > 0 ? (cagrCalc * 100).toFixed(2) + '%' : 'NaN (negative terminal value)'}`);

    if (traj) {
      const lastIdx = traj.years.length - 1;
      const loanBalance = traj.loanBalance.p50[lastIdx] || 0;
      // medianTerminal is ALREADY net worth, so gross = net worth + loan
      const grossPortfolio = medianTerminal + loanBalance;
      lines.push('');
      lines.push(`  SBLOC Breakdown:`);
      lines.push(`    Median NET WORTH (from stats.median): $${medianTerminal.toFixed(0)}`);
      lines.push(`    Loan Balance (P50): $${loanBalance.toFixed(0)}`);
      lines.push(`    Reconstructed GROSS Portfolio: $${grossPortfolio.toFixed(0)} = $${medianTerminal.toFixed(0)} + $${loanBalance.toFixed(0)}`);
    }
    lines.push('');

    // SBLOC Debug Stats (detailed diagnostics)
    if (data.debugStats) {
      const ds = data.debugStats;
      lines.push('▸ SBLOC DIAGNOSTIC DETAILS');
      lines.push('');
      lines.push('  MARGIN CALL DISTRIBUTION:');
      lines.push(`    0 margin calls:  ${ds.marginCallDistribution.noMarginCalls.toLocaleString()} iterations`);
      lines.push(`    1 margin call:   ${ds.marginCallDistribution.oneMarginCall.toLocaleString()} iterations`);
      lines.push(`    2 margin calls:  ${ds.marginCallDistribution.twoMarginCalls.toLocaleString()} iterations`);
      lines.push(`    3+ margin calls: ${ds.marginCallDistribution.threeOrMore.toLocaleString()} iterations`);
      lines.push(`    Max in any iter: ${ds.marginCallDistribution.maxMarginCalls}`);
      lines.push('');
      lines.push('  HAIRCUT LOSSES (from forced liquidations):');
      lines.push(`    Median:          $${ds.haircutLosses.median.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    Mean:            $${ds.haircutLosses.mean.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    Max:             $${ds.haircutLosses.max.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push('');
      lines.push('  TOTAL INTEREST CHARGED (over 15 years):');
      lines.push(`    Median:          $${ds.interestCharged.median.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    Mean:            $${ds.interestCharged.mean.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push('');
      lines.push('  FINAL GROSS PORTFOLIO (before loan subtraction):');
      lines.push(`    Median:          $${ds.finalGrossPortfolio.median.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    Mean:            $${ds.finalGrossPortfolio.mean.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push('');

      // Portfolio returns analysis
      if (ds.portfolioReturns) {
        lines.push('  PORTFOLIO RETURNS (cumulative over 15 years):');
        lines.push(`    P10:             ${(ds.portfolioReturns.p10 * 100).toFixed(1)}%`);
        lines.push(`    Median:          ${(ds.portfolioReturns.median * 100).toFixed(1)}%`);
        lines.push(`    Mean:            ${(ds.portfolioReturns.mean * 100).toFixed(1)}%`);
        lines.push(`    P90:             ${(ds.portfolioReturns.p90 * 100).toFixed(1)}%`);
        lines.push('');
      }

      // Failure analysis
      if (ds.failureAnalysis) {
        const fa = ds.failureAnalysis;
        const totalIter = fa.totalFailed + fa.totalSucceeded;
        lines.push('  FAILURE ANALYSIS:');
        lines.push(`    Failed iterations:    ${fa.totalFailed.toLocaleString()} (${(fa.totalFailed/totalIter*100).toFixed(1)}%)`);
        lines.push(`    Succeeded iterations: ${fa.totalSucceeded.toLocaleString()} (${(fa.totalSucceeded/totalIter*100).toFixed(1)}%)`);
        lines.push(`    Median failure year:  ${fa.medianFailureYear.toFixed(1)}`);
        lines.push(`    Avg failure year:     ${fa.avgFailureYear.toFixed(1)}`);
        lines.push('');
        lines.push('  RETURNS BY OUTCOME:');
        lines.push(`    Successful avg return: ${(fa.successfulAvgReturn * 100).toFixed(1)}%`);
        lines.push(`    Failed avg return:     ${(fa.failedAvgReturn * 100).toFixed(1)}%`);
        lines.push('');
      }

      // Regime parameters (if regime method was used) - multiplier-based approach
      if (ds.regimeParameters && ds.regimeParameters.length > 0) {
        lines.push(`  REGIME PARAMETERS (4-regime, multiplier-based, mode: ${ds.calibrationMode || 'unknown'}):`);
        for (const asset of ds.regimeParameters) {
          // Show asset class and historical stats if available
          const assetClass = asset.assetClass || 'unknown';
          const histMean = asset.historicalMean !== undefined ? `${(asset.historicalMean * 100).toFixed(1)}%` : 'N/A';
          const histStddev = asset.historicalStddev !== undefined ? `${(asset.historicalStddev * 100).toFixed(1)}%` : 'N/A';
          lines.push(`    ${asset.assetId} (${assetClass}):`);
          lines.push(`      Historical: mean=${histMean}, stddev=${histStddev}`);
          lines.push(`      Bull:     mean=${(asset.bull.mean * 100).toFixed(1)}%, stddev=${(asset.bull.stddev * 100).toFixed(1)}%`);
          lines.push(`      Bear:     mean=${(asset.bear.mean * 100).toFixed(1)}%, stddev=${(asset.bear.stddev * 100).toFixed(1)}%`);
          lines.push(`      Crash:    mean=${(asset.crash.mean * 100).toFixed(1)}%, stddev=${(asset.crash.stddev * 100).toFixed(1)}%`);
          if (asset.recovery) {
            lines.push(`      Recovery: mean=${(asset.recovery.mean * 100).toFixed(1)}%, stddev=${(asset.recovery.stddev * 100).toFixed(1)}%`);
          }
        }
        lines.push('');
      }

      // Fat-tail parameters (if fat-tail method was used)
      if (ds.fatTailParameters && ds.fatTailParameters.length > 0) {
        lines.push(`  FAT-TAIL PARAMETERS (Student's t-distribution):`);
        for (const asset of ds.fatTailParameters) {
          lines.push(`    ${asset.assetId} (${asset.assetClass}):`);
          lines.push(`      Degrees of Freedom: ${asset.degreesOfFreedom} (lower = fatter tails)`);
          lines.push(`      Skew Multiplier:    ${asset.skewMultiplier}`);
          lines.push(`      Survivorship Bias:  ${(asset.survivorshipBias * 100).toFixed(1)}%`);
          lines.push(`      Volatility Scaling: ${asset.volatilityScaling}`);
        }
        lines.push('');
      }

      // Path-coherent percentile extraction info (Phase 23-09)
      if (ds.pathCoherentPercentiles) {
        const pcp = ds.pathCoherentPercentiles;
        lines.push(`  PATH-COHERENT PERCENTILES (simulation indices):`);
        lines.push(`    Each percentile line = ONE complete simulation journey`);
        lines.push(`    P10 (poor):   Simulation #${pcp.p10SimIndex.toLocaleString()} → $${pcp.p10TerminalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
        lines.push(`    P50 (median): Simulation #${pcp.p50SimIndex.toLocaleString()} → $${pcp.p50TerminalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
        lines.push(`    P90 (good):   Simulation #${pcp.p90SimIndex.toLocaleString()} → $${pcp.p90TerminalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
        lines.push('');
      }

      // BBD Dividend Tax Borrowing (Phase 23-06)
      if (ds.dividendTaxesBorrowed && ds.dividendTaxesBorrowed.median > 0) {
        lines.push(`  BBD DIVIDEND TAX BORROWING:`);
        lines.push(`    Median Borrowed:  $${ds.dividendTaxesBorrowed.median.toLocaleString(undefined, {maximumFractionDigits: 0})} (these taxes are "in the loan")`);
        lines.push(`    Max Borrowed:     $${ds.dividendTaxesBorrowed.max.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
        lines.push(`    ↳ BBD borrows via SBLOC, portfolio stays whole`);
        lines.push(`    ↳ Sell liquidates same amount, reduces compound growth`);
        lines.push('');
      }
    }

    // Integrated Sell Strategy Results (Phase 23-05)
    if (data.sellStrategy) {
      const sell = data.sellStrategy;
      lines.push('▸ INTEGRATED SELL STRATEGY (1-per-iteration, same returns as BBD)');
      lines.push(`  Iterations:         ${sell.terminalValues.length.toLocaleString()} (same as BBD)`);
      lines.push(`  Success Rate:       ${sell.successRate.toFixed(1)}%`);
      lines.push(`  Depletion Prob:     ${sell.depletionProbability.toFixed(1)}%`);
      lines.push(`  Terminal Values:`);
      lines.push(`    P10: $${sell.percentiles.p10.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    P50: $${sell.percentiles.p50.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    P90: $${sell.percentiles.p90.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`  Taxes (lifetime):`);
      lines.push(`    Capital Gains:    $${sell.taxes.medianCapitalGains.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    Dividend:         $${sell.taxes.medianDividend.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push(`    Total:            $${sell.taxes.medianTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                      END DEBUG DATA');
    lines.push('═══════════════════════════════════════════════════════════════');

    output.textContent = lines.join('\n');
  }
}

// Register the custom element
customElements.define('results-dashboard', ResultsDashboard);
