/**
 * Strategy Analysis Web Component
 *
 * Comprehensive comparison section for BBD vs Sell Assets strategies.
 * Displays:
 * - Verdict banner (BBD Recommended or Consider Sell Assets)
 * - Side-by-side comparison cards
 * - Wealth differential metrics
 * - Strategy insights
 *
 * @module components/ui/strategy-analysis
 */

import { BaseComponent } from '../base-component';

// ============================================================================
// Types
// ============================================================================

/**
 * BBD strategy metrics for comparison
 */
export interface BBDMetrics {
  /** Terminal net worth (median) */
  terminalNetWorth: number;
  /** Success rate (0-100) */
  successRate: number;
  /** Lifetime cost (interest paid) */
  lifetimeCost: number;
  /** Dividend taxes paid */
  dividendTaxes: number;
  /** Primary risk description */
  primaryRisk: string;
  /** Margin call probability (0-100) */
  marginCallProbability: number;
}

/**
 * Sell Assets strategy metrics for comparison
 */
export interface SellMetrics {
  /** Terminal net worth (median) */
  terminalNetWorth: number;
  /** Success rate (0-100) */
  successRate: number;
  /** Lifetime cost (taxes paid) */
  lifetimeCost: number;
  /** Primary risk description */
  primaryRisk: string;
  /** Depletion probability (0-100) */
  depletionProbability: number;
}

/**
 * Strategy verdict data
 */
export interface StrategyVerdict {
  /** Recommended strategy */
  recommendation: 'bbd' | 'sell';
  /** Headline text */
  headline: string;
  /** Rationale text */
  rationale: string;
  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * Wealth differential metrics
 */
export interface WealthDifferential {
  /** BBD vs Sell difference (positive = BBD better) */
  bbdVsSell: number;
  /** Tax savings from BBD strategy */
  taxSavings: number;
  /** Estate value under BBD */
  estateValue: number;
}

/**
 * Strategy insights for explanation section
 */
export interface StrategyInsights {
  /** Main insight quote */
  quote: string;
  /** Explanation paragraph */
  explanation: string;
  /** Tax deferral benefit amount */
  taxDeferralBenefit: number;
  /** Compounding advantage amount */
  compoundingAdvantage: number;
}

/**
 * Full props interface for StrategyAnalysis component
 */
export interface StrategyAnalysisProps {
  /** BBD strategy metrics */
  bbdData: BBDMetrics;
  /** Sell strategy metrics */
  sellData: SellMetrics;
  /** Strategy verdict */
  verdict: StrategyVerdict;
  /** Wealth differential metrics */
  differential: WealthDifferential;
  /** Strategy insights */
  insights: StrategyInsights;
  /** Number of simulations run */
  simulationsRun: number;
  /** Time horizon in years */
  timeHorizon: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Strategy Analysis component for BBD vs Sell comparison.
 *
 * @example
 * ```html
 * <strategy-analysis id="strategy"></strategy-analysis>
 *
 * <script>
 *   const analysis = document.querySelector('#strategy');
 *   analysis.data = {
 *     bbdData: { terminalNetWorth: 5000000, successRate: 87.5, ... },
 *     sellData: { terminalNetWorth: 3800000, successRate: 92.1, ... },
 *     verdict: { recommendation: 'bbd', headline: 'BBD Recommended', ... },
 *     differential: { bbdVsSell: 1200000, taxSavings: 450000, ... },
 *     insights: { quote: '...', explanation: '...', ... },
 *     simulationsRun: 10000,
 *     timeHorizon: 30
 *   };
 * </script>
 * ```
 */
export class StrategyAnalysis extends BaseComponent {
  /** Stored props data */
  private _data: StrategyAnalysisProps | null = null;

  /**
   * Set analysis data and update display.
   */
  set data(value: StrategyAnalysisProps | null) {
    this._data = value;
    this.updateDisplay();
  }

  /**
   * Get analysis data.
   */
  get data(): StrategyAnalysisProps | null {
    return this._data;
  }

