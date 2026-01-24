# Phase 17: Welcome Page & User Guide - Research

**Researched:** 2026-01-23
**Domain:** Onboarding UX, financial education content, help system architecture, empty states, progressive disclosure
**Confidence:** MEDIUM

## Summary

Research focused on implementing a welcoming first-run experience with Buy-Borrow-Die strategy education, quick-start guidance, and comprehensive user guide for the eVelo financial calculator. The goal is to transform the empty dashboard state into an engaging introduction that educates users about the BBD strategy and guides them to their first simulation.

The eVelo codebase already has excellent UI infrastructure: `help-section` component for expandable content, `modal-dialog` for overlays, `help-tooltip` for inline help (WCAG 1.4.13 compliant from Phase 9), and consistent Web Components patterns. The primary challenge is creating accurate, clear financial education content about Buy-Borrow-Die without misleading users, then structuring it with progressive disclosure patterns for complex parameter documentation.

**Primary recommendation:** Create a dedicated `welcome-screen` component that displays when no simulation has been run (empty state pattern). Use modal dialog for the comprehensive user guide (accessible via header button). Structure BBD explanation with visual hierarchy: hero introduction → three-step breakdown (Buy, Borrow, Die) → benefits/risks → quick-start CTA. Document parameters using accordion pattern (already implemented in `help-section`). Ensure all financial claims are accurate and include appropriate disclaimers.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Components | Native | Component architecture | Already project foundation; `help-section`, `modal-dialog` exist |
| CSS Grid | Native | Layout for hero section | Responsive empty state layouts; baseline since March 2017 |
| `help-section` | Existing | Expandable documentation | Already in project (lines 404-412 in app-root.ts); accordion pattern |
| `modal-dialog` | Existing | User guide overlay | Already in project; accessible overlay with blur backdrop |
| Progressive disclosure | Pattern | Complex info presentation | Standard UX pattern for parameter docs; reduces cognitive load |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `help-tooltip` | Existing | Inline parameter help | Already in project (Phase 9); WCAG 1.4.13 compliant |
| sessionStorage | Native | Track first-run state | Persist "has seen welcome" flag; survives refresh but clears on session end |
| CSS `@starting-style` | Native | Entry animations | Optional for welcome screen fade-in (baseline since March 2024) |
| Markdown parser | None | Formatted help content | Don't add dependency; use HTML in template literals instead |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated welcome component | Tour overlay (shepherd.js, driver.js) | Tours interrupt workflow; empty state is less intrusive |
| Modal for user guide | Dedicated /guide route | Modal keeps context; route requires navigation state management |
| sessionStorage | localStorage | sessionStorage clears on session end (appropriate for "first-run" flag) |
| Inline HTML content | External Markdown files | Markdown adds parser dependency; HTML in templates is simpler |

**Installation:**
No new dependencies required. All features use native Web APIs and existing components (`help-section`, `modal-dialog`, `help-tooltip`).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── ui/
│       ├── welcome-screen.ts      # NEW: Empty state hero with BBD intro
│       ├── user-guide-modal.ts    # NEW: Comprehensive documentation modal
│       ├── help-section.ts        # EXISTING: Accordion for parameters
│       ├── modal-dialog.ts        # EXISTING: Base modal (use for guide)
│       └── help-tooltip.ts        # EXISTING: Inline help (Phase 9)
├── content/
│   └── guide-content.ts           # NEW: Help text and parameter docs
└── services/
    └── onboarding-service.ts      # NEW: Track first-run state
```

### Pattern 1: Empty State Welcome Screen
**What:** Display welcome content when no simulation has been run; hide when results exist
**When to use:** First-run experience, empty dashboard state

**Example:**
```typescript
// Source: Empty state pattern from Mobbin, Carbon Design System
class WelcomeScreen extends BaseComponent {
  protected template(): string {
    return `
      <div class="welcome-hero">
        <h1>Welcome to eVelo Portfolio Simulator</h1>
        <p class="subtitle">Model the Buy-Borrow-Die tax optimization strategy</p>

        <div class="bbd-steps">
          <div class="step">
            <span class="step-icon">📈</span>
            <h3>Buy</h3>
            <p>Purchase appreciating assets (stocks, real estate)</p>
          </div>
          <div class="step">
            <span class="step-icon">🏦</span>
            <h3>Borrow</h3>
            <p>Use securities-backed lines of credit for tax-free income</p>
          </div>
          <div class="step">
            <span class="step-icon">⚖️</span>
            <h3>Die</h3>
            <p>Heirs inherit with stepped-up basis, avoiding capital gains tax</p>
          </div>
        </div>

        <button class="cta-primary">Run Your First Simulation</button>
        <button class="cta-secondary">Learn More</button>
      </div>
    `;
  }

