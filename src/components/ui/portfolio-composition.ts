import { BaseComponent } from '../base-component';
import { ModalDialog } from './modal-dialog';
import { getPresetData, getPresetSymbols, PresetData } from '../../data/services/preset-service';
import {
  saveTempPortfolio,
  loadLastPortfolio,
  deleteTempPortfolio,
  savePortfolio,
  loadAllPortfolios,
  deletePortfolio,
  importFromFile,
  exportAndDownload,
  TEMP_PORTFOLIO_KEY
} from '../../data/services/portfolio-service';
import type { AssetRecord, PortfolioRecord } from '../../data/schemas/portfolio';
import { Chart, DoughnutController, ArcElement } from 'chart.js/auto';

/**
 * Asset with calculated statistics
 */
interface AssetStats {
  symbol: string;
  name: string;
  assetClass: string;
  years: number;
  avgReturn: number;
  volatility: number;
  color: string;
}

/**
 * Selected asset with weight
 */
interface SelectedAsset extends AssetStats {
  weight: number;
}

// Color palette for portfolio assets
const ASSET_COLORS = [
  '#0d9488', // teal
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // cyan
  '#f97316', // orange
];

/**
 * Portfolio Composition component - unified asset selection and weight management.
 *
 * Features:
 * - Available assets list with stats (years, avg return, volatility)
 * - Add assets via + button or double-click
 * - Selected assets with color swatch, stats, weight input, remove button
 * - Visual weight distribution bar
 * - Balance/Clear buttons
 * - Portfolio preset management
 *
 * @element portfolio-composition
 * @fires portfolio-change - Dispatched when portfolio changes
 */
export class PortfolioComposition extends BaseComponent {
  private availableAssets: AssetStats[] = [];
  private selectedAssets: SelectedAsset[] = [];
  private searchQuery = '';
  private donutChart: Chart | null = null;
  private _currentPortfolioId: number | undefined = undefined;
  private _currentPortfolioName = '';
  private modal!: ModalDialog;

