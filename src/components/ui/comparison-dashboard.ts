/**
 * Comparison Dashboard Component
 *
 * Container for side-by-side comparison of two simulation results on desktop.
 * Falls back to single dashboard when not in comparison mode.
 */

import { BaseComponent } from '../base-component';
import { comparisonState } from '../../services/comparison-state';
import { computeComparisonMetrics } from '../../utils/delta-calculations';
import type { SimulationOutput, SimulationConfig } from '../../simulation/types';

// Import results-dashboard and trade-off-summary to register them
import './results-dashboard';
import './trade-off-summary';

/**
 * Comparison Dashboard - shows side-by-side results or single dashboard
 *
 * Usage:
 * ```html
 * <comparison-dashboard id="comparison"></comparison-dashboard>
 *
 * <script>
 *   const dashboard = document.querySelector('#comparison');
 *
 *   // For comparison mode
 *   dashboard.enterComparisonMode(
 *     previousOutput, currentOutput,
 *     previousConfig, currentConfig,
 *     'Previous', 'Current'
 *   );
 *
 *   // For single mode
 *   dashboard.data = simulationOutput;
 * </script>
 * ```
 */
export class ComparisonDashboard extends BaseComponent {
  /** Whether currently in comparison mode */
  private _isComparisonMode: boolean = false;

  /** Previous simulation data (baseline) */
  private _previousData: SimulationOutput | null = null;

  /** Current simulation data */
  private _currentData: SimulationOutput | null = null;

  /** Previous simulation configuration */
  private _previousConfig: SimulationConfig | null = null;

  /** Current simulation configuration */
  private _currentConfig: SimulationConfig | null = null;

  /** Name/label for previous preset */
  private _previousPresetName: string = '';

  /** Name/label for current preset */
  private _currentPresetName: string = '';

  /** Current active tab for mobile view */
  private _activeTab: 'previous' | 'current' | 'delta' = 'previous';

  /** Portfolio weights for donut chart */
  private _portfolioWeights: { symbol: string; weight: number }[] | null = null;

  /** Correlation matrix for heatmap */
  private _correlationMatrix: { labels: string[]; matrix: number[][] } | null = null;

  /** Initial portfolio value for param summary */
  private _initialValue: number = 1000000;

  /** Simulation configuration for param summary */
  private _simulationConfig: SimulationConfig | null = null;

  connectedCallback(): void {
    super.connectedCallback();

    // Listen for comparison state changes from global state manager
    window.addEventListener('comparison-state-change', this.handleStateChange);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('comparison-state-change', this.handleStateChange);
  }

  /**
   * Handle comparison state changes from global state manager
   */
  private handleStateChange = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const state = customEvent.detail;

