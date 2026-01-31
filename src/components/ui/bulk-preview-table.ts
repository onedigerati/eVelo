/**
 * Bulk Preview Table Component
 *
 * Displays a preview of assets to be imported during bulk import,
 * showing add/update/skip action per asset with expandable validation details.
 */

import { BaseComponent } from '../base-component';
import type {
  ValidationError,
  ValidationWarning,
} from '../../data/validation/data-validator';

/**
 * Row data for the preview table
 */
export interface PreviewRow {
  symbol: string;
  name: string;
  action: 'add' | 'update' | 'skip';
  recordCount: number;
  status: 'valid' | 'warning' | 'error';
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export class BulkPreviewTable extends BaseComponent {
  private _rows: PreviewRow[] = [];
  private _expandedSymbols: Set<string> = new Set();

  /**
   * Set the rows to display in the preview table
   */
  set rows(value: PreviewRow[]) {
    this._rows = value;
    this._expandedSymbols.clear();
    this.render();
  }

  /**
   * Get the current rows
   */
  get rows(): PreviewRow[] {
    return this._rows;
  }

  protected template(): string {
    if (this._rows.length === 0) {
      return `
        <div class="empty-state">
          <p>No assets to preview</p>
        </div>
      `;
    }

    const validCount = this._rows.filter(r => r.status !== 'error').length;
    const totalCount = this._rows.length;

    return `
      <div class="preview-container">
        <div class="summary-section">
          <span class="summary-text">
            <strong>${validCount}</strong> of <strong>${totalCount}</strong> assets ready to import
          </span>
        </div>

        <table class="preview-table">
          <thead>
            <tr>
              <th class="col-expand"></th>
              <th class="col-symbol">Symbol</th>
              <th class="col-name">Name</th>
              <th class="col-action">Action</th>
              <th class="col-records">Records</th>
              <th class="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            ${this._rows.map(row => this.renderRow(row)).join('')}
          </tbody>
        </table>

        <div class="action-buttons">
          <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="confirm-btn" ${validCount === 0 ? 'disabled' : ''}>
            Import Valid Assets (${validCount})
          </button>
        </div>
      </div>
    `;
  }

  private renderRow(row: PreviewRow): string {
    const hasDetails = (row.errors && row.errors.length > 0) || (row.warnings && row.warnings.length > 0);
    const isExpanded = this._expandedSymbols.has(row.symbol);

    const statusIcon = this.getStatusIcon(row.status);
    const actionClass = `action-${row.action}`;
    const statusClass = `status-${row.status}`;

    let html = `
      <tr class="preview-row ${statusClass}">
        <td class="col-expand">
          ${hasDetails ? `
            <button class="expand-btn" data-symbol="${row.symbol}" aria-label="${isExpanded ? 'Collapse' : 'Expand'} details">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${isExpanded ? 'rotated' : ''}">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ` : ''}
        </td>
        <td class="col-symbol"><code>${row.symbol}</code></td>
        <td class="col-name">${row.name}</td>
        <td class="col-action">
          <span class="action-badge ${actionClass}">${row.action.toUpperCase()}</span>
        </td>
        <td class="col-records">${row.recordCount}</td>
        <td class="col-status">
          <span class="status-indicator ${statusClass}">${statusIcon}</span>
        </td>
      </tr>
    `;

    if (hasDetails && isExpanded) {
      html += this.renderExpandedDetails(row);
    }

    return html;
  }

  private renderExpandedDetails(row: PreviewRow): string {
    const errors = row.errors || [];
    const warnings = row.warnings || [];

    return `
      <tr class="details-row">
        <td colspan="6">
          <div class="details-content">
            ${errors.length > 0 ? `
              <div class="error-section">
                <h4>Errors (${errors.length})</h4>
                <ul class="error-list">
                  ${errors.map(e => `
                    <li class="error-item">
                      <span class="item-type">${e.type.replace(/_/g, ' ')}</span>
                      <span class="item-message">${e.message}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            ${warnings.length > 0 ? `
              <div class="warning-section">
                <h4>Warnings (${warnings.length})</h4>
                <ul class="warning-list">
                  ${warnings.map(w => `
                    <li class="warning-item">
                      <span class="item-type">${w.type.replace(/_/g, ' ')}</span>
                      <span class="item-message">${w.message}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  private getStatusIcon(status: 'valid' | 'warning' | 'error'): string {
    switch (status) {
      case 'valid':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>`;
      case 'warning':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`;
      case 'error':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`;
    }
  }

  protected afterRender(): void {
    // Wire expand/collapse toggle buttons
    this.$$('.expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const symbol = (e.currentTarget as HTMLElement).dataset.symbol;
        if (symbol) {
          if (this._expandedSymbols.has(symbol)) {
            this._expandedSymbols.delete(symbol);
          } else {
            this._expandedSymbols.add(symbol);
          }
          this.render();
        }
      });
    });

    // Wire cancel button
    this.$('#cancel-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('preview-cancelled', {
        bubbles: true,
        composed: true,
      }));
    });

    // Wire confirm button
    this.$('#confirm-btn')?.addEventListener('click', () => {
      const validRows = this._rows.filter(r => r.status !== 'error');
      this.dispatchEvent(new CustomEvent('preview-confirmed', {
        detail: { validRows },
        bubbles: true,
        composed: true,
      }));
    });
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .empty-state {
        padding: 40px;
        text-align: center;
        color: var(--text-tertiary, #9ca3af);
      }

      .preview-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .summary-section {
        padding: 12px 16px;
        background: var(--surface-secondary, #f9fafb);
        border-radius: var(--border-radius-md, 8px);
        text-align: center;
      }

      .summary-text {
        color: var(--text-secondary, #6b7280);
        font-size: 0.9375rem;
      }

      .summary-text strong {
        color: var(--text-primary, #111827);
      }

      /* Table styles */
      .preview-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      .preview-table th {
        text-align: left;
        padding: 10px 12px;
        font-weight: 600;
        color: var(--text-secondary, #6b7280);
        border-bottom: 2px solid var(--border-color, #e5e7eb);
        white-space: nowrap;
      }

      .preview-table td {
        padding: 12px;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        vertical-align: middle;
      }

      .col-expand {
        width: 32px;
        text-align: center;
      }

      .col-symbol {
        width: 100px;
      }

      .col-name {
        min-width: 150px;
      }

      .col-action {
        width: 80px;
        text-align: center;
      }

      .col-records {
        width: 80px;
        text-align: center;
      }

      .col-status {
        width: 60px;
        text-align: center;
      }

      .preview-row code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.8125rem;
        padding: 2px 6px;
        background: var(--surface-secondary, #f3f4f6);
        border-radius: var(--border-radius-sm, 4px);
      }

      /* Expand button */
      .expand-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-tertiary, #9ca3af);
        transition: color 0.2s;
      }

      .expand-btn:hover {
        color: var(--text-primary, #111827);
      }

      .expand-btn svg {
        transition: transform 0.2s;
      }

      .expand-btn svg.rotated {
        transform: rotate(90deg);
      }

      /* Action badges */
      .action-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 9999px;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .action-add {
        background: rgba(16, 185, 129, 0.15);
        color: #059669;
      }

      .action-update {
        background: rgba(14, 165, 233, 0.15);
        color: #0284c7;
      }

      .action-skip {
        background: rgba(107, 114, 128, 0.15);
        color: #6b7280;
      }

      /* Status indicators */
      .status-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .status-indicator.status-valid {
        color: #059669;
      }

      .status-indicator.status-warning {
        color: #d97706;
      }

      .status-indicator.status-error {
        color: #dc2626;
      }

      /* Row status styling */
      .preview-row.status-error {
        background: rgba(220, 38, 38, 0.05);
      }

      .preview-row.status-warning {
        background: rgba(217, 119, 6, 0.05);
      }

      /* Details row */
      .details-row td {
        padding: 0;
        background: var(--surface-secondary, #f9fafb);
      }

      .details-content {
        padding: 16px 24px;
      }

      .error-section, .warning-section {
        margin-bottom: 12px;
      }

      .error-section:last-child, .warning-section:last-child {
        margin-bottom: 0;
      }

      .error-section h4 {
        margin: 0 0 8px 0;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #dc2626;
      }

      .warning-section h4 {
        margin: 0 0 8px 0;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #d97706;
      }

      .error-list, .warning-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .error-item, .warning-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 12px;
        margin-bottom: 6px;
        border-radius: var(--border-radius-sm, 4px);
        font-size: 0.8125rem;
      }

      .error-item {
        background: rgba(220, 38, 38, 0.1);
      }

      .warning-item {
        background: rgba(217, 119, 6, 0.1);
      }

      .error-item:last-child, .warning-item:last-child {
        margin-bottom: 0;
      }

      .item-type {
        font-weight: 600;
        text-transform: capitalize;
      }

      .error-item .item-type {
        color: #dc2626;
      }

      .warning-item .item-type {
        color: #d97706;
      }

      .item-message {
        color: var(--text-secondary, #6b7280);
      }

      /* Action buttons */
      .action-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 8px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: var(--border-radius-md, 6px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .btn-primary {
        background: var(--color-primary, #0d9488);
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: var(--color-primary-dark, #0f766e);
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: var(--surface-secondary, #f3f4f6);
        color: var(--text-primary, #111827);
        border: 1px solid var(--border-color, #d1d5db);
      }

      .btn-secondary:hover {
        background: var(--surface-hover, #e5e7eb);
      }

      /* Dark theme */
      :host-context([data-theme="dark"]) .summary-section {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .preview-table th {
        color: var(--text-secondary);
        border-bottom-color: var(--border-color);
      }

      :host-context([data-theme="dark"]) .preview-table td {
        border-bottom-color: var(--border-color);
      }

      :host-context([data-theme="dark"]) .preview-row code {
        background: var(--surface-secondary);
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .expand-btn:hover {
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .action-add {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
      }

      :host-context([data-theme="dark"]) .action-update {
        background: rgba(14, 165, 233, 0.2);
        color: #38bdf8;
      }

      :host-context([data-theme="dark"]) .action-skip {
        background: rgba(107, 114, 128, 0.25);
        color: #9ca3af;
      }

      :host-context([data-theme="dark"]) .status-indicator.status-valid {
        color: #34d399;
      }

      :host-context([data-theme="dark"]) .status-indicator.status-warning {
        color: #fbbf24;
      }

      :host-context([data-theme="dark"]) .status-indicator.status-error {
        color: #f87171;
      }

      :host-context([data-theme="dark"]) .preview-row.status-error {
        background: rgba(248, 113, 113, 0.1);
      }

      :host-context([data-theme="dark"]) .preview-row.status-warning {
        background: rgba(251, 191, 36, 0.1);
      }

      :host-context([data-theme="dark"]) .details-row td {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .error-section h4 {
        color: #f87171;
      }

      :host-context([data-theme="dark"]) .warning-section h4 {
        color: #fbbf24;
      }

      :host-context([data-theme="dark"]) .error-item {
        background: rgba(248, 113, 113, 0.15);
      }

      :host-context([data-theme="dark"]) .error-item .item-type {
        color: #f87171;
      }

      :host-context([data-theme="dark"]) .warning-item {
        background: rgba(251, 191, 36, 0.15);
      }

      :host-context([data-theme="dark"]) .warning-item .item-type {
        color: #fbbf24;
      }

      :host-context([data-theme="dark"]) .btn-secondary {
        background: var(--surface-secondary);
        border-color: var(--border-color);
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .btn-secondary:hover {
        background: var(--surface-hover);
      }
    `;
  }
}

customElements.define('bulk-preview-table', BulkPreviewTable);
