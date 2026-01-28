/**
 * Parameter Summary Web Component
 *
 * Displays portfolio composition visualization and simulation input parameters:
 * - Portfolio donut chart with asset breakdown bars
 * - Parameter grid: Starting Portfolio, Time Horizon, Annual Withdrawal,
 *   Withdrawal Growth, SBLOC Interest Rate, Max Borrowing, Maintenance Margin,
 *   Simulations Run
 */
import { BaseComponent } from '../base-component';
import { Chart, DoughnutController, ArcElement } from 'chart.js/auto';

/**
 * Asset data for portfolio visualization.
 */
export interface PortfolioAsset {
  symbol: string;
  name: string;
  weight: number; // 0-100 percentage
  color: string;
}

/**
 * Data structure for the parameter summary.
 */
export interface ParamSummaryData {
  startingPortfolio: number; // currency
  timeHorizon: number; // years
  annualWithdrawal: number; // currency
  withdrawalGrowth: number; // percentage (3 = 3%)
  sblocInterestRate: number; // percentage (6.96 = 6.96%)
  maxBorrowing: number; // percentage (65 = 65%)
  maintenanceMargin: number; // percentage (50 = 50%)
  simulationsRun: number; // count
}

/**
 * Combined portfolio composition and parameter summary display.
 *
 * Usage:
 * ```html
 * <param-summary></param-summary>
 *
 * <script>
 *   const summary = document.querySelector('param-summary');
 *   summary.portfolioAssets = [
 *     { symbol: 'GOOG', name: 'Google', weight: 38.8, color: '#3b82f6' },
 *     { symbol: 'GLD', name: 'Gold (GLD)', weight: 25.1, color: '#8b5cf6' },
 *   ];
 *   summary.data = {
 *     startingPortfolio: 113500000,
 *     timeHorizon: 15,
 *     annualWithdrawal: 165000,
 *     withdrawalGrowth: 3.0,
 *     sblocInterestRate: 7.00,
 *     maxBorrowing: 65,
 *     maintenanceMargin: 50,
 *     simulationsRun: 10000
 *   };
 * </script>
 * ```
 */
export class ParamSummary extends BaseComponent {
  /** Stored parameter data */
  private _data: ParamSummaryData | null = null;

  /** Portfolio assets for visualization */
  private _portfolioAssets: PortfolioAsset[] = [];

  /** Donut chart instance */
  private donutChart: Chart | null = null;

  /**
   * Set parameter data and update display.
   */
  set data(value: ParamSummaryData | null) {
    this._data = value;
    this.updateDisplay();
  }

  /**
   * Get current parameter data.
   */
  get data(): ParamSummaryData | null {
    return this._data;
  }

  /**
   * Set portfolio assets for visualization.
   */
  set portfolioAssets(value: PortfolioAsset[]) {
    this._portfolioAssets = value;
    this.updatePortfolioVisualization();
  }

  /**
   * Get portfolio assets.
   */
  get portfolioAssets(): PortfolioAsset[] {
    return this._portfolioAssets;
  }

