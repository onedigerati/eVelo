/**
 * Virtual scrolling data table for displaying historical return data
 *
 * Only renders visible rows for performance with large datasets (30+ years).
 * Supports positive/negative value coloring.
 */

import { BaseComponent } from '../base-component';

interface DataRow {
  date: string;
  return: number;
}

export class DataTable extends BaseComponent {
  private _data: DataRow[] = [];
  private _visibleRows = 15;
  private _rowHeight = 40; // px
  private _scrollTop = 0;
  private _scrollHandler: ((e: Event) => void) | null = null;

  set data(value: DataRow[]) {
    this._data = value;
    this.render();
  }

  get data(): DataRow[] {
    return this._data;
  }

  protected template(): string {
    if (this._data.length === 0) {
      return `
        <div class="empty-state">
          <p>No data available</p>
        </div>
      `;
    }

    const totalHeight = this._data.length * this._rowHeight;
    const startIndex = Math.floor(this._scrollTop / this._rowHeight);
    const endIndex = Math.min(startIndex + this._visibleRows + 2, this._data.length);
    const offsetY = startIndex * this._rowHeight;

    const visibleData = this._data.slice(startIndex, endIndex);

    return `
      <div class="table-container" style="max-height: ${this._visibleRows * this._rowHeight + 44}px;">
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Annual Return</th>
            </tr>
          </thead>
        </table>
        <div class="table-body-scroll">
          <div class="table-spacer" style="height: ${totalHeight}px;">
            <table class="table-body" style="transform: translateY(${offsetY}px);">
              <tbody>
                ${visibleData.map(row => `
                  <tr>
                    <td>${this.formatDate(row.date)}</td>
                    <td class="${row.return >= 0 ? 'positive' : 'negative'}">
                      ${row.return >= 0 ? '+' : ''}${(row.return * 100).toFixed(2)}%
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="table-footer">
        <span>${this._data.length} records</span>
        <span>${this.formatDate(this._data[0]?.date)} - ${this.formatDate(this._data[this._data.length - 1]?.date)}</span>
      </div>
    `;
  }

  private formatDate(date: string): string {
    if (!date) return '';
    // If it's just a year (YYYY), return as-is
    if (/^\d{4}$/.test(date)) return date;
    // If it's a full date, extract year
    return date.substring(0, 4);
  }

  protected afterRender(): void {
    const scrollContainer = this.$('.table-body-scroll');
    if (scrollContainer && !this._scrollHandler) {
      this._scrollHandler = (e: Event) => {
        const newScrollTop = (e.target as HTMLElement).scrollTop;
        if (Math.abs(newScrollTop - this._scrollTop) >= this._rowHeight) {
          this._scrollTop = newScrollTop;
          this.updateVisibleRows();
        }
      };
      scrollContainer.addEventListener('scroll', this._scrollHandler, { passive: true });
    }
  }

  private updateVisibleRows(): void {
    const startIndex = Math.floor(this._scrollTop / this._rowHeight);
    const endIndex = Math.min(startIndex + this._visibleRows + 2, this._data.length);
    const offsetY = startIndex * this._rowHeight;
    const visibleData = this._data.slice(startIndex, endIndex);

    const tableBody = this.$('.table-body tbody');
    const tableWrapper = this.$('.table-body') as HTMLElement;

    if (tableBody && tableWrapper) {
      tableWrapper.style.transform = `translateY(${offsetY}px)`;
      tableBody.innerHTML = visibleData.map(row => `
        <tr>
          <td>${this.formatDate(row.date)}</td>
          <td class="${row.return >= 0 ? 'positive' : 'negative'}">
            ${row.return >= 0 ? '+' : ''}${(row.return * 100).toFixed(2)}%
          </td>
        </tr>
      `).join('');
    }
  }

  disconnectedCallback(): void {
    const scrollContainer = this.$('.table-body-scroll');
    if (scrollContainer && this._scrollHandler) {
      scrollContainer.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
    super.disconnectedCallback();
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .table-container {
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: var(--border-radius-md, 8px);
        overflow: hidden;
        background: var(--surface-primary, #fff);
      }

      .table-body-scroll {
        overflow-y: auto;
        max-height: ${this._visibleRows * this._rowHeight}px;
      }

      .table-spacer {
        position: relative;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      thead {
        background: var(--color-primary, #0d9488);
        color: white;
        position: sticky;
        top: 0;
        z-index: 1;
      }

      th, td {
        padding: 10px 16px;
        text-align: left;
        height: ${this._rowHeight}px;
        box-sizing: border-box;
      }

      th {
        font-weight: 600;
        font-size: 0.875rem;
      }

      th:last-child, td:last-child {
        text-align: right;
      }

      tbody tr:nth-child(even) {
        background: var(--surface-secondary, #f9fafb);
      }

      tbody tr:hover {
        background: var(--surface-hover, #f3f4f6);
      }

      td {
        font-family: var(--font-mono, monospace);
        font-size: 0.875rem;
      }

      .positive {
        color: var(--color-success, #059669);
      }

      .negative {
        color: var(--color-danger, #dc2626);
      }

      .table-footer {
        display: flex;
        justify-content: space-between;
        padding: 8px 16px;
        border-top: 1px solid var(--border-color, #e5e7eb);
        font-size: 0.75rem;
        color: var(--text-tertiary, #6b7280);
        background: var(--surface-secondary, #f9fafb);
      }

      .empty-state {
        padding: 32px;
        text-align: center;
        color: var(--text-tertiary, #6b7280);
      }

      /* Dark theme support */
      :host-context([data-theme="dark"]) .table-container {
        border-color: var(--border-color);
        background: var(--surface-primary);
      }

      :host-context([data-theme="dark"]) thead {
        background: var(--color-primary);
      }

      :host-context([data-theme="dark"]) tbody tr:nth-child(even) {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) tbody tr:hover {
        background: var(--surface-hover);
      }

      :host-context([data-theme="dark"]) .table-footer {
        background: var(--surface-secondary);
        border-color: var(--border-color);
      }
    `;
  }
}

customElements.define('data-table', DataTable);
