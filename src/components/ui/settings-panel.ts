/**
 * Settings Panel Component
 *
 * Modal dialog for configuring API keys and CORS proxy settings.
 * Settings persist to IndexedDB via the settings service.
 */

import { BaseComponent } from '../base-component';
import {
  getSettings,
  setApiKey,
  clearApiKey,
  setCorsConfig
} from '../../data/services/settings-service';
import type { ApiSource } from '../../data/schemas/market-data';
import type { CorsProxyType } from '../../data/schemas/settings';

/**
 * API provider information for settings UI
 */
const API_PROVIDERS: Array<{
  source: ApiSource;
  name: string;
  description: string;
  signupUrl: string;
}> = [
  {
    source: 'fmp',
    name: 'Financial Modeling Prep',
    description: 'Free tier: 250 requests/day',
    signupUrl: 'https://site.financialmodelingprep.com/developer/docs'
  },
  {
    source: 'eodhd',
    name: 'EOD Historical Data',
    description: 'Free tier: 20 requests/day',
    signupUrl: 'https://eodhistoricaldata.com/register'
  },
  {
    source: 'alphavantage',
    name: 'Alpha Vantage',
    description: 'Free tier: 25 requests/day',
    signupUrl: 'https://www.alphavantage.co/support/#api-key'
  },
  {
    source: 'tiingo',
    name: 'Tiingo',
    description: 'Free tier: 500 symbols, 1000 requests/day',
    signupUrl: 'https://api.tiingo.com/'
  }
];

/**
 * CORS proxy options for settings UI
 */
const CORS_PROXY_OPTIONS: Array<{
  type: CorsProxyType;
  name: string;
  description: string;
}> = [
  { type: 'none', name: 'None', description: 'Direct requests (localhost/same-origin only)' },
  { type: 'allorigins', name: 'AllOrigins', description: 'Public proxy (may be slow)' },
  { type: 'corsproxy', name: 'CORS Proxy', description: 'Alternative public proxy' },
  { type: 'custom', name: 'Custom', description: 'Your own proxy URL' }
];

/**
 * Settings Panel
 *
 * Modal component for managing API keys and CORS proxy configuration.
 * Call show()/hide()/toggle() to control visibility.
 */
export class SettingsPanel extends BaseComponent {
  private _visible = false;

  /**
   * Show the settings modal
   */
  show(): void {
    this._visible = true;
    this.loadCurrentSettings();
    this.updateVisibility();
  }

  /**
   * Hide the settings modal
   */
  hide(): void {
    this._visible = false;
    this.updateVisibility();
  }

  /**
   * Toggle the settings modal visibility
   */
  toggle(): void {
    this._visible ? this.hide() : this.show();
  }

