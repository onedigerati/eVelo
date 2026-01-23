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

// Import results-dashboard to register it
import './results-dashboard';

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
      this.exitComparisonMode();
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
    return `
      <div class="comparison-container">
        <div class="comparison-header">
          <h2>Comparing Strategies</h2>
          <button class="exit-btn" id="exit-btn">Exit Comparison</button>
        </div>
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
        <div class="delta-summary">
          <!-- Delta indicators for key metrics could go here in future -->
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

      /* Hide comparison on mobile (handled in 16-03) */
      @media (max-width: 768px) {
        .comparison-container {
          display: none;
        }
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

      // Pass data to child dashboards
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
      }
    } else {
      // Single mode - pass data to single dashboard
      const singleDashboard = this.$('#single-dashboard') as any;
      if (singleDashboard && this._currentData) {
        singleDashboard.data = this._currentData;
      }
    }
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
