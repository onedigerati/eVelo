/**
 * Key Metrics Banner Web Component
 *
 * Displays hero header banner and 3 metric cards at top of results dashboard:
 * - Hero banner: "Escape Velocity Unlocked!" or "Not ready yet, but keep it going!"
 * - Alert card: Strategy status with recommendation
 * - Strategy Success: BBD success rate, vs Sell comparison, median utilization
 * - Portfolio Growth: CAGR, starting/terminal values, vs Sell comparison
 * - Leverage Safety: Margin call probability, utilization metrics
 */
import { BaseComponent } from '../base-component';
import { logoUrl } from '../../assets/logo';

/**
 * Data structure for the key metrics banner.
 */
export interface KeyMetricsData {
  // Strategy Success card
  bbdSuccessRate: number; // 0-100 percentage
  sellSuccessRate: number; // 0-100 percentage
  medianUtilization: number; // 0-100 percentage
  yearsAbove70Pct: number; // average years

  // Portfolio Growth card
  cagr: number; // decimal (0.142 = 14.2%)
  startingValue: number; // currency
  medianTerminal: number; // currency
  sellTerminal: number; // currency
  p10Outcome: number; // currency

  // Leverage Safety card
  marginCallProbability: number; // 0-100 percentage
  peakUtilizationP90: number; // 0-100 percentage
  safetyBufferP10: number; // 0-100 percentage
  mostDangerousYear: number; // year number

  // Time horizon for context
  timeHorizon?: number; // years
}

/** Success rate threshold for "Escape Velocity" status */
const SUCCESS_THRESHOLD = 80;

/** Margin call risk threshold for safety warnings */
const MARGIN_CALL_THRESHOLD = 20;

/**
 * Executive summary banner with hero header, alert card, and 3 metric cards.
 *
 * Usage:
 * ```html
 * <key-metrics-banner></key-metrics-banner>
 *
 * <script>
 *   const banner = document.querySelector('key-metrics-banner');
 *   banner.data = {
 *     bbdSuccessRate: 80.6,
 *     sellSuccessRate: 96.3,
 *     // ... other metrics
 *   };
 * </script>
 * ```
 */
export class KeyMetricsBanner extends BaseComponent {
  /** Stored metrics data */
  private _data: KeyMetricsData | null = null;

  /**
   * Set metrics data and update display.
   */
  set data(value: KeyMetricsData | null) {
    this._data = value;
    this.updateDisplay();
  }

  /**
   * Get current metrics data.
   */
  get data(): KeyMetricsData | null {
    return this._data;
  }

