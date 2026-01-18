import { BaseComponent } from '../base-component';

/**
 * Represents an asset in the weight editor.
 */
interface AssetItem {
  id: string;
  name?: string;
  weight?: number;
}

/**
 * Weight distribution component for portfolio allocation.
 * Allows setting weights per asset with validation that total equals 100%.
 *
 * @element weight-editor
 * @attr {string} assets - JSON array of assets (strings or objects with id/name/weight)
 * @fires weights-change - Dispatched when weights change
 *
 * @example
 * <weight-editor assets='["SPY","QQQ","VTI"]'></weight-editor>
 * <weight-editor assets='[{"id":"SPY","name":"S&P 500","weight":60}]'></weight-editor>
 */
export class WeightEditor extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['assets'];
  }

  private weights: Map<string, number> = new Map();
  private assetNames: Map<string, string> = new Map();
  private initializedFromJson = false;

  protected template(): string {
    const total = this.calculateTotal();
    const isValid = Math.abs(total - 100) < 0.01;

    return `
      <div class="weight-editor">
        <div class="weights-list">
          <!-- Weight rows inserted dynamically -->
        </div>
        <div class="controls">
          <button class="balance-btn" type="button">Balance Equally</button>
          <button class="clear-btn" type="button">Clear All</button>
        </div>
        <div class="total">
          Total: <span class="total-value">${total.toFixed(1)}</span>%
          <span class="validation ${isValid ? 'valid' : 'invalid'}">
            ${isValid ? '' : total > 100 ? '(exceeds 100%)' : '(below 100%)'}
          </span>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .weight-editor {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md, 16px);
      }

      .weights-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .weight-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
      }

      .asset-name {
        flex: 1;
        font-weight: 500;
        color: var(--text-primary, #1e293b);
      }

      .weight-input {
        width: 70px;
        padding: var(--spacing-sm, 8px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-sm, 4px);
        font-size: var(--font-size-md, 1rem);
        font-family: inherit;
        text-align: right;
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .weight-input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }

      .weight-input:invalid {
        border-color: var(--color-error, #dc2626);
      }

      .percent {
        color: var(--text-secondary, #64748b);
      }

      .controls {
        display: flex;
        gap: var(--spacing-sm, 8px);
      }

      .balance-btn,
      .clear-btn {
        flex: 1;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        font-size: var(--font-size-sm, 0.875rem);
        font-family: inherit;
        cursor: pointer;
        transition: background 0.2s ease, border-color 0.2s ease;
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
      }

      .balance-btn:hover,
      .clear-btn:hover {
        background: var(--surface-tertiary, #e2e8f0);
      }

      .balance-btn:focus-visible,
      .clear-btn:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      .balance-btn {
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
        border-color: var(--color-primary, #0d9488);
      }

      .balance-btn:hover {
        background: var(--color-primary-hover, #0f766e);
        border-color: var(--color-primary-hover, #0f766e);
      }

      .total {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding-top: var(--spacing-sm, 8px);
        border-top: 1px solid var(--border-color, #e2e8f0);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .total-value {
        font-size: var(--font-size-lg, 1.25rem);
        color: var(--color-primary, #0d9488);
      }

      .validation {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: normal;
      }

      .validation.valid {
        color: var(--color-success, #059669);
      }

      .validation.invalid {
        color: var(--color-error, #dc2626);
      }
    `;
  }

  protected override afterRender(): void {
    // Render weight rows
    this.renderWeights();

    // Attach button handlers
    this.$('.balance-btn')?.addEventListener('click', () => this.balanceWeights());
    this.$('.clear-btn')?.addEventListener('click', () => this.clearWeights());
  }

  private getAssets(): string[] {
    try {
      const parsed = JSON.parse(this.getAttribute('assets') || '[]');

      // Handle array of strings or array of objects
      return parsed.map((item: string | AssetItem) => {
        if (typeof item === 'string') {
          return item;
        }
        // Object format: { id, name?, weight? }
        const asset = item as AssetItem;
        if (asset.name) {
          this.assetNames.set(asset.id, asset.name);
        }
        // Initialize weights from JSON only on first parse
        if (!this.initializedFromJson && asset.weight !== undefined) {
          this.weights.set(asset.id, asset.weight);
        }
        return asset.id;
      });
    } catch {
      return [];
    }
  }

  private getAssetDisplayName(assetId: string): string {
    return this.assetNames.get(assetId) || assetId;
  }

  private renderWeights(): void {
    const list = this.$('.weights-list');
    if (!list) return;

    const assets = this.getAssets();

    // Mark as initialized after first parse
    this.initializedFromJson = true;

    // Initialize weights for new assets (that weren't in JSON)
    assets.forEach((asset) => {
      if (!this.weights.has(asset)) {
        this.weights.set(asset, 0);
      }
    });

    // Remove weights for removed assets
    for (const asset of this.weights.keys()) {
      if (!assets.includes(asset)) {
        this.weights.delete(asset);
      }
    }

    list.innerHTML = assets
      .map((asset) => {
        const weight = this.weights.get(asset) || 0;
        const displayName = this.getAssetDisplayName(asset);
        return `
          <div class="weight-row" data-asset="${asset}">
            <span class="asset-name">${displayName}</span>
            <input type="number"
                   min="0"
                   max="100"
                   step="0.1"
                   value="${weight}"
                   class="weight-input"
                   aria-label="Weight for ${displayName}" />
            <span class="percent">%</span>
          </div>
        `;
      })
      .join('');

    // Add input handlers
    this.$$('.weight-row').forEach((row) => {
      const input = row.querySelector('.weight-input') as HTMLInputElement;
      const asset = (row as HTMLElement).dataset.asset;

      input?.addEventListener('input', () => {
        const value = parseFloat(input.value) || 0;
        if (asset) {
          this.weights.set(asset, value);
          this.updateTotal();
          this.dispatchWeightsChange();
        }
      });
    });
  }

  private calculateTotal(): number {
    let total = 0;
    this.weights.forEach((value) => {
      total += value;
    });
    return Math.round(total * 10) / 10;
  }

  private updateTotal(): void {
    const total = this.calculateTotal();
    const isValid = Math.abs(total - 100) < 0.01;

    const totalEl = this.$('.total-value');
    const validationEl = this.$('.validation');

    if (totalEl) {
      totalEl.textContent = total.toFixed(1);
    }

    if (validationEl) {
      validationEl.className = `validation ${isValid ? 'valid' : 'invalid'}`;
      validationEl.textContent = isValid
        ? ''
        : total > 100
          ? '(exceeds 100%)'
          : '(below 100%)';
    }
  }

  private balanceWeights(): void {
    const assets = this.getAssets();
    if (assets.length === 0) return;

    const equalWeight = Math.round((100 / assets.length) * 10) / 10;

    assets.forEach((asset) => {
      this.weights.set(asset, equalWeight);
    });

    // Update input values
    this.$$('.weight-row').forEach((row) => {
      const input = row.querySelector('.weight-input') as HTMLInputElement;
      if (input) {
        input.value = String(equalWeight);
      }
    });

    this.updateTotal();
    this.dispatchWeightsChange();

    this.dispatchEvent(
      new CustomEvent('weights-balanced', {
        bubbles: true,
        composed: true,
        detail: { weights: this.getWeightsObject() },
      })
    );
  }

  private clearWeights(): void {
    this.weights.forEach((_, key) => {
      this.weights.set(key, 0);
    });

    // Update input values
    this.$$('.weight-input').forEach((input) => {
      (input as HTMLInputElement).value = '0';
    });

    this.updateTotal();
    this.dispatchWeightsChange();

    this.dispatchEvent(
      new CustomEvent('weights-cleared', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private dispatchWeightsChange(): void {
    const total = this.calculateTotal();
    const isValid = Math.abs(total - 100) < 0.01;

    this.dispatchEvent(
      new CustomEvent('weights-change', {
        bubbles: true,
        composed: true,
        detail: {
          weights: this.getWeightsObject(),
          total,
          valid: isValid,
        },
      })
    );
  }

  private getWeightsObject(): Record<string, number> {
    const result: Record<string, number> = {};
    this.weights.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Get current weights as an object.
   */
  public getWeights(): Record<string, number> {
    return this.getWeightsObject();
  }

  /**
   * Programmatically set weights.
   */
  public setWeights(weights: Record<string, number>): void {
    Object.entries(weights).forEach(([asset, weight]) => {
      this.weights.set(asset, weight);
    });
    this.renderWeights();
    this.updateTotal();
  }

  /**
   * Check if weights are valid (total equals 100%).
   */
  public isValid(): boolean {
    const total = this.calculateTotal();
    return Math.abs(total - 100) < 0.01;
  }
}

// Register the custom element
customElements.define('weight-editor', WeightEditor);
