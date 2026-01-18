import { BaseComponent } from './base-component';
// Import UI components to register them
import './ui';
// Import simulation module
import { runSimulation, SimulationConfig, PortfolioConfig, SimulationOutput, AssetConfig } from '../simulation';
// Import preset service for historical returns
import { getPresetData } from '../data/services/preset-service';
// Import portfolio types
import type { AssetRecord, PortfolioRecord } from '../data/schemas/portfolio';

// UI component types for type casting
type RangeSlider = import('./ui/range-slider').RangeSlider;
type NumberInput = import('./ui/number-input').NumberInput;
type SelectInput = import('./ui/select-input').SelectInput;
type WeightEditor = import('./ui/weight-editor').WeightEditor;

/**
 * Format currency values for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export class AppRoot extends BaseComponent {
  /** Stored simulation result for charts */
  private _simulationResult: SimulationOutput | null = null;

  /** Track if simulation is running */
  private _isRunning = false;
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
              id="weight-editor"
              assets='[{"id":"SPY","name":"S&P 500","weight":60},{"id":"BND","name":"Total Bond","weight":30},{"id":"GLD","name":"Gold","weight":10}]'
            ></weight-editor>
          </param-section>

          <param-section title="Portfolio Management">
            <portfolio-manager id="portfolio-manager"></portfolio-manager>
          </param-section>
        </sidebar-panel>

        <div slot="header" class="header-content">
          <h1>eVelo Portfolio Simulator</h1>
          <button id="btn-settings" class="header-btn" aria-label="Settings" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>

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
              label="Running simulation..."
              class="hidden"
            ></progress-indicator>
          </div>

          <div class="charts-placeholder">
            <p>Charts will appear here after running a simulation.</p>
            <p class="hint">Configure parameters in the sidebar and click "Run Simulation"</p>
          </div>
        </div>
      </main-layout>
      <toast-container position="bottom-right"></toast-container>
      <settings-panel id="settings-panel"></settings-panel>
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

      progress-indicator {
        flex: 1;
        max-width: 300px;
      }

      progress-indicator.hidden {
        display: none;
      }

      .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      .header-content h1 {
        margin: 0;
      }

      .header-btn {
        background: transparent;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: var(--spacing-xs, 4px);
        border-radius: var(--radius-sm, 4px);
        color: var(--text-secondary, #475569);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header-btn:hover {
        background: var(--surface-hover, rgba(0, 0, 0, 0.05));
        color: var(--color-primary, #0d9488);
      }

      .header-btn:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }
    `;
  }

  /**
   * Get the current simulation result (null if no simulation run yet)
   */
  get simulationResult(): SimulationOutput | null {
    return this._simulationResult;
  }

  /**
   * Check if a simulation is currently running
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Collect simulation parameters from UI components
   */
  private collectSimulationParams(): { config: SimulationConfig; portfolio: PortfolioConfig } {
    // Query UI components directly from shadow DOM
    // Portfolio Settings section
    const investmentInput = this.$('number-input') as (NumberInput & { value: number | null }) | null;
    const horizonSlider = this.$('range-slider[suffix=" years"]') as (RangeSlider & { value: number }) | null;
    const iterationsSelect = this.$('select-input') as (SelectInput & { value: string }) | null;
    const weightEditor = this.$('weight-editor') as (WeightEditor & { getWeights(): Record<string, number> }) | null;

    // Extract values with fallbacks
    const initialValue = investmentInput?.value ?? 1000000;
    const timeHorizon = horizonSlider?.value ?? 30;
    const iterations = parseInt(iterationsSelect?.value ?? '10000', 10);

    // Build SimulationConfig
    const config: SimulationConfig = {
      iterations,
      timeHorizon,
      initialValue,
      inflationRate: 0.03,
      inflationAdjusted: false,
      resamplingMethod: 'simple',
      seed: undefined,
    };

    // Build PortfolioConfig from weight-editor assets
    const weights: Record<string, number> = weightEditor?.getWeights() ?? { SPY: 60, BND: 30, GLD: 10 };
    const assets: AssetConfig[] = [];

    for (const [symbol, weightPercent] of Object.entries(weights)) {
      // Get historical returns from preset data
      const preset = getPresetData(symbol);
      let historicalReturns: number[];

      if (preset) {
        // Extract return values from preset data
        historicalReturns = preset.returns.map((r) => r.return);
      } else {
        // Fallback: use placeholder returns with warning
        console.warn(`No preset data for ${symbol}, using placeholder returns`);
        // Generate 20 years of placeholder returns (roughly 8% annual with 15% vol)
        historicalReturns = Array.from({ length: 20 }, () =>
          0.08 + (Math.random() - 0.5) * 0.30
        );
      }

      assets.push({
        id: symbol,
        weight: weightPercent / 100, // Convert percentage to decimal
        historicalReturns,
      });
    }

    // Build identity correlation matrix (diagonal = 1, off-diagonal = 0)
    // Phase 9 can refine this with actual correlations
    const n = assets.length;
    const correlationMatrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );

    const portfolio: PortfolioConfig = {
      assets,
      correlationMatrix,
    };

    return { config, portfolio };
  }

  protected override afterRender(): void {
    const runBtn = this.$('#run-sim') as HTMLButtonElement;
    const progress = this.$('#sim-progress') as HTMLElement;
    const toastContainer = this.$('toast-container') as any;

    // Settings button handler
    const settingsBtn = this.$('#btn-settings');
    const settingsPanel = this.$('#settings-panel') as any;

    settingsBtn?.addEventListener('click', () => {
      settingsPanel?.toggle();
    });

    runBtn?.addEventListener('click', async () => {
      // Prevent double-runs
      if (this._isRunning) {
        return;
      }

      try {
        this._isRunning = true;
        runBtn.disabled = true;

        // Show progress indicator
        if (progress) {
          progress.classList.remove('hidden');
          progress.setAttribute('value', '0');
        }

        // Collect parameters from UI
        const { config, portfolio } = this.collectSimulationParams();

        // Run the real Monte Carlo simulation
        const result = await runSimulation(config, portfolio, (percent) => {
          if (progress) {
            progress.setAttribute('value', String(percent));
          }
        });

        // Store result for charts
        this._simulationResult = result;

        // Hide progress
        if (progress) {
          progress.classList.add('hidden');
        }

        // Show success toast
        if (toastContainer && typeof toastContainer.show === 'function') {
          toastContainer.show(
            `Simulation complete: ${config.iterations.toLocaleString()} iterations, median ${formatCurrency(result.statistics.median)}`,
            'success'
          );
        }

        // Dispatch custom event for other components (e.g., charts)
        this.dispatchEvent(
          new CustomEvent('simulation-complete', {
            detail: { result: this._simulationResult },
            bubbles: true,
            composed: true,
          })
        );
      } catch (error) {
        console.error('Simulation failed:', error);

        // Hide progress on error
        if (progress) {
          progress.classList.add('hidden');
        }

        // Show error toast
        if (toastContainer && typeof toastContainer.show === 'function') {
          toastContainer.show(
            `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'error'
          );
        }
      } finally {
        this._isRunning = false;
        runBtn.disabled = false;
      }
    });

    // Handle request for current portfolio state (from portfolio-manager)
    this.addEventListener('request-portfolio-state', (e: Event) => {
      const weightEditor = this.$('#weight-editor') as (WeightEditor & {
        getWeights(): Record<string, number>;
      }) | null;
      const weights = weightEditor?.getWeights() || {};
      const assets: AssetRecord[] = Object.entries(weights).map(([symbol, weight]) => ({
        id: symbol,
        symbol,
        name: symbol, // Could be enhanced with lookup
        assetClass: 'equity' as const, // Default, can be refined later
        weight: weight / 100 // Convert percent to decimal
      }));
      (e as CustomEvent).detail.assets = assets;
    });

    // Handle portfolio loaded (from portfolio-manager)
    this.addEventListener('portfolio-loaded', (e: Event) => {
      const { portfolio } = (e as CustomEvent).detail as { portfolio: PortfolioRecord };
      const weightEditor = this.$('#weight-editor') as HTMLElement | null;
      if (weightEditor && portfolio.assets) {
        // Transform to weight-editor format
        const assets = portfolio.assets.map((a: AssetRecord) => ({
          id: a.symbol,
          name: a.name,
          weight: a.weight * 100 // Convert decimal to percent
        }));
        weightEditor.setAttribute('assets', JSON.stringify(assets));
      }
    });
  }
}

// Register the custom element
customElements.define('app-root', AppRoot);