  protected template(): string {
    return `
      <!-- Hero Header Banner -->
      <div class="hero-banner" id="hero-banner">
        <img src="${logoUrl}" alt="" class="hero-watermark" aria-hidden="true" />
        <div class="hero-icon" id="hero-icon">
          <img src="${logoUrl}" alt="" class="hero-logo" id="hero-logo" />
          <span class="hero-emoji" id="hero-emoji" style="display: none;">💪</span>
        </div>
        <span class="hero-title" id="hero-title">Analyzing...</span>
      </div>

      <!-- Alert Card -->
      <div class="alert-card" id="alert-card">
        <div class="alert-icon" id="alert-icon"></div>
        <div class="alert-content">
          <div class="alert-title" id="alert-title">Loading...</div>
          <div class="alert-description" id="alert-description"></div>
        </div>
      </div>

      <div class="banner-grid">
        <!-- Strategy Success Card -->
        <div class="metric-card" id="strategy-card">
          <div class="card-accent" id="strategy-accent"></div>
          <div class="card-body">
            <div class="card-header">
              <div class="card-title">
                <span class="title-text">Strategy Success</span>
                <span class="subtitle">BBD SUCCESS RATE</span>
              </div>
              <div class="status-badge" id="strategy-badge">
                <span class="badge-icon" id="strategy-badge-icon"></span>
              </div>
            </div>
            <div class="hero-metric">
              <span class="hero-value" id="bbd-success">--</span>
              <span class="hero-unit" id="bbd-success-unit">%</span>
            </div>
            <div class="hero-label">PROBABILITY OF SUCCESS</div>
            <div class="metrics-grid">
              <div class="metric-item highlight-negative">
                <span class="metric-value" id="vs-sell-success">--</span>
                <span class="metric-label">vs Sell Assets</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="sell-success-rate">--</span>
                <span class="metric-label">Sell Success Rate</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="median-utilization">--</span>
                <span class="metric-label">Median Utilization</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="years-above-70">--</span>
                <span class="metric-label">Years Above 70%</span>
              </div>
            </div>
            <div class="card-footer" id="strategy-footer">
              <span class="footer-icon" id="strategy-footer-icon"></span>
              <span class="footer-text" id="strategy-footer-text">Target: 80%</span>
            </div>
          </div>
        </div>

        <!-- Portfolio Growth Card -->
        <div class="metric-card" id="growth-card">
          <div class="card-accent accent-blue"></div>
          <div class="card-body">
            <div class="card-header">
              <div class="card-title">
                <span class="title-text">Portfolio Growth</span>
                <span class="subtitle">IMPLIED CAGR (MEDIAN)</span>
              </div>
              <div class="status-badge badge-blue">
                <span class="badge-icon icon-chart"></span>
              </div>
            </div>
            <div class="hero-metric">
              <span class="hero-value value-blue" id="cagr">--</span>
              <span class="hero-unit unit-blue" id="cagr-unit">%</span>
            </div>
            <div class="hero-label">COMPOUND ANNUAL GROWTH RATE</div>
            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-value" id="starting-value">--</span>
                <span class="metric-label">Starting Value</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="median-terminal">--</span>
                <span class="metric-label">Median Terminal</span>
              </div>
              <div class="metric-item highlight-positive">
                <span class="metric-value" id="vs-sell-terminal">--</span>
                <span class="metric-label">vs Sell Assets</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="sell-terminal">--</span>
                <span class="metric-label">Sell Terminal</span>
              </div>
            </div>
            <div class="card-footer">
              <span class="footer-icon icon-chart-small"></span>
              <span class="footer-text">P10 outcome: <span id="p10-outcome" class="p10-value">--</span></span>
            </div>
          </div>
        </div>

        <!-- Leverage Safety Card -->
        <div class="metric-card" id="safety-card">
          <div class="card-accent" id="safety-accent"></div>
          <div class="card-body">
            <div class="card-header">
              <div class="card-title">
                <span class="title-text">Leverage Safety</span>
                <span class="subtitle">MARGIN CALL RISK</span>
              </div>
              <div class="status-badge" id="safety-badge">
                <span class="badge-icon" id="safety-badge-icon"></span>
              </div>
            </div>
            <div class="hero-metric">
              <span class="hero-value" id="margin-call-prob">--</span>
              <span class="hero-unit" id="margin-call-unit">%</span>
            </div>
            <div class="hero-label">MARGIN CALL PROBABILITY</div>
            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-value" id="peak-utilization">--</span>
                <span class="metric-label">Peak Utilization (P90)</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="safety-buffer">--</span>
                <span class="metric-label">Safety Buffer (P10)</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="median-util-safety">--</span>
                <span class="metric-label">Median Utilization</span>
              </div>
              <div class="metric-item">
                <span class="metric-value" id="years-above-70-safety">--</span>
                <span class="metric-label">Years Above 70%</span>
              </div>
            </div>
            <div class="card-footer">
              <span class="footer-icon icon-calendar"></span>
              <span class="footer-text">Most dangerous year: <span id="dangerous-year" class="danger-value">--</span></span>
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

      /* ============================================
         Hero Banner Styles
         ============================================ */
      .hero-banner {
        border-radius: var(--radius-lg, 12px);
        padding: var(--spacing-xl, 32px) var(--spacing-lg, 24px);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-md, 16px);
        margin-bottom: var(--spacing-lg, 24px);
        transition: background-color 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      /* Shimmer effect overlay */
      .hero-banner::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        animation: shimmerGlow 2s infinite;
      }

      @keyframes shimmerGlow {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(0); }
        100% { transform: translateX(100%); }
      }

      .hero-banner.status-success {
        background: linear-gradient(135deg, #2D9B8A 0%, #247A6D 100%);
      }

      .hero-banner.status-warning {
        background: linear-gradient(135deg, #F5A623 0%, #E09000 100%);
      }

      .hero-icon {
        position: relative;
        z-index: 2;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-logo {
        width: 48px;
        height: 48px;
        filter: brightness(0) invert(1);
      }

      .hero-emoji {
        font-size: 48px;
        line-height: 1;
      }

      .hero-watermark {
        position: absolute;
        right: -40px;
        top: 50%;
        transform: translateY(-50%);
        width: 200px;
        height: 200px;
        opacity: 0.08;
        filter: brightness(0) invert(1);
        z-index: 0;
        pointer-events: none;
      }

      /* Rocket animation - simple vertical bounce */
      @keyframes rocketBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      /* Flexing arm animation - scale and rotate */
      @keyframes flexBounce {
        0%, 100% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.15) rotate(-5deg); }
      }

      .hero-banner.status-success .hero-icon {
        animation: rocketBounce 1.5s ease-in-out infinite;
      }

      .hero-banner.status-warning .hero-icon {
        animation: flexBounce 1.5s ease-in-out infinite;
      }

      .hero-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        position: relative;
        z-index: 1;
      }

      .hero-title .brand {
        font-weight: 800;
      }

      .hero-title .suffix {
        font-weight: 500;
        opacity: 0.7;
      }

      /* ============================================
         Alert Card Styles
         ============================================ */
      .alert-card {
        background: var(--surface-primary, #ffffff);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
        margin-bottom: var(--spacing-lg, 24px);
        border-left: 4px solid transparent;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--border-color, #e2e8f0);
        border-left-width: 4px;
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .alert-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
      }

      .alert-card.alert-success {
        border-left-color: #22c55e;
      }

      .alert-card.alert-warning {
        border-left-color: #F5A623;
      }

      .alert-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .alert-icon.icon-success {
        background: #dcfce7;
      }

      .alert-icon.icon-success::after {
        content: '';
        width: 16px;
        height: 16px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322c55e'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .alert-icon.icon-warning {
        background: #fef3c7;
      }

      .alert-icon.icon-warning::after {
        content: '';
        width: 16px;
        height: 16px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5A623'%3E%3Cpath d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .alert-content {
        flex: 1;
      }

      .alert-title {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        margin-bottom: 2px;
      }

      .alert-title.title-success {
        color: #22c55e;
      }

      .alert-title.title-warning {
        color: #F5A623;
      }

      .alert-description {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        line-height: 1.4;
      }

      /* ============================================
         Card Grid Styles
         ============================================ */
      .banner-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-lg, 24px);
      }

      .metric-card {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .metric-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      .card-accent {
        height: 4px;
        width: 100%;
      }

      .card-accent.accent-success {
        background: #22c55e;
      }

      .card-accent.accent-warning {
        background: #F5A623;
      }

      .card-accent.accent-blue {
        background: #4A90D9;
      }

      .card-body {
        padding: var(--spacing-lg, 24px);
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-md, 16px);
      }

      .card-title {
        display: flex;
        flex-direction: column;
      }

      .title-text {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .subtitle {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 2px;
      }

      /* ============================================
         Status Badge Styles
         ============================================ */
      .status-badge {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .status-badge.badge-success {
        background: #dcfce7;
      }

      .status-badge.badge-warning {
        background: #fef3c7;
      }

      .status-badge.badge-blue {
        background: #dbeafe;
      }

      .badge-icon {
        width: 16px;
        height: 16px;
        display: block;
      }

      .badge-icon.icon-check::after {
        content: '';
        display: block;
        width: 16px;
        height: 16px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322c55e'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .badge-icon.icon-warning::after {
        content: '';
        display: block;
        width: 16px;
        height: 16px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5A623'%3E%3Cpath d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .badge-icon.icon-chart::after {
        content: '';
        display: block;
        width: 16px;
        height: 16px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234A90D9'%3E%3Cpath d='M3.5 18.5l6-6 4 4L22 6.92V10h2V4h-6v2h3.08l-7.58 7.58-4-4L2 17.5z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      /* ============================================
         Hero Metric Styles
         ============================================ */
      .hero-metric {
        display: flex;
        align-items: baseline;
        margin-bottom: var(--spacing-xs, 4px);
      }

      .hero-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--text-primary, #1e293b);
        word-break: break-word;
        line-height: 1;
      }

      .hero-unit {
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 500;
        color: var(--text-secondary, #475569);
        margin-left: 2px;
      }

      /* Hero value color modifiers */
      .hero-value.value-success,
      .hero-unit.unit-success {
        color: #22c55e;
      }

      .hero-value.value-warning,
      .hero-unit.unit-warning {
        color: #F5A623;
      }

      .hero-value.value-blue,
      .hero-unit.unit-blue {
        color: #4A90D9;
      }

      .hero-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-md, 16px);
      }

      /* ============================================
         Metrics Grid Styles
         ============================================ */
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        padding-top: var(--spacing-md, 16px);
        border-top: 1px solid var(--border-color-light, #f1f5f9);
      }

      .metric-item {
        display: flex;
        flex-direction: column;
      }

      .metric-value {
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .metric-label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
      }

      .highlight-negative .metric-value {
        color: var(--color-danger, #ef4444);
      }

      .highlight-positive .metric-value {
        color: var(--color-success, #22c55e);
      }

      /* ============================================
         Card Footer Styles
         ============================================ */
      .card-footer {
        margin-top: var(--spacing-md, 16px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs, 4px);
      }

      .footer-icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }

      .footer-icon.icon-clock::after {
        content: '';
        display: block;
        width: 14px;
        height: 14px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .footer-icon.icon-arrow-up::after {
        content: '';
        display: block;
        width: 14px;
        height: 14px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322c55e'%3E%3Cpath d='M7 14l5-5 5 5z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .footer-icon.icon-chart-small::after {
        content: '';
        display: block;
        width: 14px;
        height: 14px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M3.5 18.5l6-6 4 4L22 6.92V10h2V4h-6v2h3.08l-7.58 7.58-4-4L2 17.5z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .footer-icon.icon-calendar::after {
        content: '';
        display: block;
        width: 14px;
        height: 14px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z'/%3E%3C/svg%3E");
        background-size: contain;
      }

      .footer-text {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-tertiary, #94a3b8);
      }

      .footer-text .gap-value {
        color: var(--color-danger, #ef4444);
        font-weight: 600;
      }

      .footer-text .success-value {
        color: var(--color-success, #22c55e);
        font-weight: 600;
      }

      .p10-value {
        color: var(--color-success, #22c55e);
        font-weight: 600;
      }

      .p10-value.negative {
        color: var(--color-danger, #ef4444);
      }

      .danger-value {
        color: var(--color-danger, #ef4444);
        font-weight: 600;
      }

      /* ============================================
         Mobile Responsive Styles
         ============================================ */
      @media (max-width: 1024px) {
        .banner-grid {
          grid-template-columns: 1fr;
          gap: var(--spacing-md, 16px);
        }

        .hero-banner {
          padding: var(--spacing-lg, 24px);
        }

        .hero-icon {
          width: 40px;
          height: 40px;
        }

        .hero-logo {
          width: 40px;
          height: 40px;
        }

        .hero-emoji {
          font-size: 40px;
        }

        .hero-watermark {
          width: 160px;
          height: 160px;
          right: -30px;
        }

        .hero-title {
          font-size: 1.5rem;
        }
      }

      @media (max-width: 768px) {
        .banner-container,
        .hero-banner,
        .banner-grid,
        .hero-card {
          max-width: 100%;
          overflow-x: hidden;
        }

        .banner-grid {
          gap: var(--spacing-sm, 8px);
        }

        .hero-banner {
          padding: var(--spacing-md, 16px);
          margin-bottom: var(--spacing-md, 16px);
        }

        .hero-icon {
          width: 36px;
          height: 36px;
        }

        .hero-logo {
          width: 36px;
          height: 36px;
        }

        .hero-emoji {
          font-size: 36px;
        }

        .hero-watermark {
          width: 120px;
          height: 120px;
          right: -20px;
          opacity: 0.06;
        }

        .hero-title {
          font-size: 1.25rem;
        }

        .alert-card {
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
          margin-bottom: var(--spacing-md, 16px);
        }

        .alert-icon {
          width: 32px;
          height: 32px;
        }

        .alert-title {
          font-size: var(--font-size-base, 1rem);
        }

        .alert-description {
          font-size: var(--font-size-xs, 0.75rem);
        }

        .card-body {
          padding: var(--spacing-md, 16px);
        }

        .card-header {
          margin-bottom: var(--spacing-sm, 8px);
        }

        .title-text {
          font-size: var(--font-size-base, 1rem);
        }

        .subtitle {
          font-size: 0.65rem;
        }

        .hero-value {
          font-size: 2rem;
        }

        .hero-label {
          font-size: 0.65rem;
          margin-bottom: var(--spacing-sm, 8px);
        }

        .metrics-grid {
          padding-top: var(--spacing-sm, 8px);
          gap: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        }

        .metric-value {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .metric-label {
          font-size: 0.65rem;
        }

        .card-footer {
          margin-top: var(--spacing-sm, 8px);
          padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        }

        .footer-text {
          font-size: var(--font-size-xs, 0.75rem);
        }
      }

      @media (max-width: 480px) {
        .hero-banner {
          flex-direction: column;
          gap: var(--spacing-sm, 8px);
          text-align: center;
        }

        .hero-icon {
          width: 32px;
          height: 32px;
        }

        .hero-logo {
          width: 32px;
          height: 32px;
        }

        .hero-emoji {
          font-size: 32px;
        }

        .hero-watermark {
          display: none;
        }

        .hero-value {
          font-size: 1.75rem;
        }

        .metrics-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateDisplay();
  }

  /**
   * Update the display with current data.
   */
  private updateDisplay(): void {
    if (!this._data) return;

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(n);

    const formatCurrencyFull = (n: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(n);

    const formatPercent = (n: number, decimals = 1) => `${n.toFixed(decimals)}%`;

    // Determine overall status
    const isSuccess = this._data.bbdSuccessRate >= SUCCESS_THRESHOLD;
    const isSafetyGood = this._data.marginCallProbability <= MARGIN_CALL_THRESHOLD;

    // Update hero banner
    const heroBanner = this.$('#hero-banner');
    const heroTitle = this.$('#hero-title');
    const heroLogo = this.$('#hero-logo') as HTMLImageElement;
    const heroEmoji = this.$('#hero-emoji') as HTMLSpanElement;

    if (heroBanner) {
      heroBanner.classList.remove('status-success', 'status-warning');
      heroBanner.classList.add(isSuccess ? 'status-success' : 'status-warning');
    }
    if (heroTitle) {
      heroTitle.innerHTML = isSuccess
        ? '<span class="brand">eVelo</span><span class="suffix">city</span> Unlocked!'
        : 'Not ready yet, but keep it going!';
    }
    // Show logo for success, muscle arm emoji for warning
    if (heroLogo) {
      heroLogo.style.display = isSuccess ? 'block' : 'none';
    }
    if (heroEmoji) {
      heroEmoji.style.display = isSuccess ? 'none' : 'block';
    }

    // Update alert card
    const alertCard = this.$('#alert-card');
    const alertIcon = this.$('#alert-icon');
    const alertTitle = this.$('#alert-title');
    const alertDescription = this.$('#alert-description');

    if (alertCard) {
      alertCard.classList.remove('alert-success', 'alert-warning');
      alertCard.classList.add(isSuccess ? 'alert-success' : 'alert-warning');
    }
    if (alertIcon) {
      alertIcon.classList.remove('icon-success', 'icon-warning');
      alertIcon.classList.add(isSuccess ? 'icon-success' : 'icon-warning');
    }
    if (alertTitle) {
      alertTitle.classList.remove('title-success', 'title-warning');
      alertTitle.classList.add(isSuccess ? 'title-success' : 'title-warning');
      alertTitle.textContent = isSuccess ? 'Strategy On Track' : 'Monitor Closely';
    }
    if (alertDescription) {
      const timeHorizon = this._data.timeHorizon || 30;
      if (isSuccess) {
        const marginNote = this._data.marginCallProbability > 10
          ? ` Note: ${this._data.marginCallProbability.toFixed(1)}% margin call probability - consider a cash buffer.`
          : '';
        alertDescription.textContent = `Your ${timeHorizon}-year strategy shows strong fundamentals with ${this._data.bbdSuccessRate.toFixed(1)}% success rate.${marginNote}`;
      } else {
        alertDescription.textContent = `${this._data.bbdSuccessRate.toFixed(1)}% success rate is below 80% target. ${this._data.marginCallProbability.toFixed(1)}% margin call probability adds risk. Consider reducing withdrawals or adjusting leverage.`;
      }
    }

    // Update Strategy Success card
    const strategyAccent = this.$('#strategy-accent');
    const strategyBadge = this.$('#strategy-badge');
    const strategyBadgeIcon = this.$('#strategy-badge-icon');
    const strategyFooter = this.$('#strategy-footer');
    const strategyFooterIcon = this.$('#strategy-footer-icon');
    const strategyFooterText = this.$('#strategy-footer-text');

    if (strategyAccent) {
      strategyAccent.classList.remove('accent-success', 'accent-warning');
      strategyAccent.classList.add(isSuccess ? 'accent-success' : 'accent-warning');
    }
    if (strategyBadge) {
      strategyBadge.classList.remove('badge-success', 'badge-warning');
      strategyBadge.classList.add(isSuccess ? 'badge-success' : 'badge-warning');
    }
    if (strategyBadgeIcon) {
      strategyBadgeIcon.classList.remove('icon-check', 'icon-warning');
      strategyBadgeIcon.classList.add(isSuccess ? 'icon-check' : 'icon-warning');
    }
    if (strategyFooterIcon) {
      strategyFooterIcon.classList.remove('icon-clock', 'icon-arrow-up');
      strategyFooterIcon.classList.add(isSuccess ? 'icon-arrow-up' : 'icon-clock');
    }
    if (strategyFooterText) {
      if (isSuccess) {
        strategyFooterText.innerHTML = `Target: <span class="success-value">80% exceeded</span>`;
      } else {
        const gap = (SUCCESS_THRESHOLD - this._data.bbdSuccessRate).toFixed(1);
        strategyFooterText.innerHTML = `Target: 80% · Gap: <span class="gap-value">${gap}%</span>`;
      }
    }

    // Strategy Success card values
    const bbdSuccess = this.$('#bbd-success');
    const bbdSuccessUnit = this.$('#bbd-success-unit');
    const vsSellSuccess = this.$('#vs-sell-success');
    const sellSuccessRate = this.$('#sell-success-rate');
    const medianUtil = this.$('#median-utilization');
    const yearsAbove70 = this.$('#years-above-70');

    if (bbdSuccess) {
      bbdSuccess.textContent = this._data.bbdSuccessRate.toFixed(1);
      bbdSuccess.classList.remove('value-success', 'value-warning');
      bbdSuccess.classList.add(isSuccess ? 'value-success' : 'value-warning');
    }
    if (bbdSuccessUnit) {
      bbdSuccessUnit.classList.remove('unit-success', 'unit-warning');
      bbdSuccessUnit.classList.add(isSuccess ? 'unit-success' : 'unit-warning');
    }
    if (vsSellSuccess) {
      const diff = this._data.bbdSuccessRate - this._data.sellSuccessRate;
      vsSellSuccess.textContent = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
    }
    if (sellSuccessRate) sellSuccessRate.textContent = formatPercent(this._data.sellSuccessRate);
    if (medianUtil) medianUtil.textContent = formatPercent(this._data.medianUtilization);
    if (yearsAbove70) yearsAbove70.textContent = this._data.yearsAbove70Pct.toFixed(1);

    // Portfolio Growth card
    const cagr = this.$('#cagr');
    const startingValue = this.$('#starting-value');
    const medianTerminal = this.$('#median-terminal');
    const vsSellTerminal = this.$('#vs-sell-terminal');
    const sellTerminal = this.$('#sell-terminal');
    const p10Outcome = this.$('#p10-outcome');

    if (cagr) cagr.textContent = (this._data.cagr * 100).toFixed(1);
    if (startingValue) startingValue.textContent = formatCurrencyFull(this._data.startingValue);
    if (medianTerminal) medianTerminal.textContent = formatCurrencyFull(this._data.medianTerminal);
    if (vsSellTerminal) {
      const diff = this._data.medianTerminal - this._data.sellTerminal;
      const pctDiff = ((diff / this._data.sellTerminal) * 100).toFixed(1);
      vsSellTerminal.textContent = `+${formatCurrencyFull(diff)} (${pctDiff}%)`;
    }
    if (sellTerminal) sellTerminal.textContent = formatCurrencyFull(this._data.sellTerminal);
    if (p10Outcome) {
      p10Outcome.textContent = formatCurrencyFull(this._data.p10Outcome);
      p10Outcome.classList.toggle('negative', this._data.p10Outcome < 0);
    }

    // Update Leverage Safety card
    const safetyAccent = this.$('#safety-accent');
    const safetyBadge = this.$('#safety-badge');
    const safetyBadgeIcon = this.$('#safety-badge-icon');

    if (safetyAccent) {
      safetyAccent.classList.remove('accent-success', 'accent-warning');
      safetyAccent.classList.add(isSafetyGood ? 'accent-success' : 'accent-warning');
    }
    if (safetyBadge) {
      safetyBadge.classList.remove('badge-success', 'badge-warning');
      safetyBadge.classList.add(isSafetyGood ? 'badge-success' : 'badge-warning');
    }
    if (safetyBadgeIcon) {
      safetyBadgeIcon.classList.remove('icon-check', 'icon-warning');
      safetyBadgeIcon.classList.add(isSafetyGood ? 'icon-check' : 'icon-warning');
    }

    // Leverage Safety card values
    const marginCallProb = this.$('#margin-call-prob');
    const marginCallUnit = this.$('#margin-call-unit');
    const peakUtil = this.$('#peak-utilization');
    const safetyBuffer = this.$('#safety-buffer');
    const medianUtilSafety = this.$('#median-util-safety');
    const yearsAbove70Safety = this.$('#years-above-70-safety');
    const dangerousYear = this.$('#dangerous-year');

    if (marginCallProb) {
      marginCallProb.textContent = this._data.marginCallProbability.toFixed(1);
      marginCallProb.classList.remove('value-success', 'value-warning');
      marginCallProb.classList.add(isSafetyGood ? 'value-success' : 'value-warning');
    }
    if (marginCallUnit) {
      marginCallUnit.classList.remove('unit-success', 'unit-warning');
      marginCallUnit.classList.add(isSafetyGood ? 'unit-success' : 'unit-warning');
    }
    if (peakUtil) peakUtil.textContent = formatPercent(this._data.peakUtilizationP90);
    if (safetyBuffer) safetyBuffer.textContent = formatPercent(this._data.safetyBufferP10);
    if (medianUtilSafety) medianUtilSafety.textContent = formatPercent(this._data.medianUtilization);
    if (yearsAbove70Safety) yearsAbove70Safety.textContent = this._data.yearsAbove70Pct.toFixed(1);
    if (dangerousYear) dangerousYear.textContent = this._data.mostDangerousYear.toString();
  }
}

// Register the custom element
customElements.define('key-metrics-banner', KeyMetricsBanner);