  // Hide when simulation results exist
  public hide(): void {
    this.style.display = 'none';
    sessionStorage.setItem('hasRunSimulation', 'true');
  }
}
```

### Pattern 2: User Guide Modal with Progressive Disclosure
**What:** Comprehensive documentation in overlay modal, using accordions for parameter sections
**When to use:** Detailed help that shouldn't interrupt workflow

**Example:**
```typescript
// Source: Modal pattern from existing modal-dialog.ts
class UserGuideModal extends BaseComponent {
  protected template(): string {
    return `
      <modal-dialog id="guide-modal">
        <div class="guide-content">
          <h1>User Guide</h1>

          <help-section title="Getting Started" open>
            <p>This simulator models the Buy-Borrow-Die strategy...</p>
          </help-section>

          <help-section title="Portfolio Parameters">
            <dl class="param-list">
              <dt>Initial Investment</dt>
              <dd>Starting portfolio value. Typical range: $1M-$100M</dd>

              <dt>Asset Allocation</dt>
              <dd>Distribution across stocks, bonds, gold. Affects volatility...</dd>
            </dl>
          </help-section>

          <help-section title="SBLOC Terms">
            <p>Securities-backed line of credit parameters...</p>
          </help-section>

          <help-section title="Understanding Charts">
            <p>How to interpret simulation results...</p>
          </help-section>
        </div>
      </modal-dialog>
    `;
  }

  public show(): void {
    const modal = this.$('#guide-modal') as ModalDialog;
    modal?.show({ type: 'confirm', title: 'User Guide' });
  }
}
```

### Pattern 3: BBD Strategy Education Content
**What:** Accurate, clear explanation of Buy-Borrow-Die tax strategy without misleading claims
**When to use:** Welcome screen, user guide introduction

**Key principles (from research):**
- **Factual accuracy:** BBD is legal but under policy scrutiny (California Billionaire Tax Act, TCJA extension debates)
- **Risk disclosure:** Must mention margin call risk, forced liquidation, market volatility
- **Appropriate audience:** Strategy designed for high-net-worth individuals ($5M+ portfolios)
- **No tax advice:** Include disclaimer to consult tax professionals

**Example:**
```typescript
// content/guide-content.ts
export const BBD_INTRO = `
The Buy-Borrow-Die strategy is a wealth preservation technique used by high-net-worth
individuals to minimize lifetime tax burden:

1. **Buy**: Invest in appreciating assets (stocks, bonds, real estate) and hold long-term
2. **Borrow**: Access cash via securities-backed lines of credit (SBLOC) instead of selling
3. **Die**: Heirs inherit assets with stepped-up basis, potentially avoiding capital gains tax

**Key Benefits:**
- No capital gains tax on borrowed funds (loan proceeds are not taxable income)
- Portfolio continues compounding without tax drag from sales
- Stepped-up basis eliminates unrealized gains at death (current tax code)

**Important Risks:**
- Margin calls if portfolio value drops (loan-to-value exceeds threshold)
- Interest accrues on borrowed funds (typically SOFR + 1-3%)
- Forced liquidation in severe market downturns
- Tax law changes could eliminate step-up basis (under policy debate)

**Disclaimer:** This simulator is for educational purposes only. Consult qualified tax
and financial advisors before implementing any tax strategy.
`;
```

### Pattern 4: Quick-Start Guidance with Preset Selection
**What:** Guide users to their first simulation with recommended starting parameters
**When to use:** Welcome screen CTA, new user flow

**Example:**
```typescript
// Source: Fintech onboarding best practices (Verified.inc, UserGuiding)
class QuickStartGuide extends BaseComponent {
  protected template(): string {
    return `
      <div class="quick-start">
        <h2>Run Your First Simulation</h2>
        <p>Choose a starting scenario:</p>

        <div class="preset-cards">
          <button class="preset-card" data-preset="conservative">
            <h3>Conservative Approach</h3>
            <ul>
              <li>60% bonds, 30% stocks, 10% gold</li>
              <li>50% max LTV (safer margin)</li>
              <li>$200K annual withdrawal</li>
            </ul>
          </button>

          <button class="preset-card" data-preset="balanced">
            <h3>Balanced Strategy</h3>
            <ul>
              <li>60% stocks, 30% bonds, 10% gold</li>
              <li>65% max LTV (standard)</li>
              <li>$200K annual withdrawal</li>
            </ul>
          </button>

          <button class="preset-card" data-preset="aggressive">
            <h3>Growth-Focused</h3>
            <ul>
              <li>80% stocks, 15% bonds, 5% gold</li>
              <li>70% max LTV (higher risk)</li>
              <li>$250K annual withdrawal</li>
            </ul>
          </button>
        </div>

        <p class="help-text">After running a simulation, explore the parameters to model your own scenario.</p>
      </div>
    `;
  }
}
```

### Anti-Patterns to Avoid
- **Overpromising tax benefits:** BBD is under scrutiny; avoid "guaranteed tax-free" language
- **Multi-step tour overlays:** Users skip tours; empty state is more effective
- **Hiding welcome behind "Don't show again":** Use natural state (hide when results exist) instead
- **Technical jargon without explanation:** Define SBLOC, LTV, margin call, step-up basis clearly
- **Burying important disclaimers:** Tax/legal disclaimer must be prominent
- **Long-form content without progressive disclosure:** Use accordions for parameter docs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Expandable documentation sections | Custom collapsible divs | `help-section` component | Already in project; handles keyboard nav, ARIA roles |
| Overlay modal for user guide | Custom modal implementation | `modal-dialog` component | Already in project; accessible, keyboard-friendly, blur backdrop |
| Inline parameter tooltips | Custom tooltip positioning | `help-tooltip` component | Already in project (Phase 9); WCAG 1.4.13 compliant |
| First-run state tracking | Cookie-based tracking | sessionStorage flag | Simpler; clears on session end (appropriate for first-run) |
| Markdown rendering | Add marked.js or similar | HTML in template literals | Avoid dependency; templates support HTML already |

**Key insight:** eVelo already has all the UI primitives needed for welcome/guide implementation. Don't add libraries or rebuild existing components - compose from `help-section`, `modal-dialog`, `help-tooltip`.

## Common Pitfalls

### Pitfall 1: Inaccurate BBD Strategy Claims
**What goes wrong:** Misleading users about tax benefits, legality, or applicability
**Why it happens:** Simplified explanations omit important nuances and risks
**How to avoid:** Verify all financial claims with authoritative sources; include risk disclosures; add tax advisor disclaimer
**Warning signs:** Claims like "completely tax-free," "guaranteed savings," "no risk"

**Prevention checklist:**
- [ ] Step-up basis explained as *current* tax law (subject to change)
- [ ] Margin call risk and forced liquidation mentioned prominently
- [ ] SBLOC interest costs acknowledged (not truly "free" money)
- [ ] Appropriate audience noted (high-net-worth, $5M+ portfolios)
- [ ] Disclaimer to consult tax professionals included

### Pitfall 2: Welcome Screen Never Dismisses
**What goes wrong:** Welcome screen keeps appearing even after user has run simulations
**Why it happens:** No state tracking for "has seen welcome" or "has results"
**How to avoid:** Track simulation state; hide welcome when results exist; use sessionStorage for first-run flag
**Warning signs:** Welcome reappears on every page refresh

**Solution:**
```typescript
// In app-root.ts afterRender()
const welcomeScreen = this.$('welcome-screen');
const hasResults = this._simulationResult !== null;
const hasRunBefore = sessionStorage.getItem('hasRunSimulation') === 'true';

