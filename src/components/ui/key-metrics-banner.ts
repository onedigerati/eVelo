/**
 * Key Metrics Banner Web Component
 *
 * Displays 3 hero cards at top of results dashboard:
 * - Strategy Success: BBD success rate, vs Sell comparison, median utilization
 * - Portfolio Growth: CAGR, starting/terminal values, vs Sell comparison
 * - Leverage Safety: Margin call probability, utilization metrics
 */
import { BaseComponent } from '../base-component';

/**
 * Data structure for the key metrics banner.
 */
export interface KeyMetricsData {
  // Strategy Success card
  bbdSuccessRate: number; // 0-100 percentage
  sellSuccessRate: number; // 0-100 percentage
  medianUtilization: number; // 0-100 percentage
  yearsAbove70Pct: number; // average years

  // Portfolio Growth card
  cagr: number; // decimal (0.142 = 14.2%)
  startingValue: number; // currency
  medianTerminal: number; // currency
  sellTerminal: number; // currency
  p10Outcome: number; // currency

  // Leverage Safety card
  marginCallProbability: number; // 0-100 percentage
  peakUtilizationP90: number; // 0-100 percentage
  safetyBufferP10: number; // 0-100 percentage
  mostDangerousYear: number; // year number
}

/**
 * Executive summary banner with 3 hero metric cards.
 *
 * Usage:
 * ```html
 * <key-metrics-banner></key-metrics-banner>
 *
 * <script>
 *   const banner = document.querySelector('key-metrics-banner');
 *   banner.data = {
 *     bbdSuccessRate: 80.6,
 *     sellSuccessRate: 96.3,
 *     // ... other metrics
 *   };
 * </script>
 * ```
 */
export class KeyMetricsBanner extends BaseComponent {
  /** Stored metrics data */
  private _data: KeyMetricsData | null = null;

  /**
   * Set metrics data and update display.
   */
  set data(value: KeyMetricsData | null) {
    this._data = value;
    this.updateDisplay();
  }

  /**
   * Get current metrics data.
   */
  get data(): KeyMetricsData | null {
    return this._data;
  }