  protected template(): string {
    const apiInputs = API_PROVIDERS.map(p => `
      <div class="api-provider">
        <label>${p.name}</label>
        <p class="description">${p.description}</p>
        <div class="input-row">
          <input type="password"
                 id="api-${p.source}"
                 placeholder="Enter API key"
                 autocomplete="off" />
          <button class="btn-clear" data-source="${p.source}">Clear</button>
        </div>
        <a href="${p.signupUrl}" target="_blank" rel="noopener">Get API key</a>
      </div>
    `).join('');

    const corsOptions = CORS_PROXY_OPTIONS.map(o => `
      <label class="radio-option">
        <input type="radio" name="cors-proxy" value="${o.type}" />
        <span class="option-name">${o.name}</span>
        <span class="option-desc">${o.description}</span>
      </label>
    `).join('');

    return `
      <div class="settings-overlay" id="overlay">
        <div class="settings-modal">
          <header>
            <h2>Settings</h2>
            <button id="btn-close" aria-label="Close">&times;</button>
          </header>

          <section class="api-keys-section">
            <h3>API Keys</h3>
            <p class="section-info">Configure API keys for fetching historical market data.
               At least one is needed for non-bundled assets.</p>
            ${apiInputs}
          </section>

          <section class="cors-section">
            <h3>CORS Proxy</h3>
            <p class="section-info">Required for fetching data from external APIs in browser.</p>
            <div class="cors-options">
              ${corsOptions}
            </div>
            <div class="custom-url-row" id="custom-url-row" style="display: none;">
              <label>Custom Proxy URL</label>
              <input type="text" id="cors-custom-url" placeholder="https://your-proxy.com/" />
            </div>
          </section>

          <footer>
            <button id="btn-save" class="btn-primary">Save Settings</button>
          </footer>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .settings-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        padding: var(--spacing-lg, 24px);
      }

      .settings-modal {
        background: var(--surface-primary, #ffffff);
        border-radius: var(--radius-lg, 8px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
                    0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      header h2 {
        margin: 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      #btn-close {
        background: transparent;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-secondary, #475569);
        padding: var(--spacing-xs, 4px);
        line-height: 1;
        border-radius: var(--radius-sm, 4px);
      }

      #btn-close:hover {
        background: var(--surface-hover, rgba(0, 0, 0, 0.05));
      }

      section {
        padding: var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      section:last-of-type {
        border-bottom: none;
      }

      h3 {
        margin: 0 0 var(--spacing-xs, 4px) 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .section-info {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .api-provider {
        margin-bottom: var(--spacing-lg, 24px);
      }

      .api-provider:last-child {
        margin-bottom: 0;
      }

      .api-provider > label {
        display: block;
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        margin-bottom: var(--spacing-xs, 4px);
      }

      .api-provider .description {
        margin: 0 0 var(--spacing-sm, 8px) 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .input-row {
        display: flex;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-xs, 4px);
      }

      .input-row input {
        flex: 1;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
      }

      .input-row input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }

      .btn-clear {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        background: var(--surface-primary, #ffffff);
        color: var(--text-secondary, #475569);
        cursor: pointer;
        font-size: var(--font-size-sm, 0.875rem);
      }

      .btn-clear:hover {
        background: var(--surface-hover, #f8fafc);
        border-color: var(--color-error, #ef4444);
        color: var(--color-error, #ef4444);
      }

      .api-provider a {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--color-primary, #0d9488);
        text-decoration: none;
      }

      .api-provider a:hover {
        text-decoration: underline;
      }

      .cors-options {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .radio-option {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
      }

      .radio-option:hover {
        border-color: var(--color-primary, #0d9488);
        background: var(--surface-hover, rgba(13, 148, 136, 0.05));
      }

      .radio-option:has(input:checked) {
        border-color: var(--color-primary, #0d9488);
        background: rgba(13, 148, 136, 0.05);
      }

      .radio-option input[type="radio"] {
        margin-top: 2px;
        accent-color: var(--color-primary, #0d9488);
      }

      .option-name {
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        display: block;
      }

      .option-desc {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        display: block;
      }

      .custom-url-row {
        margin-top: var(--spacing-md, 16px);
      }

      .custom-url-row label {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        margin-bottom: var(--spacing-xs, 4px);
      }

      .custom-url-row input {
        width: 100%;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
        box-sizing: border-box;
      }

      .custom-url-row input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }

      footer {
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        display: flex;
        justify-content: flex-end;
      }

      .btn-primary {
        background: var(--color-primary, #0d9488);
        color: white;
        border: none;
        padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-base, 1rem);
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }

      .btn-primary:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .btn-primary:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      /* Toast styling */
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-radius: var(--radius-md, 6px);
        color: white;
        font-size: var(--font-size-sm, 0.875rem);
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
      }

      .toast.success {
        background: var(--color-success, #10b981);
      }

      .toast.error {
        background: var(--color-error, #ef4444);
      }

      @keyframes slideIn {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
  }

  /**
   * Update overlay visibility based on _visible flag
   */
  private updateVisibility(): void {
    const overlay = this.$('#overlay') as HTMLElement;
    if (overlay) {
      overlay.style.display = this._visible ? 'flex' : 'none';
    }
  }

  /**
   * Load current settings into form inputs
   */
  private async loadCurrentSettings(): Promise<void> {
    const settings = await getSettings();

    // Set API key inputs (show mask if value exists)
    for (const p of API_PROVIDERS) {
      const input = this.$(`#api-${p.source}`) as HTMLInputElement;
      const key = settings.apiKeys[p.source as keyof typeof settings.apiKeys];
      if (input) {
        if (key) {
          input.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'; // Mask existing keys
          input.dataset.hasKey = 'true';
        } else {
          input.value = '';
          input.dataset.hasKey = 'false';
        }
      }
    }