if (hasResults || hasRunBefore) {
  welcomeScreen?.hide();
}
```

### Pitfall 3: User Guide Too Long Without Structure
**What goes wrong:** Single long-scrolling modal overwhelms users; no clear sections
**Why it happens:** Dumping all documentation into one modal without progressive disclosure
**How to avoid:** Use accordion pattern (`help-section` components) to group topics; allow users to expand only what they need
**Warning signs:** User guide requires excessive scrolling; users can't find specific topics

### Pitfall 4: Empty State Without Clear Call-to-Action
**What goes wrong:** Welcome screen is informative but doesn't guide users to action
**Why it happens:** Missing or unclear CTA buttons; no obvious "next step"
**How to avoid:** Prominent "Run Your First Simulation" button; optional "Learn More" for user guide
**Warning signs:** Users read welcome but don't know what to do next

**Best practice:**
- Primary CTA: "Run Your First Simulation" (triggers preset selection or loads default params)
- Secondary CTA: "View User Guide" (opens modal)
- Tertiary CTA: "Skip to Dashboard" (hides welcome, shows empty results state)

### Pitfall 5: User Guide Opens in Modal on Mobile
**What goes wrong:** Modal overlays on small screens make content hard to read and navigate
**Why it happens:** Same modal implementation for desktop and mobile
**How to avoid:** Consider dedicated route for mobile (`/guide`) or full-screen modal variant
**Warning signs:** Modal exceeds viewport height; scrolling is awkward on mobile

**Solution options:**
1. Full-screen modal on mobile (height: 100vh, scrollable body)
2. Dedicated `/guide` route (simpler for mobile, adds routing complexity)
3. Hybrid: Modal on desktop, route on mobile (detect with media query)

### Pitfall 6: Financial Jargon Without Definitions
**What goes wrong:** Users encounter terms like "LTV," "SBLOC," "step-up basis" without explanation
**Why it happens:** Assuming financial literacy; not providing inline definitions
**How to avoid:** Use `help-tooltip` for inline definitions; include glossary section in user guide
**Warning signs:** Support requests asking "what is SBLOC?"

**Solution:**
```typescript
// In parameter labels
<label>
  Max LTV / Hard Margin
  <help-tooltip content="Loan-to-Value ratio. Maximum percentage of portfolio value you can borrow."></help-tooltip>
</label>
```

## Code Examples

Verified patterns from official sources:

### Welcome Screen Component
```typescript
// Source: Empty state patterns from Carbon Design System, Mobbin
import { BaseComponent } from '../base-component';