  protected template(): string {
    return `
      <div class="portfolio-composition">
        <h3 class="section-title">Portfolio Composition:</h3>
        <p class="section-desc">Build a custom portfolio or load a preset configuration.</p>

        <h4 class="subsection-title">Available Assets:</h4>
        <p class="subsection-desc">Click the + icon or double-click an asset to add to your portfolio</p>

        <input type="search"
               class="search-input"
               placeholder="Search assets..."
               aria-label="Search available assets" />

        <div class="available-assets-list" role="listbox">
          <!-- Populated dynamically -->
        </div>

        <h4 class="subsection-title preset-title">Select a Portfolio Preset:</h4>
        <div class="preset-row">
          <select class="preset-select" aria-label="Portfolio preset">
            <option value="">-- Presets --</option>
          </select>
          <button class="preset-btn save-btn" title="Save" aria-label="Save portfolio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
          </button>
          <button class="preset-btn load-btn" title="Load" aria-label="Load portfolio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
          <button class="preset-btn import-btn" title="Import from file" aria-label="Import portfolio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="12" y2="12"></line>
              <line x1="15" y1="15" x2="12" y2="12"></line>
            </svg>
          </button>
          <button class="preset-btn export-btn" title="Export to file" aria-label="Export portfolio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="12" x2="12" y2="18"></line>
              <line x1="9" y1="15" x2="12" y2="18"></line>
              <line x1="15" y1="15" x2="12" y2="18"></line>
            </svg>
          </button>
          <button class="preset-btn delete-btn" title="Delete" aria-label="Delete portfolio">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
        <input type="file" class="import-file-input" accept=".json" hidden />
        <p class="preset-legend">
          <span class="legend-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg> Save,</span>
          <span class="legend-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Load,</span>
          <span class="legend-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg> Import,</span>
          <span class="legend-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg> Export, or</span>
          <span class="legend-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete</span>
          portfolio configurations
        </p>

        <div class="portfolio-visualization" style="display: none;">
          <div class="card-header">
            <svg class="header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
            <div class="header-text">
              <span class="header-title">Portfolio Composition</span>
              <span class="header-subtitle">0 Assets</span>
            </div>
          </div>
          <div class="portfolio-content">
            <div class="donut-container">
              <canvas id="portfolio-donut"></canvas>
              <div class="donut-center">0 ASSETS</div>
            </div>
            <div class="asset-bars-list">
              <!-- Horizontal bars for each asset -->
            </div>
          </div>
        </div>

        <div class="selected-assets-list">
          <!-- Weight editing cards populated dynamically -->
        </div>

        <div class="weight-section" style="display: none;">
          <h4 class="subsection-title">Weight Distribution:</h4>
          <div class="weight-bar">
            <!-- Populated dynamically -->
          </div>

          <div class="weight-controls">
            <button class="balance-btn" type="button">BALANCE WEIGHTS</button>
            <button class="clear-btn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              CLEAR ALL
            </button>
          </div>

          <div class="total-row">
            Total: <span class="total-value">0.0</span>%
          </div>
        </div>
      </div>
      <modal-dialog id="portfolio-modal"></modal-dialog>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .portfolio-composition {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .section-title {
        margin: 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .section-desc {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        font-style: italic;
      }

      .subsection-title {
        margin: var(--spacing-md, 16px) 0 0 0;
        font-size: var(--font-size-md, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .subsection-title.preset-title {
        margin-top: var(--spacing-lg, 24px);
      }

      .subsection-desc {
        margin: 0 0 var(--spacing-sm, 8px) 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        font-style: italic;
      }

      .search-input {
        width: 100%;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        font-size: var(--font-size-md, 1rem);
        font-family: inherit;
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
        box-sizing: border-box;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }

      /* Available Assets List */
      .available-assets-list {
        max-height: 250px;
        overflow-y: auto;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        background: var(--surface-secondary, #f8fafc);
      }

      .available-asset-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .available-asset-item:last-child {
        border-bottom: none;
      }

      .available-asset-item:hover {
        background: var(--surface-tertiary, #e2e8f0);
      }

      .available-asset-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .asset-info {
        flex: 1;
      }

      .asset-name {
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        font-size: var(--font-size-md, 1rem);
      }

      .asset-badge {
        display: inline-block;
        margin-left: var(--spacing-sm, 8px);
        padding: 2px 8px;
        background: var(--surface-tertiary, #e2e8f0);
        border-radius: var(--border-radius-sm, 4px);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        color: var(--text-secondary, #64748b);
        text-transform: uppercase;
        vertical-align: middle;
      }

      .asset-stats {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        margin-top: 2px;
      }

      .add-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-sm, 4px);
        background: var(--surface-primary, #ffffff);
        color: var(--text-secondary, #64748b);
        cursor: pointer;
        font-size: 18px;
        font-weight: 300;
        transition: all 0.15s ease;
        flex-shrink: 0;
        margin-left: var(--spacing-sm, 8px);
      }

      .add-btn:hover {
        background: var(--color-primary, #0d9488);
        border-color: var(--color-primary, #0d9488);
        color: white;
      }

      /* Preset Row */
      .preset-row {
        display: flex;
        gap: var(--spacing-xs, 4px);
        align-items: center;
        margin-top: var(--spacing-sm, 8px);
      }

      .preset-select {
        flex: 1;
        padding: var(--spacing-sm, 8px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        font-size: var(--font-size-md, 1rem);
        font-family: inherit;
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
      }

      .preset-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        background: var(--surface-primary, #ffffff);
        color: var(--color-primary, #0d9488);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .preset-btn:hover {
        background: var(--color-primary, #0d9488);
        border-color: var(--color-primary, #0d9488);
        color: white;
      }

      .preset-legend {
        margin: var(--spacing-xs, 4px) 0 0 0;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
        font-style: italic;
      }

      .legend-item {
        white-space: nowrap;
      }

      .legend-item svg {
        vertical-align: middle;
        margin-right: 2px;
      }

      /* Portfolio Visualization */
      .portfolio-visualization {
        margin-top: var(--spacing-lg, 24px);
        background: #f0fdfa;
        border: 1px solid #99f6e4;
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-md, 16px);
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-md, 16px);
        padding-bottom: var(--spacing-sm, 8px);
        border-bottom: 1px solid #99f6e4;
      }

      .header-icon {
        color: var(--color-primary, #0d9488);
      }

      .header-text {
        flex: 1;
      }

      .header-title {
        display: block;
        font-weight: 600;
        font-size: var(--font-size-md, 1rem);
        color: var(--text-primary, #1e293b);
      }

      .header-subtitle {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
      }

      .portfolio-content {
        display: flex;
        gap: var(--spacing-lg, 24px);
        align-items: flex-start;
      }

      .donut-container {
        position: relative;
        width: 120px;
        height: 120px;
        flex-shrink: 0;
      }

      #portfolio-donut {
        width: 100%;
        height: 100%;
      }

      .donut-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 700;
        color: var(--text-secondary, #64748b);
        pointer-events: none;
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
        height: 28px;
        padding: 0 var(--spacing-sm, 8px);
        border-radius: var(--border-radius-sm, 4px);
        background: white;
        overflow: hidden;
      }

      .asset-bar-row::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: var(--bar-width, 0%);
        background: var(--bar-color, #0d9488);
        opacity: 0.15;
        border-radius: var(--border-radius-sm, 4px);
        z-index: 0;
      }

      .asset-bar-swatch {
        width: 12px;
        height: 12px;
        border-radius: var(--border-radius-xs, 2px);
        flex-shrink: 0;
        z-index: 1;
      }

      .asset-bar-name {
        flex: 1;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        z-index: 1;
      }

      .asset-bar-percent {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        z-index: 1;
      }

      /* Selected Assets - weight editing cards */
      .selected-assets-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
        margin-top: var(--spacing-md, 16px);
      }

      .selected-asset-card {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-md, 16px);
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-lg, 12px);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        flex-wrap: nowrap;
      }

      .color-swatch {
        width: 16px;
        height: 16px;
        border-radius: var(--border-radius-sm, 4px);
        flex-shrink: 0;
        margin-top: 4px;
      }

      .selected-asset-info {
        flex: 1;
        min-width: 80px;
        overflow: hidden;
      }

      .selected-asset-name {
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        font-size: var(--font-size-sm, 0.875rem);
        text-transform: uppercase;
        line-height: 1.3;
      }

      .selected-asset-badge {
        display: inline-block;
        margin-top: 4px;
        padding: 2px 6px;
        background: var(--color-primary, #0d9488);
        border-radius: var(--border-radius-sm, 4px);
        font-size: 10px;
        font-weight: 600;
        color: white;
        text-transform: uppercase;
      }

      .selected-asset-stats {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-secondary, #64748b);
        margin-top: 4px;
        white-space: nowrap;
      }

      .weight-input-group {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs, 4px);
        flex-shrink: 0;
      }

      .weight-input {
        width: 60px;
        padding: 6px 8px;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-sm, 4px);
        font-size: var(--font-size-sm, 0.875rem);
        font-family: inherit;
        text-align: right;
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
      }

      .weight-input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
      }

      .weight-percent {
        color: var(--text-secondary, #64748b);
      }

      .remove-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: var(--text-tertiary, #94a3b8);
        cursor: pointer;
        font-size: 20px;
        transition: color 0.15s ease;
      }

      .remove-btn:hover {
        color: var(--color-error, #dc2626);
      }

      /* Weight Section */
      .weight-section {
        margin-top: var(--spacing-lg, 24px);
      }

      .weight-bar {
        display: flex;
        height: 36px;
        border-radius: var(--border-radius-md, 8px);
        overflow: hidden;
        margin-top: var(--spacing-sm, 8px);
      }

      .weight-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        transition: flex 0.3s ease;
        min-width: 40px;
      }

      .weight-controls {
        display: flex;
        gap: var(--spacing-sm, 8px);
        margin-top: var(--spacing-md, 16px);
      }

      .balance-btn {
        flex: 1;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: var(--color-primary, #0d9488);
        color: white;
        border: none;
        border-radius: var(--border-radius-md, 8px);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .balance-btn:hover {
        background: var(--color-primary-hover, #0f766e);
      }

      .clear-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs, 4px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: var(--surface-primary, #ffffff);
        color: var(--color-warning, #f59e0b);
        border: 2px solid var(--color-warning, #f59e0b);
        border-radius: var(--border-radius-md, 8px);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .clear-btn:hover {
        background: var(--color-warning, #f59e0b);
        color: white;
      }

      .total-row {
        text-align: right;
        font-weight: 600;
        margin-top: var(--spacing-sm, 8px);
        font-size: var(--font-size-md, 1rem);
      }

      .total-value {
        color: var(--color-success, #059669);
      }

      .total-value.invalid {
        color: var(--color-error, #dc2626);
      }
    `;
  }

