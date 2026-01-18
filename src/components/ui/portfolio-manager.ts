/**
 * Portfolio manager component for save/load/export/import operations.
 *
 * Provides a panel for managing portfolio configurations including:
 * - Save current portfolio with a name
 * - Load saved portfolios (delegates to portfolio-list)
 * - Export all portfolios to JSON file
 * - Import portfolios from JSON file
 *
 * @element portfolio-manager
 * @fires portfolio-loaded - Dispatched when user loads a portfolio
 * @fires request-portfolio-state - Dispatched to request current portfolio state from parent
 */

import { BaseComponent } from '../base-component';
import {
  savePortfolio,
  loadPortfolio,
  loadAllPortfolios,
  exportAndDownload,
  importFromFile,
  bulkImportPortfolios
} from '../../data/services/portfolio-service';
import type { PortfolioRecord } from '../../data/schemas/portfolio';
import type { AssetRecord } from '../../data/schemas/portfolio';
import './portfolio-list';

export class PortfolioManager extends BaseComponent {
  private _currentPortfolioId: number | undefined;

  /**
   * Get the ID of the currently loaded portfolio.
   */
  get currentPortfolioId(): number | undefined {
    return this._currentPortfolioId;
  }

  protected template(): string {
    return `
      <div class="portfolio-manager">
        <section class="save-section">
          <h4>Save Current Portfolio</h4>
          <div class="save-form">
            <input type="text" id="portfolio-name" placeholder="Portfolio name" />
            <button id="btn-save" class="btn-primary">Save</button>
          </div>
        </section>

        <section class="list-section">
          <h4>Saved Portfolios</h4>
          <portfolio-list id="portfolio-list"></portfolio-list>
        </section>

        <section class="import-export-section">
          <h4>Import / Export</h4>
          <div class="ie-buttons">
            <button id="btn-export">Export All</button>
            <button id="btn-import">Import</button>
            <input type="file" id="import-file" accept=".json" hidden />
          </div>
        </section>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .portfolio-manager {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg, 24px);
      }

      section {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      h4 {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--text-secondary, #475569);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .save-form {
        display: flex;
        gap: var(--spacing-sm, 8px);
      }

      .save-form input {
        flex: 1;
        min-width: 0;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        font-family: inherit;
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .save-form input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }

      .save-form input::placeholder {
        color: var(--text-tertiary, #94a3b8);
      }

      .btn-primary {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
        border: none;
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.2s;
        white-space: nowrap;
      }

      .btn-primary:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .btn-primary:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      .ie-buttons {
        display: flex;
        gap: var(--spacing-sm, 8px);
      }

      .ie-buttons button {
        flex: 1;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: var(--surface-secondary, #f8fafc);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        font-family: inherit;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
        color: var(--text-primary, #1e293b);
      }

      .ie-buttons button:hover {
        background: var(--surface-tertiary, #f1f5f9);
        border-color: var(--color-primary, #0d9488);
      }

      .ie-buttons button:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      #btn-export {
        background: var(--color-success-light, #dcfce7);
        border-color: var(--color-success, #22c55e);
        color: var(--color-success-dark, #166534);
      }

      #btn-export:hover {
        background: var(--color-success, #22c55e);
        color: var(--text-inverse, #ffffff);
      }
    `;
  }

  protected override afterRender(): void {
    const saveBtn = this.$('#btn-save');
    const nameInput = this.$('#portfolio-name') as HTMLInputElement;
    const exportBtn = this.$('#btn-export');
    const importBtn = this.$('#btn-import');
    const importFile = this.$('#import-file') as HTMLInputElement;
    const list = this.$('#portfolio-list') as HTMLElement & { refresh(): Promise<void> };

    // Save button
    saveBtn?.addEventListener('click', async () => {
      const name = nameInput?.value.trim();
      if (!name) {
        this.showToast('Please enter a portfolio name', 'error');
        return;
      }
      await this.saveCurrentPortfolio(name);
      nameInput.value = '';
      await list?.refresh();
      this.showToast('Portfolio saved', 'success');
    });

    // Export button
    exportBtn?.addEventListener('click', async () => {
      const portfolios = await loadAllPortfolios();
      if (portfolios.length === 0) {
        this.showToast('No portfolios to export', 'warning');
        return;
      }
      exportAndDownload(portfolios);
      this.showToast(`Exported ${portfolios.length} portfolios`, 'success');
    });

    // Import button triggers file input
    importBtn?.addEventListener('click', () => {
      importFile?.click();
    });

    // File input change
    importFile?.addEventListener('change', async () => {
      const file = importFile.files?.[0];
      if (!file) return;

      try {
        const portfolios = await importFromFile(file);
        await bulkImportPortfolios(portfolios);
        await list?.refresh();
        this.showToast(`Imported ${portfolios.length} portfolios`, 'success');
      } catch (e) {
        this.showToast((e as Error).message, 'error');
      }
      importFile.value = ''; // Reset for re-import
    });

    // Listen for load-portfolio from list
    this.addEventListener('load-portfolio', async (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      const portfolio = await loadPortfolio(id);
      if (portfolio) {
        this._currentPortfolioId = id;
        this.dispatchEvent(new CustomEvent('portfolio-loaded', {
          detail: { portfolio },
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  /**
   * Save the current portfolio state.
   * Dispatches request-portfolio-state event to collect current state from parent.
   */
  private async saveCurrentPortfolio(name: string): Promise<void> {
    // Dispatch event asking parent for current portfolio state
    const event = new CustomEvent('request-portfolio-state', {
      bubbles: true,
      composed: true,
      detail: {} as { assets?: AssetRecord[] }
    });
    this.dispatchEvent(event);

    // Parent should have set event.detail.assets
    const assets = event.detail.assets;
    if (!assets || assets.length === 0) {
      this.showToast('No assets to save', 'warning');
      return;
    }

    const record: Omit<PortfolioRecord, 'id'> = {
      name,
      assets,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: 1
    };

    if (this._currentPortfolioId) {
      // Update existing
      await savePortfolio({ ...record, id: this._currentPortfolioId });
    } else {
      // Create new
      this._currentPortfolioId = await savePortfolio(record);
    }
  }

  /**
   * Show a toast notification.
   */
  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const container = document.querySelector('toast-container') as HTMLElement & {
      show(message: string, type: string): void;
    } | null;
    container?.show(message, type);
  }

  /**
   * Refresh the portfolio list.
   */
  async refresh(): Promise<void> {
    const list = this.$('#portfolio-list') as HTMLElement & { refresh(): Promise<void> } | null;
    await list?.refresh();
  }

  /**
   * Clear the current portfolio ID (for creating a new portfolio).
   */
  clearCurrentPortfolio(): void {
    this._currentPortfolioId = undefined;
  }
}

// Register the custom element
customElements.define('portfolio-manager', PortfolioManager);