export class WelcomeScreen extends BaseComponent {
  protected template(): string {
    return `
      <div class="welcome-container">
        <div class="welcome-hero">
          <h1 class="hero-title">Welcome to eVelo Portfolio Simulator</h1>
          <p class="hero-subtitle">
            Model the Buy-Borrow-Die tax optimization strategy with Monte Carlo simulation
          </p>
        </div>

        <div class="bbd-explanation">
          <h2>What is Buy-Borrow-Die?</h2>
          <div class="bbd-steps">
            <div class="step-card">
              <div class="step-icon">📈</div>
              <h3>Buy</h3>
              <p>Purchase appreciating assets like stocks and real estate. Hold long-term to maximize growth.</p>
            </div>
            <div class="step-card">
              <div class="step-icon">🏦</div>
              <h3>Borrow</h3>
              <p>Access cash via securities-backed lines of credit (SBLOC) instead of selling. Loan proceeds are not taxable income.</p>
            </div>
            <div class="step-card">
              <div class="step-icon">⚖️</div>
              <h3>Die</h3>
              <p>Heirs inherit assets with stepped-up basis, potentially avoiding capital gains tax on appreciation.</p>
            </div>
          </div>
        </div>

        <div class="benefits-risks">
          <div class="benefits">
            <h3>Key Benefits</h3>
            <ul>
              <li>No capital gains tax on borrowed funds</li>
              <li>Portfolio continues compounding without tax drag</li>
              <li>Stepped-up basis at death (under current tax law)</li>
            </ul>
          </div>
          <div class="risks">
            <h3>Important Risks</h3>
            <ul>
              <li>Margin calls if portfolio value drops</li>
              <li>Interest accrues on borrowed funds</li>
              <li>Forced liquidation in severe downturns</li>
              <li>Tax law changes may eliminate step-up basis</li>
            </ul>
          </div>
        </div>

        <div class="cta-section">
          <button class="btn-primary" id="quick-start-btn">
            Run Your First Simulation
          </button>
          <button class="btn-secondary" id="learn-more-btn">
            View User Guide
          </button>
        </div>

        <p class="disclaimer">
          <strong>Disclaimer:</strong> This simulator is for educational purposes only.
          Consult qualified tax and financial advisors before implementing any tax strategy.
        </p>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        max-width: 900px;
        margin: 0 auto;
        padding: var(--spacing-xl, 32px);
      }

      .welcome-hero {
        text-align: center;
        margin-bottom: var(--spacing-xl, 32px);
      }

      .hero-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--text-primary, #1e293b);
        margin-bottom: var(--spacing-sm, 8px);
      }

      .hero-subtitle {
        font-size: 1.25rem;
        color: var(--text-secondary, #64748b);
      }

      .bbd-steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--spacing-lg, 24px);
        margin: var(--spacing-xl, 32px) 0;
      }

      .step-card {
        padding: var(--spacing-lg, 24px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--border-radius-lg, 12px);
        text-align: center;
      }

      .step-icon {
        font-size: 3rem;
        margin-bottom: var(--spacing-sm, 8px);
      }

      .step-card h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-primary, #0d9488);
        margin-bottom: var(--spacing-sm, 8px);
      }

      .benefits-risks {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--spacing-lg, 24px);
        margin: var(--spacing-xl, 32px) 0;
      }

      .benefits, .risks {
        padding: var(--spacing-lg, 24px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
      }

      .benefits h3 {
        color: var(--color-success, #059669);
      }

      .risks h3 {
        color: var(--color-warning, #f59e0b);
      }

      .cta-section {
        display: flex;
        gap: var(--spacing-md, 16px);
        justify-content: center;
        margin: var(--spacing-xl, 32px) 0;
      }

      .btn-primary, .btn-secondary {
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        border-radius: var(--border-radius-md, 8px);
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: var(--color-primary, #0d9488);
        color: white;
        border: none;
      }

      .btn-primary:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .btn-secondary {
        background: transparent;
        color: var(--color-primary, #0d9488);
        border: 2px solid var(--color-primary, #0d9488);
      }

      .btn-secondary:hover {
        background: var(--color-primary, #0d9488);
        color: white;
      }

      .disclaimer {
        text-align: center;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        font-style: italic;
        margin-top: var(--spacing-xl, 32px);
        padding: var(--spacing-md, 16px);
        background: var(--surface-tertiary, #fef3c7);
        border-left: 4px solid var(--color-warning, #f59e0b);
      }

      @media (max-width: 768px) {
        .hero-title {
          font-size: 2rem;
        }

        .bbd-steps {
          grid-template-columns: 1fr;
        }

        .cta-section {
          flex-direction: column;
        }
      }
    `;
  }

  protected afterRender(): void {
    const quickStartBtn = this.$('#quick-start-btn');
    const learnMoreBtn = this.$('#learn-more-btn');

    quickStartBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('quick-start', { bubbles: true, composed: true }));
      this.hide();
    });

    learnMoreBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('show-guide', { bubbles: true, composed: true }));
    });
  }

  public hide(): void {
    this.style.display = 'none';
    sessionStorage.setItem('hasSeenWelcome', 'true');
  }

  public show(): void {
    this.style.display = 'block';
  }
}