  protected template(): string {
    return `
      <div class="strategy-analysis">
        <!-- Header -->
        <header class="analysis-header">
          <div class="header-content">
            <span class="header-icon">&#x2696;</span>
            <div class="header-text">
              <h2>Strategy Analysis</h2>
              <p class="header-subtitle" id="header-subtitle">
                Based on <span id="sim-count">10,000</span> Monte Carlo simulations over <span id="time-horizon">30</span> years
              </p>
            </div>
          </div>
          <span class="disclaimer-badge">Educational purposes only</span>
        </header>

        <!-- Verdict Banner -->
        <div class="verdict-banner" id="verdict-banner">
          <div class="verdict-content">
            <div class="verdict-icon" id="verdict-icon">&#x2714;</div>
            <div class="verdict-text">
              <h3 id="verdict-headline">BBD Recommended</h3>
              <p id="verdict-rationale">Based on simulation results, the BBD strategy provides higher terminal wealth.</p>
            </div>
          </div>
          <div class="success-dial" id="success-dial">
            <svg viewBox="0 0 100 100" class="dial-svg">
              <circle class="dial-bg" cx="50" cy="50" r="45"/>
              <circle class="dial-progress" cx="50" cy="50" r="45" id="dial-progress"/>
              <text class="dial-text" x="50" y="50" id="dial-text">87%</text>
              <text class="dial-label" x="50" y="65">Success</text>
            </svg>
          </div>
        </div>

        <!-- Side-by-Side Comparison -->
        <div class="comparison-grid">
          <div class="comparison-card bbd-card">
            <h4 class="card-title">
              <span class="card-icon">&#x1F3E6;</span>
              BBD Strategy
            </h4>
            <div class="metrics-list">
              <div class="metric-row">
                <span class="metric-label">Terminal Net Worth</span>
                <span class="metric-value" id="bbd-terminal">-</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Success Rate</span>
                <span class="metric-value" id="bbd-success">-</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Lifetime Interest Paid</span>
                <span class="metric-value" id="bbd-cost">-</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Dividend Taxes</span>
                <span class="metric-value" id="bbd-dividends">-</span>
              </div>
              <div class="metric-row risk-row">
                <span class="metric-label">Primary Risk</span>
                <span class="metric-value risk-value" id="bbd-risk">-</span>
              </div>
            </div>
          </div>

          <div class="comparison-card sell-card">
            <h4 class="card-title">
              <span class="card-icon">&#x1F4B0;</span>
              Sell Assets
            </h4>
            <div class="metrics-list">
              <div class="metric-row">
                <span class="metric-label">Terminal Net Worth</span>
                <span class="metric-value" id="sell-terminal">-</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Success Rate</span>
                <span class="metric-value" id="sell-success">-</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Lifetime Taxes Paid</span>
                <span class="metric-value" id="sell-cost">-</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">&nbsp;</span>
                <span class="metric-value">&nbsp;</span>
              </div>
              <div class="metric-row risk-row">
                <span class="metric-label">Primary Risk</span>
                <span class="metric-value risk-value" id="sell-risk">-</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Wealth Differential -->
        <div class="differential-section">
          <h4 class="section-title">Wealth Differential</h4>
          <div class="differential-grid">
            <div class="differential-card" id="diff-advantage-card">
              <span class="diff-icon">&#x1F4C8;</span>
              <div class="diff-content">
                <span class="diff-label">BBD vs Sell</span>
                <span class="diff-value positive" id="diff-advantage">+$0</span>
              </div>
            </div>
            <div class="differential-card">
              <span class="diff-icon">&#x1F4B5;</span>
              <div class="diff-content">
                <span class="diff-label">Tax Savings</span>
                <span class="diff-value" id="diff-tax-savings">$0</span>
              </div>
            </div>
            <div class="differential-card">
              <span class="diff-icon">&#x1F3E0;</span>
              <div class="diff-content">
                <span class="diff-label">Estate Value (BBD)</span>
                <span class="diff-value" id="diff-estate">$0</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Why Strategy Performs Well -->
        <div class="insights-section" id="insights-section">
          <h4 class="section-title">Why <span id="winning-strategy">BBD</span> Performs Well</h4>
          <blockquote class="insight-quote" id="insight-quote">
            "BBD leverages tax deferral and compounding to build greater terminal wealth."
          </blockquote>
          <p class="insight-explanation" id="insight-explanation">
            By borrowing against assets instead of selling, you avoid capital gains taxes and keep more money invested.
          </p>
          <div class="benefit-cards">
            <div class="benefit-card">
              <span class="benefit-icon">&#x23F3;</span>
              <div class="benefit-content">
                <span class="benefit-label">Tax Deferral Benefit</span>
                <span class="benefit-value" id="benefit-tax">$0</span>
              </div>
            </div>
            <div class="benefit-card">
              <span class="benefit-icon">&#x1F4C8;</span>
              <div class="benefit-content">
                <span class="benefit-label">Compounding Advantage</span>
                <span class="benefit-value" id="benefit-compound">$0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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

      .strategy-analysis {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
      }

      /* Header */
      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-lg, 24px);
        flex-wrap: wrap;
        gap: var(--spacing-md, 16px);
      }

      .header-content {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md, 16px);
      }

      .header-icon {
        font-size: 2rem;
        line-height: 1;
      }

      .header-text h2 {
        margin: 0;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .header-subtitle {
        margin: var(--spacing-xs, 4px) 0 0 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .disclaimer-badge {
        background: var(--color-warning-light, #fef3c7);
        color: var(--color-warning-dark, #92400e);
        padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 500;
      }

      /* Verdict Banner */
      .verdict-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, var(--color-success-light, #dcfce7) 0%, var(--color-success-lighter, #f0fdf4) 100%);
        border: 1px solid var(--color-success, #22c55e);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
        margin-bottom: var(--spacing-lg, 24px);
        flex-wrap: wrap;
        gap: var(--spacing-md, 16px);
      }

      .verdict-banner.sell-recommended {
        background: linear-gradient(135deg, var(--color-warning-light, #fef3c7) 0%, var(--color-warning-lighter, #fffbeb) 100%);
        border-color: var(--color-warning, #f59e0b);
      }

      .verdict-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
      }

      .verdict-icon {
        width: 48px;
        height: 48px;
        background: var(--color-success, #22c55e);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: white;
      }

      .verdict-banner.sell-recommended .verdict-icon {
        background: var(--color-warning, #f59e0b);
      }

      .verdict-text h3 {
        margin: 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 700;
        color: var(--text-primary, #1e293b);
      }

      .verdict-text p {
        margin: var(--spacing-xs, 4px) 0 0 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        max-width: 500px;
      }

      /* Success Dial */
      .success-dial {
        width: 100px;
        height: 100px;
        flex-shrink: 0;
      }

      .dial-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .dial-bg {
        fill: none;
        stroke: var(--surface-secondary, #f1f5f9);
        stroke-width: 8;
      }

      .dial-progress {
        fill: none;
        stroke: var(--color-success, #22c55e);
        stroke-width: 8;
        stroke-linecap: round;
        stroke-dasharray: 283;
        stroke-dashoffset: 283;
        transition: stroke-dashoffset 0.5s ease;
      }

      .verdict-banner.sell-recommended .dial-progress {
        stroke: var(--color-warning, #f59e0b);
      }

      .dial-text {
        fill: var(--text-primary, #1e293b);
        font-size: 1.2rem;
        font-weight: 700;
        text-anchor: middle;
        dominant-baseline: middle;
        transform: rotate(90deg);
        transform-origin: 50px 50px;
      }

      .dial-label {
        fill: var(--text-secondary, #475569);
        font-size: 0.6rem;
        text-anchor: middle;
        dominant-baseline: middle;
        transform: rotate(90deg);
        transform-origin: 50px 65px;
      }

      /* Comparison Grid */
      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md, 16px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .comparison-card {
        background: var(--surface-secondary, #f8fafc);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-md, 16px);
      }

      .bbd-card {
        border-left: 4px solid var(--color-primary, #0d9488);
      }

      .sell-card {
        border-left: 4px solid var(--color-secondary, #6366f1);
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .card-icon {
        font-size: 1.25rem;
      }

      .metrics-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .metric-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-xs, 4px) 0;
        border-bottom: 1px dashed var(--border-color, #e2e8f0);
      }

      .metric-row:last-child {
        border-bottom: none;
      }

      .metric-label {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
      }

      .metric-value {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .risk-row .risk-value {
        color: var(--color-warning-dark, #92400e);
        font-size: var(--font-size-xs, 0.75rem);
      }

      /* Differential Section */
      .differential-section {
        margin-bottom: var(--spacing-lg, 24px);
      }

      .section-title {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .differential-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-md, 16px);
      }

      .differential-card {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        background: var(--surface-secondary, #f8fafc);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-md, 16px);
      }

      .diff-icon {
        font-size: 1.5rem;
      }

      .diff-content {
        display: flex;
        flex-direction: column;
      }

      .diff-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-secondary, #475569);
      }

      .diff-value {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 700;
        color: var(--text-primary, #1e293b);
      }

      .diff-value.positive {
        color: var(--color-success, #22c55e);
      }

      .diff-value.negative {
        color: var(--color-error, #ef4444);
      }

      /* Insights Section */
      .insights-section {
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-lg, 24px);
      }

      .insight-quote {
        margin: 0 0 var(--spacing-md, 16px) 0;
        padding: var(--spacing-md, 16px);
        border-left: 4px solid var(--color-primary, #0d9488);
        font-style: italic;
        color: var(--text-secondary, #475569);
        background: var(--surface-primary, #ffffff);
        border-radius: 0 var(--radius-md, 6px) var(--radius-md, 6px) 0;
      }

      .insight-explanation {
        margin: 0 0 var(--spacing-lg, 24px) 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        line-height: 1.6;
      }

      .benefit-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md, 16px);
      }

      .benefit-card {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-md, 16px);
      }

      .benefit-icon {
        font-size: 1.5rem;
      }

      .benefit-content {
        display: flex;
        flex-direction: column;
      }

      .benefit-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-secondary, #475569);
      }

      .benefit-value {
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--color-success, #22c55e);
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .strategy-analysis {
          padding: var(--spacing-md, 16px);
        }

        .analysis-header {
          margin-bottom: var(--spacing-md, 16px);
          gap: var(--spacing-sm, 8px);
        }

        .header-icon {
          font-size: 1.5rem;
        }

        .header-text h2 {
          font-size: var(--font-size-base, 1rem);
        }

        .header-subtitle {
          font-size: var(--font-size-xs, 0.75rem);
        }

        .disclaimer-badge {
          font-size: 0.65rem;
          padding: 2px var(--spacing-xs, 4px);
        }

        .verdict-banner {
          padding: var(--spacing-md, 16px);
          margin-bottom: var(--spacing-md, 16px);
          flex-direction: column;
          align-items: flex-start;
        }

        .verdict-icon {
          width: 36px;
          height: 36px;
          font-size: 1.2rem;
        }

        .verdict-text h3 {
          font-size: var(--font-size-base, 1rem);
        }

        .verdict-text p {
          font-size: var(--font-size-xs, 0.75rem);
        }

        .success-dial {
          width: 80px;
          height: 80px;
          align-self: center;
        }

        .dial-text {
          font-size: 1rem;
        }

        .comparison-grid {
          grid-template-columns: 1fr;
          gap: var(--spacing-sm, 8px);
          margin-bottom: var(--spacing-md, 16px);
        }

        .comparison-card {
          padding: var(--spacing-sm, 8px);
        }

        .card-title {
          font-size: var(--font-size-sm, 0.875rem);
          margin-bottom: var(--spacing-sm, 8px);
        }

        .card-icon {
          font-size: 1rem;
        }

        .metric-row {
          padding: 2px 0;
        }

        .metric-label,
        .metric-value {
          font-size: var(--font-size-xs, 0.75rem);
        }

        .differential-section {
          margin-bottom: var(--spacing-md, 16px);
        }

        .section-title {
          font-size: var(--font-size-sm, 0.875rem);
          margin-bottom: var(--spacing-sm, 8px);
        }

        .differential-grid {
          grid-template-columns: 1fr;
          gap: var(--spacing-sm, 8px);
        }

        .differential-card {
          padding: var(--spacing-sm, 8px);
        }

        .diff-icon {
          font-size: 1.25rem;
        }

        .diff-label {
          font-size: 0.65rem;
        }

        .diff-value {
          font-size: var(--font-size-base, 1rem);
        }

        .insights-section {
          padding: var(--spacing-md, 16px);
        }

        .insight-quote {
          padding: var(--spacing-sm, 8px);
          font-size: var(--font-size-xs, 0.75rem);
          margin-bottom: var(--spacing-sm, 8px);
        }

        .insight-explanation {
          font-size: var(--font-size-xs, 0.75rem);
          margin-bottom: var(--spacing-md, 16px);
        }

        .benefit-cards {
          grid-template-columns: 1fr;
          gap: var(--spacing-sm, 8px);
        }

        .benefit-card {
          padding: var(--spacing-sm, 8px);
        }

        .benefit-icon {
          font-size: 1.25rem;
        }

        .benefit-label {
          font-size: 0.65rem;
        }

        .benefit-value {
          font-size: var(--font-size-sm, 0.875rem);
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateDisplay();
  }

  /**
   * Update display with current data.
   */
  private updateDisplay(): void {
    if (!this._data) return;

    const {
      bbdData,
      sellData,
      verdict,
      differential,
      insights,
      simulationsRun,
      timeHorizon,
    } = this._data;

    // Format currency
    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: n >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: n >= 1000000 ? 1 : 0,
    }).format(n);

    // Format percentage
    const formatPercent = (n: number) => `${n.toFixed(1)}%`;

    // Update header
    const simCount = this.$('#sim-count');
    const horizonSpan = this.$('#time-horizon');
    if (simCount) simCount.textContent = simulationsRun.toLocaleString();
    if (horizonSpan) horizonSpan.textContent = String(timeHorizon);

    // Update verdict banner
    const verdictBanner = this.$('#verdict-banner');
    const verdictHeadline = this.$('#verdict-headline');
    const verdictRationale = this.$('#verdict-rationale');
    const verdictIcon = this.$('#verdict-icon');

    if (verdict.recommendation === 'sell') {
      verdictBanner?.classList.add('sell-recommended');
      if (verdictIcon) verdictIcon.innerHTML = '&#x26A0;'; // Warning sign
    } else {
      verdictBanner?.classList.remove('sell-recommended');
      if (verdictIcon) verdictIcon.innerHTML = '&#x2714;'; // Checkmark
    }

    if (verdictHeadline) verdictHeadline.textContent = verdict.headline;
    if (verdictRationale) verdictRationale.textContent = verdict.rationale;

    // Update success dial
    this.updateSuccessDial(verdict.confidence);

    // Update BBD metrics
    const bbdTerminal = this.$('#bbd-terminal');
    const bbdSuccess = this.$('#bbd-success');
    const bbdCost = this.$('#bbd-cost');
    const bbdDividends = this.$('#bbd-dividends');
    const bbdRisk = this.$('#bbd-risk');

    if (bbdTerminal) bbdTerminal.textContent = formatCurrency(bbdData.terminalNetWorth);
    if (bbdSuccess) bbdSuccess.textContent = formatPercent(bbdData.successRate);
    if (bbdCost) bbdCost.textContent = formatCurrency(bbdData.lifetimeCost);
    if (bbdDividends) bbdDividends.textContent = formatCurrency(bbdData.dividendTaxes);
    if (bbdRisk) bbdRisk.textContent = bbdData.primaryRisk;

    // Update Sell metrics
    const sellTerminal = this.$('#sell-terminal');
    const sellSuccess = this.$('#sell-success');
    const sellCost = this.$('#sell-cost');
    const sellRisk = this.$('#sell-risk');

    if (sellTerminal) sellTerminal.textContent = formatCurrency(sellData.terminalNetWorth);
    if (sellSuccess) sellSuccess.textContent = formatPercent(sellData.successRate);
    if (sellCost) sellCost.textContent = formatCurrency(sellData.lifetimeCost);
    if (sellRisk) sellRisk.textContent = sellData.primaryRisk;

    // Update differential
    const diffAdvantage = this.$('#diff-advantage');
    const diffAdvantaggeCard = this.$('#diff-advantage-card');
    const diffTaxSavings = this.$('#diff-tax-savings');
    const diffEstate = this.$('#diff-estate');

    if (diffAdvantage) {
      const prefix = differential.bbdVsSell >= 0 ? '+' : '';
      diffAdvantage.textContent = `${prefix}${formatCurrency(differential.bbdVsSell)}`;
      diffAdvantage.classList.toggle('positive', differential.bbdVsSell >= 0);
      diffAdvantage.classList.toggle('negative', differential.bbdVsSell < 0);
    }
    if (diffTaxSavings) diffTaxSavings.textContent = formatCurrency(differential.taxSavings);
    if (diffEstate) diffEstate.textContent = formatCurrency(differential.estateValue);

    // Update insights
    const winningStrategy = this.$('#winning-strategy');
    const insightQuote = this.$('#insight-quote');
    const insightExplanation = this.$('#insight-explanation');
    const benefitTax = this.$('#benefit-tax');
    const benefitCompound = this.$('#benefit-compound');

    if (winningStrategy) {
      winningStrategy.textContent = verdict.recommendation === 'bbd' ? 'BBD' : 'Sell Assets';
    }
    if (insightQuote) insightQuote.textContent = `"${insights.quote}"`;
    if (insightExplanation) insightExplanation.textContent = insights.explanation;
    if (benefitTax) benefitTax.textContent = formatCurrency(insights.taxDeferralBenefit);
    if (benefitCompound) benefitCompound.textContent = formatCurrency(insights.compoundingAdvantage);
  }

  /**
   * Update the success dial SVG.
   */
  private updateSuccessDial(percentage: number): void {
    const dialProgress = this.$('#dial-progress') as SVGCircleElement | null;
    const dialText = this.$('#dial-text');

    if (dialProgress) {
      // Circle circumference = 2 * PI * r = 2 * 3.14159 * 45 = 283
      const circumference = 283;
      const offset = circumference - (percentage / 100) * circumference;
      dialProgress.style.strokeDashoffset = String(offset);
    }

    if (dialText) {
      dialText.textContent = `${Math.round(percentage)}%`;
    }
  }
}

// Register the custom element
customElements.define('strategy-analysis', StrategyAnalysis);
