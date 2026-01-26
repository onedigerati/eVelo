/**
 * Year-by-Year Percentile Analysis Table Component
 *
 * Displays detailed year-by-year breakdown of:
 * - Annual and cumulative withdrawals
 * - Net worth percentiles (P10, P25, P50, P75, P90)
 * - Color-coded values (green positive, red negative)
 */
import { BaseComponent } from '../base-component';

/**
 * Yearly percentile data for a single year
 */
export interface YearlyPercentileData {
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
export interface WithdrawalData {
  /** Annual withdrawal amounts for each year */
  annual: number[];
  /** Cumulative withdrawal amounts for each year (or loan balance if SBLOC) */
  cumulative: number[];
}

/**
 * Props for the YearlyAnalysisTable component
 */
export interface YearlyAnalysisTableProps {
  /** Starting year (e.g., 2025) */
  startYear: number;
  /** Withdrawal data (annual and cumulative) */
  withdrawals: WithdrawalData;
  /** Yearly percentile data */
  percentiles: YearlyPercentileData[];
  /** Whether cumulative column shows SBLOC loan balance (includes interest) */
  isSBLOCLoanBalance?: boolean;
}

/**
 * Calculate withdrawal data with annual growth.
 *
 * @param annualWithdrawal - Initial annual withdrawal amount
 * @param withdrawalGrowth - Annual growth rate (e.g., 0.03 for 3%)
 * @param timeHorizon - Number of years
 * @returns Withdrawal data with annual and cumulative arrays
 */
export function calculateWithdrawals(
  annualWithdrawal: number,
  withdrawalGrowth: number,
  timeHorizon: number
): WithdrawalData {
  const annual: number[] = [];
  const cumulative: number[] = [];

  let currentWithdrawal = annualWithdrawal;
  let runningTotal = 0;

  for (let year = 0; year < timeHorizon; year++) {
    // Apply growth after first year
    if (year > 0) {
      currentWithdrawal = currentWithdrawal * (1 + withdrawalGrowth);
    }

    annual.push(currentWithdrawal);
    runningTotal += currentWithdrawal;
    cumulative.push(runningTotal);
  }

  return { annual, cumulative };
}

/**
 * Year-by-Year Percentile Analysis Table
 *
 * Usage:
 * ```html
 * <yearly-analysis-table id="yearly-table"></yearly-analysis-table>
 *
 * <script>
 *   const table = document.querySelector('#yearly-table');
 *   table.data = {
 *     startYear: 2025,
 *     withdrawals: { annual: [...], cumulative: [...] },
 *     percentiles: [{ year: 2025, p10: 100000, p25: 200000, p50: 300000, p75: 400000, p90: 500000 }, ...]
 *   };
 * </script>
 * ```
 */
export class YearlyAnalysisTable extends BaseComponent {
  /** Stored table data */
  private _data: YearlyAnalysisTableProps | null = null;

  /**
   * Set table data and trigger re-render.
   */
  set data(value: YearlyAnalysisTableProps | null) {
    this._data = value;
    this.updateTable();
  }

  /**
   * Get current table data.
   */
  get data(): YearlyAnalysisTableProps | null {
    return this._data;
  }

  protected template(): string {
    return `
      <div class="table-container">
        <div class="table-header">
          <span class="table-icon">&#x1F4CA;</span>
          <h3>Year-by-Year Percentile Analysis</h3>
        </div>
        <div class="table-wrapper">
          <table class="analysis-table" id="analysis-table">
            <thead>
              <tr>
                <th rowspan="2" class="sticky-col">Year</th>
                <th colspan="2" class="withdrawal-header">Withdrawals</th>
                <th colspan="5" class="percentile-header">Net Worth by Percentile</th>
              </tr>
              <tr>
                <th>Annual</th>
                <th id="cumulative-header">Cumulative</th>
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

      .table-wrapper {
        overflow-x: auto;
      }

      .analysis-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-sm, 0.875rem);
        min-width: 800px;
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

        .table-header h3 {
          font-size: var(--font-size-base, 1rem);
        }

        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .analysis-table {
          min-width: 600px;
        }

        .analysis-table th,
        .analysis-table td {
          padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
          font-size: var(--font-size-xs, 0.75rem);
        }
      }

      @media (max-width: 480px) {
        .table-header {
          padding: var(--spacing-sm, 8px);
        }

        .table-icon {
          font-size: 1rem;
        }

        .table-header h3 {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .analysis-table th,
        .analysis-table td {
          padding: 3px 4px;
          font-size: 0.65rem;
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateTable();
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

    // Update cumulative header based on whether this is SBLOC loan balance data
    const cumulativeHeader = this.$('#cumulative-header');
    if (cumulativeHeader) {
      // When showing SBLOC data, the cumulative column shows actual loan balance
      // (principal + accrued interest), not just sum of principal withdrawals
      cumulativeHeader.textContent = this._data?.isSBLOCLoanBalance
        ? 'Loan Balance'
        : 'Cumulative';
    }

    if (!this._data || this._data.percentiles.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">No data available</td>
        </tr>
      `;
      return;
    }

    const { startYear, withdrawals, percentiles } = this._data;

    // Build table rows
    const rows = percentiles.map((p, index) => {
      const yearNumber = startYear + index;
      const annualWithdrawal = withdrawals.annual[index] || 0;
      const cumulativeWithdrawal = withdrawals.cumulative[index] || 0;

      return `
        <tr>
          <td>${yearNumber}</td>
          <td class="withdrawal-col">${this.formatCurrency(annualWithdrawal)}</td>
          <td class="withdrawal-col">${this.formatCurrency(cumulativeWithdrawal)}</td>
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
customElements.define('yearly-analysis-table', YearlyAnalysisTable);