    // Set CORS proxy radio
    const proxyRadio = this.$(`input[name="cors-proxy"][value="${settings.corsProxyType}"]`) as HTMLInputElement;
    if (proxyRadio) proxyRadio.checked = true;

    // Show custom URL if custom selected
    const customRow = this.$('#custom-url-row') as HTMLElement;
    if (customRow) {
      customRow.style.display = settings.corsProxyType === 'custom' ? 'block' : 'none';
    }

    const customUrl = this.$('#cors-custom-url') as HTMLInputElement;
    if (customUrl && settings.corsProxyUrl) {
      customUrl.value = settings.corsProxyUrl;
    }
  }

  protected override afterRender(): void {
    // Close button
    this.$('#btn-close')?.addEventListener('click', () => this.hide());

    // Overlay click to close
    this.$('#overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'overlay') this.hide();
    });

    // Clear buttons
    this.shadow.querySelectorAll('.btn-clear').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const source = (e.target as HTMLElement).dataset.source as ApiSource;
        await clearApiKey(source);
        const input = this.$(`#api-${source}`) as HTMLInputElement;
        if (input) {
          input.value = '';
          input.dataset.hasKey = 'false';
        }
        this.showToast(`${source.toUpperCase()} API key cleared`, 'success');
      });
    });

    // CORS proxy radio change
    this.shadow.querySelectorAll('input[name="cors-proxy"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const customRow = this.$('#custom-url-row') as HTMLElement;
        const selected = (this.$('input[name="cors-proxy"]:checked') as HTMLInputElement)?.value;
        if (customRow) {
          customRow.style.display = selected === 'custom' ? 'block' : 'none';
        }
      });
    });

    // Save button
    this.$('#btn-save')?.addEventListener('click', async () => {
      await this.saveSettings();
      this.showToast('Settings saved', 'success');
      this.hide();
    });

    // Input focus clears mask
    for (const p of API_PROVIDERS) {
      const input = this.$(`#api-${p.source}`) as HTMLInputElement;
      input?.addEventListener('focus', () => {
        if (input.dataset.hasKey === 'true') {
          input.value = '';
        }
      });
    }
  }

  /**
   * Save current form values to settings
   */
  private async saveSettings(): Promise<void> {
    // Save API keys (only if changed from mask)
    for (const p of API_PROVIDERS) {
      const input = this.$(`#api-${p.source}`) as HTMLInputElement;
      if (input && input.value && input.value !== '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022') {
        await setApiKey(p.source, input.value);
      }
    }

    // Save CORS config
    const selectedProxy = (this.$('input[name="cors-proxy"]:checked') as HTMLInputElement)?.value as CorsProxyType;
    const customUrl = (this.$('#cors-custom-url') as HTMLInputElement)?.value;

    await setCorsConfig({
      type: selectedProxy || 'none',
      customUrl: selectedProxy === 'custom' ? customUrl : undefined
    });
  }

  /**
   * Show a toast notification
   */
  private showToast(message: string, type: 'success' | 'error'): void {
    // Remove any existing toast
    const existing = this.$('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.shadow.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => toast.remove(), 3000);
  }
}

// Register custom element
customElements.define('settings-panel', SettingsPanel);
