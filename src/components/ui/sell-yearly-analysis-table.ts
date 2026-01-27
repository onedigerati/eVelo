/**
 * Sell Strategy Year-by-Year Percentile Analysis Table Component
 *
 * Displays detailed year-by-year breakdown for Sell strategy:
 * - Annual and cumulative withdrawals
 * - Cumulative taxes paid (capital gains + dividends)
 * - Net worth percentiles (P10, P25, P50, P75, P90)
 * - Color-coded values (green positive, red negative)
 *
 * Complements the BBD YearlyAnalysisTable by showing Sell strategy outcomes,
 * helping users understand the tax drag and portfolio impact over time.
 */
import { BaseComponent } from '../base-component';

/**
 * Yearly percentile data for Sell strategy
 */
export interface SellYearlyPercentileData {
  /** Year number (e.g., 2025) */
  year: number;
  /** 10th percentile net worth */
  p10: number;
  /** 25th percentile net worth */
  p25: number;
  /** 50th percentile net worth (median) */
  p50: number;
  /** 75th percentile net worth */
  p75: number;
  /** 90th percentile net worth */
  p90: number;
}

/**
 * Withdrawal data for the table
 */
export interface SellWithdrawalData {
  /** Annual withdrawal amounts for each year */
  annual: number[];
  /** Cumulative withdrawal amounts for each year */
  cumulative: number[];
}

/**
 * Props for the SellYearlyAnalysisTable component
 */
export interface SellYearlyAnalysisTableProps {
  /** Starting year (e.g., 2025) */
  startYear: number;
  /** Withdrawal data (annual and cumulative) */
  withdrawals: SellWithdrawalData;
  /** Cumulative taxes paid by year (includes capital gains + dividends) */
  cumulativeTaxes: number[];
  /** Yearly percentile data */
  percentiles: SellYearlyPercentileData[];
}

/**
 * Sell Strategy Year-by-Year Percentile Analysis Table
 *
 * Usage:
 * ```html
 * <sell-yearly-analysis-table id="sell-yearly-table"></sell-yearly-analysis-table>
 *
 * <script>
 *   const table = document.querySelector('#sell-yearly-table');
 *   table.data = {
 *     startYear: 2025,
 *     withdrawals: { annual: [...], cumulative: [...] },
 *     cumulativeTaxes: [...],
 *     percentiles: [{ year: 2025, p10: 100000, ... }, ...]
 *   };
 * </script>
 * ```
 */
export class SellYearlyAnalysisTable extends BaseComponent {
  /** Stored table data */
  private _data: SellYearlyAnalysisTableProps | null = null;

  /**
   * Set table data and trigger re-render.
   */
  set data(value: SellYearlyAnalysisTableProps | null) {
    this._data = value;
    this.updateTable();
  }

  /**
   * Get current table data.
   */
  get data(): SellYearlyAnalysisTableProps | null {
    return this._data;
  }

