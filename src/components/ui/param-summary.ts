/**
 * Parameter Summary Web Component
 *
 * Displays simulation input parameters in a 2-column grid:
 * - Starting Portfolio, Time Horizon
 * - Annual Withdrawal, Withdrawal Growth
 * - SBLOC Interest Rate, Max Borrowing
 * - Maintenance Margin, Simulations Run
 */
import { BaseComponent } from '../base-component';

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
 * Summary display of simulation input parameters.
 *
 * Usage:
 * ```html
 * <param-summary></param-summary>
 *
 * <script>
 *   const summary = document.querySelector('param-summary');
 *   summary.data = {
 *     startingPortfolio: 3500000,
 *     timeHorizon: 15,
 *     annualWithdrawal: 165000,
 *     withdrawalGrowth: 3.0,
 *     sblocInterestRate: 6.96,
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

  protected template(): string {
    return `
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
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
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
      }

      /* Mobile responsive: single column on small screens */
      @media (max-width: 768px) {
        .param-grid {
          grid-template-columns: 1fr;
        }

        .param-item {
          padding: var(--spacing-sm, 8px);
          padding-left: var(--spacing-sm, 8px);
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
