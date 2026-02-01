/**
 * Historical Data Viewer Modal
 *
 * Main modal for viewing, exporting, and importing historical market data.
 * Displays bundled preset data with options to export as CSV/JSON,
 * or import custom data with validation feedback.
 *
 * Supports both single-asset and bulk operations modes:
 * - Single asset: View, export, import for one asset at a time
 * - Bulk operations: Export all, import multiple, reset all to defaults
 */

import { BaseComponent } from '../base-component';
import { getPresetData, getPresetSymbols, type PresetData } from '../../data/services/preset-service';
import {
  getCustomData,
  saveCustomData,
  hasCustomData,
  resetToDefaults,
  saveAllCustomData,
  resetAllToDefaults,
  getCustomSymbols,
} from '../../data/services/custom-data-service';
import {
  parseAndValidateCsv,
  parseAndValidateJson,
  validateBulkCsv,
  validateBulkJson,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type BulkValidationResult,
  type AssetValidationResult,
} from '../../data/validation/data-validator';
import { exportAllToCsv, exportAllToJson } from '../../data/services/bulk-export-service';
import { downloadCsvTemplate, downloadJsonTemplate } from '../../data/formats/bulk-format-templates';
import './data-table';
import './file-drop-zone';
import './bulk-preview-table';
import type { PreviewRow } from './bulk-preview-table';

type ViewMode = 'view' | 'import';
type OperationMode = 'single' | 'bulk';

export class HistoricalDataViewer extends BaseComponent {
  private _isOpen = false;
  private _currentSymbol = 'SPY';
  private _currentData: PresetData | null = null;
  private _viewMode: ViewMode = 'view';
  private _operationMode: OperationMode = 'single';
  private _validationResult: ValidationResult | null = null;
  private _bulkValidationResult: BulkValidationResult | null = null;
  private _isCustomData = false;
  private _showHelp = false;
  private _isLoading = false;
  private _showResetAllConfirm = false;
  private _resetAllCheckbox = false;
  private _customSymbolCount = 0;
  private _allSymbols: string[] = [];

  /**
   * Show the modal for a specific symbol
   */
  async show(symbol?: string): Promise<void> {
    if (symbol) {
      this._currentSymbol = symbol.toUpperCase();
    }
    this._isOpen = true;
    this._viewMode = 'view';
    this._operationMode = 'single';
    this._validationResult = null;
    this._bulkValidationResult = null;
    this._showHelp = false;
    this._showResetAllConfirm = false;
    this._resetAllCheckbox = false;
    await this.loadAllSymbols();
    await this.loadData();
  }

  /**
   * Load all available symbols (bundled + custom-only)
   */
  private async loadAllSymbols(): Promise<void> {
    const bundledSymbols = getPresetSymbols();
    const customSymbols = await getCustomSymbols();

    // Merge: bundled + any custom-only symbols not in bundled
    const bundledSet = new Set(bundledSymbols);
    const customOnlySymbols = customSymbols.filter(s => !bundledSet.has(s));

    this._allSymbols = [...bundledSymbols, ...customOnlySymbols];
  }