  protected template(): string {
    return `
      <div class="summary-card">
        <!-- Portfolio Composition Section -->
        <div class="portfolio-section">
          <div class="card-header">
            <svg class="header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
            <div class="header-text">
              <span class="header-title">Portfolio Composition</span>
              <span class="header-subtitle" id="asset-count">0 Assets</span>
            </div>
          </div>

          <div class="portfolio-content">
            <div class="donut-container">
              <canvas id="summary-donut"></canvas>
              <div class="donut-center" id="donut-center">0<br><span>ASSETS</span></div>
            </div>
            <div class="asset-bars-list" id="asset-bars">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>

        <!-- Parameter Summary Section -->
        <div class="param-section">
          <div class="param-grid">
            <div class="param-item">
              <span class="param-label">STARTING PORTFOLIO</span>
              <span class="param-value" id="starting-portfolio">--</span>
            </div>
            <div class="param-item">
              <span class="param-label">TIME HORIZON</span>
              <span class="param-value" id="time-horizon">--</span>
            </div>
            <div class="param-item">
              <span class="param-label">ANNUAL WITHDRAWAL</span>
              <span class="param-value" id="annual-withdrawal">--</span>
            </div>
            <div class="param-item">
              <span class="param-label">WITHDRAWAL GROWTH</span>
              <span class="param-value" id="withdrawal-growth">--</span>
            </div>
            <div class="param-item">
              <span class="param-label">SBLOC INTEREST RATE</span>
              <span class="param-value" id="sbloc-interest">--</span>
            </div>
            <div class="param-item">
              <span class="param-label">MAX BORROWING</span>
              <span class="param-value" id="max-borrowing">--</span>
            </div>
            <div class="param-item">
              <span class="param-label">MAINTENANCE MARGIN</span>
              <span class="param-value" id="maintenance-margin">--</span>
            </div>
            <div class="param-item">
              <span class="param-label">SIMULATIONS RUN</span>
              <span class="param-value" id="simulations-run">--</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        max-width: 100%;
      }

      /* Shadow DOM reset - global box-sizing doesn't penetrate */
      *, *::before, *::after {
        box-sizing: border-box;
      }

      .summary-card {
        background: var(--surface-primary, #ffffff);
        border: 1px solid #99f6e4;
        border-radius: var(--radius-lg, 12px);
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .summary-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      /* Portfolio Section */
      .portfolio-section {
        background: #f0fdfa;
        padding: var(--spacing-lg, 24px);
        padding-bottom: var(--spacing-md, 16px);
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .header-icon {
        width: 32px;
        height: 32px;
        padding: 6px;
        background: var(--color-primary, #0d9488);
        border-radius: var(--radius-md, 8px);
        color: white;
      }

      .header-text {
        flex: 1;
      }

      .header-title {
        display: block;
        font-weight: 600;
        font-size: var(--font-size-lg, 1.125rem);
        color: #1e293b; /* Force dark text on light accent background */
      }

      .header-subtitle {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        color: #64748b; /* Force gray text on light accent background */
      }

      .portfolio-content {
        display: flex;
        gap: var(--spacing-xl, 32px);
        align-items: flex-start;
      }

      .donut-container {
        position: relative;
        width: 120px;
        height: 120px;
        flex-shrink: 0;
      }

      #summary-donut {
        width: 100%;
        height: 100%;
      }

      .donut-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 700;
        color: #0d9488; /* Force teal on light accent background */
        line-height: 1.2;
        pointer-events: none;
      }

      .donut-center span {
        display: block;
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        color: #64748b; /* Force gray text on light accent background */
        letter-spacing: 0.05em;
      }

      .asset-bars-list {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
      }

      .asset-bar-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        height: 32px;
        padding: 0 var(--spacing-md, 16px);
        border-radius: var(--radius-sm, 4px);
        overflow: hidden;
        background: white;
      }

      .asset-bar-row::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: var(--bar-width, 0%);
        background: var(--bar-color, #0d9488);
        opacity: 0.2;
        border-radius: var(--radius-sm, 4px);
        z-index: 0;
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .asset-bar-swatch {
        width: 14px;
        height: 14px;
        border-radius: var(--radius-xs, 2px);
        flex-shrink: 0;
        z-index: 1;
      }

      .asset-bar-name {
        flex: 1;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: #1e293b; /* Force dark text on light accent background */
        z-index: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .asset-bar-percent {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: #0d9488; /* Force teal on light accent background */
        z-index: 1;
        min-width: 50px;
        text-align: right;
      }

      /* Parameter Section */
      .param-section {
        background: var(--surface-primary, #ffffff);
        padding: var(--spacing-lg, 24px);
        border-top: 1px solid #e2f8f5;
      }

      .param-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-md, 16px) var(--spacing-xl, 32px);
      }

      .param-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-left: var(--spacing-sm, 8px);
        border-left: 3px solid var(--color-primary, #0d9488);
        min-width: 0; /* Allow flex item to shrink below content size */
        gap: var(--spacing-xs, 4px);
      }

      .param-label {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 500;
        color: var(--text-secondary, #475569);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .param-value {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--color-primary, #0d9488);
        text-align: right;
        word-break: break-word;
        flex-shrink: 0;
      }

      /* Empty state for portfolio */
      .portfolio-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 120px;
        color: var(--text-tertiary, #94a3b8);
        font-size: var(--font-size-sm, 0.875rem);
        font-style: italic;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .portfolio-section,
        .portfolio-content,
        .params-section {
          max-width: 100%;
          overflow-x: hidden;
        }

        .portfolio-section {
          padding: var(--spacing-md, 16px);
        }

        .card-header {
          margin-bottom: var(--spacing-md, 16px);
        }

        .header-title {
          font-size: var(--font-size-base, 1rem);
        }

        .portfolio-content {
          flex-direction: row;
          align-items: flex-start;
          gap: var(--spacing-md, 16px);
        }

        .donut-container {
          width: 80px;
          height: 80px;
        }

        .donut-center {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .donut-center span {
          font-size: 0.6rem;
        }

        .asset-bars-list {
          flex: 1;
        }

        .asset-bar-row {
          height: 26px;
          padding: 0 var(--spacing-sm, 8px);
        }

        .asset-bar-swatch {
          width: 10px;
          height: 10px;
        }

        .asset-bar-name {
          font-size: var(--font-size-xs, 0.75rem);
        }

        .asset-bar-percent {
          font-size: var(--font-size-xs, 0.75rem);
          min-width: 40px;
        }

        .param-section {
          padding: var(--spacing-md, 16px);
        }

        .param-grid {
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        }

        .param-item {
          padding: var(--spacing-xs, 4px);
          padding-left: var(--spacing-xs, 4px);
          border-left-width: 2px;
        }

        .param-label {
          font-size: 0.6rem;
        }

        .param-value {
          font-size: var(--font-size-sm, 0.875rem);
        }
      }

      @media (max-width: 480px) {
        .portfolio-content {
          flex-direction: column;
          align-items: center;
        }

        .donut-container {
          width: 100px;
          height: 100px;
          margin-bottom: var(--spacing-sm, 8px);
        }

        .donut-center {
          font-size: var(--font-size-base, 1rem);
        }

        .asset-bars-list {
          width: 100%;
        }

        .param-grid {
          grid-template-columns: 1fr;
          gap: var(--spacing-xs, 4px);
        }
      }

      /* Print styles */
      @media print {
        .summary-card {
          break-inside: avoid;
        }
      }

      /* Dark mode styles */
      :host-context([data-theme="dark"]) .summary-card {
        background: var(--surface-secondary, #1e293b);
        border-color: #1f4a4a;
      }

      :host-context([data-theme="dark"]) .portfolio-section {
        background: #132f2f;
      }

      :host-context([data-theme="dark"]) .header-title {
        color: var(--text-primary, #f1f5f9);
      }

      :host-context([data-theme="dark"]) .header-subtitle {
        color: var(--text-secondary, #94a3b8);
      }

      :host-context([data-theme="dark"]) .donut-center {
        color: var(--color-primary, #14b8a6);
      }

      :host-context([data-theme="dark"]) .donut-center span {
        color: var(--text-secondary, #94a3b8);
      }

      :host-context([data-theme="dark"]) .asset-bar-row {
        background: #1a3838;
      }

      :host-context([data-theme="dark"]) .asset-bar-name {
        color: var(--text-primary, #f1f5f9);
      }

      :host-context([data-theme="dark"]) .asset-bar-percent {
        color: var(--color-primary, #14b8a6);
      }

      :host-context([data-theme="dark"]) .param-section {
        background: var(--surface-secondary, #1e293b);
        border-top-color: #1f4a4a;
      }
    `;
  }

