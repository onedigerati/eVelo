/**
 * Welcome Screen Web Component
 *
 * Displays when the app first loads and no simulation has been run yet.
 * Introduces the Buy-Borrow-Die (BBD) wealth strategy with:
 * - Hero section with title and subtitle
 * - Three-step BBD explanation (Buy, Borrow, Die)
 * - Benefits and risks grid
 * - CTA buttons for quick-start and user guide
 * - Educational disclaimer
 *
 * @module components/ui/welcome-screen
 */

import { BaseComponent } from '../base-component';

/**
 * Welcome screen component for first-time users.
 *
 * @example
 * ```html
 * <welcome-screen></welcome-screen>
 *
 * <script>
 *   const welcome = document.querySelector('welcome-screen');
 *   welcome.addEventListener('quick-start', () => {
 *     // Navigate to simulation setup
 *   });
 *   welcome.addEventListener('show-guide', () => {
 *     // Open user guide
 *   });
 * </script>
 * ```
 *
 * @fires quick-start - Dispatched when "Run Your First Simulation" button is clicked
 * @fires show-guide - Dispatched when "View User Guide" button is clicked
 */
export class WelcomeScreen extends BaseComponent {
  protected template(): string {
    return `
      <div class="welcome-container">
        <!-- Hero Section -->
        <header class="hero-section">
          <img src="/logo.png" alt="eVelo logo" class="hero-logo" />
          <h1 class="hero-title">Welcome to eVelo Portfolio Simulator</h1>
          <p class="hero-subtitle">
            Explore the Buy-Borrow-Die wealth strategy through Monte Carlo simulation.
            Understand the potential benefits and risks before making financial decisions.
          </p>
        </header>

        <!-- BBD Explanation Section -->
        <section class="bbd-section">
          <h2 class="section-title">The Buy-Borrow-Die Strategy</h2>
          <p class="section-description">
            A three-step wealth preservation approach used by high-net-worth individuals
            to minimize taxes while maintaining access to funds.
          </p>

          <div class="step-cards">
            <!-- Step 1: Buy -->
            <div class="step-card">
              <div class="step-icon">&#x1F4C8;</div>
              <h3 class="step-title">Buy</h3>
              <p class="step-description">
                Purchase appreciating assets (stocks, real estate).
                Hold long-term to maximize growth and defer capital gains taxes.
              </p>
            </div>

            <!-- Step 2: Borrow -->
            <div class="step-card">
              <div class="step-icon">&#x1F3E6;</div>
              <h3 class="step-title">Borrow</h3>
              <p class="step-description">
                Access cash via securities-backed lines of credit (SBLOC).
                Loan proceeds are not taxable income.
              </p>
            </div>

            <!-- Step 3: Die -->
            <div class="step-card">
              <div class="step-icon">&#x2696;</div>
              <h3 class="step-title">Die</h3>
              <p class="step-description">
                Heirs inherit assets with stepped-up cost basis under current tax law,
                potentially avoiding capital gains tax on appreciation.
              </p>
            </div>
          </div>
        </section>

        <!-- Benefits & Risks Section -->
        <section class="benefits-risks-section">
          <div class="benefits-column">
            <h3 class="column-title benefits-title">Potential Benefits</h3>
            <ul class="feature-list">
              <li class="feature-item">
                <span class="feature-icon">&#x2714;</span>
                <span class="feature-text">No capital gains tax on borrowed funds</span>
              </li>
              <li class="feature-item">
                <span class="feature-icon">&#x2714;</span>
                <span class="feature-text">Portfolio continues compounding uninterrupted</span>
              </li>
              <li class="feature-item">
                <span class="feature-icon">&#x2714;</span>
                <span class="feature-text">Stepped-up basis at death eliminates embedded gains</span>
              </li>
              <li class="feature-item">
                <span class="feature-icon">&#x2714;</span>
                <span class="feature-text">Maintain control over investment decisions</span>
              </li>
            </ul>
          </div>

          <div class="risks-column">
            <h3 class="column-title risks-title">Key Risks</h3>
            <ul class="feature-list">
              <li class="feature-item">
                <span class="feature-icon warning">&#x26A0;</span>
                <span class="feature-text">Margin calls if portfolio drops significantly</span>
              </li>
              <li class="feature-item">
                <span class="feature-icon warning">&#x26A0;</span>
                <span class="feature-text">Interest accrues on borrowed funds over time</span>
              </li>
              <li class="feature-item">
                <span class="feature-icon warning">&#x26A0;</span>
                <span class="feature-text">Forced liquidation in severe market downturns</span>
              </li>
              <li class="feature-item">
                <span class="feature-icon warning">&#x26A0;</span>
                <span class="feature-text">Tax law changes could reduce or eliminate benefits</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
          <button class="cta-button primary" id="quick-start-btn">
            Run Your First Simulation
          </button>
          <button class="cta-button secondary" id="show-guide-btn">
            View User Guide
          </button>
        </section>

        <!-- Disclaimer Section -->
        <aside class="disclaimer-section">
          <div class="disclaimer-icon">&#x26A0;</div>
          <div class="disclaimer-content">
            <strong>Educational Purposes Only</strong>
            <p>
              This simulator is for educational purposes only. It does not constitute
              financial, tax, or legal advice. Consult qualified tax and financial
              advisors before implementing any tax strategy.
            </p>
          </div>
        </aside>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .welcome-container {
        max-width: 900px;
        margin: 0 auto;
        padding: var(--spacing-xl, 32px);
      }

      /* Hero Section */
      .hero-section {
        text-align: center;
        margin-bottom: var(--spacing-xl, 32px);
      }

      .hero-logo {
        width: 120px;
        height: 120px;
        margin-bottom: var(--spacing-lg, 24px);
        animation: logoEntrance 0.8s ease-out;
        transition: transform 0.3s ease, filter 0.3s ease;
        cursor: pointer;
      }

      .hero-logo:hover {
        transform: scale(1.1) rotate(5deg);
        filter: drop-shadow(0 8px 24px rgba(13, 148, 136, 0.4));
      }

      @keyframes logoEntrance {
        0% {
          opacity: 0;
          transform: scale(0.5) rotate(-180deg);
        }
        60% {
          opacity: 1;
          transform: scale(1.1) rotate(10deg);
        }
        100% {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
      }

      .hero-title {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary, #1e293b);
        line-height: 1.2;
      }

      .hero-subtitle {
        margin: 0;
        font-size: var(--font-size-lg, 1.25rem);
        color: var(--text-secondary, #64748b);
        line-height: 1.6;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }

      /* BBD Section */
      .bbd-section {
        margin-bottom: var(--spacing-xl, 32px);
      }

      .section-title {
        margin: 0 0 var(--spacing-sm, 8px) 0;
        font-size: var(--font-size-lg, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        text-align: center;
      }

      .section-description {
        margin: 0 0 var(--spacing-lg, 24px) 0;
        font-size: var(--font-size-md, 1rem);
        color: var(--text-secondary, #64748b);
        text-align: center;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }

      /* Step Cards */
      .step-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-lg, 24px);
      }

      .step-card {
        background: #f0fdfa;
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-lg, 24px);
        text-align: center;
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .step-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      .step-icon {
        font-size: 2.5rem;
        margin-bottom: var(--spacing-md, 16px);
        line-height: 1;
      }

      .step-title {
        margin: 0 0 var(--spacing-sm, 8px) 0;
        font-size: var(--font-size-lg, 1.25rem);
        font-weight: 600;
        color: var(--color-primary, #0d9488);
      }

      .step-description {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        line-height: 1.6;
      }

      /* Benefits & Risks Section */
      .benefits-risks-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-lg, 24px);
        margin-bottom: var(--spacing-xl, 32px);
      }

      .benefits-column,
      .risks-column {
        background: var(--surface-secondary, #f8fafc);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-lg, 24px);
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .benefits-column:hover,
      .risks-column:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      .column-title {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-md, 1rem);
        font-weight: 600;
      }

      .benefits-title {
        color: #059669;
      }

      .risks-title {
        color: #f59e0b;
      }

      .feature-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .feature-item {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-sm, 8px);
      }

      .feature-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        color: #059669;
      }

      .feature-icon.warning {
        color: #f59e0b;
      }

      .feature-text {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-primary, #1e293b);
        line-height: 1.5;
      }

      /* CTA Section */
      .cta-section {
        display: flex;
        justify-content: center;
        gap: var(--spacing-md, 16px);
        margin-bottom: var(--spacing-xl, 32px);
      }

      .cta-button {
        padding: var(--spacing-md, 16px) var(--spacing-xl, 32px);
        font-size: var(--font-size-md, 1rem);
        font-weight: 600;
        border-radius: var(--border-radius-md, 8px);
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
      }

      .cta-button.primary {
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
        border-color: var(--color-primary, #0d9488);
      }

      .cta-button.primary:hover {
        background: var(--color-primary-hover, #0f766e);
        border-color: var(--color-primary-hover, #0f766e);
      }

      .cta-button.secondary {
        background: transparent;
        color: var(--color-primary, #0d9488);
        border-color: var(--color-primary, #0d9488);
      }

      .cta-button.secondary:hover {
        background: #f0fdfa;
      }

      .cta-button:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.3);
      }

      /* Disclaimer Section */
      .disclaimer-section {
        display: flex;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-md, 16px);
        background: #fffbeb;
        border-left: 4px solid #f59e0b;
        border-radius: 0 var(--border-radius-md, 8px) var(--border-radius-md, 8px) 0;
      }

      .disclaimer-icon {
        flex-shrink: 0;
        font-size: 1.5rem;
        color: #f59e0b;
      }

      .disclaimer-content {
        flex: 1;
      }

      .disclaimer-content strong {
        display: block;
        margin-bottom: var(--spacing-xs, 4px);
        font-size: var(--font-size-sm, 0.875rem);
        color: #92400e;
      }

      .disclaimer-content p {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: #78350f;
        line-height: 1.5;
      }

      /* Responsive: Mobile */
      @media (max-width: 768px) {
        .welcome-container {
          padding: var(--spacing-lg, 24px);
        }

        .hero-logo {
          width: 80px;
          height: 80px;
        }

        .hero-title {
          font-size: 1.5rem;
        }

        .hero-subtitle {
          font-size: var(--font-size-md, 1rem);
        }

        .step-cards {
          grid-template-columns: 1fr;
        }

        .benefits-risks-section {
          grid-template-columns: 1fr;
        }

        .cta-section {
          flex-direction: column;
          align-items: stretch;
        }

        .cta-button {
          text-align: center;
        }
      }

      /* Dark theme adjustments */
      [data-theme="dark"] .step-card {
        background: rgba(13, 148, 136, 0.1);
      }

      [data-theme="dark"] .disclaimer-section {
        background: rgba(245, 158, 11, 0.1);
      }

      [data-theme="dark"] .disclaimer-content strong,
      [data-theme="dark"] .disclaimer-content p {
        color: #fcd34d;
      }

      [data-theme="dark"] .cta-button.secondary:hover {
        background: rgba(13, 148, 136, 0.1);
      }
    `;
  }

  protected override afterRender(): void {
    // Set up quick-start button click handler
    const quickStartBtn = this.$('#quick-start-btn');
    if (quickStartBtn) {
      quickStartBtn.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('quick-start', { bubbles: true, composed: true })
        );
      });
    }

    // Set up show-guide button click handler
    const showGuideBtn = this.$('#show-guide-btn');
    if (showGuideBtn) {
      showGuideBtn.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('show-guide', { bubbles: true, composed: true })
        );
      });
    }
  }

  /**
   * Show the welcome screen.
   */
  public show(): void {
    this.style.display = 'block';
  }

  /**
   * Hide the welcome screen.
   */
  public hide(): void {
    this.style.display = 'none';
  }
}

// Register the custom element
customElements.define('welcome-screen', WelcomeScreen);