    if (state.isComparisonMode && state.previousResult && state.currentResult) {
      this.enterComparisonMode(
        state.previousResult,
        state.currentResult,
        state.previousConfig,
        state.currentConfig,
        state.previousPresetName,
        state.currentPresetName
      );
    } else if (!state.isComparisonMode && state.currentResult) {
      // Only exit comparison mode if we're currently in it (prevents infinite loop)
      if (this._isComparisonMode) {
        this.exitComparisonMode();
      }
      this.data = state.currentResult;
    }
  };

  /**
   * Enter comparison mode with two sets of results
   */
  enterComparisonMode(
    previous: SimulationOutput,
    current: SimulationOutput,
    prevConfig: SimulationConfig,
    currConfig: SimulationConfig,
    prevName: string,
    currName: string
  ): void {
    this._isComparisonMode = true;
    this._previousData = previous;
    this._currentData = current;
    this._previousConfig = prevConfig;
    this._currentConfig = currConfig;
    this._previousPresetName = prevName;
    this._currentPresetName = currName;

    this.render();
  }

  /**
   * Exit comparison mode and return to single dashboard
   */
  exitComparisonMode(): void {
    this._isComparisonMode = false;
    this._previousData = null;
    this._previousConfig = null;
    this._previousPresetName = '';

    // Dispatch event for external listeners
    this.dispatchEvent(
      new CustomEvent('exit-comparison-mode', {
        bubbles: true,
        composed: true,
      })
    );

    this.render();
  }

  /**
   * Set data for single dashboard mode
   */
  set data(value: SimulationOutput | null) {
    if (!this._isComparisonMode) {
      this._currentData = value;
      this.render();
    }
  }

  /**
   * Get current data
   */
  get data(): SimulationOutput | null {
    return this._currentData;
  }

  /**
   * Set portfolio weights for donut chart.
   */
  set portfolioWeights(value: { symbol: string; weight: number }[] | null) {
    this._portfolioWeights = value;
    this.updateChildDashboardPortfolioData();
  }

  /**
   * Get portfolio weights.
   */
  get portfolioWeights(): { symbol: string; weight: number }[] | null {
    return this._portfolioWeights;
  }

  /**
   * Set correlation matrix for heatmap.
   */
  set correlationMatrix(value: { labels: string[]; matrix: number[][] } | null) {
    this._correlationMatrix = value;
    this.updateChildDashboardPortfolioData();
  }

  /**
   * Get correlation matrix.
   */
  get correlationMatrix(): { labels: string[]; matrix: number[][] } | null {
    return this._correlationMatrix;
  }

  /**
   * Set initial portfolio value for param summary.
   */
  set initialValue(value: number) {
    this._initialValue = value;
    this.updateChildDashboardConfigData();
  }

  /**
   * Get initial portfolio value.
   */
  get initialValue(): number {
    return this._initialValue;
  }

  /**
   * Set simulation configuration for param summary.
   */
  set simulationConfig(value: SimulationConfig | null) {
    this._simulationConfig = value;
    this.updateChildDashboardConfigData();
  }

  /**
   * Get simulation configuration.
   */
  get simulationConfig(): SimulationConfig | null {
    return this._simulationConfig;
  }

  /**
   * Set time horizon (forwarded to child dashboards).
   * Note: Also available in simulationConfig.timeHorizon.
   */
  set timeHorizon(value: number) {
    const singleDashboard = this.$('#single-dashboard') as any;
    if (singleDashboard) singleDashboard.timeHorizon = value;
  }

  /**
   * Set annual withdrawal (forwarded to child dashboards).
   * Note: Also available in simulationConfig.sbloc.annualWithdrawal.
   */
  set annualWithdrawal(value: number) {
    const singleDashboard = this.$('#single-dashboard') as any;
    if (singleDashboard) singleDashboard.annualWithdrawal = value;
  }

  /**
   * Set effective tax rate (forwarded to child dashboards).
   */
  set effectiveTaxRate(value: number) {
    const singleDashboard = this.$('#single-dashboard') as any;
    if (singleDashboard) singleDashboard.effectiveTaxRate = value;
  }

  /**
   * Update child dashboards with config data (initialValue and simulationConfig).
   * Called when initialValue or simulationConfig is set.
   */
  private updateChildDashboardConfigData(): void {
    const singleDashboard = this.$('#single-dashboard') as any;
    if (singleDashboard) {
      singleDashboard.initialValue = this._initialValue;
      if (this._simulationConfig) singleDashboard.simulationConfig = this._simulationConfig;
    }
  }

  /**
   * Update child dashboards with portfolio data (weights and correlation matrix).
   * Called when portfolioWeights or correlationMatrix is set.
   */
  private updateChildDashboardPortfolioData(): void {
    // Update single dashboard
    const singleDashboard = this.$('#single-dashboard') as any;
    if (singleDashboard) {
      if (this._portfolioWeights) singleDashboard.portfolioWeights = this._portfolioWeights;
      if (this._correlationMatrix) singleDashboard.correlationMatrix = this._correlationMatrix;
    }

    // Update comparison mode dashboards (desktop)
    const prevDashboard = this.$('#previous-dashboard') as any;
    const currDashboard = this.$('#current-dashboard') as any;
    if (prevDashboard) {
      if (this._portfolioWeights) prevDashboard.portfolioWeights = this._portfolioWeights;
      if (this._correlationMatrix) prevDashboard.correlationMatrix = this._correlationMatrix;
    }
    if (currDashboard) {
      if (this._portfolioWeights) currDashboard.portfolioWeights = this._portfolioWeights;
      if (this._correlationMatrix) currDashboard.correlationMatrix = this._correlationMatrix;
    }

    // Update comparison mode dashboards (mobile)
    const mobilePrevDashboard = this.$('#mobile-previous-dashboard') as any;
    const mobileCurrDashboard = this.$('#mobile-current-dashboard') as any;
    if (mobilePrevDashboard) {
      if (this._portfolioWeights) mobilePrevDashboard.portfolioWeights = this._portfolioWeights;
      if (this._correlationMatrix) mobilePrevDashboard.correlationMatrix = this._correlationMatrix;
    }
    if (mobileCurrDashboard) {
      if (this._portfolioWeights) mobileCurrDashboard.portfolioWeights = this._portfolioWeights;
      if (this._correlationMatrix) mobileCurrDashboard.correlationMatrix = this._correlationMatrix;
    }
  }

  protected template(): string {
    if (this._isComparisonMode && this._previousData && this._currentData) {
      return this.comparisonTemplate();
    } else {
      return this.singleTemplate();
    }
  }

  /**
   * Template for comparison mode (side-by-side)
   */
  private comparisonTemplate(): string {
    const metrics = this._previousData && this._currentData
      ? computeComparisonMetrics(this._previousData, this._currentData)
      : null;

    return `
      <div class="comparison-container">
        <div class="comparison-header">
          <h2>Comparing Strategies</h2>
          <button class="exit-btn" id="exit-btn">Exit Comparison</button>
        </div>

        <!-- Desktop: Side-by-side grid -->
        <div class="comparison-grid">
          <div class="comparison-panel previous-panel">
            <div class="panel-header">
              <span class="panel-label">Previous</span>
              <span class="panel-name">${this.escapeHtml(this._previousPresetName)}</span>
            </div>
            <results-dashboard id="previous-dashboard"></results-dashboard>
          </div>
          <div class="comparison-panel current-panel">
            <div class="panel-header">
              <span class="panel-label">Current</span>
              <span class="panel-name">${this.escapeHtml(this._currentPresetName)}</span>
            </div>
            <results-dashboard id="current-dashboard"></results-dashboard>
          </div>
        </div>

        <!-- Mobile: Tabbed interface -->
        <div class="comparison-tabs" role="tablist" aria-label="Comparison view">
          <button
            role="tab"
            id="tab-previous"
            aria-selected="${this._activeTab === 'previous'}"
            aria-controls="panel-previous"
            tabindex="${this._activeTab === 'previous' ? '0' : '-1'}"
            class="tab-button">
            Previous
            <span class="tab-badge">${this.escapeHtml(this._previousPresetName)}</span>
          </button>
          <button
            role="tab"
            id="tab-current"
            aria-selected="${this._activeTab === 'current'}"
            aria-controls="panel-current"
            tabindex="${this._activeTab === 'current' ? '0' : '-1'}"
            class="tab-button">
            Current
            <span class="tab-badge">${this.escapeHtml(this._currentPresetName)}</span>
          </button>
          <button
            role="tab"
            id="tab-delta"
            aria-selected="${this._activeTab === 'delta'}"
            aria-controls="panel-delta"
            tabindex="${this._activeTab === 'delta' ? '0' : '-1'}"
            class="tab-button">
            Delta
          </button>
        </div>

        <div id="panel-previous" role="tabpanel" aria-labelledby="tab-previous" class="tab-panel" ${this._activeTab !== 'previous' ? 'hidden' : ''}>
          <results-dashboard id="mobile-previous-dashboard"></results-dashboard>
        </div>

        <div id="panel-current" role="tabpanel" aria-labelledby="tab-current" class="tab-panel" ${this._activeTab !== 'current' ? 'hidden' : ''}>
          <results-dashboard id="mobile-current-dashboard"></results-dashboard>
        </div>

        <div id="panel-delta" role="tabpanel" aria-labelledby="tab-delta" class="tab-panel" ${this._activeTab !== 'delta' ? 'hidden' : ''}>
          ${this.deltaTableTemplate(metrics)}
          <trade-off-summary id="trade-off-summary"></trade-off-summary>
        </div>
      </div>
    `;
  }

  /**
   * Template for delta metrics table (mobile delta tab)
   */
  private deltaTableTemplate(metrics: ReturnType<typeof computeComparisonMetrics> | null): string {
    if (!metrics) {
      return '<p class="no-metrics">No comparison metrics available</p>';
    }

    return `
      <div class="delta-table">
        <h3>Key Metric Changes</h3>
        <div class="delta-grid">
          <delta-indicator
            value="${this._currentData!.statistics.median}"
            previous-value="${this._previousData!.statistics.median}"
            format="currency"
            label="Final Value">
          </delta-indicator>

          <delta-indicator
            value="${this._currentData!.statistics.successRate}"
            previous-value="${this._previousData!.statistics.successRate}"
            format="percent"
            label="Success Rate">
          </delta-indicator>

          ${metrics.cagr ? `
            <delta-indicator
              value="${this._currentData!.statistics.cagr || 0}"
              previous-value="${this._previousData!.statistics.cagr || 0}"
              format="percent"
              label="CAGR">
            </delta-indicator>
          ` : ''}

          ${metrics.marginCallProbability ? `
            <delta-indicator
              value="${this._currentData!.marginCallStats?.[this._currentData!.marginCallStats.length - 1]?.cumulativeProbability || 0}"
              previous-value="${this._previousData!.marginCallStats?.[this._previousData!.marginCallStats.length - 1]?.cumulativeProbability || 0}"
              format="percent"
              label="Margin Call Risk">
            </delta-indicator>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Template for single mode (not comparing)
   */
  private singleTemplate(): string {
    return `
      <results-dashboard id="single-dashboard"></results-dashboard>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        max-width: 100%;
      }

      /* Shadow DOM reset - global box-sizing doesn't penetrate */
      *, *::before, *::after {
        box-sizing: border-box;
      }

      /* Comparison mode styles */
      .comparison-container {
        display: block;
      }

      .comparison-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--spacing-lg, 24px);
        padding-bottom: var(--spacing-md, 16px);
        border-bottom: 2px solid var(--color-primary, #0d9488);
      }

      .comparison-header h2 {
        margin: 0;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .exit-btn {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: transparent;
        border: 2px solid var(--color-primary, #0d9488);
        border-radius: var(--radius-md, 6px);
        color: var(--color-primary, #0d9488);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .exit-btn:hover {
        background: var(--color-primary, #0d9488);
        color: white;
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-lg, 24px);
      }

      .comparison-panel {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-md, 16px);
      }

      .previous-panel {
        border-left: 3px solid #8b5cf6;
      }

      .current-panel {
        border-left: 3px solid #0d9488;
      }

      .panel-header {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-sm, 8px);
        padding-bottom: var(--spacing-md, 16px);
        margin-bottom: var(--spacing-md, 16px);
        border-bottom: 2px solid var(--color-primary, #0d9488);
      }

      .panel-label {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: var(--text-secondary, #475569);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .panel-name {
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .delta-summary {
        margin-top: var(--spacing-lg, 24px);
        padding: var(--spacing-md, 16px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
      }

      /* Mobile tabs - hidden on desktop */
      .comparison-tabs {
        display: none;
      }

      .tab-panel {
        display: block;
      }

      .tab-panel[hidden] {
        display: none;
      }

      /* Mobile responsive styles */
      @media (max-width: 768px) {
        /* Hide desktop grid on mobile */
        .comparison-grid {
          display: none;
        }

        /* Show tabs on mobile */
        .comparison-tabs {
          display: flex;
          border-bottom: 2px solid var(--border-color, #e5e7eb);
          margin-bottom: var(--spacing-md, 16px);
        }

        .tab-button {
          flex: 1;
          padding: 12px 8px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: var(--font-size-sm, 0.875rem);
          color: var(--text-secondary, #64748b);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .tab-button[aria-selected="true"] {
          border-bottom-color: var(--color-primary, #0d9488);
          color: var(--color-primary, #0d9488);
          font-weight: 600;
        }

        .tab-button:hover {
          background: var(--surface-secondary, #f8fafc);
        }

        .tab-badge {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--text-tertiary, #94a3b8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .tab-button[aria-selected="true"] .tab-badge {
          color: var(--color-primary, #0d9488);
          font-weight: 500;
        }

        /* Tab panels */
        .tab-panel {
          padding-top: var(--spacing-sm, 8px);
        }
      }

      /* Delta table styles */
      .delta-table {
        margin-bottom: var(--spacing-lg, 24px);
        padding: var(--spacing-md, 16px);
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: var(--radius-md, 6px);
      }

      .delta-table h3 {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .delta-grid {
        display: grid;
        gap: var(--spacing-sm, 8px);
      }

      .no-metrics {
        color: var(--text-secondary, #64748b);
        font-style: italic;
        text-align: center;
        padding: var(--spacing-lg, 24px);
      }

      /* Single mode styles */
      #single-dashboard {
        display: block;
      }
    `;
  }

  protected override afterRender(): void {
    if (this._isComparisonMode && this._previousData && this._currentData) {
      // Wire exit button
      const exitBtn = this.$('#exit-btn') as HTMLButtonElement | null;
      if (exitBtn) {
        exitBtn.addEventListener('click', () => this.exitComparisonMode());
      }

      // Pass data to desktop child dashboards
      const prevDashboard = this.$('#previous-dashboard') as any;
      const currDashboard = this.$('#current-dashboard') as any;

      if (prevDashboard && this._previousData) {
        prevDashboard.data = this._previousData;
        if (this._previousConfig) {
          prevDashboard.simulationConfig = this._previousConfig;
          prevDashboard.initialValue = this._previousConfig.initialValue;
          prevDashboard.timeHorizon = this._previousConfig.timeHorizon;
          if (this._previousConfig.sbloc) {
            prevDashboard.annualWithdrawal = this._previousConfig.sbloc.annualWithdrawal;
          }
        }
        // Pass portfolio data for visualization
        if (this._portfolioWeights) prevDashboard.portfolioWeights = this._portfolioWeights;
        if (this._correlationMatrix) prevDashboard.correlationMatrix = this._correlationMatrix;
      }

      if (currDashboard && this._currentData) {
        currDashboard.data = this._currentData;
        if (this._currentConfig) {
          currDashboard.simulationConfig = this._currentConfig;
          currDashboard.initialValue = this._currentConfig.initialValue;
          currDashboard.timeHorizon = this._currentConfig.timeHorizon;
          if (this._currentConfig.sbloc) {
            currDashboard.annualWithdrawal = this._currentConfig.sbloc.annualWithdrawal;
          }
        }
        // Pass portfolio data for visualization
        if (this._portfolioWeights) currDashboard.portfolioWeights = this._portfolioWeights;
        if (this._correlationMatrix) currDashboard.correlationMatrix = this._correlationMatrix;
      }

      // Pass data to mobile child dashboards
      const mobilePrevDashboard = this.$('#mobile-previous-dashboard') as any;
      const mobileCurrDashboard = this.$('#mobile-current-dashboard') as any;

      if (mobilePrevDashboard && this._previousData) {
        mobilePrevDashboard.data = this._previousData;
        if (this._previousConfig) {
          mobilePrevDashboard.simulationConfig = this._previousConfig;
          mobilePrevDashboard.initialValue = this._previousConfig.initialValue;
          mobilePrevDashboard.timeHorizon = this._previousConfig.timeHorizon;
          if (this._previousConfig.sbloc) {
            mobilePrevDashboard.annualWithdrawal = this._previousConfig.sbloc.annualWithdrawal;
          }
        }
        // Pass portfolio data for visualization
        if (this._portfolioWeights) mobilePrevDashboard.portfolioWeights = this._portfolioWeights;
        if (this._correlationMatrix) mobilePrevDashboard.correlationMatrix = this._correlationMatrix;
      }

      if (mobileCurrDashboard && this._currentData) {
        mobileCurrDashboard.data = this._currentData;
        if (this._currentConfig) {
          mobileCurrDashboard.simulationConfig = this._currentConfig;
          mobileCurrDashboard.initialValue = this._currentConfig.initialValue;
          mobileCurrDashboard.timeHorizon = this._currentConfig.timeHorizon;
          if (this._currentConfig.sbloc) {
            mobileCurrDashboard.annualWithdrawal = this._currentConfig.sbloc.annualWithdrawal;
          }
        }
        // Pass portfolio data for visualization
        if (this._portfolioWeights) mobileCurrDashboard.portfolioWeights = this._portfolioWeights;
        if (this._correlationMatrix) mobileCurrDashboard.correlationMatrix = this._correlationMatrix;
      }

      // Wire up tab navigation (mobile)
      this.setupTabNavigation();

      // Update trade-off summary
      const tradeOffSummary = this.$('#trade-off-summary') as any;
      if (tradeOffSummary && this._previousData && this._currentData) {
        const metrics = computeComparisonMetrics(this._previousData, this._currentData);
        tradeOffSummary.metrics = metrics;
        tradeOffSummary.previousName = this._previousPresetName;
        tradeOffSummary.currentName = this._currentPresetName;
      }
    } else {
      // Single mode - pass data to single dashboard
      const singleDashboard = this.$('#single-dashboard') as any;
      if (singleDashboard && this._currentData) {
        singleDashboard.data = this._currentData;
        // Pass portfolio data for visualization
        if (this._portfolioWeights) singleDashboard.portfolioWeights = this._portfolioWeights;
        if (this._correlationMatrix) singleDashboard.correlationMatrix = this._correlationMatrix;
        // Pass config data for param summary
        singleDashboard.initialValue = this._initialValue;
        if (this._simulationConfig) singleDashboard.simulationConfig = this._simulationConfig;
      }
    }
  }

  /**
   * Setup keyboard navigation and click handlers for mobile tabs
   */
  private setupTabNavigation(): void {
    const tabs = this.$$('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    if (tabs.length === 0) return;

    // Click handlers
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabId = tab.id.replace('tab-', '') as 'previous' | 'current' | 'delta';
        this.activateTab(tabId);
      });
    });

    // Keyboard navigation
    tabs.forEach((tab, index) => {
      tab.addEventListener('keydown', (e) => {
        let targetIndex: number | null = null;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          targetIndex = (index + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          targetIndex = (index - 1 + tabs.length) % tabs.length;
        }

        if (targetIndex !== null) {
          const targetTab = tabs[targetIndex];
          const tabId = targetTab.id.replace('tab-', '') as 'previous' | 'current' | 'delta';
          this.activateTab(tabId);
          targetTab.focus();
        }
      });
    });
  }

  /**
   * Activate a specific tab
   */
  private activateTab(tabId: 'previous' | 'current' | 'delta'): void {
    this._activeTab = tabId;

    // Update tab buttons
    const tabs = this.$$('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    tabs.forEach((tab) => {
      const isActive = tab.id === `tab-${tabId}`;
      tab.setAttribute('aria-selected', isActive.toString());
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Update panels
    const panels = this.$$('[role="tabpanel"]') as NodeListOf<HTMLElement>;
    panels.forEach((panel) => {
      const isActive = panel.id === `panel-${tabId}`;
      if (isActive) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });
  }

  /**
   * Escape HTML to prevent XSS in preset names
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('comparison-dashboard', ComparisonDashboard);