  override connectedCallback(): void {
    // Load assets BEFORE rendering so data is available in afterRender
    this.loadAvailableAssets();
    super.connectedCallback();
    // Load last portfolio from IndexedDB after rendering
    this.loadInitialPortfolio();
  }

  private async loadInitialPortfolio(): Promise<void> {
    try {
      const lastPortfolio = await loadLastPortfolio();
      if (lastPortfolio && lastPortfolio.assets.length > 0) {
        this.populateFromPortfolio(lastPortfolio);
      }
    } catch (error) {
      console.warn('Failed to load last portfolio:', error);
    }
  }

  private populateFromPortfolio(portfolio: PortfolioRecord): void {
    // Track if this is a named portfolio (not temp)
    if (portfolio.name !== TEMP_PORTFOLIO_KEY) {
      this._currentPortfolioId = portfolio.id;
      this._currentPortfolioName = portfolio.name;
    } else {
      this._currentPortfolioId = undefined;
      this._currentPortfolioName = '';
    }

    // Convert AssetRecords to SelectedAssets
    this.selectedAssets = portfolio.assets.map((asset, index) => {
      const availableAsset = this.availableAssets.find(a => a.symbol === asset.symbol);
      const color = ASSET_COLORS[index % ASSET_COLORS.length];
      return {
        symbol: asset.symbol,
        name: asset.name,
        assetClass: availableAsset?.assetClass || 'STOCK',
        years: availableAsset?.years || 0,
        avgReturn: availableAsset?.avgReturn || 0,
        volatility: availableAsset?.volatility || 0,
        color,
        weight: asset.weight * 100, // Convert from 0-1 to 0-100
      };
    });

    this.renderAvailableAssets();
    this.renderSelectedAssets();
    this.updatePresetSelect();
    this.dispatchPortfolioChange();
  }