customElements.define('welcome-screen', WelcomeScreen);
```

### User Guide Modal Component
```typescript
// Source: Modal pattern from existing modal-dialog.ts, progressive disclosure from NN/g
import { BaseComponent } from '../base-component';

export class UserGuideModal extends BaseComponent {
  protected template(): string {
    return `
      <div class="guide-overlay" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div class="guide-modal">
          <div class="guide-header">
            <h1 id="guide-title">eVelo User Guide</h1>
            <button class="close-btn" aria-label="Close guide">&times;</button>
          </div>

          <div class="guide-body">
            <help-section title="Getting Started" icon="🚀" open>
              <p>
                eVelo simulates the Buy-Borrow-Die tax optimization strategy using Monte Carlo analysis.
                Configure your portfolio, SBLOC terms, and time horizon, then run thousands of simulations
                to understand potential outcomes.
              </p>
              <h4>Quick Start:</h4>
              <ol>
                <li>Set your initial investment amount</li>
                <li>Choose asset allocation (stocks, bonds, gold)</li>
                <li>Configure SBLOC terms (interest rate, max LTV)</li>
                <li>Click "Run Monte Carlo Simulation"</li>
              </ol>
            </help-section>

            <help-section title="Portfolio Parameters" icon="💼">
              <dl class="param-definitions">
                <dt>Initial Investment</dt>
                <dd>Starting portfolio value in dollars. This simulator is designed for portfolios typically $1M-$100M.</dd>

                <dt>Asset Allocation</dt>
                <dd>Distribution across asset classes (stocks, bonds, gold). Higher stock allocation = higher expected returns but more volatility.</dd>

                <dt>Initial LOC Balance</dt>
                <dd>Pre-existing line of credit balance if you're already borrowing against your portfolio. Leave at $0 if starting fresh.</dd>
              </dl>
            </help-section>

            <help-section title="Spending Parameters" icon="💰">
              <dl class="param-definitions">
                <dt>Annual Cash Need</dt>
                <dd>Tax-free income from borrowing against your portfolio. Unlike selling assets, borrowing doesn't trigger capital gains taxes.</dd>

                <dt>Annual Increase</dt>
                <dd>Percentage increase in withdrawals each year (inflation adjustment). Typical values: 2-4%.</dd>

                <dt>Withdraw Monthly</dt>
                <dd>When enabled, withdrawals occur monthly (1/12 of annual amount) with monthly interest accrual. More realistic simulation.</dd>
              </dl>
            </help-section>

            <help-section title="SBLOC Terms" icon="🏦">
              <dl class="param-definitions">
                <dt>Annual Interest Rate</dt>
                <dd>Interest charged on your securities-backed line of credit. Typically SOFR + 1-3% (currently ~5-7%).</dd>

                <dt>Max LTV / Hard Margin</dt>
                <dd>Loan-to-Value ratio. Maximum percentage of portfolio value you can borrow. Lower LTV = more conservative. If exceeded, portfolio is liquidated.</dd>

                <dt>Warning Zone LTV</dt>
                <dd>Maintenance margin threshold. If your loan exceeds this percentage of portfolio value, you receive a margin call warning.</dd>

                <dt>Liquidation Haircut</dt>
                <dd>Market impact and transaction costs if forced to liquidate. Typical range: 2-10%.</dd>
              </dl>
            </help-section>

            <help-section title="Simulation Settings" icon="⚙️">
              <dl class="param-definitions">
                <dt>Iterations</dt>
                <dd>Number of Monte Carlo scenarios. More iterations = more accurate percentiles but slower computation. 10,000 is usually sufficient.</dd>

                <dt>Return Distribution Model</dt>
                <dd>
                  <strong>Bootstrap Resampling:</strong> Randomly samples from historical returns.<br>
                  <strong>Regime-Switching:</strong> Models bull/bear/crash market cycles explicitly.
                </dd>

                <dt>Expected Inflation</dt>
                <dd>Annual inflation rate for real return calculations. Typical values: 2-4%.</dd>
              </dl>
            </help-section>

            <help-section title="Understanding Charts" icon="📊">
              <h4>Probability Cone</h4>
              <p>Shows range of portfolio values over time. Shaded bands represent percentiles (P10-P90). Wider bands = more uncertainty.</p>

              <h4>Terminal Value Distribution</h4>
              <p>Histogram of final portfolio values. Tells you the spread of possible outcomes after N years.</p>

              <h4>Margin Call Risk</h4>
              <p>Probability of hitting margin call in each year. Higher bars = higher risk of forced liquidation.</p>

              <h4>SBLOC Balance Over Time</h4>
              <p>Shows how your loan balance grows (from withdrawals + interest). Compare to portfolio value to assess sustainability.</p>
            </help-section>

            <help-section title="Key Metrics Explained" icon="📈">
              <dl class="param-definitions">
                <dt>Success Rate</dt>
                <dd>Percentage of simulations ending with positive net worth. Higher = more sustainable strategy.</dd>

                <dt>Median Final Value</dt>
                <dd>Middle outcome (50th percentile). Half of simulations end above this, half below.</dd>

                <dt>CAGR</dt>
                <dd>Compound Annual Growth Rate. Annualized return across the time horizon.</dd>

                <dt>Max Drawdown</dt>
                <dd>Worst peak-to-trough decline. Tells you the maximum loss experienced in any simulation.</dd>

                <dt>Salary Equivalent</dt>
                <dd>Pre-tax salary needed to match your after-tax SBLOC withdrawals. Shows tax savings of BBD strategy.</dd>
              </dl>
            </help-section>

            <help-section title="Glossary" icon="📖">
              <dl class="param-definitions">
                <dt>Buy-Borrow-Die (BBD)</dt>
                <dd>Wealth preservation strategy: buy appreciating assets, borrow against them for living expenses, pass to heirs with stepped-up basis.</dd>

                <dt>SBLOC</dt>
                <dd>Securities-Backed Line of Credit. Loan using your investment portfolio as collateral. Proceeds are not taxable income.</dd>

                <dt>LTV (Loan-to-Value)</dt>
                <dd>Ratio of loan balance to portfolio value. Example: $500K loan on $1M portfolio = 50% LTV.</dd>

                <dt>Margin Call</dt>
                <dd>Demand to repay portion of loan or post additional collateral when LTV exceeds maintenance margin.</dd>

                <dt>Stepped-Up Basis</dt>
                <dd>Tax provision adjusting cost basis of inherited assets to market value at death. Eliminates capital gains tax on appreciation.</dd>

                <dt>Monte Carlo Simulation</dt>
                <dd>Statistical method running thousands of scenarios with random market returns to model range of possible outcomes.</dd>
              </dl>
            </help-section>
          </div>

          <div class="guide-footer">
            <p class="disclaimer">
              <strong>Disclaimer:</strong> This simulator is for educational purposes only.
              Consult qualified tax and financial advisors before implementing any tax strategy.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: contents;
      }

      .guide-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--modal-backdrop, rgba(0, 0, 0, 0.3));
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .guide-overlay.open {
        opacity: 1;
        visibility: visible;
      }

      .guide-modal {
        background: var(--surface-primary, #ffffff);
        border-radius: var(--border-radius-lg, 12px);
        max-width: 800px;
        max-height: 90vh;
        width: 90%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        transform: scale(0.95);
        transition: transform 0.2s ease;
      }

      .guide-overlay.open .guide-modal {
        transform: scale(1);
      }

      .guide-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      .guide-header h1 {
        margin: 0;
        font-size: 1.5rem;
        color: var(--text-primary, #1e293b);
      }

      .close-btn {
        background: transparent;
        border: none;
        font-size: 2rem;
        color: var(--text-secondary, #64748b);
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
      }

      .close-btn:hover {
        color: var(--text-primary, #1e293b);
      }

      .guide-body {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-lg, 24px);
      }

      .param-definitions {
        margin: var(--spacing-md, 16px) 0;
      }

      .param-definitions dt {
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        margin-top: var(--spacing-md, 16px);
      }

      .param-definitions dt:first-child {
        margin-top: 0;
      }

      .param-definitions dd {
        margin: var(--spacing-xs, 4px) 0 0 var(--spacing-md, 16px);
        color: var(--text-secondary, #64748b);
        line-height: 1.6;
      }

      .guide-footer {
        padding: var(--spacing-lg, 24px);
        border-top: 1px solid var(--border-color, #e2e8f0);
      }

      .disclaimer {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
        font-style: italic;
        text-align: center;
      }

      @media (max-width: 768px) {
        .guide-modal {
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
      }
    `;
  }

