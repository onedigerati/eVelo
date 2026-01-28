import { BaseComponent } from './base-component';
// Import UI components to register them
import './ui';
// Import simulation module
import { runSimulation, SimulationConfig, PortfolioConfig, SimulationOutput, AssetConfig } from '../simulation';
// Import preset service for historical returns
import { getPresetData } from '../data/services/preset-service';
// Import correlation calculation
import { correlationMatrix as calcCorrelationMatrix } from '../math/correlation';
// Import portfolio composition types
import type { PortfolioComposition } from './ui/portfolio-composition';
// Import portfolio types
import type { AssetRecord, PortfolioRecord } from '../data/schemas/portfolio';
// Import comparison dashboard
import type { ComparisonDashboard } from './ui/comparison-dashboard';

// UI component types for type casting
type RangeSlider = import('./ui/range-slider').RangeSlider;
type NumberInput = import('./ui/number-input').NumberInput;
type SelectInput = import('./ui/select-input').SelectInput;
type CheckboxInput = import('./ui/checkbox-input').CheckboxInput;

// Import additional types from simulation
import type {
  SBLOCSimConfig,
  TimelineConfig,
  WithdrawalChaptersConfig,
  TaxModelingConfig,
  RegimeCalibrationMode,
} from '../simulation/types';

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

  /** Track regime calibration mode */
  private _regimeCalibration: RegimeCalibrationMode = 'conservative';

  protected template(): string {
    const currentYear = new Date().getFullYear();
    return `
      <main-layout>
        <sidebar-panel slot="sidebar" title="Strategy Parameters">
          <param-section title="Your Portfolio" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12V7H5a2 2 0 0 1 0-4h14v4'/><path d='M3 5v14a2 2 0 0 0 2 2h16v-5'/><path d='M18 12a2 2 0 0 0 0 4h4v-4Z'/></svg>" open>
            <div class="param-group">
              <label>Initial Investment</label>
              <number-input
                id="initial-investment"
                value="5000000"
                min="10000"
                max="100000000"
                step="10000"
                suffix="$"
              ></number-input>
            </div>
            <portfolio-composition id="portfolio-composition"></portfolio-composition>
            <div class="param-group">
              <label>Initial LOC Balance</label>
              <number-input
                id="initial-loc-balance"
                value="0"
                min="0"
                max="50000000"
                step="1000"
                suffix="$"
              ></number-input>
              <span class="help-text">Leave at 0 if starting fresh</span>
            </div>
          </param-section>

          <param-section title="Your Spending Needs" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='6' width='20' height='12' rx='2'/><circle cx='12' cy='12' r='2'/><path d='M6 12h.01M18 12h.01'/></svg>" open>
            <div class="param-group">
              <label>
                Annual Cash Need ($)
                <help-tooltip content="Tax-free income from borrowing against your portfolio. Unlike selling, this doesn't trigger capital gains taxes."></help-tooltip>
              </label>
              <number-input
                id="annual-withdrawal"
                value="200000"
                min="0"
                max="10000000"
                step="5000"
                suffix="$"
              ></number-input>
            </div>
            <div class="param-group">
              <label>Annual Increase (%)</label>
              <range-slider
                id="annual-raise"
                value="3"
                min="0"
                max="10"
                step="0.5"
                suffix="%"
              ></range-slider>
            </div>
            <div class="param-group">
              <checkbox-input
                id="monthly-withdrawal"
                label="Withdraw Monthly (Equal Amounts)"
                checked
              ></checkbox-input>
            </div>
          </param-section>

          <param-section title="Time Horizon" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='2'/><path d='M16 2v4M8 2v4M3 10h18'/></svg>" open>
            <div class="param-group">
              <label>Strategy Start Year</label>
              <number-input
                id="start-year"
                value="${currentYear}"
                min="2000"
                max="2100"
                step="1"
              ></number-input>
            </div>
            <div class="param-group">
              <label>First Withdrawal Year</label>
              <number-input
                id="withdrawal-start-year"
                value="${currentYear}"
                min="2000"
                max="2100"
                step="1"
              ></number-input>
            </div>
            <div class="param-group">
              <label>
                Period (Years)
                <help-tooltip content="Investment period in years. Longer horizons typically show more benefit from the Buy-Borrow-Die strategy."></help-tooltip>
              </label>
              <range-slider
                id="time-horizon"
                value="15"
                min="5"
                max="50"
                step="1"
                suffix=" years"
              ></range-slider>
            </div>
          </param-section>

          <param-section title="Line of Credit Terms" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'/><path d='m9 12 2 2 4-4'/></svg>" open>
            <div class="param-group">
              <label>
                Annual Interest Rate (%)
                <help-tooltip content="Annual interest rate charged on your securities-backed line of credit. Typically SOFR + 1-3%."></help-tooltip>
              </label>
              <range-slider
                id="sbloc-rate"
                value="7"
                min="3"
                max="15"
                step="0.25"
                suffix="%"
              ></range-slider>
            </div>
            <div class="param-group">
              <label>
                Max LTV / Hard Margin (%)
                <help-tooltip content="Loan-to-Value ratio. Maximum percentage of your portfolio value you can borrow. Lower LTV = more conservative."></help-tooltip>
              </label>
              <range-slider
                id="max-borrowing"
                value="65"
                min="30"
                max="80"
                step="5"
                suffix="%"
              ></range-slider>
              <span class="help-text">Portfolio liquidated if LTV exceeds this threshold</span>
            </div>
            <div class="param-group">
              <label>
                Warning Zone LTV (%)
                <help-tooltip content="LTV threshold that triggers a margin call. If your loan exceeds this ratio of portfolio value, you must repay or liquidate."></help-tooltip>
              </label>
              <range-slider
                id="maintenance-margin"
                value="50"
                min="20"
                max="70"
                step="5"
                suffix="%"
              ></range-slider>
              <span class="help-text">Warning zone - between this and max borrowing</span>
            </div>
            <div class="param-group">
              <label>Forced Liquidation Haircut (%)</label>
              <range-slider
                id="liquidation-haircut"
                value="5"
                min="0"
                max="20"
                step="1"
                suffix="%"
              ></range-slider>
              <span class="help-text">Market impact + transaction costs on forced sale</span>
            </div>
          </param-section>

          <div class="section-divider">
            <span>Advanced Options</span>
          </div>

          <param-section title="Simulation Settings" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'/></svg>">
            <div class="param-group">
              <label>
                Simulation Iterations
                <help-tooltip content="Number of Monte Carlo scenarios to simulate. More iterations = more accurate results but slower computation."></help-tooltip>
              </label>
              <select-input
                id="num-simulations"
                value="10000"
                options='[{"value":"1000","label":"1,000 (Fast)"},{"value":"5000","label":"5,000 (Quick)"},{"value":"10000","label":"10,000 (Precise)"},{"value":"50000","label":"50,000 (Accurate)"},{"value":"100000","label":"100,000 (High Precision)"}]'
              ></select-input>
            </div>
            <div class="param-group">
              <label>Expected Annual Inflation (%)</label>
              <range-slider
                id="inflation-rate"
                value="2.5"
                min="0"
                max="8"
                step="0.5"
                suffix="%"
              ></range-slider>
              <span class="help-text">Used to calculate real (inflation-adjusted) returns</span>
            </div>
            <div class="param-group">
              <label>Return Distribution Model</label>
              <select-input
                id="return-model"
                value="regime"
                options='[{"value":"bootstrap","label":"Bootstrap Resampling"},{"value":"regime","label":"Regime-Switching (Bull/Bear)"}]'
              ></select-input>
              <span class="help-text">How to model market returns and volatility</span>
            </div>
            <div class="param-group regime-calibration-group visible" id="regime-calibration-group">
              <label>Regime Calibration</label>
              <div class="toggle-group">
                <button type="button" class="toggle-btn" id="regime-historical">Historical</button>
                <button type="button" class="toggle-btn active" id="regime-conservative">Conservative</button>
              </div>
              <span class="help-text" id="regime-help-text">Stress-testing with extended crash durations</span>
            </div>
          </param-section>

          <param-section title="Withdrawal Chapters (Optional)" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='8' y='2' width='8' height='4' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg>">
            <div class="param-group">
              <checkbox-input
                id="enable-chapters"
                label="Enable Multi-Phase Withdrawal Strategy"
              ></checkbox-input>
            </div>
            <div class="chapters-config" id="chapters-config">
              <div class="chapter-group">
                <span class="chapter-label">Chapter 2</span>
                <div class="param-group">
                  <label>Years After Start</label>
                  <number-input
                    id="chapter2-years"
                    value="10"
                    min="1"
                    max="40"
                    step="1"
                  ></number-input>
                </div>
                <div class="param-group">
                  <label>Reduction %</label>
                  <range-slider
                    id="chapter2-reduction"
                    value="20"
                    min="-50"
                    max="80"
                    step="5"
                    suffix="%"
                  ></range-slider>
                  <span class="help-text">Positive = reduce spending, negative = increase</span>
                </div>
              </div>
              <div class="chapter-group">
                <span class="chapter-label">Chapter 3</span>
                <div class="param-group">
                  <label>Years After Chapter 2</label>
                  <number-input
                    id="chapter3-years"
                    value="10"
                    min="1"
                    max="40"
                    step="1"
                  ></number-input>
                </div>
                <div class="param-group">
                  <label>Reduction %</label>
                  <range-slider
                    id="chapter3-reduction"
                    value="30"
                    min="-50"
                    max="80"
                    step="5"
                    suffix="%"
                  ></range-slider>
                </div>
              </div>
            </div>
          </param-section>

          <param-section title="Tax Modeling (Optional)" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z'/><path d='M14 8H8'/><path d='M16 12H8'/><path d='M13 16H8'/></svg>">
            <div class="param-group">
              <checkbox-input
                id="enable-tax-modeling"
                label="Enable Dividend Tax & Capital Gains Tax Modeling"
              ></checkbox-input>
            </div>
            <div class="tax-config" id="tax-config">
              <div class="param-group">
                <checkbox-input
                  id="tax-advantaged"
                  label="Portfolio in Tax-Advantaged Account (No Taxes)"
                ></checkbox-input>
              </div>
              <div class="tax-rates-group" id="tax-rates-group">
                <div class="param-group">
                  <label>Average Dividend Yield (%)</label>
                  <range-slider
                    id="dividend-yield"
                    value="0.5"
                    min="0"
                    max="5"
                    step="0.1"
                    suffix="%"
                  ></range-slider>
                  <span class="help-text">Approximate dividend yield of portfolio</span>
                </div>
                <div class="param-group">
                  <label>Ordinary Income Tax Rate (%)</label>
                  <range-slider
                    id="ordinary-tax-rate"
                    value="37"
                    min="0"
                    max="50"
                    step="1"
                    suffix="%"
                  ></range-slider>
                  <span class="help-text">Top federal + state tax rate on dividends</span>
                </div>
                <div class="param-group">
                  <label>Long-Term Capital Gains Tax Rate (%)</label>
                  <range-slider
                    id="ltcg-tax-rate"
                    value="23.8"
                    min="0"
                    max="40"
                    step="0.1"
                    suffix="%"
                  ></range-slider>
                  <span class="help-text">Federal LTCG (20%) + NIIT (3.8%)</span>
                </div>
              </div>
            </div>
          </param-section>

          <param-section title="Sell Strategy Comparison" icon="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 3v18h18'/><path d='M18 17V9'/><path d='M13 17V5'/><path d='M8 17v-3'/></svg>" open>
            <div class="param-group">
              <label>
                Cost Basis Ratio (%)
                <help-tooltip content="What fraction of your portfolio is original cost (basis) vs gains. 40% means 60% embedded gains. Affects capital gains taxes when selling."></help-tooltip>
              </label>
              <range-slider
                id="sell-cost-basis-ratio"
                value="40"
                min="5"
                max="95"
                step="5"
                suffix="%"
              ></range-slider>
              <span class="help-text">Lower ratio = more embedded gains = higher taxes on sale</span>
            </div>
            <div class="param-group">
              <label>
                Dividend Yield (%)
                <help-tooltip content="Annual dividend yield of your portfolio. S&P 500 averages 1.5-2%. Growth portfolios may be lower, income portfolios higher."></help-tooltip>
              </label>
              <range-slider
                id="sell-dividend-yield"
                value="2"
                min="0"
                max="10"
                step="0.5"
                suffix="%"
              ></range-slider>
              <span class="help-text">Higher yield = more dividend taxes in Sell strategy</span>
            </div>
          </param-section>

          <div slot="footer" class="simulation-controls">
            <button class="btn-primary" id="run-sim">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run Monte Carlo Simulation
            </button>
            <progress-indicator
              id="sim-progress"
              value="0"
              label="Running simulation..."
              class="hidden"
            ></progress-indicator>
          </div>
        </sidebar-panel>

        <app-header slot="header">
          <div slot="actions" class="header-buttons">
            <button id="btn-guide" class="header-btn" aria-label="User Guide" title="User Guide">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>
            <button id="btn-settings" class="header-btn" aria-label="Settings" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <!-- Center circle -->
                <circle cx="12" cy="12" r="3"></circle>
                <!-- 8 radial dots -->
                <circle cx="12" cy="3" r="1.5"></circle>
                <circle cx="18.36" cy="5.64" r="1.5"></circle>
                <circle cx="21" cy="12" r="1.5"></circle>
                <circle cx="18.36" cy="18.36" r="1.5"></circle>
                <circle cx="12" cy="21" r="1.5"></circle>
                <circle cx="5.64" cy="18.36" r="1.5"></circle>
                <circle cx="3" cy="12" r="1.5"></circle>
                <circle cx="5.64" cy="5.64" r="1.5"></circle>
              </svg>
            </button>
          </div>
        </app-header>

        <div class="dashboard">
          <welcome-screen id="welcome"></welcome-screen>
<!-- Hide inline BBD help when welcome screen is visible 
          <help-section class="bbd-inline-help" title="What is Buy-Borrow-Die?">
            The Buy-Borrow-Die strategy is a wealth preservation technique where you:
            <ol>
              <li><strong>Buy</strong> appreciating assets (stocks, real estate)</li>
              <li><strong>Borrow</strong> against them via securities-backed lines of credit (SBLOC)</li>
              <li><strong>Die</strong> with stepped-up basis, eliminating capital gains tax</li>
            </ol>
            This simulator models the risks and outcomes of this strategy.
          </help-section>
-->
          <comparison-dashboard id="results"></comparison-dashboard>
        </div>
      </main-layout>
      <toast-container position="bottom-right"></toast-container>
      <settings-panel id="settings-panel"></settings-panel>
      <user-guide-modal id="user-guide"></user-guide-modal>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .param-group {
        margin-bottom: var(--spacing-lg, 24px);
      }

      .param-group:last-child {
        margin-bottom: 0;
      }

      .param-group label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        margin-bottom: var(--spacing-sm, 8px);
      }

      .param-group .help-text {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        margin-top: var(--spacing-sm, 8px);
        font-style: italic;
        line-height: 1.4;
      }

      .dashboard {
        max-width: 1200px;
        margin: 0 auto;
      }

      /* Section Divider for Advanced Options */
      .section-divider {
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-lg, 24px) var(--spacing-md, 16px);
        color: var(--text-secondary, #64748b);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .section-divider::before,
      .section-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border-color, #e2e8f0);
      }

      .simulation-controls {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .btn-primary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm, 8px);
        background: var(--color-primary, #0d9488);
        color: white;
        border: none;
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
        width: 100%;
        /* Touch optimization */
        min-height: 48px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: rgba(13, 148, 136, 0.2);
      }

      /* Mobile touch target enhancement */
      @media (max-width: 768px) {
        .btn-primary {
          min-height: 52px;
          font-size: var(--font-size-base, 1rem);
        }
      }

      .btn-primary:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .btn-primary:active {
        transform: scale(0.98);
      }

      .btn-primary:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      .btn-primary .btn-icon {
        flex-shrink: 0;
      }

      progress-indicator {
        width: 100%;
      }

      progress-indicator.hidden {
        display: none;
      }

      .header-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        font-size: 1.5rem;
        cursor: pointer;
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 50%;
        color: var(--text-inverse, #ffffff);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, border-color 0.2s;
      }

      .header-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
      }

      .header-btn:focus-visible {
        outline: 2px solid var(--text-inverse, #ffffff);
        outline-offset: 2px;
      }

      /* Header buttons container */
      .header-buttons {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      /* Welcome screen visibility */
      welcome-screen {
        display: block;
      }

      welcome-screen.hidden {
        display: none;
      }

      /* Hide inline BBD help when welcome is visible */
      .bbd-inline-help {
        display: none;
      }

      /* Show inline help only when welcome is hidden */
      welcome-screen.hidden ~ .bbd-inline-help {
        display: block;
      }

      /* Toggle Group for Regime Calibration */
      .toggle-group {
        display: flex;
        gap: 0;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        overflow: hidden;
        background: var(--surface-secondary, #f8fafc);
      }

      .toggle-btn {
        flex: 1;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: none;
        background: transparent;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: var(--text-secondary, #64748b);
        cursor: pointer;
        transition: all 0.2s;
      }

      .toggle-btn:not(:last-child) {
        border-right: 1px solid var(--border-color, #e2e8f0);
      }

      .toggle-btn.active {
        background: var(--color-primary, #0d9488);
        color: white;
      }

      .toggle-btn:hover:not(.active) {
        background: var(--surface-tertiary, #e2e8f0);
      }

      /* Regime Calibration Group - conditionally shown */
      .regime-calibration-group {
        display: none;
      }

      .regime-calibration-group.visible {
        display: block;
      }

      /* Chapters Configuration */
      .chapters-config {
        display: none;
        margin-top: var(--spacing-lg, 24px);
        padding: var(--spacing-lg, 24px);
        background: var(--surface-primary, #ffffff);
        border-radius: var(--border-radius-md, 8px);
        border: 1px solid var(--border-color, #e2e8f0);
      }

      .chapters-config.visible {
        display: block;
      }

      .chapter-group {
        margin-bottom: var(--spacing-xl, 32px);
        padding-bottom: var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      .chapter-group:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }

      .chapter-label {
        display: block;
        font-weight: 700;
        color: var(--color-primary, #0d9488);
        margin-bottom: var(--spacing-md, 16px);
        font-size: var(--font-size-sm, 0.875rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* Tax Configuration */
      .tax-config {
        display: none;
        margin-top: var(--spacing-lg, 24px);
      }

      .tax-config.visible {
        display: block;
      }

      .tax-rates-group {
        padding: var(--spacing-lg, 24px);
        background: var(--surface-primary, #ffffff);
        border-radius: var(--border-radius-md, 8px);
        border: 1px solid var(--border-color, #e2e8f0);
        margin-top: var(--spacing-md, 16px);
      }

      .tax-rates-group.hidden {
        display: none;
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

  /** Helper to get value from a UI component by ID */
  private getNumberInputValue(id: string, fallback: number): number {
    const el = this.$(`#${id}`) as (NumberInput & { value: number | null }) | null;
    return el?.value ?? fallback;
  }

  private getRangeSliderValue(id: string, fallback: number): number {
    const el = this.$(`#${id}`) as (RangeSlider & { value: number }) | null;
    return el?.value ?? fallback;
  }

  private getSelectInputValue(id: string, fallback: string): string {
    const el = this.$(`#${id}`) as (SelectInput & { value: string }) | null;
    return el?.value ?? fallback;
  }

  private getCheckboxValue(id: string, fallback: boolean): boolean {
    const el = this.$(`#${id}`) as (CheckboxInput & { checked: boolean }) | null;
    return el?.checked ?? fallback;
  }

  /**
   * Get all simulation parameters for saving to portfolio presets
   * Returns params in 0-1 scale (NOT percentages) to match storage convention
   */
  public getSimulationParams(): Partial<PortfolioRecord> {
    // Portfolio & Timeline
    const initialValue = this.getNumberInputValue('initial-investment', 5000000);
    const initialLocBalance = this.getNumberInputValue('initial-loc-balance', 0);
    const currentYear = new Date().getFullYear();
    const startYear = this.getNumberInputValue('start-year', currentYear);
    const withdrawalStartYear = this.getNumberInputValue('withdrawal-start-year', currentYear);
    const timeHorizon = this.getRangeSliderValue('time-horizon', 15);

    // Withdrawal Strategy
    const annualWithdrawal = this.getNumberInputValue('annual-withdrawal', 200000);
    const annualRaise = this.getRangeSliderValue('annual-raise', 3) / 100; // Convert to 0-1
    const monthlyWithdrawal = this.getCheckboxValue('monthly-withdrawal', true);

    // SBLOC Terms (convert from % to 0-1 scale)
    const sblocRate = this.getRangeSliderValue('sbloc-rate', 7) / 100;
    const maxBorrowing = this.getRangeSliderValue('max-borrowing', 65) / 100;
    const maintenanceMargin = this.getRangeSliderValue('maintenance-margin', 50) / 100;
    const liquidationHaircut = this.getRangeSliderValue('liquidation-haircut', 5) / 100;

    // Simulation Settings
    const iterations = parseInt(this.getSelectInputValue('num-simulations', '10000'), 10);
    const inflationRate = this.getRangeSliderValue('inflation-rate', 2.5) / 100;
    const returnModel = this.getSelectInputValue('return-model', 'bootstrap') as 'bootstrap' | 'regime';
    const regimeCalibration = this._regimeCalibration;

    // Withdrawal Chapters
    const enableChapters = this.getCheckboxValue('enable-chapters', false);
    const withdrawalChapters = enableChapters ? {
      enabled: true,
      chapter2: {
        yearsAfterStart: this.getNumberInputValue('chapter2-years', 10),
        reductionPercent: this.getRangeSliderValue('chapter2-reduction', 20),
      },
      chapter3: {
        yearsAfterStart: this.getNumberInputValue('chapter3-years', 10),
        reductionPercent: this.getRangeSliderValue('chapter3-reduction', 30),
      },
    } : { enabled: false };

    // Tax Modeling
    const enableTaxModeling = this.getCheckboxValue('enable-tax-modeling', false);
    const taxAdvantaged = this.getCheckboxValue('tax-advantaged', false);
    const taxModeling = {
      enabled: enableTaxModeling,
      taxAdvantaged,
      dividendYield: enableTaxModeling && !taxAdvantaged ? this.getRangeSliderValue('dividend-yield', 0.5) / 100 : 0,
      ordinaryTaxRate: enableTaxModeling && !taxAdvantaged ? this.getRangeSliderValue('ordinary-tax-rate', 37) / 100 : 0,
      ltcgTaxRate: enableTaxModeling && !taxAdvantaged ? this.getRangeSliderValue('ltcg-tax-rate', 23.8) / 100 : 0,
    };

    return {
      initialValue,
      initialLocBalance,
      startYear,
      withdrawalStartYear,
      timeHorizon,
      annualWithdrawal,
      annualRaise,
      monthlyWithdrawal,
      sblocRate,
      maxBorrowing,
      maintenanceMargin,
      liquidationHaircut,
      iterations,
      inflationRate,
      returnModel,
      regimeCalibration,
      withdrawalChapters,
      taxModeling,
    };
  }

  /**
   * Set simulation parameters from saved portfolio preset
   * Converts from 0-1 scale to percentages (0-100) for UI sliders
   */
  public setSimulationParams(params: Partial<PortfolioRecord>): void {
    // Portfolio & Timeline
    if (params.initialValue !== undefined) {
      const el = this.$('#initial-investment') as NumberInput;
      if (el) el.value = params.initialValue;
    }
    if (params.initialLocBalance !== undefined) {
      const el = this.$('#initial-loc-balance') as NumberInput;
      if (el) el.value = params.initialLocBalance;
    }
    if (params.startYear !== undefined) {
      const el = this.$('#start-year') as NumberInput;
      if (el) el.value = params.startYear;
    }
    if (params.withdrawalStartYear !== undefined) {
      const el = this.$('#withdrawal-start-year') as NumberInput;
      if (el) el.value = params.withdrawalStartYear;
    }
    if (params.timeHorizon !== undefined) {
      const el = this.$('#time-horizon') as RangeSlider;
      if (el) el.value = params.timeHorizon;
    }

    // Withdrawal Strategy
    if (params.annualWithdrawal !== undefined) {
      const el = this.$('#annual-withdrawal') as NumberInput;
      if (el) el.value = params.annualWithdrawal;
    }
    if (params.annualRaise !== undefined) {
      const el = this.$('#annual-raise') as RangeSlider;
      if (el) el.value = params.annualRaise * 100; // Convert 0-1 to 0-100
    }
    if (params.monthlyWithdrawal !== undefined) {
      const el = this.$('#monthly-withdrawal') as CheckboxInput;
      if (el) el.checked = params.monthlyWithdrawal;
    }

    // SBLOC Terms (convert 0-1 to 0-100 for sliders)
    if (params.sblocRate !== undefined) {
      const el = this.$('#sbloc-rate') as RangeSlider;
      if (el) el.value = params.sblocRate * 100;
    }
    if (params.maxBorrowing !== undefined) {
      const el = this.$('#max-borrowing') as RangeSlider;
      if (el) el.value = params.maxBorrowing * 100;
    }
    if (params.maintenanceMargin !== undefined) {
      const el = this.$('#maintenance-margin') as RangeSlider;
      if (el) el.value = params.maintenanceMargin * 100;
    }
    if (params.liquidationHaircut !== undefined) {
      const el = this.$('#liquidation-haircut') as RangeSlider;
      if (el) el.value = params.liquidationHaircut * 100;
    }

    // Simulation Settings
    if (params.iterations !== undefined) {
      const el = this.$('#num-simulations') as SelectInput;
      if (el) el.value = params.iterations.toString();
    }
    if (params.inflationRate !== undefined) {
      const el = this.$('#inflation-rate') as RangeSlider;
      if (el) el.value = params.inflationRate * 100;
    }
    if (params.returnModel !== undefined) {
      const el = this.$('#return-model') as SelectInput;
      if (el) el.value = params.returnModel;
      // Trigger visibility update for regime calibration
      el?.dispatchEvent(new Event('change'));
    }
    if (params.regimeCalibration !== undefined) {
      this._regimeCalibration = params.regimeCalibration;
      const historicalBtn = this.$('#regime-historical') as HTMLButtonElement;
      const conservativeBtn = this.$('#regime-conservative') as HTMLButtonElement;
      const helpText = this.$('#regime-help-text');
      historicalBtn?.classList.toggle('active', params.regimeCalibration === 'historical');
      conservativeBtn?.classList.toggle('active', params.regimeCalibration === 'conservative');
      if (helpText) {
        helpText.textContent = params.regimeCalibration === 'historical'
          ? 'Calibrated to historical S&P 500 data (1950-2024)'
          : 'Stress-testing with extended crash durations';
      }
    }

    // Withdrawal Chapters
    if (params.withdrawalChapters !== undefined) {
      const enableEl = this.$('#enable-chapters') as CheckboxInput;
      if (enableEl) {
        enableEl.checked = params.withdrawalChapters.enabled;
        enableEl.dispatchEvent(new Event('change')); // Trigger visibility
      }

      if (params.withdrawalChapters.enabled && params.withdrawalChapters.chapter2) {
        const yearsEl = this.$('#chapter2-years') as NumberInput;
        const reductionEl = this.$('#chapter2-reduction') as RangeSlider;
        if (yearsEl) yearsEl.value = params.withdrawalChapters.chapter2.yearsAfterStart;
        if (reductionEl) reductionEl.value = params.withdrawalChapters.chapter2.reductionPercent;
      }

      if (params.withdrawalChapters.enabled && params.withdrawalChapters.chapter3) {
        const yearsEl = this.$('#chapter3-years') as NumberInput;
        const reductionEl = this.$('#chapter3-reduction') as RangeSlider;
        if (yearsEl) yearsEl.value = params.withdrawalChapters.chapter3.yearsAfterStart;
        if (reductionEl) reductionEl.value = params.withdrawalChapters.chapter3.reductionPercent;
      }
    }

    // Tax Modeling
    if (params.taxModeling !== undefined) {
      const enableEl = this.$('#enable-tax-modeling') as CheckboxInput;
      if (enableEl) {
        enableEl.checked = params.taxModeling.enabled;
        enableEl.dispatchEvent(new Event('change')); // Trigger visibility
      }

      const taxAdvantagedEl = this.$('#tax-advantaged') as CheckboxInput;
      if (taxAdvantagedEl) {
        taxAdvantagedEl.checked = params.taxModeling.taxAdvantaged;
        taxAdvantagedEl.dispatchEvent(new Event('change')); // Trigger visibility
      }

      if (params.taxModeling.enabled && !params.taxModeling.taxAdvantaged) {
        const dividendEl = this.$('#dividend-yield') as RangeSlider;
        const ordinaryEl = this.$('#ordinary-tax-rate') as RangeSlider;
        const ltcgEl = this.$('#ltcg-tax-rate') as RangeSlider;
        if (dividendEl) dividendEl.value = params.taxModeling.dividendYield * 100;
        if (ordinaryEl) ordinaryEl.value = params.taxModeling.ordinaryTaxRate * 100;
        if (ltcgEl) ltcgEl.value = params.taxModeling.ltcgTaxRate * 100;
      }
    }
  }

  /**
   * Collect simulation parameters from UI components
   */
  private collectSimulationParams(): { config: SimulationConfig; portfolio: PortfolioConfig } {
    // Portfolio Settings
    const initialValue = this.getNumberInputValue('initial-investment', 5000000);
    const initialLocBalance = this.getNumberInputValue('initial-loc-balance', 0);
    const iterations = parseInt(this.getSelectInputValue('num-simulations', '10000'), 10);
    const inflationRate = this.getRangeSliderValue('inflation-rate', 2.5) / 100;

    // Timeline
    const currentYear = new Date().getFullYear();
    const startYear = this.getNumberInputValue('start-year', currentYear);
    const withdrawalStartYearCalendar = this.getNumberInputValue('withdrawal-start-year', currentYear);
    const timeHorizon = this.getRangeSliderValue('time-horizon', 15);

    // Convert calendar years to 0-based simulation year indices
    // withdrawalStartYear should be 0 if withdrawals start immediately,
    // or (withdrawalStartYearCalendar - startYear) to delay withdrawals
    const withdrawalStartYear = Math.max(0, withdrawalStartYearCalendar - startYear);

    // Withdrawal Strategy
    const annualWithdrawal = this.getNumberInputValue('annual-withdrawal', 200000);
    const annualRaise = this.getRangeSliderValue('annual-raise', 3) / 100;
    const monthlyWithdrawal = this.getCheckboxValue('monthly-withdrawal', true);

    // SBLOC Risk Parameters
    const sblocRate = this.getRangeSliderValue('sbloc-rate', 7) / 100;
    const maxBorrowing = this.getRangeSliderValue('max-borrowing', 65) / 100;
    const maintenanceMargin = this.getRangeSliderValue('maintenance-margin', 50) / 100;
    const liquidationHaircut = this.getRangeSliderValue('liquidation-haircut', 5) / 100;

    // Return Distribution Model
    const returnModel = this.getSelectInputValue('return-model', 'bootstrap');
    const regimeCalibration = this._regimeCalibration;

    // Withdrawal Chapters
    const enableChapters = this.getCheckboxValue('enable-chapters', false);
    const withdrawalChapters: WithdrawalChaptersConfig = {
      enabled: enableChapters,
    };
    if (enableChapters) {
      withdrawalChapters.chapter2 = {
        yearsAfterStart: this.getNumberInputValue('chapter2-years', 10),
        reductionPercent: this.getRangeSliderValue('chapter2-reduction', 20),
      };
      withdrawalChapters.chapter3 = {
        yearsAfterStart: this.getNumberInputValue('chapter3-years', 10),
        reductionPercent: this.getRangeSliderValue('chapter3-reduction', 30),
      };
    }

    // Tax Modeling
    const enableTaxModeling = this.getCheckboxValue('enable-tax-modeling', false);
    const taxAdvantaged = this.getCheckboxValue('tax-advantaged', false);
    const taxModeling: TaxModelingConfig = {
      enabled: enableTaxModeling,
      taxAdvantaged,
      dividendYield: enableTaxModeling && !taxAdvantaged ? this.getRangeSliderValue('dividend-yield', 0.5) / 100 : 0,
      ordinaryTaxRate: enableTaxModeling && !taxAdvantaged ? this.getRangeSliderValue('ordinary-tax-rate', 37) / 100 : 0,
      ltcgTaxRate: enableTaxModeling && !taxAdvantaged ? this.getRangeSliderValue('ltcg-tax-rate', 23.8) / 100 : 0,
    };

    // Sell Strategy Comparison
    const sellCostBasisRatio = this.getRangeSliderValue('sell-cost-basis-ratio', 40) / 100;
    const sellDividendYield = this.getRangeSliderValue('sell-dividend-yield', 2) / 100;
    const sellStrategy = {
      costBasisRatio: sellCostBasisRatio,
      dividendYield: sellDividendYield,
    };

    // Build SBLOC config
    const sblocConfig: SBLOCSimConfig = {
      targetLTV: maxBorrowing,
      interestRate: sblocRate,
      annualWithdrawal,
      annualWithdrawalRaise: annualRaise,
      monthlyWithdrawal,
      maintenanceMargin,
      liquidationHaircut,
      initialLocBalance,
    };

    // Build Timeline config
    const timeline: TimelineConfig = {
      startYear,
      withdrawalStartYear,
    };

    // Build SimulationConfig
    const config: SimulationConfig = {
      iterations,
      timeHorizon,
      initialValue,
      inflationRate,
      inflationAdjusted: false,
      resamplingMethod: returnModel === 'regime' ? 'regime' : 'simple',
      regimeCalibration: returnModel === 'regime' ? regimeCalibration : undefined,
      seed: undefined,
      timeline,
      sbloc: sblocConfig,
      withdrawalChapters,
      taxModeling,
      sellStrategy,
    };

    // Build PortfolioConfig from portfolio-composition assets
    const portfolioComp = this.$('#portfolio-composition') as (PortfolioComposition & { getWeights(): Record<string, number> }) | null;
    const weights: Record<string, number> = portfolioComp?.getWeights() ?? { SPY: 60, BND: 30, GLD: 10 };
    const assets: AssetConfig[] = [];

    // Collect returns with year information for correlation calculation
    const assetReturnsByYear: Map<string, Map<string, number>> = new Map();

    for (const [symbol, weightPercent] of Object.entries(weights)) {
      // Get historical returns from preset data
      const preset = getPresetData(symbol);
      let historicalReturns: number[];
      const returnsByYear: Map<string, number> = new Map();

      if (preset) {
        // Extract return values from preset data, keeping year information
        historicalReturns = preset.returns.map((r) => r.return);
        for (const r of preset.returns) {
          returnsByYear.set(r.date, r.return);
        }
      } else {
        // Fallback: use placeholder returns with warning
        console.warn(`No preset data for ${symbol}, using placeholder returns`);
        // Generate 20 years of placeholder returns (roughly 8% annual with 15% vol)
        historicalReturns = Array.from({ length: 20 }, () =>
          0.08 + (Math.random() - 0.5) * 0.30
        );
        // Create synthetic year labels for placeholders
        for (let i = 0; i < historicalReturns.length; i++) {
          returnsByYear.set(String(2005 + i), historicalReturns[i]);
        }
      }

      assetReturnsByYear.set(symbol, returnsByYear);

      assets.push({
        id: symbol,
        weight: weightPercent / 100, // Convert percentage to decimal
        historicalReturns,
      });
    }

    // Calculate correlation matrix from year-aligned returns
    const n = assets.length;
    let correlationMatrix: number[][];

    if (n > 1) {
      // Find common years across all assets
      const allYears = new Set<string>();
      for (const returnsByYear of assetReturnsByYear.values()) {
        for (const year of returnsByYear.keys()) {
          allYears.add(year);
        }
      }

      // Filter to years where ALL assets have data
      const commonYears = Array.from(allYears).filter((year) =>
        Array.from(assetReturnsByYear.values()).every((returnsByYear) => returnsByYear.has(year))
      ).sort();

      if (commonYears.length >= 2) {
        // Build aligned return arrays for correlation calculation
        const assetSymbols = Object.keys(weights);
        const alignedReturns: number[][] = assetSymbols.map((symbol) => {
          const returnsByYear = assetReturnsByYear.get(symbol)!;
          return commonYears.map((year) => returnsByYear.get(year)!);
        });

        // Calculate actual correlation matrix
        correlationMatrix = calcCorrelationMatrix(alignedReturns);
      } else {
        // Not enough common years - fall back to identity matrix
        console.warn('Insufficient common years for correlation calculation, using identity matrix');
        correlationMatrix = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
        );
      }
    } else {
      // Single asset - correlation is 1 with itself
      correlationMatrix = [[1]];
    }

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

    // Listen for show-toast events from child components
    this.shadowRoot?.addEventListener('show-toast', ((e: CustomEvent) => {
      if (toastContainer && typeof toastContainer.show === 'function') {
        const { message, type } = e.detail;
        toastContainer.show(message, type);
      }
    }) as EventListener);

    // Settings button handler
    const settingsBtn = this.$('#btn-settings');
    const settingsPanel = this.$('#settings-panel') as any;

    settingsBtn?.addEventListener('click', () => {
      settingsPanel?.toggle();
    });

    // =========================================================================
    // User guide button handler
    // =========================================================================
    const guideBtn = this.$('#btn-guide');
    const userGuide = this.$('#user-guide') as any;

    guideBtn?.addEventListener('click', () => {
      userGuide?.show();
    });

    // =========================================================================
    // Welcome screen management
    // =========================================================================
    const welcome = this.$('#welcome') as any;

    // Show welcome if no simulation has been run
    // Hide if simulation exists
    const hasSimulationResults = this._simulationResult !== null;
    if (hasSimulationResults) {
      welcome?.classList.add('hidden');
    } else {
      welcome?.classList.remove('hidden');
    }

    // Quick-start: trigger simulation with current/default parameters
    this.addEventListener('quick-start', () => {
      welcome?.classList.add('hidden');
      // Trigger simulation
      runBtn?.click();
    });

    // Show guide: open user guide modal
    this.addEventListener('show-guide', () => {
      userGuide?.show();
    });

    // =========================================================================
    // Notify portfolio-composition when parameters change (for dirty state tracking)
    // =========================================================================
    const notifyParamsChanged = () => {
      const portfolioComp = this.$('#portfolio-composition');
      if (portfolioComp) {
        portfolioComp.dispatchEvent(new CustomEvent('params-changed', {
          bubbles: false,
          composed: false,
        }));
      }
    };

    // =========================================================================
    // Return Distribution Model Toggle
    // =========================================================================
    const returnModelSelect = this.$('#return-model') as (SelectInput & { value: string }) | null;
    const regimeCalibrationGroup = this.$('#regime-calibration-group');
    const regimeHistoricalBtn = this.$('#regime-historical') as HTMLButtonElement | null;
    const regimeConservativeBtn = this.$('#regime-conservative') as HTMLButtonElement | null;
    const regimeHelpText = this.$('#regime-help-text');

    const updateRegimeVisibility = () => {
      const isRegime = returnModelSelect?.value === 'regime';
      if (regimeCalibrationGroup) {
        regimeCalibrationGroup.classList.toggle('visible', isRegime);
      }
    };

    returnModelSelect?.addEventListener('change', updateRegimeVisibility);
    updateRegimeVisibility(); // Initial state

    // Regime calibration toggle buttons
    const updateRegimeCalibration = (mode: RegimeCalibrationMode) => {
      this._regimeCalibration = mode;
      regimeHistoricalBtn?.classList.toggle('active', mode === 'historical');
      regimeConservativeBtn?.classList.toggle('active', mode === 'conservative');
      if (regimeHelpText) {
        regimeHelpText.textContent = mode === 'historical'
          ? 'Calibrated to historical S&P 500 data (1950-2024)'
          : 'Stress-testing with extended crash durations';
      }
    };

    regimeHistoricalBtn?.addEventListener('click', () => {
      updateRegimeCalibration('historical');
      notifyParamsChanged();
    });
    regimeConservativeBtn?.addEventListener('click', () => {
      updateRegimeCalibration('conservative');
      notifyParamsChanged();
    });

    // =========================================================================
    // Withdrawal Chapters Toggle
    // =========================================================================
    const enableChaptersCheckbox = this.$('#enable-chapters') as (CheckboxInput & { checked: boolean }) | null;
    const chaptersConfig = this.$('#chapters-config');

    const updateChaptersVisibility = () => {
      const isEnabled = enableChaptersCheckbox?.checked ?? false;
      if (chaptersConfig) {
        chaptersConfig.classList.toggle('visible', isEnabled);
      }
    };

    enableChaptersCheckbox?.addEventListener('change', updateChaptersVisibility);
    updateChaptersVisibility(); // Initial state

    // =========================================================================
    // Tax Modeling Toggle
    // =========================================================================
    const enableTaxCheckbox = this.$('#enable-tax-modeling') as (CheckboxInput & { checked: boolean }) | null;
    const taxConfig = this.$('#tax-config');
    const taxAdvantagedCheckbox = this.$('#tax-advantaged') as (CheckboxInput & { checked: boolean }) | null;
    const taxRatesGroup = this.$('#tax-rates-group');

    const updateTaxVisibility = () => {
      const isEnabled = enableTaxCheckbox?.checked ?? false;
      const isTaxAdvantaged = taxAdvantagedCheckbox?.checked ?? false;

      if (taxConfig) {
        taxConfig.classList.toggle('visible', isEnabled);
      }
      if (taxRatesGroup) {
        taxRatesGroup.classList.toggle('hidden', isTaxAdvantaged);
      }
    };

    enableTaxCheckbox?.addEventListener('change', updateTaxVisibility);
    taxAdvantagedCheckbox?.addEventListener('change', updateTaxVisibility);
    updateTaxVisibility(); // Initial state

    // Portfolio composition changes are handled internally by the component
    // The component dispatches 'portfolio-change' events which we can listen to if needed

    // =========================================================================
    // Auto-run simulation on parameter commit (Enter key or slider mouseup)
    // =========================================================================
    const triggerSimulation = () => {
      if (!this._isRunning) {
        runBtn?.click();
      }
    };

    // Listen for 'commit' events from number-input and range-slider components
    this.shadowRoot?.addEventListener('commit', triggerSimulation);

    // Listen for changes on all input components
    this.shadowRoot?.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      // Only notify for parameter inputs, not search inputs etc.
      if (target.tagName === 'RANGE-SLIDER' ||
          target.tagName === 'NUMBER-INPUT' ||
          target.tagName === 'SELECT-INPUT' ||
          target.tagName === 'CHECKBOX-INPUT') {
        notifyParamsChanged();
      }
    });

    // Also listen for change events (for selects and checkboxes)
    this.shadowRoot?.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'SELECT-INPUT' ||
          target.tagName === 'CHECKBOX-INPUT') {
        notifyParamsChanged();
      }
    });

    runBtn?.addEventListener('click', async () => {
      // Prevent double-runs
      if (this._isRunning) {
        return;
      }

      // Dispatch event to trigger auto-collapse on mobile
      this.dispatchEvent(
        new CustomEvent('simulation-start', {
          bubbles: true,
          composed: true,
        })
      );

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

        // Hide welcome screen after successful simulation
        welcome?.classList.add('hidden');

        // Update results dashboard with simulation data
        const dashboard = this.$('#results') as ComparisonDashboard & {
          data: SimulationOutput | null;
          portfolioWeights: { symbol: string; weight: number }[] | null;
          correlationMatrix: { labels: string[]; matrix: number[][] } | null;
          initialValue: number;
          timeHorizon: number;
          annualWithdrawal: number;
          effectiveTaxRate: number;
        };
        if (dashboard) {
          // Set configuration values for extended stats calculation
          dashboard.initialValue = config.initialValue;
          dashboard.timeHorizon = config.timeHorizon;
          dashboard.annualWithdrawal = config.sbloc?.annualWithdrawal ?? 50000;
          dashboard.effectiveTaxRate = 0.37; // Default federal tax rate

          // Set simulation config for yearly analysis table (annualWithdrawalRaise, etc.)
          (dashboard as any).simulationConfig = config;

          // Set simulation data (triggers chart updates)
          dashboard.data = this._simulationResult;

          // Set portfolio composition for donut chart
          const portfolioCompTyped = this.$('#portfolio-composition') as (PortfolioComposition & { getWeights(): Record<string, number> }) | null;
          const currentWeights = portfolioCompTyped?.getWeights() ?? {};
          const portfolioWeights = Object.entries(currentWeights).map(([symbol, weight]) => ({
            symbol,
            weight: weight as number
          }));
          dashboard.portfolioWeights = portfolioWeights;

          // Set correlation matrix for heatmap
          dashboard.correlationMatrix = {
            labels: portfolioWeights.map(w => w.symbol),
            matrix: portfolio.correlationMatrix
          };
        }

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
            detail: { result: this._simulationResult, config },
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

    // Handle request for current portfolio state (from portfolio-composition)
    this.addEventListener('request-portfolio-state', (e: Event) => {
      const portfolioComp = this.$('#portfolio-composition') as (PortfolioComposition & {
        getWeights(): Record<string, number>;
      }) | null;
      const weights = portfolioComp?.getWeights() || {};
      const assets: AssetRecord[] = Object.entries(weights).map(([symbol, weight]) => ({
        id: symbol,
        symbol,
        name: symbol, // Could be enhanced with lookup
        assetClass: 'equity' as const, // Default, can be refined later
        weight: weight / 100 // Convert percent to decimal
      }));
      (e as CustomEvent).detail.assets = assets;
    });

    // Handle request for simulation parameters (from portfolio-composition)
    this.addEventListener('get-simulation-params', (e: Event) => {
      const params = this.getSimulationParams();
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.callback === 'function') {
        customEvent.detail.callback(params);
      }
    });

    // Handle set simulation parameters (from portfolio-composition)
    this.addEventListener('set-simulation-params', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        this.setSimulationParams(customEvent.detail);
      }
    });

    // Portfolio preset functionality is now handled internally by portfolio-composition
  }
}

// Register the custom element
customElements.define('app-root', AppRoot);