  private updatePresetSelect(): void {
    const select = this.$('.preset-select') as HTMLSelectElement;
    if (!select) return;

    // Update selected option based on current portfolio
    if (this._currentPortfolioId !== undefined) {
      select.value = this._currentPortfolioId.toString();
    } else {
      select.value = '';
    }
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

    // Get modal reference
    this.modal = this.$('#portfolio-modal') as ModalDialog;

    this.renderAvailableAssets();
    this.attachEventListeners();
    this.initializeDonutChart();
    this.refreshPresetDropdown();
  }

  private loadAvailableAssets(): void {
    const symbols = getPresetSymbols();
    this.availableAssets = symbols.map((symbol, index) => {
      const preset = getPresetData(symbol);
      return this.calculateAssetStats(symbol, preset, index);
    });
  }

  private calculateAssetStats(symbol: string, preset: PresetData | undefined, colorIndex: number): AssetStats {
    if (!preset) {
      return {
        symbol,
        name: symbol,
        assetClass: 'unknown',
        years: 0,
        avgReturn: 0,
        volatility: 0,
        color: ASSET_COLORS[colorIndex % ASSET_COLORS.length],
      };
    }

    const returns = preset.returns.map(r => r.return);
    const years = returns.length;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / years * 100;

    // Calculate volatility (standard deviation of returns)
    const mean = avgReturn / 100;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / years;
    const volatility = Math.sqrt(variance) * 100;

    // Map asset class to display name
    const assetClassMap: Record<string, string> = {
      'equity_stock': 'STOCK',
      'equity_index': 'INDEX',
      'commodity': 'COMMODITY',
      'bond': 'BOND',
    };

    return {
      symbol,
      name: preset.name || symbol,
      assetClass: assetClassMap[(preset as any).assetClass] || 'STOCK',
      years,
      avgReturn,
      volatility,
      color: ASSET_COLORS[colorIndex % ASSET_COLORS.length],
    };
  }