  /**
   * Hide the modal
   */
  hide(): void {
    this._isOpen = false;
    this._validationResult = null;
    this._bulkValidationResult = null;
    this._showResetAllConfirm = false;
    this._resetAllCheckbox = false;
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

    // Update custom symbol count for bulk mode
    const customSymbols = await getCustomSymbols();
    this._customSymbolCount = customSymbols.length;

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
            ${this.renderModeToggle()}

            ${this._isLoading ? this.renderLoading() : ''}
            ${!this._isLoading && this._operationMode === 'single' ? this.renderSingleMode() : ''}
            ${!this._isLoading && this._operationMode === 'bulk' ? this.renderBulkMode() : ''}

            ${this._showHelp ? this.renderHelp() : ''}
          </div>

          <footer class="modal-footer">
            ${this.renderFooterButtons()}
          </footer>
        </div>
        ${this._showResetAllConfirm ? this.renderResetAllConfirmation() : ''}
      </div>
    `;
  }

  private renderModeToggle(): string {
    return `
      <div class="mode-toggle">
        <button
          class="mode-btn ${this._operationMode === 'single' ? 'active' : ''}"
          data-mode="single"
        >
          Single Asset
        </button>
        <button
          class="mode-btn ${this._operationMode === 'bulk' ? 'active' : ''}"
          data-mode="bulk"
        >
          Bulk Operations
        </button>
      </div>
    `;
  }

  private renderSingleMode(): string {
    return `
      ${this.renderSymbolSelector()}

      ${this._viewMode === 'view' ? this.renderViewMode() : ''}
      ${this._viewMode === 'import' ? this.renderImportMode() : ''}
    `;
  }

  private renderBulkMode(): string {
    return `
      <div class="bulk-operations">
        ${this._bulkValidationResult ? this.renderBulkPreview() : this.renderBulkOptions()}
      </div>
    `;
  }

  private renderBulkOptions(): string {
    return `
      <div class="bulk-section">
        <h3>Bulk Export</h3>
        <p class="bulk-description">
          Export all assets to a single file for backup or editing.
          Custom data takes precedence over bundled data.
        </p>
        <div class="bulk-buttons">
          <button class="btn btn-secondary" id="bulk-export-csv">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export All as CSV
          </button>
          <button class="btn btn-secondary" id="bulk-export-json">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export All as JSON
          </button>
        </div>
      </div>

      <div class="bulk-section">
        <h3>Bulk Import</h3>
        <p class="bulk-description">
          Import multiple assets at once from a single file.
          You'll see a preview before any data is saved.
        </p>
        <div class="template-downloads">
          <span class="template-label">Download template:</span>
          <button class="btn btn-text" id="download-csv-template">CSV Template</button>
          <button class="btn btn-text" id="download-json-template">JSON Template</button>
        </div>
        <file-drop-zone id="bulk-file-drop"></file-drop-zone>
      </div>

      <div class="bulk-section reset-section">
        <h3>Reset to Defaults</h3>
        <p class="bulk-description">
          Delete all custom data and restore bundled defaults for all assets.
        </p>
        ${this._customSymbolCount === 0 ? `
          <p class="no-custom-data">No custom data to reset</p>
        ` : `
          <p class="custom-data-count">
            <strong>${this._customSymbolCount}</strong> asset${this._customSymbolCount !== 1 ? 's' : ''} with custom data
          </p>
          <button class="btn btn-danger" id="reset-all-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
            Reset All to Defaults
          </button>
        `}
      </div>
    `;
  }

  private renderBulkPreview(): string {
    const result = this._bulkValidationResult!;
    const previewRows = this.convertToPreviewRows(result.assets);

    return `
      <div class="bulk-preview">
        <h3>Import Preview</h3>
        <p class="bulk-description">
          Review the assets below. Only valid assets will be imported.
        </p>
        <bulk-preview-table id="preview-table"></bulk-preview-table>
      </div>
    `;
  }

  private convertToPreviewRows(assets: AssetValidationResult[]): PreviewRow[] {
    return assets.map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      action: asset.action,
      recordCount: asset.recordCount,
      status: asset.result.errors.length > 0 ? 'error' :
              asset.result.warnings.length > 0 ? 'warning' : 'valid',
      errors: asset.result.errors,
      warnings: asset.result.warnings,
    }));
  }

  private renderResetAllConfirmation(): string {
    return `
      <div class="confirmation-overlay">
        <div class="confirmation-modal">
          <div class="confirmation-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="warning-icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h3>Reset All to Defaults</h3>
          </div>
          <div class="confirmation-body">
            <p>This will permanently delete custom data for <strong>${this._customSymbolCount}</strong> asset${this._customSymbolCount !== 1 ? 's' : ''}.</p>
            <p>Bundled preset data will be restored.</p>
            <label class="confirmation-checkbox">
              <input type="checkbox" id="reset-all-confirm-checkbox" />
              <span>I understand this cannot be undone</span>
            </label>
          </div>
          <div class="confirmation-actions">
            <button class="btn btn-secondary" id="reset-all-cancel">Cancel</button>
            <button class="btn btn-danger" id="reset-all-confirm" disabled>
              Confirm Reset
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderSymbolSelector(): string {
    const symbols = this._allSymbols.length > 0 ? this._allSymbols : getPresetSymbols();
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
        // Custom-only assets (no bundled preset) go to Individual Stocks
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

    // Sort each group alphabetically
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.localeCompare(b));
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
    if (this._operationMode === 'bulk') {
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
          <button class="btn btn-primary" id="close-modal">Done</button>
        </div>
      `;
    }

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

    // Mode toggle
    this.$$('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.target as HTMLElement).dataset.mode as OperationMode;
        if (mode && mode !== this._operationMode) {
          this._operationMode = mode;
          this._bulkValidationResult = null;
          this._validationResult = null;
          this.render();
        }
      });
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
    this.$('#reset-defaults')?.addEventListener('click', () => this.resetToDefaultsSingle());

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

    // File drop zone (single asset import)
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

    // Bulk operations buttons
    this.$('#bulk-export-csv')?.addEventListener('click', () => this.handleBulkExportCsv());
    this.$('#bulk-export-json')?.addEventListener('click', () => this.handleBulkExportJson());
    this.$('#download-csv-template')?.addEventListener('click', () => downloadCsvTemplate());
    this.$('#download-json-template')?.addEventListener('click', () => downloadJsonTemplate());

    // Bulk file drop zone
    const bulkFileDropZone = this.$('#bulk-file-drop');
    bulkFileDropZone?.addEventListener('file-selected', ((e: CustomEvent) => {
      this.handleBulkFileSelected(e.detail.file);
    }) as EventListener);
    bulkFileDropZone?.addEventListener('file-error', ((e: CustomEvent) => {
      // For bulk import errors, just show an alert for now
      console.error('Bulk file error:', e.detail.error);
    }) as EventListener);

    // Bulk preview table
    const previewTable = this.$('#preview-table') as HTMLElement & { rows: PreviewRow[] };
    if (previewTable && this._bulkValidationResult) {
      previewTable.rows = this.convertToPreviewRows(this._bulkValidationResult.assets);
    }

    // Preview table events
    this.$('#preview-table')?.addEventListener('preview-cancelled', () => {
      this._bulkValidationResult = null;
      this.render();
    });
    this.$('#preview-table')?.addEventListener('preview-confirmed', ((e: CustomEvent) => {
      this.handleBulkPreviewConfirmed(e.detail.validRows);
    }) as EventListener);

    // Reset all button
    this.$('#reset-all-btn')?.addEventListener('click', () => {
      this._showResetAllConfirm = true;
      this._resetAllCheckbox = false;
      this.render();
    });

    // Reset all confirmation modal
    this.$('#reset-all-cancel')?.addEventListener('click', () => {
      this._showResetAllConfirm = false;
      this._resetAllCheckbox = false;
      this.render();
    });

    this.$('#reset-all-confirm-checkbox')?.addEventListener('change', (e) => {
      this._resetAllCheckbox = (e.target as HTMLInputElement).checked;
      const confirmBtn = this.$('#reset-all-confirm') as HTMLButtonElement;
      if (confirmBtn) {
        confirmBtn.disabled = !this._resetAllCheckbox;
      }
    });

    this.$('#reset-all-confirm')?.addEventListener('click', () => {
      if (this._resetAllCheckbox) {
        this.handleResetAll();
      }
    });

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

  private async handleBulkFileSelected(file: File): Promise<void> {
    const content = await file.text();
    const isJson = file.name.toLowerCase().endsWith('.json');

    if (isJson) {
      this._bulkValidationResult = await validateBulkJson(content);
    } else {
      this._bulkValidationResult = await validateBulkCsv(content);
    }

    this.render();
  }

  private async handleBulkExportCsv(): Promise<void> {
    const csv = await exportAllToCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, `all_assets_${this.getDateStamp()}.csv`);
  }

  private async handleBulkExportJson(): Promise<void> {
    const json = await exportAllToJson();
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, `all_assets_${this.getDateStamp()}.json`);
  }

  private getDateStamp(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }

  private async handleBulkPreviewConfirmed(validRows: PreviewRow[]): Promise<void> {
    // Map PreviewRows back to PresetData format using the bulk validation result
    const assetsToSave: PresetData[] = [];

    for (const row of validRows) {
      // Find the original validation result for this symbol
      const assetResult = this._bulkValidationResult?.assets.find(
        a => a.symbol === row.symbol && a.result.valid
      );

      if (assetResult?.result.data) {
        assetsToSave.push(assetResult.result.data);
      }
    }

    if (assetsToSave.length > 0) {
      await saveAllCustomData(assetsToSave, 'user-import');

      // Dispatch event to notify app that data has changed
      this.dispatchEvent(new CustomEvent('bulk-data-imported', {
        detail: { count: assetsToSave.length },
        bubbles: true,
        composed: true,
      }));
    }

    this._bulkValidationResult = null;
    await this.loadData();
  }

  private async handleResetAll(): Promise<void> {
    const deletedCount = await resetAllToDefaults();

    this._showResetAllConfirm = false;
    this._resetAllCheckbox = false;

    // Dispatch event to notify app that data has been reset
    this.dispatchEvent(new CustomEvent('all-data-reset', {
      detail: { count: deletedCount },
      bubbles: true,
      composed: true,
    }));

    await this.loadData();
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

  private async resetToDefaultsSingle(): Promise<void> {
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

      /* Mode toggle */
      .mode-toggle {
        display: flex;
        gap: 4px;
        padding: 4px;
        background: var(--surface-secondary, #f3f4f6);
        border-radius: var(--border-radius-md, 8px);
        margin-bottom: 20px;
      }

      .mode-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        background: transparent;
        color: var(--text-secondary, #6b7280);
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: var(--border-radius-sm, 6px);
        cursor: pointer;
        transition: all 0.2s;
      }

      .mode-btn:hover {
        color: var(--text-primary, #111827);
      }

      .mode-btn.active {
        background: var(--surface-primary, #fff);
        color: var(--text-primary, #111827);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

      /* Bulk operations */
      .bulk-operations {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .bulk-section {
        padding: 20px;
        background: var(--surface-secondary, #f9fafb);
        border-radius: var(--border-radius-md, 8px);
      }

      .bulk-section h3 {
        margin: 0 0 8px 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary, #111827);
      }

      .bulk-description {
        margin: 0 0 16px 0;
        color: var(--text-secondary, #6b7280);
        font-size: 0.875rem;
        line-height: 1.5;
      }

      .bulk-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .template-downloads {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      }

      .template-label {
        font-size: 0.875rem;
        color: var(--text-secondary, #6b7280);
      }

      /* Reset section */
      .reset-section {
        background: rgba(220, 38, 38, 0.05);
        border: 1px solid rgba(220, 38, 38, 0.2);
      }

      .no-custom-data {
        color: var(--text-tertiary, #9ca3af);
        font-style: italic;
        margin: 0;
      }

      .custom-data-count {
        color: var(--text-secondary, #6b7280);
        margin: 0 0 12px 0;
      }

      /* Bulk preview */
      .bulk-preview h3 {
        margin: 0 0 8px 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary, #111827);
      }

      /* Confirmation modal */
      .confirmation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1100;
      }

      .confirmation-modal {
        background: var(--surface-primary, #fff);
        border-radius: var(--border-radius-lg, 12px);
        max-width: 400px;
        width: 90%;
        padding: 24px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      }

      .confirmation-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .confirmation-header .warning-icon {
        color: #d97706;
        flex-shrink: 0;
      }

      .confirmation-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary, #111827);
      }

      .confirmation-body {
        margin-bottom: 20px;
      }

      .confirmation-body p {
        margin: 0 0 12px 0;
        color: var(--text-secondary, #6b7280);
        font-size: 0.9375rem;
        line-height: 1.5;
      }

      .confirmation-checkbox {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 12px;
        background: var(--surface-secondary, #f9fafb);
        border-radius: var(--border-radius-sm, 6px);
        margin-top: 16px;
      }

      .confirmation-checkbox input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .confirmation-checkbox span {
        color: var(--text-primary, #111827);
        font-size: 0.875rem;
        font-weight: 500;
      }

      .confirmation-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
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
        background: #dc2626;
        color: white;
        border: none;
      }

      .btn-danger:hover {
        background: #b91c1c;
      }

      .btn-danger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-text.btn-danger {
        background: transparent;
        color: var(--color-danger, #dc2626);
      }

      .btn-text.btn-danger:hover {
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

      :host-context([data-theme="dark"]) .mode-toggle {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .mode-btn {
        color: var(--text-secondary);
      }

      :host-context([data-theme="dark"]) .mode-btn:hover {
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .mode-btn.active {
        background: var(--surface-primary);
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

      :host-context([data-theme="dark"]) .bulk-section {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .reset-section {
        background: rgba(248, 113, 113, 0.1);
        border-color: rgba(248, 113, 113, 0.3);
      }

      :host-context([data-theme="dark"]) .confirmation-modal {
        background: var(--surface-primary);
        border: 1px solid var(--border-color);
      }

      :host-context([data-theme="dark"]) .confirmation-header h3 {
        color: var(--text-primary);
      }

      :host-context([data-theme="dark"]) .confirmation-header .warning-icon {
        color: #fbbf24;
      }

      :host-context([data-theme="dark"]) .confirmation-checkbox {
        background: var(--surface-secondary);
      }

      :host-context([data-theme="dark"]) .confirmation-checkbox span {
        color: var(--text-primary);
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
