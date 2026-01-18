import { BaseComponent } from '../base-component';

/**
 * Asset search/filter/select component.
 * Provides a searchable list of assets with multi-selection support.
 *
 * @element asset-selector
 * @attr {string} assets - JSON array of asset tickers (e.g., '["SPY","QQQ","VTI"]')
 * @attr {string} selected - JSON array of selected assets
 * @attr {number} max-selection - Maximum number of selectable assets (default: 5)
 * @fires selection-change - Dispatched when selection changes
 *
 * @example
 * <asset-selector
 *   assets='["SPY","QQQ","VTI","VOO","IWM"]'
 *   selected='["SPY"]'
 *   max-selection="3">
 * </asset-selector>
 */
export class AssetSelector extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['assets', 'selected', 'max-selection'];
  }

  private filteredAssets: string[] = [];
  private selectedAssets: Set<string> = new Set();

  protected template(): string {
    const maxSelection = this.getMaxSelection();
    const selectedCount = this.selectedAssets.size;

    return `
      <div class="asset-selector">
        <input type="search"
               placeholder="Search assets..."
               class="search-input"
               aria-label="Search available assets" />
        <ul class="asset-list" role="listbox" aria-label="Available assets">
          <!-- Populated dynamically -->
        </ul>
        <div class="selected-count">
          <span class="count">${selectedCount}</span>/<span class="max">${maxSelection}</span> selected
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .asset-selector {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
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
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        box-sizing: border-box;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }

      .search-input::placeholder {
        color: var(--text-secondary, #64748b);
      }

      .asset-list {
        list-style: none;
        padding: 0;
        margin: 0;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        background: var(--surface-primary, #ffffff);
      }

      .asset-list:empty::before {
        content: 'No assets found';
        display: block;
        padding: var(--spacing-md, 16px);
        text-align: center;
        color: var(--text-secondary, #64748b);
        font-style: italic;
      }

      .asset-item {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        cursor: pointer;
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        transition: background 0.2s ease;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      .asset-item:last-child {
        border-bottom: none;
      }

      .asset-item:hover:not([aria-disabled="true"]) {
        background: var(--surface-tertiary, #e2e8f0);
      }

      .asset-item:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: -2px;
      }

      .asset-item[aria-selected="true"] {
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
      }

      .asset-item[aria-selected="true"]:hover {
        background: var(--color-primary-hover, #0f766e);
      }

      .asset-item[aria-disabled="true"] {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .checkmark {
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .selected-count {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        text-align: right;
      }

      .selected-count .count {
        font-weight: 600;
        color: var(--color-primary, #0d9488);
      }
    `;
  }

  override connectedCallback(): void {
    // Initialize selected assets from attribute
    this.syncSelectedFromAttribute();
    super.connectedCallback();
  }

  protected override afterRender(): void {
    const searchInput = this.$('.search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.filterAssets(searchInput.value);
    });

    // Initial render of asset list
    this.filterAssets('');
  }

  private syncSelectedFromAttribute(): void {
    try {
      const selectedAttr = this.getAttribute('selected') || '[]';
      const selected = JSON.parse(selectedAttr) as string[];
      this.selectedAssets = new Set(selected);
    } catch {
      this.selectedAssets = new Set();
    }
  }

  private getMaxSelection(): number {
    return parseInt(this.getAttribute('max-selection') || '5', 10);
  }

  private getAllAssets(): string[] {
    try {
      return JSON.parse(this.getAttribute('assets') || '[]') as string[];
    } catch {
      return [];
    }
  }

  private filterAssets(query: string): void {
    const allAssets = this.getAllAssets();
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery === '') {
      this.filteredAssets = allAssets;
    } else {
      this.filteredAssets = allAssets.filter((asset) =>
        asset.toLowerCase().includes(lowerQuery)
      );
    }

    this.renderAssetList();
  }

  private renderAssetList(): void {
    const list = this.$('.asset-list');
    if (!list) return;

    const maxSelection = this.getMaxSelection();
    const atMaxSelection = this.selectedAssets.size >= maxSelection;

    list.innerHTML = this.filteredAssets
      .map((asset) => {
        const isSelected = this.selectedAssets.has(asset);
        const isDisabled = !isSelected && atMaxSelection;

        return `
          <li class="asset-item"
              role="option"
              tabindex="0"
              data-asset="${asset}"
              aria-selected="${isSelected}"
              ${isDisabled ? 'aria-disabled="true"' : ''}>
            <span class="checkmark">${isSelected ? '&#10003;' : ''}</span>
            <span class="asset-name">${asset}</span>
          </li>
        `;
      })
      .join('');

    // Add click and keyboard handlers
    this.$$('.asset-item').forEach((item) => {
      item.addEventListener('click', () => this.handleItemClick(item));
      item.addEventListener('keydown', (e) => this.handleItemKeydown(e, item));
    });

    // Update the count display
    this.updateCountDisplay();
  }

  private handleItemClick(item: Element): void {
    if (item.getAttribute('aria-disabled') === 'true') return;

    const asset = (item as HTMLElement).dataset.asset;
    if (asset) {
      this.toggleAsset(asset);
    }
  }

  private handleItemKeydown(e: Event, item: Element): void {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
      keyEvent.preventDefault();
      this.handleItemClick(item);
    }
  }

  private toggleAsset(asset: string): void {
    const maxSelection = this.getMaxSelection();

    if (this.selectedAssets.has(asset)) {
      this.selectedAssets.delete(asset);
    } else if (this.selectedAssets.size < maxSelection) {
      this.selectedAssets.add(asset);
    } else {
      // At max selection, cannot add more
      return;
    }

    // Update the selected attribute
    this.setAttribute('selected', JSON.stringify(Array.from(this.selectedAssets)));

    // Re-render list to update selection state
    this.renderAssetList();

    // Dispatch event
    this.dispatchEvent(
      new CustomEvent('selection-change', {
        bubbles: true,
        composed: true,
        detail: { selected: Array.from(this.selectedAssets) },
      })
    );
  }

  private updateCountDisplay(): void {
    const countEl = this.$('.count');
    const maxEl = this.$('.max');

    if (countEl) {
      countEl.textContent = String(this.selectedAssets.size);
    }
    if (maxEl) {
      maxEl.textContent = String(this.getMaxSelection());
    }
  }

  /**
   * Get currently selected assets.
   */
  public getSelected(): string[] {
    return Array.from(this.selectedAssets);
  }

  /**
   * Programmatically set selected assets.
   */
  public setSelected(assets: string[]): void {
    const maxSelection = this.getMaxSelection();
    this.selectedAssets = new Set(assets.slice(0, maxSelection));
    this.setAttribute('selected', JSON.stringify(Array.from(this.selectedAssets)));
    this.renderAssetList();
  }
}

// Register the custom element
customElements.define('asset-selector', AssetSelector);