  private getFilteredAssets(): AssetStats[] {
    const query = this.searchQuery.toLowerCase();
    if (!query) return this.availableAssets;

    return this.availableAssets.filter(asset =>
      asset.symbol.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query)
    );
  }

  private renderAvailableAssets(): void {
    const list = this.$('.available-assets-list');
    if (!list) return;

    const selectedSymbols = new Set(this.selectedAssets.map(a => a.symbol));
    // Filter OUT selected symbols entirely (hide, not disable)
    const filtered = this.getFilteredAssets().filter(a => !selectedSymbols.has(a.symbol));

    list.innerHTML = filtered.map(asset => {
      return `
        <div class="available-asset-item"
             data-symbol="${asset.symbol}"
             role="option"
             aria-selected="false">
          <div class="asset-info">
            <div>
              <span class="asset-name">${asset.symbol}</span>
              <span class="asset-badge">${asset.assetClass}</span>
            </div>
            <div class="asset-stats">
              ${asset.years} years | Avg: ${asset.avgReturn.toFixed(1)}% | Vol: ${asset.volatility.toFixed(1)}%
            </div>
          </div>
          <button class="add-btn" aria-label="Add ${asset.symbol}">+</button>
        </div>
      `;
    }).join('');

    // Attach click handlers
    this.$$('.available-asset-item').forEach(item => {
      const symbol = (item as HTMLElement).dataset.symbol;
      if (!symbol) return;

      item.addEventListener('dblclick', () => this.addAsset(symbol));

      const addBtn = item.querySelector('.add-btn');
      addBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addAsset(symbol);
      });
    });
  }

  private renderSelectedAssets(): void {
    const visualization = this.$('.portfolio-visualization') as HTMLElement;
    const list = this.$('.selected-assets-list');
    const weightSection = this.$('.weight-section') as HTMLElement;
    if (!visualization || !list) return;

    if (this.selectedAssets.length === 0) {
      if (visualization) visualization.style.display = 'none';
      list.innerHTML = '';
      if (weightSection) weightSection.style.display = 'none';
      return;
    }

    if (visualization) visualization.style.display = 'block';
    if (weightSection) weightSection.style.display = 'block';

    // Update header subtitle
    const subtitle = visualization.querySelector('.header-subtitle');
    if (subtitle) {
      subtitle.textContent = `${this.selectedAssets.length} Asset${this.selectedAssets.length !== 1 ? 's' : ''}`;
    }

    // Update donut center text
    const donutCenter = visualization.querySelector('.donut-center');
    if (donutCenter) {
      donutCenter.textContent = `${this.selectedAssets.length} ASSET${this.selectedAssets.length !== 1 ? 'S' : ''}`;
    }

    // Sort assets by weight descending for visualization
    const sortedAssets = [...this.selectedAssets].sort((a, b) => b.weight - a.weight);

    // Render horizontal bars
    const barsList = visualization.querySelector('.asset-bars-list');
    if (barsList) {
      barsList.innerHTML = sortedAssets.map(asset => `
        <div class="asset-bar-row" style="--bar-width: ${asset.weight}%; --bar-color: ${asset.color};">
          <div class="asset-bar-swatch" style="background-color: ${asset.color}"></div>
          <span class="asset-bar-name">${asset.name}</span>
          <span class="asset-bar-percent">${asset.weight.toFixed(1)}%</span>
        </div>
      `).join('');
    }

    // Update donut chart
    this.updateDonutChart();

    // Render weight editing cards
    list.innerHTML = this.selectedAssets.map((asset, index) => `
      <div class="selected-asset-card" data-symbol="${asset.symbol}">
        <div class="color-swatch" style="background-color: ${asset.color}"></div>
        <div class="selected-asset-info">
          <div class="selected-asset-name">${asset.name}</div>
          <div class="selected-asset-badge">${asset.assetClass}</div>
          <div class="selected-asset-stats">
            Avg: ${asset.avgReturn.toFixed(1)}% | Vol: ${asset.volatility.toFixed(1)}%
          </div>
        </div>
        <div class="weight-input-group">
          <input type="number"
                 class="weight-input"
                 value="${asset.weight.toFixed(1)}"
                 min="0"
                 max="100"
                 step="0.1"
                 data-index="${index}"
                 aria-label="Weight for ${asset.symbol}" />
          <span class="weight-percent">%</span>
        </div>
        <button class="remove-btn" data-symbol="${asset.symbol}" aria-label="Remove ${asset.symbol}">&times;</button>
      </div>
    `).join('');

    // Attach weight input handlers
    this.$$('.weight-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt((e.target as HTMLInputElement).dataset.index || '0');
        const value = parseFloat((e.target as HTMLInputElement).value) || 0;
        if (this.selectedAssets[idx]) {
          this.selectedAssets[idx].weight = value;
          this.renderVisualizationOnly();
          this.renderWeightBar();
          this.updateTotal();
          this.dispatchPortfolioChange();
        }
      });
    });

    // Attach remove button handlers
    this.$$('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const symbol = (btn as HTMLElement).dataset.symbol;
        if (symbol) this.removeAsset(symbol);
      });
    });

    this.renderWeightBar();
    this.updateTotal();
  }

  private renderWeightBar(): void {
    const bar = this.$('.weight-bar');
    if (!bar) return;

    const total = this.selectedAssets.reduce((sum, a) => sum + a.weight, 0);

    bar.innerHTML = this.selectedAssets.map(asset => {
      const percent = total > 0 ? (asset.weight / total * 100) : 0;
      const displayPercent = asset.weight;
      return `
        <div class="weight-segment" style="flex: ${asset.weight || 0.1}; background-color: ${asset.color}">
          ${displayPercent >= 5 ? displayPercent.toFixed(0) + '%' : ''}
        </div>
      `;
    }).join('');
  }

  private updateTotal(): void {
    const total = this.selectedAssets.reduce((sum, a) => sum + a.weight, 0);
    const totalEl = this.$('.total-value');
    if (totalEl) {
      totalEl.textContent = total.toFixed(1);
      totalEl.className = `total-value ${Math.abs(total - 100) < 0.01 ? '' : 'invalid'}`;
    }
  }

  private attachEventListeners(): void {
    // Search input
    const searchInput = this.$('.search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.renderAvailableAssets();
    });

    // Balance button
    this.$('.balance-btn')?.addEventListener('click', () => this.balanceWeights());

    // Clear button
    this.$('.clear-btn')?.addEventListener('click', () => this.clearAll());

    // Preset buttons
    this.$('.save-btn')?.addEventListener('click', () => this.savePreset());
    this.$('.load-btn')?.addEventListener('click', () => this.loadPreset());
    this.$('.import-btn')?.addEventListener('click', () => this.importPreset());
    this.$('.export-btn')?.addEventListener('click', () => this.exportPreset());
    this.$('.delete-btn')?.addEventListener('click', () => this.deletePreset());

    // File input for import
    const fileInput = this.$('.import-file-input') as HTMLInputElement;
    fileInput?.addEventListener('change', (e) => this.handleFileImport(e));

    // Preset select change handler
    const presetSelect = this.$('.preset-select') as HTMLSelectElement;
    presetSelect?.addEventListener('change', () => this.handlePresetSelectChange());
  }

  private async handleFileImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const portfolios = await importFromFile(file);
      if (portfolios.length > 0) {
        // Load first portfolio from import
        const portfolio = portfolios[0];
        this.populateFromPortfolio(portfolio);
        this.showToast(`Imported portfolio: ${portfolio.name}`, 'success');
      }
    } catch (error) {
      this.showToast(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }

    // Reset file input for future imports
    input.value = '';
  }

  private async handlePresetSelectChange(): Promise<void> {
    const select = this.$('.preset-select') as HTMLSelectElement;
    const selectedId = parseInt(select.value);

    if (isNaN(selectedId)) {
      // User selected default option - clear current portfolio tracking
      this._currentPortfolioId = undefined;
      this._currentPortfolioName = '';
      return;
    }

    try {
      const portfolios = await loadAllPortfolios();
      const portfolio = portfolios.find(p => p.id === selectedId);
      if (portfolio) {
        this.populateFromPortfolio(portfolio);
      }
    } catch (error) {
      this.showToast('Failed to load portfolio', 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Dispatch toast event for toast-container to handle
    this.dispatchEvent(new CustomEvent('show-toast', {
      bubbles: true,
      composed: true,
      detail: { message, type },
    }));
  }

  private addAsset(symbol: string): void {
    // Check if already selected
    if (this.selectedAssets.find(a => a.symbol === symbol)) return;

    const asset = this.availableAssets.find(a => a.symbol === symbol);
    if (!asset) return;

    // Assign a unique color based on selection order
    const usedColors = new Set(this.selectedAssets.map(a => a.color));
    let color = asset.color;
    for (const c of ASSET_COLORS) {
      if (!usedColors.has(c)) {
        color = c;
        break;
      }
    }

    this.selectedAssets.push({
      ...asset,
      color,
      weight: 0,
    });

    this.renderAvailableAssets();
    this.renderSelectedAssets();
    this.dispatchPortfolioChange();
  }

  private removeAsset(symbol: string): void {
    this.selectedAssets = this.selectedAssets.filter(a => a.symbol !== symbol);
    this.renderAvailableAssets();
    this.renderSelectedAssets();
    this.dispatchPortfolioChange();
  }

  private balanceWeights(): void {
    if (this.selectedAssets.length === 0) return;

    const equalWeight = Math.round((100 / this.selectedAssets.length) * 10) / 10;
    this.selectedAssets.forEach(asset => {
      asset.weight = equalWeight;
    });

    this.renderSelectedAssets();
    this.dispatchPortfolioChange();
  }

  private clearAll(): void {
    this.selectedAssets = [];
    this.renderAvailableAssets();
    this.renderSelectedAssets();
    this.dispatchPortfolioChange();
  }

  private async savePreset(): Promise<void> {
    if (this.selectedAssets.length === 0) {
      this.showToast('Add assets to portfolio before saving', 'error');
      return;
    }

    const name = await this.modal.show({
      title: 'Save Portfolio',
      subtitle: this._currentPortfolioName
        ? `Overwrite "${this._currentPortfolioName}" or enter a new name:`
        : 'Enter a name for this portfolio:',
      type: 'prompt',
      defaultValue: this._currentPortfolioName || '',
      confirmText: 'Save',
    });
    if (!name || typeof name !== 'string' || !name.trim()) return;

    try {
      const assets = this.buildAssetRecords();
      const now = new Date().toISOString();
      const id = await savePortfolio({
        name: name.trim(),
        assets,
        created: now,
        modified: now,
        version: 1,
      });

      this._currentPortfolioId = id;
      this._currentPortfolioName = name.trim();

      // Delete temp portfolio after successful save
      await deleteTempPortfolio();

      // Refresh preset dropdown
      await this.refreshPresetDropdown();

      this.showToast(`Saved portfolio: ${name.trim()}`, 'success');
    } catch (error) {
      this.showToast('Failed to save portfolio', 'error');
    }
  }

  private async loadPreset(): Promise<void> {
    // Refresh and show the dropdown with all portfolios
    await this.refreshPresetDropdown();

    // Focus the select to prompt user selection
    const select = this.$('.preset-select') as HTMLSelectElement;
    if (select) {
      select.focus();
      // Optionally open the dropdown (browser-dependent)
      select.click();
    }
  }

  private importPreset(): void {
    // Trigger the hidden file input
    const fileInput = this.$('.import-file-input') as HTMLInputElement;
    fileInput?.click();
  }

  private exportPreset(): void {
    if (this.selectedAssets.length === 0) {
      this.showToast('Add assets to portfolio before exporting', 'error');
      return;
    }

    const assets = this.buildAssetRecords();
    const now = new Date().toISOString();
    const portfolio: PortfolioRecord = {
      name: this._currentPortfolioName || 'Exported Portfolio',
      assets,
      created: now,
      modified: now,
      version: 1,
    };

    exportAndDownload([portfolio]);
    this.showToast('Portfolio exported', 'success');
  }

  private async deletePreset(): Promise<void> {
    if (this._currentPortfolioId === undefined) {
      this.showToast('No saved portfolio selected to delete', 'error');
      return;
    }

    const confirmed = await this.modal.show({
      title: 'Delete Portfolio',
      subtitle: `Are you sure you want to delete "${this._currentPortfolioName}"? This cannot be undone.`,
      type: 'confirm',
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      await deletePortfolio(this._currentPortfolioId);

      // Clear current portfolio tracking
      const deletedName = this._currentPortfolioName;
      this._currentPortfolioId = undefined;
      this._currentPortfolioName = '';

      // Refresh preset dropdown
      await this.refreshPresetDropdown();

      this.showToast(`Deleted portfolio: ${deletedName}`, 'success');
    } catch (error) {
      this.showToast('Failed to delete portfolio', 'error');
    }
  }

  private async refreshPresetDropdown(): Promise<void> {
    const select = this.$('.preset-select') as HTMLSelectElement;
    if (!select) return;

    try {
      const portfolios = await loadAllPortfolios();
      // Filter out temp portfolio from display
      const namedPortfolios = portfolios.filter(p => p.name !== TEMP_PORTFOLIO_KEY);

      // Rebuild options
      select.innerHTML = '<option value="">-- Presets --</option>';
      namedPortfolios.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id?.toString() || '';
        option.textContent = p.name;
        if (p.id === this._currentPortfolioId) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    } catch (error) {
      console.warn('Failed to refresh preset dropdown:', error);
    }
  }

  private dispatchPortfolioChange(): void {
    const total = this.selectedAssets.reduce((sum, a) => sum + a.weight, 0);
    this.dispatchEvent(new CustomEvent('portfolio-change', {
      bubbles: true,
      composed: true,
      detail: {
        assets: this.selectedAssets.map(a => ({
          symbol: a.symbol,
          name: a.name,
          weight: a.weight,
          color: a.color,
        })),
        total,
        valid: Math.abs(total - 100) < 0.01,
      },
    }));

    // Auto-save to temp portfolio when no named portfolio is selected
    if (this._currentPortfolioId === undefined) {
      this.autoSaveToTemp();
    }
  }

  private async autoSaveToTemp(): Promise<void> {
    try {
      const assets = this.buildAssetRecords();
      await saveTempPortfolio(assets);
    } catch (error) {
      console.warn('Failed to auto-save temp portfolio:', error);
    }
  }

  private buildAssetRecords(): AssetRecord[] {
    return this.selectedAssets.map(asset => ({
      id: asset.symbol, // Use symbol as unique ID
      symbol: asset.symbol,
      name: asset.name,
      assetClass: (asset.assetClass.toLowerCase() === 'stock' ? 'equity' :
                   asset.assetClass.toLowerCase() === 'index' ? 'equity' :
                   asset.assetClass.toLowerCase()) as any,
      weight: asset.weight / 100, // Convert from 0-100 to 0-1
    }));
  }

  private initializeDonutChart(): void {
    const canvas = this.$('#portfolio-donut') as HTMLCanvasElement;
    if (!canvas) return;

    this.donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
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

  private updateDonutChart(): void {
    if (!this.donutChart) return;

    const labels = this.selectedAssets.map(a => a.name);
    const values = this.selectedAssets.map(a => a.weight);
    const colors = this.selectedAssets.map(a => a.color);

    this.donutChart.data.labels = labels;
    this.donutChart.data.datasets[0].data = values;
    this.donutChart.data.datasets[0].backgroundColor = colors;
    this.donutChart.update();
  }

  private renderVisualizationOnly(): void {
    const visualization = this.$('.portfolio-visualization') as HTMLElement;
    if (!visualization) return;

    // Update donut center text
    const donutCenter = visualization.querySelector('.donut-center');
    if (donutCenter) {
      donutCenter.textContent = `${this.selectedAssets.length} ASSET${this.selectedAssets.length !== 1 ? 'S' : ''}`;
    }

    // Sort assets by weight descending
    const sortedAssets = [...this.selectedAssets].sort((a, b) => b.weight - a.weight);

    // Render horizontal bars
    const barsList = visualization.querySelector('.asset-bars-list');
    if (barsList) {
      barsList.innerHTML = sortedAssets.map(asset => `
        <div class="asset-bar-row" style="--bar-width: ${asset.weight}%; --bar-color: ${asset.color};">
          <div class="asset-bar-swatch" style="background-color: ${asset.color}"></div>
          <span class="asset-bar-name">${asset.name}</span>
          <span class="asset-bar-percent">${asset.weight.toFixed(1)}%</span>
        </div>
      `).join('');
    }

    // Update donut chart
    this.updateDonutChart();
  }

  /**
   * Get current portfolio as weights object
   */
  public getWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    this.selectedAssets.forEach(a => {
      weights[a.symbol] = a.weight;
    });
    return weights;
  }

  /**
   * Get selected asset symbols
   */
  public getSelected(): string[] {
    return this.selectedAssets.map(a => a.symbol);
  }

  /**
   * Check if portfolio is valid (weights sum to 100%)
   */
  public isValid(): boolean {
    const total = this.selectedAssets.reduce((sum, a) => sum + a.weight, 0);
    return Math.abs(total - 100) < 0.01 && this.selectedAssets.length > 0;
  }
}

// Register the custom element
customElements.define('portfolio-composition', PortfolioComposition);