  protected afterRender(): void {
    const overlay = this.$('.guide-overlay');
    const closeBtn = this.$('.close-btn');

    // Close on overlay click
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    // Close button
    closeBtn?.addEventListener('click', () => {
      this.hide();
    });

    // Escape key to close
    document.addEventListener('keydown', this.handleEscape);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleEscape);
  }

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.hide();
    }
  };

  public show(): void {
    const overlay = this.$('.guide-overlay');
    overlay?.classList.add('open');
  }

  public hide(): void {
    const overlay = this.$('.guide-overlay');
    overlay?.classList.remove('open');
  }
}

customElements.define('user-guide-modal', UserGuideModal);
```

### Integration into app-root.ts
```typescript
// Source: Existing app-root.ts patterns
// In app-root.ts template() method:

protected template(): string {
  return `
    <main-layout>
      <!-- ... existing sidebar ... -->

      <div slot="header" class="header-content">
        <h1>eVelo Portfolio Simulator</h1>
        <div class="header-buttons">
          <button id="btn-guide" class="header-btn" aria-label="User Guide" title="User Guide">
            <svg><!-- question mark icon --></svg>
          </button>
          <button id="btn-settings" class="header-btn" aria-label="Settings" title="Settings">
            <svg><!-- settings icon --></svg>
          </button>
        </div>
      </div>

      <div class="dashboard">
        <!-- Welcome screen (shown when no results) -->
        <welcome-screen id="welcome"></welcome-screen>

        <!-- Results dashboard (shown after simulation) -->
        <comparison-dashboard id="results"></comparison-dashboard>
      </div>
    </main-layout>

    <!-- User guide modal -->
    <user-guide-modal id="user-guide"></user-guide-modal>

    <toast-container position="bottom-right"></toast-container>
    <settings-panel id="settings-panel"></settings-panel>
  `;
}

