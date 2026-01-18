import { BaseComponent } from './base-component';
// Import UI components to register them
import './ui';

export class AppRoot extends BaseComponent {
  protected template(): string {
    return `
      <main-layout>
        <sidebar-panel slot="sidebar" title="Strategy Parameters">
          <param-section title="Portfolio Settings" open>
            <div class="param-group">
              <label>Initial Investment</label>
              <number-input
                value="1000000"
                min="10000"
                max="100000000"
                step="10000"
                suffix="$"
              ></number-input>
            </div>
            <div class="param-group">
              <label>Time Horizon</label>
              <range-slider
                value="30"
                min="10"
                max="50"
                step="1"
                suffix=" years"
              ></range-slider>
            </div>
            <div class="param-group">
              <label>Simulation Iterations</label>
              <select-input
                value="10000"
                options='[{"value":"1000","label":"1,000 (Fast)"},{"value":"10000","label":"10,000 (Standard)"},{"value":"50000","label":"50,000 (Accurate)"},{"value":"100000","label":"100,000 (High Precision)"}]'
              ></select-input>
            </div>
          </param-section>

          <param-section title="SBLOC Settings">
            <div class="param-group">
              <label>Loan-to-Value Ratio</label>
              <range-slider
                value="50"
                min="10"
                max="70"
                step="5"
                suffix="%"
              ></range-slider>
            </div>
            <div class="param-group">
              <label>Interest Rate</label>
              <range-slider
                value="6.5"
                min="3"
                max="12"
                step="0.25"
                suffix="%"
              ></range-slider>
            </div>
          </param-section>

          <param-section title="Asset Allocation">
            <weight-editor
              assets='[{"id":"SPY","name":"S&P 500","weight":60},{"id":"BND","name":"Total Bond","weight":30},{"id":"GLD","name":"Gold","weight":10}]'
            ></weight-editor>
          </param-section>
        </sidebar-panel>

        <h1 slot="header">eVelo Portfolio Simulator</h1>

        <div class="dashboard">
          <help-section title="What is Buy-Borrow-Die?">
            The Buy-Borrow-Die strategy is a wealth preservation technique where you:
            <ol>
              <li><strong>Buy</strong> appreciating assets (stocks, real estate)</li>
              <li><strong>Borrow</strong> against them via securities-backed lines of credit (SBLOC)</li>
              <li><strong>Die</strong> with stepped-up basis, eliminating capital gains tax</li>
            </ol>
            This simulator models the risks and outcomes of this strategy.
          </help-section>

          <div class="simulation-controls">
            <button class="btn-primary" id="run-sim">Run Simulation</button>
            <progress-indicator
              id="sim-progress"
              value="0"
              max="100"
              style="display: none;"
            ></progress-indicator>
          </div>

          <div class="charts-placeholder">
            <p>Charts will appear here after running a simulation.</p>
            <p class="hint">Configure parameters in the sidebar and click "Run Simulation"</p>
          </div>
        </div>
      </main-layout>
      <toast-container position="bottom-right"></toast-container>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .param-group {
        margin-bottom: var(--spacing-md, 16px);
      }

      .param-group label {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: var(--text-secondary, #475569);
        margin-bottom: var(--spacing-xs, 4px);
      }

      .dashboard {
        max-width: 1200px;
        margin: 0 auto;
      }

      .simulation-controls {
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
        margin: var(--spacing-lg, 24px) 0;
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

      .charts-placeholder {
        background: var(--surface-secondary, #f8fafc);
        border: 2px dashed var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-2xl, 48px);
        text-align: center;
        color: var(--text-secondary, #475569);
      }

      .charts-placeholder .hint {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-tertiary, #94a3b8);
        margin-top: var(--spacing-sm, 8px);
      }
    `;
  }

  protected override afterRender(): void {
    const runBtn = this.$('#run-sim');
    const progress = this.$('#sim-progress') as HTMLElement;
    const toastContainer = this.$('toast-container') as any;

    runBtn?.addEventListener('click', () => {
      // Demo: show progress and toast
      if (progress) {
        progress.style.display = 'flex';
        progress.setAttribute('status', 'Running simulation...');
        let val = 0;
        const interval = setInterval(() => {
          val += 5;
          progress.setAttribute('value', String(val));
          if (val >= 100) {
            clearInterval(interval);
            progress.style.display = 'none';
            if (toastContainer && typeof toastContainer.show === 'function') {
              toastContainer.show('Simulation complete! (Demo)', 'success');
            }
          }
        }, 100);
      }
    });
  }
}

// Register the custom element
customElements.define('app-root', AppRoot);
