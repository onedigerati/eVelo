import { BaseComponent } from '../base-component';

/**
 * Comprehensive user guide modal component.
 * Documents all simulation parameters, chart interpretations, and financial terminology.
 * Uses help-section accordions for progressive disclosure.
 *
 * @element user-guide-modal
 *
 * @example
 * <user-guide-modal></user-guide-modal>
 * <script>
 *   document.querySelector('user-guide-modal').show();
 * </script>
 */
export class UserGuideModal extends BaseComponent {
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  protected template(): string {
    return `
      <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div class="modal">
          <header class="modal-header">
            <h2 id="guide-title">User Guide</h2>
            <button class="close-btn" aria-label="Close user guide">&times;</button>
          </header>

          <div class="modal-body">
            <!-- Section 1: Getting Started -->
            <help-section title="Getting Started" icon="🚀" open>
              <p>
                <strong>eVelo</strong> is a Monte Carlo simulator for the <strong>Buy-Borrow-Die (BBD)</strong>
                wealth strategy. BBD allows you to access portfolio value without selling assets, avoiding
                capital gains taxes while your investments continue to grow.
              </p>
              <p><strong>Quick Start:</strong></p>
              <ol>
                <li><strong>Set Initial Investment</strong> - Enter your starting portfolio value</li>
                <li><strong>Choose Asset Allocation</strong> - Select assets and their weights</li>
                <li><strong>Configure SBLOC Terms</strong> - Set interest rate, LTV limits, and withdrawal amount</li>
                <li><strong>Click Run Simulation</strong> - View probability-weighted outcomes across thousands of scenarios</li>
              </ol>
            </help-section>

            <!-- Section 2: Portfolio Parameters -->
            <help-section title="Portfolio Parameters" icon="💼">
              <dl>
                <dt>Initial Investment</dt>
                <dd>
                  Your starting portfolio value. This is the total amount invested at day one.
                  Typical range: $1M - $100M. The simulator models how this grows (or shrinks)
                  over your time horizon.
                </dd>

                <dt>Asset Allocation</dt>
                <dd>
                  How your portfolio is distributed across asset classes. Select from available
                  assets (stocks, bonds, alternatives) and assign percentage weights. Weights
                  must sum to 100%. Different allocations produce different risk/return profiles.
                </dd>

                <dt>Initial LOC Balance</dt>
                <dd>
                  Any pre-existing loan balance on your SBLOC. If you've already borrowed against
                  your portfolio, enter that amount here. Set to $0 for a fresh start.
                </dd>
              </dl>
            </help-section>

            <!-- Section 3: Spending Parameters -->
            <help-section title="Spending Parameters" icon="💰">
              <dl>
                <dt>Annual Cash Need</dt>
                <dd>
                  The yearly amount you borrow from your SBLOC for living expenses. This is
                  <strong>tax-free income</strong> since it's a loan, not a sale. The simulator
                  adds this to your loan balance each year while your portfolio continues growing.
                </dd>

                <dt>Annual Increase (%)</dt>
                <dd>
                  How much your annual cash need grows each year, typically to keep pace with
                  inflation. A 2-4% annual increase is common. For example, a 3% increase on
                  $100K means year 2 withdrawals of $103K, year 3 of $106K, and so on.
                </dd>

                <dt>Withdraw Monthly</dt>
                <dd>
                  When enabled, withdrawals are spread across 12 monthly draws instead of a
                  single annual withdrawal. This provides more realistic cash flow modeling
                  and more accurate interest compounding calculations.
                </dd>
              </dl>
            </help-section>

            <!-- Section 4: SBLOC Terms -->
            <help-section title="SBLOC Terms" icon="🏦">
              <dl>
                <dt>Annual Interest Rate</dt>
                <dd>
                  The rate charged on your SBLOC balance. Typically SOFR + 1-3%, currently
                  around 5-7%. Interest accrues on the outstanding balance and compounds
                  (monthly or annually based on your settings).
                </dd>

                <dt>Max LTV / Hard Margin</dt>
                <dd>
                  The maximum Loan-to-Value ratio before forced liquidation. If your loan
                  balance exceeds this percentage of your portfolio value, assets are sold
                  to pay down the loan. Typical range: 50-70%.
                </dd>

                <dt>Warning Zone LTV</dt>
                <dd>
                  The LTV threshold that triggers a margin call warning. You'd receive notice
                  to add collateral or pay down the loan. Set below Max LTV to provide a
                  buffer. Typical range: 40-60%.
                </dd>

                <dt>Liquidation Haircut</dt>
                <dd>
                  Transaction costs incurred when assets are force-sold during a margin call.
                  Includes bid-ask spreads, commissions, and potential market impact.
                  Typical range: 2-5%.
                </dd>
              </dl>
            </help-section>

            <!-- Section 5: Simulation Settings -->
            <help-section title="Simulation Settings" icon="⚙️">
              <dl>
                <dt>Iterations</dt>
                <dd>
                  The number of random scenarios to simulate. More iterations provide more
                  statistically robust results but take longer to compute. 10,000 iterations
                  is typically sufficient for reliable percentile estimates.
                </dd>

                <dt>Return Distribution Model</dt>
                <dd>
                  <strong>Bootstrap:</strong> Randomly samples from historical returns,
                  preserving actual market behavior including fat tails and clustering.
                  <br><br>
                  <strong>Regime-Switching:</strong> Models distinct market states (bull,
                  bear, crash) with different return characteristics and transition
                  probabilities. Better captures market regime changes.
                </dd>

                <dt>Expected Inflation</dt>
                <dd>
                  The assumed annual inflation rate for calculating real (inflation-adjusted)
                  returns. Used to show purchasing power outcomes alongside nominal values.
                  Historical average is around 3%.
                </dd>
              </dl>
            </help-section>

            <!-- Section 6: Understanding Charts -->
            <help-section title="Understanding Charts" icon="📊">
              <dl>
                <dt>Probability Cone</dt>
                <dd>
                  Shows the range of possible portfolio values over time. The bands represent
                  different percentile outcomes: P90 (optimistic, only 10% do better), P50
                  (median, typical outcome), and P10 (pessimistic, only 10% do worse). Wider
                  bands indicate more uncertainty.
                </dd>

                <dt>Terminal Value Distribution</dt>
                <dd>
                  A histogram showing the distribution of final portfolio values across all
                  simulations. Helps visualize the range of possible outcomes and their
                  relative likelihood. A right-skewed distribution indicates positive
                  expected returns with asymmetric upside.
                </dd>

                <dt>Margin Call Risk</dt>
                <dd>
                  Shows the probability of experiencing a margin call by year. Higher
                  probabilities indicate greater risk that market downturns could force
                  liquidation. Rising probability over time reflects loan growth relative
                  to portfolio.
                </dd>

                <dt>SBLOC Balance Over Time</dt>
                <dd>
                  Tracks the growth of your loan balance with percentile bands. Shows how
                  withdrawals plus compounding interest grow the debt over time. Compare
                  against the maximum borrowing limit to gauge margin call risk.
                </dd>
              </dl>
            </help-section>

            <!-- Section 7: Key Metrics Explained -->
            <help-section title="Key Metrics Explained" icon="📈">
              <dl>
                <dt>Success Rate</dt>
                <dd>
                  The percentage of simulations that end with a positive net worth
                  (portfolio value exceeds loan balance). A higher success rate indicates
                  a more robust strategy, though 100% success is rare with leverage.
                </dd>

                <dt>Median Final Value</dt>
                <dd>
                  The 50th percentile outcome - half of simulations end higher, half lower.
                  A better measure of "typical" outcome than average because it's not
                  skewed by extreme results.
                </dd>

                <dt>CAGR (Compound Annual Growth Rate)</dt>
                <dd>
                  The smoothed annual return that would produce the median final value
                  from your initial investment. Useful for comparing against benchmarks
                  and other investment strategies.
                </dd>

                <dt>Max Drawdown</dt>
                <dd>
                  The largest peak-to-trough decline experienced during the simulation.
                  Important for understanding worst-case scenarios and whether you could
                  emotionally and financially withstand such losses.
                </dd>

                <dt>Salary Equivalent</dt>
                <dd>
                  The pre-tax salary you'd need to earn to net the same amount as your
                  tax-free SBLOC withdrawals. Calculated using your effective tax rate.
                  Illustrates the tax advantage of borrowing vs. earning income.
                </dd>
              </dl>
            </help-section>

            <!-- Section 8: Glossary -->
            <help-section title="Glossary" icon="📖">
              <dl>
                <dt>Buy-Borrow-Die (BBD)</dt>
                <dd>
                  A wealth strategy where you buy appreciating assets, borrow against them
                  for living expenses (avoiding capital gains taxes), and pass them to heirs
                  at death when the cost basis "steps up" to market value, potentially
                  eliminating the embedded capital gains.
                </dd>

                <dt>SBLOC (Securities-Backed Line of Credit)</dt>
                <dd>
                  A loan collateralized by your investment portfolio. You can borrow up to
                  a percentage (typically 50-70%) of your portfolio's value. Interest rates
                  are typically lower than unsecured loans because of the collateral.
                </dd>

                <dt>LTV (Loan-to-Value)</dt>
                <dd>
                  The ratio of your loan balance to your portfolio value, expressed as a
                  percentage. For example, a $300K loan against a $1M portfolio is 30% LTV.
                  Higher LTV means higher margin call risk.
                </dd>

                <dt>Margin Call</dt>
                <dd>
                  A demand from your lender to either deposit more collateral or pay down
                  your loan when your LTV exceeds the warning threshold. Failure to meet
                  a margin call can result in forced liquidation of assets.
                </dd>

                <dt>Stepped-Up Basis</dt>
                <dd>
                  A tax provision where inherited assets receive a new cost basis equal to
                  their market value at the time of the owner's death. This effectively
                  eliminates capital gains taxes on appreciation during the original
                  owner's lifetime.
                </dd>

                <dt>Monte Carlo Simulation</dt>
                <dd>
                  A computational technique that runs thousands of random scenarios to
                  estimate the probability distribution of outcomes. By simulating many
                  possible market paths, it provides a realistic range of potential results
                  rather than a single projection.
                </dd>
              </dl>
            </help-section>
          </div>

          <footer class="modal-footer">
            <p>
              This simulator provides educational projections only. Actual results will vary.
              Consult a qualified financial advisor before implementing any investment strategy.
            </p>
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

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }

      .overlay.open {
        opacity: 1;
        visibility: visible;
      }

      .modal {
        background: var(--surface-primary, #ffffff);
        border-radius: var(--border-radius-lg, 12px);
        box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04));
        max-width: 800px;
        max-height: 90vh;
        width: calc(100% - 32px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        flex-shrink: 0;
      }

      .modal-header h2 {
        margin: 0;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--text-secondary, #64748b);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: var(--border-radius-sm, 4px);
        line-height: 1;
        transition: background-color 0.15s ease, color 0.15s ease;
      }

      .close-btn:hover {
        background: var(--surface-secondary, #f8fafc);
        color: var(--text-primary, #1e293b);
      }

      .close-btn:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-lg, 24px);
      }

      .modal-footer {
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        border-top: 1px solid var(--border-color, #e2e8f0);
        flex-shrink: 0;
      }

      .modal-footer p {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-tertiary, #94a3b8);
        font-style: italic;
        line-height: 1.5;
      }

      /* Definition list styling for parameter docs */
      dl {
        margin: 0;
      }

      dt {
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        margin-top: var(--spacing-sm, 8px);
      }

      dt:first-child {
        margin-top: 0;
      }

      dd {
        margin: var(--spacing-xs, 4px) 0 0 0;
        color: var(--text-secondary, #64748b);
        line-height: 1.6;
      }

      /* Mobile: Full screen modal */
      @media (max-width: 640px) {
        .modal {
          width: 100%;
          height: 100%;
          max-height: 100%;
          border-radius: 0;
        }

        .modal-header {
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        }

        .modal-body {
          padding: var(--spacing-md, 16px);
        }

        .modal-footer {
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        }
      }
    `;
  }

  protected override afterRender(): void {
    // Close button handler
    const closeBtn = this.$('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Overlay click handler (close when clicking outside modal)
    const overlay = this.$('.overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hide();
        }
      });
    }

    // Escape key handler
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  /**
   * Show the user guide modal.
   */
  public show(): void {
    const overlay = this.$('.overlay');
    if (overlay) {
      overlay.classList.add('open');
    }
  }

  /**
   * Hide the user guide modal.
   */
  public hide(): void {
    const overlay = this.$('.overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
  }
}

// Register the custom element
customElements.define('user-guide-modal', UserGuideModal);