  protected template(): string {
    return `
      <div class="table-container">
        <div class="table-header">
          <span class="table-icon">&#x1F4B0;</span>
          <h3>Sell Strategy Year-by-Year Analysis</h3>
        </div>
        <div class="scroll-container">
          <div class="scroll-indicator-left" aria-hidden="true"></div>
          <div class="table-wrapper">
            <table class="analysis-table" id="analysis-table">
              <thead>
                <tr>
                  <th rowspan="2" class="sticky-col">Year</th>
                  <th colspan="2" class="withdrawal-header">Withdrawals</th>
                  <th class="tax-header">Taxes</th>
                  <th colspan="5" class="percentile-header">Portfolio Value by Percentile</th>
                </tr>
                <tr>
                  <th>Annual</th>
                  <th>Cumulative</th>
                  <th class="tax-col-header">Cumulative</th>
                  <th class="p10">10th %ile</th>
                  <th class="p25">25th %ile</th>
                  <th class="p50">50th %ile</th>
                  <th class="p75">75th %ile</th>
                  <th class="p90">90th %ile</th>
                </tr>
              </thead>
              <tbody id="table-body">
                <!-- Rows inserted dynamically -->
              </tbody>
            </table>
          </div>
          <div class="scroll-indicator-right" aria-hidden="true"></div>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .table-container {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .table-container:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      .table-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        background: var(--surface-secondary, #f8fafc);
      }

      .table-icon {
        font-size: 1.25rem;
        line-height: 1;
      }

      .table-header h3 {
        margin: 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .scroll-container {
        position: relative;
      }

      .scroll-indicator-left,
      .scroll-indicator-right {
        display: none;  /* Hidden by default */
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .analysis-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-sm, 0.875rem);
        min-width: 900px;
      }

      .analysis-table thead {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--surface-secondary, #f8fafc);
      }

      .analysis-table th {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        text-align: right;
        font-weight: 600;
        color: var(--text-secondary, #475569);
        border-bottom: 2px solid var(--border-color, #e2e8f0);
        white-space: nowrap;
      }

      .analysis-table th:first-child {
        text-align: left;
      }

      .analysis-table th.withdrawal-header {
        background: var(--surface-secondary, #f8fafc);
        color: var(--text-secondary, #475569);
        text-align: center;
      }

      /* Tax header styling - orange/amber to indicate cost */
      .analysis-table th.tax-header {
        background: rgba(245, 158, 11, 0.15);
        color: #d97706;
        text-align: center;
      }

      .tax-col-header {
        color: #d97706;
        background: rgba(245, 158, 11, 0.1);
      }

      .analysis-table th.percentile-header {
        background: rgba(13, 148, 136, 0.1);
        color: var(--color-primary, #0d9488);
        text-align: center;
      }

      .analysis-table th.p10 {
        color: #dc2626;
      }

      .analysis-table th.p25 {
        color: #ea580c;
      }

      .analysis-table th.p50 {
        color: var(--color-primary, #0d9488);
        background: rgba(13, 148, 136, 0.15);
      }

      .analysis-table th.p75 {
        color: #16a34a;
      }

      .analysis-table th.p90 {
        color: #15803d;
      }

      .sticky-col {
        position: sticky;
        left: 0;
        background: var(--surface-secondary, #f8fafc);
        z-index: 5;
      }

      .analysis-table tbody tr {
        transition: background-color 0.15s ease;
      }

      .analysis-table tbody tr:nth-child(odd) {
        background: var(--surface-primary, #ffffff);
      }

      .analysis-table tbody tr:nth-child(even) {
        background: var(--surface-secondary, #f8fafc);
      }

      .analysis-table tbody tr:hover {
        background: rgba(13, 148, 136, 0.05);
      }

      .analysis-table td {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        text-align: right;
        color: var(--text-primary, #1e293b);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        white-space: nowrap;
      }

      .analysis-table td:first-child {
        text-align: left;
        font-weight: 500;
        position: sticky;
        left: 0;
        background: inherit;
        z-index: 5;
      }

      /* Color coding for values */
      .value-positive {
        color: #16a34a;
      }

      .value-negative {
        color: #dc2626;
      }

      /* Median column highlight */
      .median-col {
        background: rgba(13, 148, 136, 0.08);
        font-weight: 600;
        color: var(--color-primary, #0d9488);
      }

      /* Withdrawal columns styling */
      .withdrawal-col {
        color: var(--text-secondary, #475569);
      }

      /* Tax column styling - orange/amber for cost emphasis */
      .tax-col {
        color: #d97706;
        font-weight: 500;
        background: rgba(245, 158, 11, 0.05);
      }

      /* Empty state */
      .empty-state {
        padding: var(--spacing-2xl, 48px);
        text-align: center;
        color: var(--text-secondary, #475569);
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .table-header {
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

        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          overscroll-behavior-x: contain;
        }

        .analysis-table th,
        .analysis-table td {
          padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
          font-size: var(--font-size-xs, 0.75rem);
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateTable();
    this.setupScrollIndicators();
  }

  /**
   * Setup scroll indicators for mobile horizontal scrolling.
   */
  private setupScrollIndicators(): void {
    const wrapper = this.$('.table-wrapper') as HTMLElement;
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

  /**
   * Format currency value with compact notation for large values.
   */
  private formatCurrency(value: number): string {
    const absValue = Math.abs(value);

    // Use compact notation for values >= 1M
    if (absValue >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    }

    // Use standard currency for smaller values
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Get CSS class for value color coding.
   */
  private getValueClass(value: number): string {
    if (value > 0) return 'value-positive';
    if (value < 0) return 'value-negative';
    return '';
  }

  /**
   * Update table with current data.
   */
  private updateTable(): void {
    const tableBody = this.$('#table-body') as HTMLTableSectionElement | null;
    if (!tableBody) return;

    if (!this._data || this._data.percentiles.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">No data available</td>
        </tr>
      `;
      return;
    }

    const { startYear, withdrawals, cumulativeTaxes, percentiles } = this._data;

    // Build table rows
    const rows = percentiles.map((p, index) => {
      const yearNumber = startYear + index;
      const annualWithdrawal = withdrawals.annual[index] || 0;
      const cumulativeWithdrawal = withdrawals.cumulative[index] || 0;
      const cumulativeTax = cumulativeTaxes[index] || 0;

      return `
        <tr>
          <td>${yearNumber}</td>
          <td class="withdrawal-col">${this.formatCurrency(annualWithdrawal)}</td>
          <td class="withdrawal-col">${this.formatCurrency(cumulativeWithdrawal)}</td>
          <td class="tax-col">${this.formatCurrency(cumulativeTax)}</td>
          <td class="${this.getValueClass(p.p10)}">${this.formatCurrency(p.p10)}</td>
          <td class="${this.getValueClass(p.p25)}">${this.formatCurrency(p.p25)}</td>
          <td class="median-col ${this.getValueClass(p.p50)}">${this.formatCurrency(p.p50)}</td>
          <td class="${this.getValueClass(p.p75)}">${this.formatCurrency(p.p75)}</td>
          <td class="${this.getValueClass(p.p90)}">${this.formatCurrency(p.p90)}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = rows.join('');
  }
}

// Register the custom element
customElements.define('sell-yearly-analysis-table', SellYearlyAnalysisTable);