  protected template(): string {
    return `
      <div class="banner-grid">
        <!-- Strategy Success Card -->
        <div class="metric-card">
          <div class="card-header">
            <div class="card-title">
              <span class="title-text">Strategy Success</span>
              <span class="subtitle">BBD SUCCESS RATE</span>
            </div>
            <span class="card-icon success-icon"></span>
          </div>
          <div class="hero-metric">
            <span class="hero-value" id="bbd-success">--</span>
            <span class="hero-unit">%</span>
          </div>
          <div class="hero-label">PROBABILITY OF SUCCESS</div>
          <div class="metrics-grid">
            <div class="metric-item highlight-negative">
              <span class="metric-value" id="vs-sell-success">--</span>
              <span class="metric-label">vs Sell Assets</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="sell-success-rate">--</span>
              <span class="metric-label">Sell Success Rate</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="median-utilization">--</span>
              <span class="metric-label">Median Utilization</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="years-above-70">--</span>
              <span class="metric-label">Years Above 70%</span>
            </div>
          </div>
        </div>

        <!-- Portfolio Growth Card -->
        <div class="metric-card">
          <div class="card-header">
            <div class="card-title">
              <span class="title-text">Portfolio Growth</span>
              <span class="subtitle">IMPLIED CAGR (MEDIAN)</span>
            </div>
            <span class="card-icon growth-icon"></span>
          </div>
          <div class="hero-metric">
            <span class="hero-value" id="cagr">--</span>
            <span class="hero-unit">%</span>
          </div>
          <div class="hero-label">COMPOUND ANNUAL GROWTH RATE</div>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-value" id="starting-value">--</span>
              <span class="metric-label">Starting Value</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="median-terminal">--</span>
              <span class="metric-label">Median Terminal</span>
            </div>
            <div class="metric-item highlight-positive">
              <span class="metric-value" id="vs-sell-terminal">--</span>
              <span class="metric-label">vs Sell Assets</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="sell-terminal">--</span>
              <span class="metric-label">Sell Terminal</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="footer-label">P10 outcome:</span>
            <span class="footer-value" id="p10-outcome">--</span>
          </div>
        </div>

        <!-- Leverage Safety Card -->
        <div class="metric-card">
          <div class="card-header">
            <div class="card-title">
              <span class="title-text">Leverage Safety</span>
              <span class="subtitle">MARGIN CALL RISK</span>
            </div>
            <span class="card-icon safety-icon"></span>
          </div>
          <div class="hero-metric">
            <span class="hero-value" id="margin-call-prob">--</span>
            <span class="hero-unit">%</span>
          </div>
          <div class="hero-label">MARGIN CALL PROBABILITY</div>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-value" id="peak-utilization">--</span>
              <span class="metric-label">Peak Utilization (P90)</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="safety-buffer">--</span>
              <span class="metric-label">Safety Buffer (P10)</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="median-util-safety">--</span>
              <span class="metric-label">Median Utilization</span>
            </div>
            <div class="metric-item">
              <span class="metric-value" id="years-above-70-safety">--</span>
              <span class="metric-label">Years Above 70%</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="footer-label">Most dangerous year:</span>
            <span class="footer-value danger" id="dangerous-year">--</span>
          </div>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .banner-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-lg, 24px);
      }

      .metric-card {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
        display: flex;
        flex-direction: column;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-md, 16px);
      }

      .card-title {
        display: flex;
        flex-direction: column;
      }

      .title-text {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .subtitle {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 2px;
      }

      .card-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .success-icon {
        background: var(--color-success-light, #dcfce7);
      }
      .success-icon::after {
        content: '';
        width: 12px;
        height: 12px;
        background: var(--color-success, #22c55e);
        border-radius: 50%;
      }

      .growth-icon {
        background: var(--color-primary-light, #ccfbf1);
      }
      .growth-icon::after {
        content: '';
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 10px solid var(--color-primary, #0d9488);
      }

      .safety-icon {
        background: var(--color-success-light, #dcfce7);
      }
      .safety-icon::after {
        content: '';
        width: 12px;
        height: 12px;
        background: var(--color-success, #22c55e);
        border-radius: 50%;
      }

      .hero-metric {
        display: flex;
        align-items: baseline;
        margin-bottom: var(--spacing-xs, 4px);
      }

      .hero-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--color-primary, #0d9488);
        line-height: 1;
      }

      .hero-unit {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 500;
        color: var(--text-secondary, #475569);
        margin-left: 2px;
      }

      .hero-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-md, 16px);
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        padding-top: var(--spacing-md, 16px);
        border-top: 1px solid var(--border-color-light, #f1f5f9);
      }

      .metric-item {
        display: flex;
        flex-direction: column;
      }

      .metric-value {
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .metric-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
      }

      .highlight-negative .metric-value {
        color: var(--color-danger, #ef4444);
      }

      .highlight-positive .metric-value {
        color: var(--color-success, #22c55e);
      }

      .card-footer {
        margin-top: var(--spacing-md, 16px);
        padding-top: var(--spacing-sm, 8px);
        border-top: 1px solid var(--border-color-light, #f1f5f9);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs, 4px);
      }

      .footer-label {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-tertiary, #94a3b8);
      }

      .footer-value {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--color-primary, #0d9488);
      }

      .footer-value.danger {
        color: var(--color-danger, #ef4444);
      }

      /* Mobile responsive: stack cards on small screens */
      @media (max-width: 1024px) {
        .banner-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .hero-value {
          font-size: 2rem;
        }

        .metric-card {
          padding: var(--spacing-md, 16px);
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateDisplay();
  }

  /**
   * Update the display with current data.
   */
  private updateDisplay(): void {
    if (!this._data) return;

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(n);

    const formatPercent = (n: number, decimals = 1) => `${n.toFixed(decimals)}%`;

    // Strategy Success card
    const bbdSuccess = this.$('#bbd-success');
    const vsSellSuccess = this.$('#vs-sell-success');
    const sellSuccessRate = this.$('#sell-success-rate');
    const medianUtil = this.$('#median-utilization');
    const yearsAbove70 = this.$('#years-above-70');

    if (bbdSuccess) bbdSuccess.textContent = this._data.bbdSuccessRate.toFixed(1);
    if (vsSellSuccess) {
      const diff = this._data.bbdSuccessRate - this._data.sellSuccessRate;
      vsSellSuccess.textContent = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
    }
    if (sellSuccessRate) sellSuccessRate.textContent = formatPercent(this._data.sellSuccessRate);
    if (medianUtil) medianUtil.textContent = formatPercent(this._data.medianUtilization);
    if (yearsAbove70) yearsAbove70.textContent = this._data.yearsAbove70Pct.toFixed(1);

    // Portfolio Growth card
    const cagr = this.$('#cagr');
    const startingValue = this.$('#starting-value');
    const medianTerminal = this.$('#median-terminal');
    const vsSellTerminal = this.$('#vs-sell-terminal');
    const sellTerminal = this.$('#sell-terminal');
    const p10Outcome = this.$('#p10-outcome');

    if (cagr) cagr.textContent = (this._data.cagr * 100).toFixed(1);
    if (startingValue) startingValue.textContent = formatCurrency(this._data.startingValue);
    if (medianTerminal) medianTerminal.textContent = formatCurrency(this._data.medianTerminal);
    if (vsSellTerminal) {
      const diff = this._data.medianTerminal - this._data.sellTerminal;
      const pctDiff = ((diff / this._data.sellTerminal) * 100).toFixed(1);
      vsSellTerminal.textContent = `+${formatCurrency(diff)} (${pctDiff}%)`;
    }
    if (sellTerminal) sellTerminal.textContent = formatCurrency(this._data.sellTerminal);
    if (p10Outcome) p10Outcome.textContent = formatCurrency(this._data.p10Outcome);

    // Leverage Safety card
    const marginCallProb = this.$('#margin-call-prob');
    const peakUtil = this.$('#peak-utilization');
    const safetyBuffer = this.$('#safety-buffer');
    const medianUtilSafety = this.$('#median-util-safety');
    const yearsAbove70Safety = this.$('#years-above-70-safety');
    const dangerousYear = this.$('#dangerous-year');

    if (marginCallProb) marginCallProb.textContent = this._data.marginCallProbability.toFixed(1);
    if (peakUtil) peakUtil.textContent = formatPercent(this._data.peakUtilizationP90);
    if (safetyBuffer) safetyBuffer.textContent = formatPercent(this._data.safetyBufferP10);
    if (medianUtilSafety) medianUtilSafety.textContent = formatPercent(this._data.medianUtilization);
    if (yearsAbove70Safety) yearsAbove70Safety.textContent = this._data.yearsAbove70Pct.toFixed(1);
    if (dangerousYear) dangerousYear.textContent = this._data.mostDangerousYear.toString();
  }
}

// Register the custom element
customElements.define('key-metrics-banner', KeyMetricsBanner);
