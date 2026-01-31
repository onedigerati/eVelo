/**
 * Historical Data Viewer Modal
 *
 * Main modal for viewing, exporting, and importing historical market data.
 * Displays bundled preset data with options to export as CSV/JSON,
 * or import custom data with validation feedback.
 */

import { BaseComponent } from '../base-component';
import { getPresetData, getPresetSymbols, type PresetData } from '../../data/services/preset-service';
import {
  getCustomData,
  saveCustomData,
  hasCustomData,
  resetToDefaults,
} from '../../data/services/custom-data-service';
import {
  parseAndValidateCsv,
  parseAndValidateJson,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from '../../data/validation/data-validator';
import './data-table';
import './file-drop-zone';

type ViewMode = 'view' | 'import';

export class HistoricalDataViewer extends BaseComponent {
  private _isOpen = false;
  private _currentSymbol = 'SPY';
  private _currentData: PresetData | null = null;
  private _viewMode: ViewMode = 'view';
  private _validationResult: ValidationResult | null = null;
  private _isCustomData = false;
  private _showHelp = false;
  private _isLoading = false;

  /**
   * Show the modal for a specific symbol
   */
  async show(symbol?: string): Promise<void> {
    if (symbol) {
      this._currentSymbol = symbol.toUpperCase();
    }
    this._isOpen = true;
    this._viewMode = 'view';
    this._validationResult = null;
    this._showHelp = false;
    await this.loadData();
  }

  /**
   * Hide the modal
   */
  hide(): void {
    this._isOpen = false;
    this._validationResult = null;
    this.render();
  }

  private async loadData(): Promise<void> {
    this._isLoading = true;
    this.render();

    // Check for custom data first
    this._isCustomData = await hasCustomData(this._currentSymbol);

    if (this._isCustomData) {
      const customData = await getCustomData(this._currentSymbol);
      if (customData) {
        this._currentData = {
          symbol: customData.symbol,
          name: customData.name,
          assetClass: customData.assetClass,
          startDate: customData.startDate,
          endDate: customData.endDate,
          returns: customData.returns,
        };
      }
    } else {
      this._currentData = getPresetData(this._currentSymbol) || null;
    }

    this._isLoading = false;
    this.render();
  }

  protected template(): string {
    if (!this._isOpen) {
      return '<div class="hidden"></div>';
    }

    return `
      <div class="modal-overlay">
        <div class="modal-container">
          <header class="modal-header">
            <h2>Historical Return Data</h2>
            <button class="close-btn" aria-label="Close">&times;</button>
          </header>

          <div class="modal-content">
            ${this.renderSymbolSelector()}

            ${this._isLoading ? this.renderLoading() : ''}
            ${!this._isLoading && this._viewMode === 'view' ? this.renderViewMode() : ''}
            ${!this._isLoading && this._viewMode === 'import' ? this.renderImportMode() : ''}

            ${this._showHelp ? this.renderHelp() : ''}
          </div>

          <footer class="modal-footer">
            ${this.renderFooterButtons()}
          </footer>
        </div>
      </div>
    `;
  }

  private renderSymbolSelector(): string {
    const symbols = getPresetSymbols();
    const groupedSymbols = this.groupSymbolsByClass(symbols);

    return `
      <div class="symbol-selector">
        <label for="symbol-select">Asset:</label>
        <select id="symbol-select">
          ${Object.entries(groupedSymbols).map(([group, syms]) => `
            <optgroup label="${group}">
              ${syms.map(s => `
                <option value="${s}" ${s === this._currentSymbol ? 'selected' : ''}>
                  ${s}${this._currentSymbol === s && this._isCustomData ? ' (Custom)' : ''}
                </option>
              `).join('')}
            </optgroup>
          `).join('')}
        </select>
        ${this._isCustomData ? '<span class="custom-badge">Using Custom Data</span>' : ''}
      </div>
    `;
  }

  private groupSymbolsByClass(symbols: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {
      'Index ETFs': [],
      'Bonds': [],
      'Individual Stocks': [],
    };

    symbols.forEach(symbol => {
      const data = getPresetData(symbol);
      if (!data) {
        groups['Individual Stocks'].push(symbol);
        return;
      }

      const assetClass = data.assetClass?.toLowerCase() || '';
      if (assetClass.includes('bond') || symbol === 'AGG') {
        groups['Bonds'].push(symbol);
      } else if (assetClass.includes('index') || ['SPY', 'QQQ', 'IWM', 'VOO', 'VTI'].includes(symbol)) {
        groups['Index ETFs'].push(symbol);
      } else {
        groups['Individual Stocks'].push(symbol);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) delete groups[key];
    });

    return groups;
  }

  private renderLoading(): string {
    return `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading data...</p>
      </div>
    `;
  }

  private renderViewMode(): string {
    if (!this._currentData) {
      return `
        <div class="empty-state">
          <p>No data available for ${this._currentSymbol}</p>
        </div>
      `;
    }

    return `
      <div class="data-info">
        <div class="info-row">
          <span class="label">Name:</span>
          <span class="value">${this._currentData.name}</span>
        </div>
        <div class="info-row">
          <span class="label">Date Range:</span>
          <span class="value">${this._currentData.startDate} - ${this._currentData.endDate}</span>
        </div>
        <div class="info-row">
          <span class="label">Records:</span>
          <span class="value">${this._currentData.returns.length} years</span>
        </div>
      </div>

      <data-table id="return-table"></data-table>

      <div class="export-buttons">
        <button class="btn btn-secondary" id="export-csv">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export CSV
        </button>
        <button class="btn btn-secondary" id="export-json">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export JSON
        </button>
      </div>
    `;
  }

  private renderImportMode(): string {
    return `
      <div class="import-section">
        <h3>Import Custom Data for ${this._currentSymbol}</h3>
        <p class="import-instructions">
          Upload a CSV or JSON file with historical return data.
          This will replace the bundled data for this asset.
        </p>

        <file-drop-zone id="file-drop"></file-drop-zone>

        ${this._validationResult ? this.renderValidationResult() : ''}
      </div>
    `;
  }

  private renderValidationResult(): string {
    const result = this._validationResult!;

    if (result.valid) {
      return `
        <div class="validation-success">
          <div class="success-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>Validation Passed</span>
          </div>
          <div class="validation-summary">
            <p><strong>${result.data!.returns.length}</strong> records found</p>
            <p>Date range: ${result.data!.startDate} - ${result.data!.endDate}</p>
          </div>
          ${result.warnings.length > 0 ? this.renderWarnings(result.warnings) : ''}
          <div class="import-actions">
            <button class="btn btn-primary" id="confirm-import">Import Data</button>
            <button class="btn btn-secondary" id="cancel-import">Cancel</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="validation-error">
        <div class="error-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>Validation Failed</span>
        </div>
        ${this.renderErrors(result.errors)}
        ${result.warnings.length > 0 ? this.renderWarnings(result.warnings) : ''}
        <button class="btn btn-secondary" id="try-again">Try Again</button>
      </div>
    `;
  }

  private renderErrors(errors: ValidationError[]): string {
    return `
      <div class="error-list">
        <h4>Errors (${errors.length})</h4>
        <ul>
          ${errors.map(e => `
            <li class="error-item">
              <span class="error-type">${e.type.replace('_', ' ')}</span>
              <span class="error-message">${e.message}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  private renderWarnings(warnings: ValidationWarning[]): string {
    return `
      <div class="warning-list">
        <h4>Warnings (${warnings.length})</h4>
        <ul>
          ${warnings.map(w => `
            <li class="warning-item">
              <span class="warning-type">${w.type.replace('_', ' ')}</span>
              <span class="warning-message">${w.message}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  private renderHelp(): string {
    return `
      <div class="help-section">
        <h3>Data Format Requirements</h3>

        <div class="help-block">
          <h4>CSV Format</h4>
          <p>Required columns: <code>year</code>, <code>annual_return</code></p>
          <pre>year,annual_return
1995,0.3758
1996,0.2296
1997,0.3336
1998,0.2858
1999,0.2104</pre>
          <p class="note">Returns should be in decimal form (0.10 = 10%)</p>
        </div>

        <div class="help-block">
          <h4>JSON Format</h4>
          <pre>{
  "symbol": "SPY",
  "name": "S&P 500 ETF Trust",
  "returns": [
    { "date": "1995", "return": 0.3758 },
    { "date": "1996", "return": 0.2296 }
  ]
}</pre>
        </div>

        <div class="help-block">
          <h4>Requirements</h4>
          <ul>
            <li>Minimum 5 years of data</li>
            <li>No duplicate years</li>
            <li>Returns as decimals (0.10 for 10%)</li>
            <li>Consecutive years recommended (gaps allowed)</li>
          </ul>
        </div>

        <button class="btn btn-secondary" id="close-help">Close Help</button>
      </div>
    `;
  }

  private renderFooterButtons(): string {
    if (this._viewMode === 'view') {
      return `
        <div class="footer-left">
          <button class="btn btn-text" id="show-help">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Help
          </button>
          ${this._isCustomData ? `
            <button class="btn btn-text btn-danger" id="reset-defaults">
              Reset to Defaults
            </button>
          ` : ''}
        </div>
        <div class="footer-right">
          <button class="btn btn-secondary" id="import-mode">Import Custom Data</button>
          <button class="btn btn-primary" id="close-modal">Done</button>
        </div>
      `;
    }

    return `
      <div class="footer-left">
        <button class="btn btn-text" id="show-help">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Help
        </button>
      </div>
      <div class="footer-right">
        <button class="btn btn-secondary" id="back-to-view">Back</button>
      </div>
    `;
  }

  protected afterRender(): void {
    if (!this._isOpen) return;

    // Close button
    this.$('.close-btn')?.addEventListener('click', () => this.hide());
    this.$('.modal-overlay')?.addEventListener('click', (e) => {
      if ((e.target as Element).classList.contains('modal-overlay')) {
        this.hide();
      }
    });

    // Symbol selector
    this.$('#symbol-select')?.addEventListener('change', async (e) => {
      this._currentSymbol = (e.target as HTMLSelectElement).value;
      this._validationResult = null;
      await this.loadData();
    });

    // View mode buttons
    this.$('#export-csv')?.addEventListener('click', () => this.exportCsv());
    this.$('#export-json')?.addEventListener('click', () => this.exportJson());
    this.$('#import-mode')?.addEventListener('click', () => {
      this._viewMode = 'import';
      this._validationResult = null;
      this.render();
    });
    this.$('#close-modal')?.addEventListener('click', () => this.hide());
    this.$('#reset-defaults')?.addEventListener('click', () => this.resetToDefaults());

    // Import mode buttons
    this.$('#back-to-view')?.addEventListener('click', () => {
      this._viewMode = 'view';
      this._validationResult = null;
      this.render();
    });
    this.$('#confirm-import')?.addEventListener('click', () => this.confirmImport());
    this.$('#cancel-import')?.addEventListener('click', () => {
      this._validationResult = null;
      this.render();
    });
    this.$('#try-again')?.addEventListener('click', () => {
      this._validationResult = null;
      this.render();
    });

    // File drop zone
    const fileDropZone = this.$('#file-drop');
    fileDropZone?.addEventListener('file-selected', ((e: CustomEvent) => {
      this.handleFileSelected(e.detail.file);
    }) as EventListener);
    fileDropZone?.addEventListener('file-error', ((e: CustomEvent) => {
      this._validationResult = {
        valid: false,
        errors: [{ type: 'format', message: e.detail.error }],
        warnings: [],
      };
      this.render();
    }) as EventListener);

    // Help toggle
    this.$('#show-help')?.addEventListener('click', () => {
      this._showHelp = true;
      this.render();
    });
    this.$('#close-help')?.addEventListener('click', () => {
      this._showHelp = false;
      this.render();
    });

    // Set data on data table
    const dataTable = this.$('#return-table') as HTMLElement & { data: unknown };
    if (dataTable && this._currentData) {
      dataTable.data = this._currentData.returns;
    }
  }

  private async handleFileSelected(file: File): Promise<void> {
    const content = await file.text();
    const isJson = file.name.toLowerCase().endsWith('.json');

    if (isJson) {
      this._validationResult = parseAndValidateJson(content);
    } else {
      // For CSV, we need to get the name from current data or use symbol
      const name = this._currentData?.name || this._currentSymbol;
      this._validationResult = parseAndValidateCsv(content, this._currentSymbol, name);
    }

    this.render();
  }

  private async confirmImport(): Promise<void> {
    if (!this._validationResult?.valid || !this._validationResult.data) return;

    await saveCustomData(this._validationResult.data, 'user-import');

    this._viewMode = 'view';
    this._validationResult = null;
    await this.loadData();

    // Dispatch event to notify app that data has changed
    this.dispatchEvent(new CustomEvent('data-imported', {
      detail: { symbol: this._currentSymbol },
      bubbles: true,
      composed: true,
    }));
  }

  private async resetToDefaults(): Promise<void> {
    await resetToDefaults(this._currentSymbol);
    await this.loadData();

    // Dispatch event to notify app that data has been reset
    this.dispatchEvent(new CustomEvent('data-reset', {
      detail: { symbol: this._currentSymbol },
      bubbles: true,
      composed: true,
    }));
  }

  private exportCsv(): void {
    if (!this._currentData) return;

    const header = 'year,annual_return\n';
    const rows = this._currentData.returns
      .map(r => `${r.date},${r.return}`)
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    this.downloadBlob(blob, `${this._currentSymbol}_returns.csv`);
  }

  private exportJson(): void {
    if (!this._currentData) return;

    const json = JSON.stringify(this._currentData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, `${this._currentSymbol}_returns.json`);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .hidden {
        display: none;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
      }

      .modal-container {
        background: var(--surface-primary, #fff);
        border-radius: var(--border-radius-lg, 12px);
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary, #111827);
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-tertiary, #9ca3af);
        padding: 4px 8px;
        line-height: 1;
        transition: color 0.2s;
      }

      .close-btn:hover {
        color: var(--text-primary, #111827);
      }

      .modal-content {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-top: 1px solid var(--border-color, #e5e7eb);
        gap: 12px;
      }

      .footer-left, .footer-right {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      /* Symbol selector */
      .symbol-selector {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }

      .symbol-selector label {
        font-weight: 500;
        color: var(--text-secondary, #6b7280);
      }

      .symbol-selector select {
        padding: 8px 12px;
        border: 1px solid var(--border-color, #d1d5db);
        border-radius: var(--border-radius-md, 6px);
        font-size: 1rem;
        background: var(--surface-primary, #fff);
        color: var(--text-primary, #111827);
        cursor: pointer;
        min-width: 120px;
      }

      .custom-badge {
        background: var(--color-primary, #0d9488);
        color: white;
        font-size: 0.75rem;
        padding: 4px 8px;
        border-radius: 9999px;
        font-weight: 500;
      }

      /* Data info */
      .data-info {
        background: var(--surface-secondary, #f9fafb);
        border-radius: var(--border-radius-md, 8px);
        padding: 16px;
        margin-bottom: 20px;
      }

      .info-row {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .info-row:last-child {
        margin-bottom: 0;
      }

      .info-row .label {
        font-weight: 500;
        color: var(--text-secondary, #6b7280);
        min-width: 100px;
      }

      .info-row .value {
        color: var(--text-primary, #111827);
      }

      /* Export buttons */
      .export-buttons {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }

      /* Buttons */
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

      .btn-primary:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .btn-secondary {
        background: var(--surface-secondary, #f3f4f6);
        color: var(--text-primary, #111827);
        border: 1px solid var(--border-color, #d1d5db);
      }

      .btn-secondary:hover {
        background: var(--surface-hover, #e5e7eb);
      }

      .btn-text {
        background: transparent;
        color: var(--text-secondary, #6b7280);
        padding: 8px 12px;
      }

      .btn-text:hover {
        color: var(--text-primary, #111827);
        background: var(--surface-secondary, #f3f4f6);
      }

      .btn-danger {
        color: var(--color-danger, #dc2626);
      }

      .btn-danger:hover {
        background: rgba(220, 38, 38, 0.1);
      }

      /* Loading state */
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px;
        gap: 16px;
        color: var(--text-secondary, #6b7280);
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--border-color, #e5e7eb);
        border-top-color: var(--color-primary, #0d9488);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Empty state */
      .empty-state {
        padding: 40px;
        text-align: center;
        color: var(--text-tertiary, #9ca3af);
      }

      /* Import section */
      .import-section {
        text-align: center;
      }

      .import-section h3 {
        margin: 0 0 8px 0;
        color: var(--text-primary, #111827);
      }

      .import-instructions {
        color: var(--text-secondary, #6b7280);
        margin-bottom: 20px;
      }

      /* Validation results */
      .validation-success, .validation-error {
        margin-top: 20px;
        padding: 20px;
        border-radius: var(--border-radius-md, 8px);
        text-align: left;
      }

      .validation-success {
        background: rgba(5, 150, 105, 0.1);
        border: 1px solid var(--color-success, #059669);
      }

      .validation-error {
        background: rgba(220, 38, 38, 0.1);
        border: 1px solid var(--color-danger, #dc2626);
      }

      .success-header, .error-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 12px;
      }

      .success-header {
        color: var(--color-success, #059669);
      }

      .error-header {
        color: var(--color-danger, #dc2626);
      }

      .validation-summary p {
        margin: 4px 0;
        color: var(--text-primary, #111827);
      }

      .error-list, .warning-list {
        margin-top: 16px;
      }

      .error-list h4 {
        color: var(--color-danger, #dc2626);
        margin: 0 0 8px 0;
        font-size: 0.875rem;
      }

      .warning-list h4 {
        color: #d97706;
        margin: 0 0 8px 0;
        font-size: 0.875rem;
      }

      .error-list ul, .warning-list ul {
        margin: 0;
        padding-left: 20px;
      }

      .error-item, .warning-item {
        margin-bottom: 8px;
        font-size: 0.875rem;
      }

      .error-type, .warning-type {
        font-weight: 500;
        text-transform: capitalize;
      }

      .error-type {
        color: var(--color-danger, #dc2626);
      }

      .warning-type {
        color: #d97706;
      }

      .error-message, .warning-message {
        color: var(--text-secondary, #6b7280);
        margin-left: 4px;
      }

      .import-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }

      /* Help section */
      .help-section {
        background: var(--surface-secondary, #f9fafb);
        border-radius: var(--border-radius-md, 8px);
        padding: 20px;
        margin-top: 20px;
        text-align: left;
      }

      .help-section h3 {
        margin: 0 0 16px 0;
        color: var(--text-primary, #111827);
      }

      .help-block {
        margin-bottom: 16px;
      }

      .help-block h4 {
        margin: 0 0 8px 0;
        color: var(--text-secondary, #6b7280);
        font-size: 0.875rem;
      }

      .help-block pre {
        background: var(--surface-primary, #fff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: var(--border-radius-sm, 4px);
        padding: 12px;
        font-size: 0.75rem;
        overflow-x: auto;
        color: var(--text-primary, #111827);
      }

      .help-block code {
        background: var(--surface-primary, #fff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: var(--border-radius-sm, 4px);
        padding: 2px 6px;
        font-size: 0.875rem;
      }

      .help-block .note {
        font-size: 0.75rem;
        color: var(--text-tertiary, #9ca3af);
        margin-top: 8px;
      }

      .help-block ul {
        margin: 0;
        padding-left: 20px;
        color: var(--text-secondary, #6b7280);
        font-size: 0.875rem;
      }

      .help-block li {
        margin-bottom: 4px;
      }

      /* Dark theme */
      :host-context([data-theme="dark"]) .modal-container {
        background: var(--surface-primary);
        border: 1px solid var(--border-color);
      }

      :host-context([data-theme="dark"]) .modal-header,
      :host-context([data-theme="dark"]) .modal-footer {
        border-color: var(--border-color);
      }

      :host-context([data-theme="dark"]) .modal-header h2 {
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .symbol-selector select {
        background: var(--surface-secondary);
        border-color: var(--border-color);
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .data-info {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .btn-secondary {
        background: var(--surface-secondary);
        border-color: var(--border-color);
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .btn-secondary:hover {
        background: var(--surface-hover);
      }

      :host-context([data-theme="dark"]) .help-section {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .help-block pre {
        background: var(--surface-primary);
        border-color: var(--border-color);
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .help-block code {
        background: var(--surface-primary);
        border-color: var(--border-color);
      }
    `;
  }
}

customElements.define('historical-data-viewer', HistoricalDataViewer);