  override disconnectedCallback(): void {
    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = null;
    }
    super.disconnectedCallback();
  }

  protected override afterRender(): void {
    // Register Chart.js components
    Chart.register(DoughnutController, ArcElement);

    this.initializeDonutChart();
    this.updateDisplay();
    this.updatePortfolioVisualization();
  }

  /**
   * Initialize the donut chart.
   */
  private initializeDonutChart(): void {
    const canvas = this.$('#summary-donut') as HTMLCanvasElement;
    if (!canvas) return;

    this.donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: '#ffffff',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        animation: {
          duration: 800,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.label}: ${value.toFixed(1)}%`;
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update the portfolio visualization.
   */
  private updatePortfolioVisualization(): void {
    const assetBars = this.$('#asset-bars');
    const assetCount = this.$('#asset-count');
    const donutCenter = this.$('#donut-center');

    if (!assetBars) return;

    const assets = this._portfolioAssets;
    const count = assets.length;

    // Update header subtitle
    if (assetCount) {
      assetCount.textContent = `${count} Asset${count !== 1 ? 's' : ''}`;
    }

    // Update donut center
    if (donutCenter) {
      donutCenter.innerHTML = `${count}<br><span>ASSETS</span>`;
    }

    // Handle empty state
    if (count === 0) {
      assetBars.innerHTML = `<div class="portfolio-empty">No assets selected</div>`;
      if (this.donutChart) {
        this.donutChart.data.labels = [];
        this.donutChart.data.datasets[0].data = [];
        this.donutChart.data.datasets[0].backgroundColor = [];
        this.donutChart.update();
      }
      return;
    }

    // Sort assets by weight descending
    const sortedAssets = [...assets].sort((a, b) => b.weight - a.weight);

    // Find maximum weight for relative bar scaling
    const maxWeight = sortedAssets.length > 0 ? sortedAssets[0].weight : 100;

    // Render asset bars with widths relative to the largest
    assetBars.innerHTML = sortedAssets.map(asset => {
      // Scale bar width so largest asset = 100%, others proportional
      const relativeWidth = (asset.weight / maxWeight) * 100;
      return `
        <div class="asset-bar-row" style="--bar-width: ${relativeWidth}%; --bar-color: ${asset.color};">
          <div class="asset-bar-swatch" style="background-color: ${asset.color}"></div>
          <span class="asset-bar-name">${asset.name}</span>
          <span class="asset-bar-percent">${asset.weight.toFixed(1)}%</span>
        </div>
      `;
    }).join('');

    // Update donut chart
    if (this.donutChart) {
      this.donutChart.data.labels = sortedAssets.map(a => a.name);
      this.donutChart.data.datasets[0].data = sortedAssets.map(a => a.weight);
      this.donutChart.data.datasets[0].backgroundColor = sortedAssets.map(a => a.color);
      this.donutChart.update();
    }
  }

  /**
   * Update the display with current data.
   */
  private updateDisplay(): void {
    if (!this._data) return;

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(n);

    const formatPercent = (n: number, suffix = '') => `${n.toFixed(n % 1 === 0 ? 0 : 2)}%${suffix}`;

    const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n);

    // Update all parameter values
    const startingPortfolio = this.$('#starting-portfolio');
    const timeHorizon = this.$('#time-horizon');
    const annualWithdrawal = this.$('#annual-withdrawal');
    const withdrawalGrowth = this.$('#withdrawal-growth');
    const sblocInterest = this.$('#sbloc-interest');
    const maxBorrowing = this.$('#max-borrowing');
    const maintenanceMargin = this.$('#maintenance-margin');
    const simulationsRun = this.$('#simulations-run');

    if (startingPortfolio) startingPortfolio.textContent = formatCurrency(this._data.startingPortfolio);
    if (timeHorizon) timeHorizon.textContent = `${this._data.timeHorizon} years`;
    if (annualWithdrawal) annualWithdrawal.textContent = formatCurrency(this._data.annualWithdrawal);
    if (withdrawalGrowth) withdrawalGrowth.textContent = formatPercent(this._data.withdrawalGrowth, ' / year');
    if (sblocInterest) sblocInterest.textContent = formatPercent(this._data.sblocInterestRate);
    if (maxBorrowing) maxBorrowing.textContent = formatPercent(this._data.maxBorrowing);
    if (maintenanceMargin) maintenanceMargin.textContent = formatPercent(this._data.maintenanceMargin);
    if (simulationsRun) simulationsRun.textContent = formatNumber(this._data.simulationsRun);
  }
}

// Register the custom element
customElements.define('param-summary', ParamSummary);