// In afterRender() method:
protected override afterRender(): void {
  // ... existing code ...

  // User guide button
  const guideBtn = this.$('#btn-guide');
  const userGuide = this.$('#user-guide') as UserGuideModal;

  guideBtn?.addEventListener('click', () => {
    userGuide?.show();
  });

  // Welcome screen management
  const welcome = this.$('#welcome') as WelcomeScreen;
  const results = this.$('#results');

  // Show welcome if no simulation run yet
  if (!this._simulationResult && sessionStorage.getItem('hasSeenWelcome') !== 'true') {
    welcome?.show();
    results?.style.setProperty('display', 'none');
  } else {
    welcome?.hide();
    results?.style.removeProperty('display');
  }

  // Handle welcome screen events
  this.addEventListener('quick-start', () => {
    // Load default parameters and trigger simulation
    this.$('#run-sim')?.click();
  });

  this.addEventListener('show-guide', () => {
    userGuide?.show();
  });

  // After successful simulation, hide welcome
  this.addEventListener('simulation-complete', () => {
    welcome?.hide();
    results?.style.removeProperty('display');
  });
}
```

## BBD Strategy Content

### Verified Facts (from research sources)

**High Confidence (verified with authoritative sources):**

1. **Three-Step Process:**
   - Buy: Purchase appreciating assets (stocks, real estate, etc.)
   - Borrow: Access liquidity via SBLOC without triggering capital gains tax
   - Die: Heirs inherit with stepped-up basis, eliminating capital gains on appreciation

2. **SBLOC Mechanics:**
   - Loan proceeds from securities-backed lines of credit are NOT taxable income
   - Typical borrowing capacity: 50-95% of portfolio value (varies by asset type and lender)
   - Interest rates: Typically SOFR + 1-3% (~5-7% as of 2026)
   - No fixed maturity date; interest-only payments

3. **Stepped-Up Basis:**
   - Tax provision that adjusts cost basis of inherited assets to fair market value at death
   - Eliminates capital gains tax on appreciation that occurred during original owner's lifetime
   - Example: Stock bought for $10,000, worth $100,000 at death → heirs' basis is $100,000, no tax on $90,000 gain

4. **Risks:**
   - Margin calls if portfolio value declines (LTV exceeds threshold)
   - Forced liquidation if margin call not met
   - Interest accrues continuously (loan balance can grow faster than portfolio in bad markets)
   - Market volatility can trigger liquidation at worst possible time

5. **Current Status (2026):**
   - Strategy is legal under current tax law
   - Under policy scrutiny (California Billionaire Tax Act, TCJA extension debates)
   - Step-up basis elimination has been proposed but not enacted
   - Treasury estimates ~$40 billion annual revenue loss from step-up basis provision

**Medium Confidence (from multiple sources, not official):**
- Typical portfolio size for BBD: $5M+ (high-net-worth strategy)
- Estate planning lawyers and private banks are primary advisors for this strategy
- Strategy effectiveness depends heavily on market returns exceeding SBLOC interest rates

**Low Confidence (single sources, requires verification):**
- Exact percentage of ultra-wealthy using BBD strategy
- Historical success rates of BBD vs traditional withdrawal strategies

### Content Guidelines for Implementation

1. **Accuracy requirements:**
   - State step-up basis as "under current tax law" (subject to change)
   - Mention policy debates (California proposal, TCJA extension)
   - Include realistic SBLOC interest rates (5-7%, not outdated 2-3%)
   - Acknowledge margin call risk prominently

2. **Appropriate disclaimers:**
   - "Educational purposes only"
   - "Consult qualified tax and financial advisors"
   - "Tax laws are subject to change"
   - "Past performance does not guarantee future results"

3. **Tone and language:**
   - Neutral, educational (not promotional)
   - Define all jargon (SBLOC, LTV, step-up basis)
   - Balanced presentation of benefits AND risks
   - Avoid absolute claims ("guaranteed," "completely tax-free")

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multi-step tour overlays (shepherd.js) | Empty state welcome screens | UX best practice shift (~2022) | Tours are skipped 60%+ of the time; empty states are contextual |
| External help docs (separate site) | In-app help with progressive disclosure | SaaS UX trend (2020+) | Users get help in context without leaving workflow |
| Long-form documentation pages | Accordion pattern (help-section) | Mobile-first design (2018+) | Reduces cognitive load; users expand only what they need |
| Modal for everything | Modal for overlays, routes for long content | UX best practice (2024+) | Modals on mobile are hard to use; dedicated routes are clearer |
| "Don't show again" checkboxes | Natural state-based visibility | UX anti-pattern recognition (2020+) | Users regret dismissing help; natural states (has results) are better |

**Deprecated/outdated:**
- Tooltip libraries (like Tippy.js) → Use native CSS + ARIA for simple tooltips (reduces dependencies)
- Markdown parsers for help content → HTML in template literals (one less dependency)
- localStorage for first-run tracking → sessionStorage (clears on session end, more appropriate)

## Open Questions

Things that couldn't be fully resolved:

1. **BBD strategy applicability thresholds**
   - What we know: Strategy designed for high-net-worth ($5M+ portfolios typical)
   - What's unclear: Exact minimum portfolio size where BBD makes sense vs traditional withdrawals
   - Recommendation: State "$1M-$100M portfolio range" in UI; mention "typically for high-net-worth individuals" in guide

2. **Tax law change probability**
   - What we know: Step-up basis under debate (California proposal, federal TCJA extension)
   - What's unclear: Likelihood and timeline of step-up basis elimination
   - Recommendation: Include disclaimer "Step-up basis is under current tax law and subject to change"; don't make predictions

3. **Welcome screen persistence strategy**
   - What we know: Welcome should hide after first simulation
   - What's unclear: Should it be permanently dismissible or only hide when results exist?
   - Recommendation: Hide when results exist (natural state); don't add "Don't show again" checkbox

4. **Mobile user guide experience**
   - What we know: Modals on mobile can be awkward (scrolling, viewport height)
   - What's unclear: Whether to use full-screen modal, dedicated route, or hybrid approach
   - Recommendation: Start with full-screen modal on mobile (height: 100vh); consider dedicated `/guide` route if user testing shows issues

5. **Help content maintenance**
   - What we know: Financial regulations and tax law change; content needs updates
   - What's unclear: How often to review/update help content; who is responsible
   - Recommendation: Add "Last updated: [date]" to user guide; review quarterly for tax law changes

## Sources

### Primary (HIGH confidence)
- [Yale Budget Lab: Buy-Borrow-Die Options for Reform](https://budgetlab.yale.edu/research/buy-borrow-die-options-reforming-tax-treatment-borrowing-against-appreciated-assets) - Authoritative policy analysis
- [Fidelity: What is a Securities-Backed Line of Credit (SBLOC)?](https://www.fidelity.com/learning-center/smart-money/what-is-a-securities-backed-line-of-credit) - Official SBLOC mechanics
- [MDN: ARIA tooltip role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tooltip_role) - Accessibility standards
- [Carbon Design System: Empty States](https://carbondesignsystem.com/patterns/empty-states-pattern/) - Design system patterns
- [NN/g: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) - UX best practices
- Project files: `src/components/ui/help-section.ts`, `src/components/ui/modal-dialog.ts`, `src/components/ui/help-tooltip.ts` - Existing infrastructure

### Secondary (MEDIUM confidence)
- [Physicians Thrive: Buy, Borrow, Die Tax Strategy Explained](https://physiciansthrive.com/financial-planning/buy-borrow-die-tax-planning-strategy/) - Strategy overview
- [Windes: Understanding the Buy, Borrow, Die Tax Planning Strategy](https://windes.com/buy-borrow-die-tax-strategy/) - Tax planning perspective
- [Fidelity: Step-up in Cost Basis](https://www.fidelity.com/learning-center/personal-finance/what-is-step-up-in-basis) - Official tax provision explanation
- [Onething Design: Top 10 Fintech UX Design Practices 2026](https://www.onething.design/post/top-10-fintech-ux-design-practices-2026) - Onboarding best practices
- [Verified.inc: Best User Onboarding Practices in Finance](https://verified.inc/post/best-user-onboarding-practices-and-ux-design-in-finance) - Financial app UX
- [UserGuiding: Onboarding Screens Best Practices](https://userguiding.com/blog/onboarding-screens) - Design patterns
- [Mobbin: Empty State Design Examples](https://mobbin.com/explore/web/screens/empty-state) - Visual references
- [Eleken: Modal UX Best Practices](https://www.eleken.co/blog-posts/modal-ux) - Modal design guidance

### Tertiary (LOW confidence)
- [Fortune: California Billionaire Tax](https://fortune.com/2026/01/14/why-california-billionaire-tax-wouldnt-work-wealth-tech-executives-leaving-1-trillion/) - Current policy debate (opinion piece)
- [DCFPI: How Wealthy Households Use Buy, Borrow, Die](https://www.dcfpi.org/all/how-wealthy-households-use-a-buy-borrow-die-strategy-to-avoid-taxes-on-their-growing-fortunes/) - Advocacy organization perspective
- Various Stack Overflow and community discussions - Pattern validation only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist in project; no new dependencies
- BBD strategy content: MEDIUM - Verified with authoritative sources but tax law is subject to change
- Architecture: HIGH - Composing existing components (help-section, modal-dialog, help-tooltip)
- UX patterns: HIGH - Empty state and progressive disclosure are well-established patterns
- Financial accuracy: MEDIUM - BBD mechanics verified, but specific thresholds and applicability vary

**Research date:** 2026-01-23
**Valid until:** ~30 days (tax law debates ongoing; content may need updates if legislation passes)
