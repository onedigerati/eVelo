/**
 * Performance Table Web Component
 *
 * Displays a performance summary table showing metrics across percentiles.
 * Metrics include TWRR (nominal/real), portfolio end balance (nominal/real),
 * annual mean return, and annualized volatility.
 *
 * Features:
 * - Color-coded values (green for positive, red for negative)
 * - Alternating row backgrounds
 * - Responsive horizontal scroll on mobile
 * - Explanatory note text
 *
 * @example
 * ```html
 * <performance-table id="perf-table"></performance-table>
 *
 * <script>
 *   const table = document.querySelector('#perf-table');
 *   table.data = performanceSummaryData;
 * </script>
 * ```
 */
import { BaseComponent } from '../base-component';
import type { PerformanceSummaryData, PerformanceRow } from '../../calculations/return-probabilities';

/**
 * Performance summary table showing metrics across P10-P90 percentiles.
 */
export class PerformanceTable extends BaseComponent {
  /** Stored table data */
  private _data: PerformanceSummaryData | null = null;

  /**
   * Set performance summary data and update display.
   */
  set data(value: PerformanceSummaryData | null) {
    this._data = value;
    this.render();
  }

  /**
   * Get current data.
   */
  get data(): PerformanceSummaryData | null {
    return this._data;
  }

  protected template(): string {
    if (!this._data) {
      return `
        <div class="no-data">
          <p>Run a simulation to see performance data</p>
        </div>
      `;
    }

    const rows = [
      this._data.twrrNominal,
      this._data.twrrReal,
      this._data.portfolioNominal,
      this._data.portfolioReal,
      this._data.meanReturn,
      this._data.volatility,
    ];

    return `
      <div class="table-section">
        <h3><span class="icon">&#x1F4CA;</span> Performance Summary</h3>
        <div class="scroll-container">
          <div class="scroll-indicator-left" aria-hidden="true"></div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th class="metric-col">Metric</th>
                  <th class="percentile-col">10th<br>Percentile</th>
                  <th class="percentile-col">25th<br>Percentile</th>
                  <th class="percentile-col">50th<br>Percentile</th>
                  <th class="percentile-col">75th<br>Percentile</th>
                  <th class="percentile-col">90th<br>Percentile</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((row, i) => this.renderRow(row, i)).join('')}
              </tbody>
            </table>
          </div>
          <div class="scroll-indicator-right" aria-hidden="true"></div>
        </div>
        <p class="note">
          <strong>Note:</strong> Real values are adjusted for 2.5% annual inflation.
          TWRR (Time-Weighted Rate of Return) represents the geometric mean return
          across the simulation period, which is the industry-standard metric for
          measuring investment performance.
        </p>
      </div>
    `;
  }

  /**
   * Render a single table row.
   */
  private renderRow(row: PerformanceRow, index: number): string {
    const rowClass = index % 2 === 0 ? 'even' : 'odd';
    return `
      <tr class="${rowClass}">
        <td class="metric-cell">${row.label}</td>
        <td class="value-cell ${this.getValueClass(row.p10, row.format)}">${this.formatValue(row.p10, row.format)}</td>
        <td class="value-cell ${this.getValueClass(row.p25, row.format)}">${this.formatValue(row.p25, row.format)}</td>
        <td class="value-cell ${this.getValueClass(row.p50, row.format)}">${this.formatValue(row.p50, row.format)}</td>
        <td class="value-cell ${this.getValueClass(row.p75, row.format)}">${this.formatValue(row.p75, row.format)}</td>
        <td class="value-cell ${this.getValueClass(row.p90, row.format)}">${this.formatValue(row.p90, row.format)}</td>
      </tr>
    `;
  }

  /**
   * Format value based on format type.
   */
  private formatValue(value: number, format: 'percent' | 'currency'): string {
    if (format === 'percent') {
      return `${(value * 100).toFixed(2)}%`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Get CSS class for value based on sign (for percent format only).
   */
  private getValueClass(value: number, format: 'percent' | 'currency'): string {
    if (format === 'percent') {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
    }
    return '';
  }

  protected override afterRender(): void {
    this.setupScrollIndicators();
  }

  /**
   * Setup scroll indicators for mobile horizontal scrolling.
   */
  private setupScrollIndicators(): void {
    const wrapper = this.$('.table-container') as HTMLElement;
    const container = this.$('.scroll-container') as HTMLElement;

    if (!wrapper || !container) return;

    const updateIndicators = () => {
      const canScrollLeft = wrapper.scrollLeft > 0;
      const canScrollRight = wrapper.scrollLeft < (wrapper.scrollWidth - wrapper.clientWidth - 1);

      container.classList.toggle('can-scroll-left', canScrollLeft);
      container.classList.toggle('can-scroll-right', canScrollRight);
    };

    wrapper.addEventListener('scroll', updateIndicators, { passive: true });
    // Initial check
    setTimeout(updateIndicators, 100);
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .table-section {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .table-section:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      h3 {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      .icon {
        font-size: 1.25rem;
      }

      .scroll-container {
        position: relative;
      }

      .scroll-indicator-left,
      .scroll-indicator-right {
        display: none;  /* Hidden by default */
      }

      .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 600px;
      }

      thead {
        background: var(--surface-secondary, #f8fafc);
      }

      th {
        padding: var(--spacing-md, 16px) var(--spacing-sm, 8px);
        text-align: right;
        font-weight: 600;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        border-bottom: 2px solid var(--border-color, #e2e8f0);
      }

      th.metric-col {
        text-align: left;
        width: 30%;
      }

      th.percentile-col {
        width: 14%;
      }

      td {
        padding: var(--spacing-md, 16px) var(--spacing-sm, 8px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      tr.even {
        background: var(--surface-primary, #ffffff);
      }

      tr.odd {
        background: var(--surface-secondary, #f8fafc);
      }

      tr:hover {
        background: var(--color-primary-50, #f0fdfa);
      }

      .metric-cell {
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        text-align: left;
      }

      .value-cell {
        text-align: right;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: var(--font-size-sm, 0.875rem);
      }

      .value-cell.positive {
        color: var(--color-success, #16a34a);
      }

      .value-cell.negative {
        color: var(--color-error, #dc2626);
      }

      .note {
        margin: var(--spacing-md, 16px) 0 0 0;
        padding: var(--spacing-md, 16px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        line-height: 1.6;
      }

      .note strong {
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
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .table-section {
          padding: var(--spacing-md, 16px);
        }

        .scroll-indicator-left,
        .scroll-indicator-right {
          display: block;
          position: absolute;
          top: 0;
          bottom: 0;
          width: 20px;
          pointer-events: none;
          z-index: 15;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .scroll-indicator-left {
          left: 0;
          background: linear-gradient(to right, var(--surface-primary, #ffffff) 0%, transparent 100%);
        }

        .scroll-indicator-right {
          right: 0;
          background: linear-gradient(to left, var(--surface-primary, #ffffff) 0%, transparent 100%);
        }

        /* Show indicators based on scroll position */
        .scroll-container.can-scroll-left .scroll-indicator-left {
          opacity: 1;
        }

        .scroll-container.can-scroll-right .scroll-indicator-right {
          opacity: 1;
        }

        .table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          overscroll-behavior-x: contain;
          touch-action: pan-x pan-y;
        }

        th, td {
          padding: var(--spacing-sm, 8px);
        }

        .metric-cell {
          font-size: var(--font-size-sm, 0.875rem);
        }
      }
    `;
  }
}

// Register the custom element
customElements.define('performance-table', PerformanceTable);
