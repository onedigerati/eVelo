/**
 * Return Probability Table Web Component
 *
 * Displays two tables:
 * 1. Expected Annual Return - CAGR at each percentile across time horizons
 * 2. Annual Return Probabilities - Probability of achieving return thresholds
 *
 * Features:
 * - Color-coded values (green for positive, intensity based on magnitude)
 * - Alternating row backgrounds
 * - Responsive horizontal scroll on mobile
 * - Explanatory note text for each table
 *
 * @example
 * ```html
 * <return-probability-table id="prob-table"></return-probability-table>
 *
 * <script>
 *   const table = document.querySelector('#prob-table');
 *   table.expectedReturns = expectedReturnsData;
 *   table.probabilities = returnProbabilitiesData;
 * </script>
 * ```
 */
import { BaseComponent } from '../base-component';
import type { ExpectedReturns, ReturnProbabilities } from '../../calculations/return-probabilities';

/**
 * Return probability table showing expected returns and probability of achieving targets.
 */
export class ReturnProbabilityTable extends BaseComponent {
  /** Expected returns data */
  private _expectedReturns: ExpectedReturns | null = null;

  /** Return probabilities data */
  private _probabilities: ReturnProbabilities | null = null;

  /**
   * Set expected returns data.
   */
  set expectedReturns(value: ExpectedReturns | null) {
    this._expectedReturns = value;
    this.render();
  }

  /**
   * Get expected returns data.
   */
  get expectedReturns(): ExpectedReturns | null {
    return this._expectedReturns;
  }

  /**
   * Set return probabilities data.
   */
  set probabilities(value: ReturnProbabilities | null) {
    this._probabilities = value;
    this.render();
  }

  /**
   * Get return probabilities data.
   */
  get probabilities(): ReturnProbabilities | null {
    return this._probabilities;
  }

  protected template(): string {
    const hasExpectedReturns = this._expectedReturns && this._expectedReturns.values.length > 0;
    const hasProbabilities = this._probabilities && this._probabilities.probabilities.length > 0;

    if (!hasExpectedReturns && !hasProbabilities) {
      return `
        <div class="no-data">
          <p>Run a simulation to see return probability data</p>
        </div>
      `;
    }

    return `
      <div class="tables-container">
        ${hasExpectedReturns ? this.renderExpectedReturnsTable() : ''}
        ${hasProbabilities ? this.renderProbabilitiesTable() : ''}
      </div>
    `;
  }

  /**
   * Render the Expected Annual Return table.
   */
  private renderExpectedReturnsTable(): string {
    if (!this._expectedReturns) return '';

    const { percentiles, timeHorizons, values } = this._expectedReturns;

    return `
      <div class="table-section">
        <h3><span class="icon">&#x1F4C8;</span> Expected Annual Return</h3>
        <div class="scroll-container expected-returns-scroll">
          <div class="scroll-indicator-left" aria-hidden="true"></div>
          <div class="table-container expected-returns-wrapper">
            <table>
              <thead>
                <tr>
                  <th class="label-col">Percentile</th>
                  ${timeHorizons.map((h) => `<th class="value-col">${h} Year${h > 1 ? 's' : ''}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${percentiles
                  .map(
                    (pct, i) => `
                  <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                    <td class="label-cell">${pct} Percentile</td>
                    ${values[i]
                      .map(
                        (v) => `
                      <td class="value-cell ${this.getReturnClass(v)}">${this.formatPercent(v)}</td>
                    `
                      )
                      .join('')}
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <div class="scroll-indicator-right" aria-hidden="true"></div>
        </div>
        <p class="note">
          <strong>Note:</strong> Expected annual returns represent the compound annual
          growth rate (CAGR) over each time horizon, showing how your portfolio is
          projected to perform over different investment periods.
        </p>
      </div>
    `;
  }

  /**
   * Render the Annual Return Probabilities table.
   */
  private renderProbabilitiesTable(): string {
    if (!this._probabilities) return '';

    const { thresholds, timeHorizons, probabilities } = this._probabilities;

    return `
      <div class="table-section">
        <h3><span class="icon">&#x1F3AF;</span> Annual Return Probabilities</h3>
        <div class="scroll-container return-probabilities-scroll">
          <div class="scroll-indicator-left" aria-hidden="true"></div>
          <div class="table-container return-probabilities-wrapper">
            <table>
              <thead>
                <tr>
                  <th class="label-col">Return</th>
                  ${timeHorizons.map((h) => `<th class="value-col">${h} Year${h > 1 ? 's' : ''}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${thresholds
                  .map(
                    (threshold, i) => `
                  <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                    <td class="label-cell">>= ${this.formatPercent(threshold)}</td>
                    ${probabilities[i]
                      .map(
                        (p) => `
                      <td class="value-cell probability ${this.getProbabilityClass(p)}">${p.toFixed(2)}%</td>
                    `
                      )
                      .join('')}
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <div class="scroll-indicator-right" aria-hidden="true"></div>
        </div>
        <p class="note">
          <strong>Note:</strong> Probabilities show the likelihood of achieving or
          exceeding each return threshold over different time horizons. Higher
          probabilities (green) indicate more confidence in achieving that return level.
        </p>
      </div>
    `;
  }

  /**
   * Format a decimal as percentage string.
   */
  private formatPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  /**
   * Get CSS class for return value based on sign.
   */
  private getReturnClass(value: number): string {
    if (value > 0.15) return 'very-positive';
    if (value > 0.05) return 'positive';
    if (value > 0) return 'slightly-positive';
    if (value < -0.05) return 'negative';
    if (value < 0) return 'slightly-negative';
    return '';
  }

  /**
   * Get CSS class for probability based on magnitude.
   */
  private getProbabilityClass(value: number): string {
    if (value >= 90) return 'prob-very-high';
    if (value >= 75) return 'prob-high';
    if (value >= 60) return 'prob-medium';
    if (value >= 40) return 'prob-low';
    return 'prob-very-low';
  }

  protected override afterRender(): void {
    this.setupScrollIndicators();
  }

  /**
   * Setup scroll indicators for mobile horizontal scrolling.
   * Handles both expected returns and probabilities tables.
   */
  private setupScrollIndicators(): void {
    // Setup for expected returns table
    const expectedReturnsWrapper = this.$('.expected-returns-wrapper') as HTMLElement;
    const expectedReturnsContainer = this.$('.expected-returns-scroll') as HTMLElement;

    if (expectedReturnsWrapper && expectedReturnsContainer) {
      const updateExpectedReturns = () => {
        const canScrollLeft = expectedReturnsWrapper.scrollLeft > 0;
        const canScrollRight = expectedReturnsWrapper.scrollLeft < (expectedReturnsWrapper.scrollWidth - expectedReturnsWrapper.clientWidth - 1);

        expectedReturnsContainer.classList.toggle('can-scroll-left', canScrollLeft);
        expectedReturnsContainer.classList.toggle('can-scroll-right', canScrollRight);
      };

      expectedReturnsWrapper.addEventListener('scroll', updateExpectedReturns, { passive: true });
      setTimeout(updateExpectedReturns, 100);
    }

    // Setup for probabilities table
    const probabilitiesWrapper = this.$('.return-probabilities-wrapper') as HTMLElement;
    const probabilitiesContainer = this.$('.return-probabilities-scroll') as HTMLElement;

    if (probabilitiesWrapper && probabilitiesContainer) {
      const updateProbabilities = () => {
        const canScrollLeft = probabilitiesWrapper.scrollLeft > 0;
        const canScrollRight = probabilitiesWrapper.scrollLeft < (probabilitiesWrapper.scrollWidth - probabilitiesWrapper.clientWidth - 1);

        probabilitiesContainer.classList.toggle('can-scroll-left', canScrollLeft);
        probabilitiesContainer.classList.toggle('can-scroll-right', canScrollRight);
      };

      probabilitiesWrapper.addEventListener('scroll', updateProbabilities, { passive: true });
      setTimeout(updateProbabilities, 100);
    }
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .tables-container {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg, 24px);
      }

      .table-section {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .table-section:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      h3 {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: var(--font-size-lg, 1.125rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      .icon {
        font-size: 1.25rem;
      }

      .scroll-container {
        position: relative;
      }

      .scroll-indicator-left,
      .scroll-indicator-right {
        display: none;  /* Hidden by default */
      }

      .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 500px;
      }

      thead {
        background: var(--surface-secondary, #f8fafc);
      }

      th {
        padding: var(--spacing-md, 16px) var(--spacing-sm, 8px);
        text-align: right;
        font-weight: 600;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        border-bottom: 2px solid var(--border-color, #e2e8f0);
      }

      th.label-col {
        text-align: left;
        width: 25%;
      }

      th.value-col {
        width: 15%;
      }

      td {
        padding: var(--spacing-md, 16px) var(--spacing-sm, 8px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      tr.even {
        background: var(--surface-primary, #ffffff);
      }

      tr.odd {
        background: var(--surface-secondary, #f8fafc);
      }

      tr:hover {
        background: var(--color-primary-50, #f0fdfa);
      }

      .label-cell {
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        text-align: left;
      }

      .value-cell {
        text-align: right;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: var(--font-size-sm, 0.875rem);
      }

      /* Return value colors (positive/negative) */
      .value-cell.very-positive {
        color: #059669;
        font-weight: 600;
      }

      .value-cell.positive {
        color: #16a34a;
      }

      .value-cell.slightly-positive {
        color: #22c55e;
      }

      .value-cell.slightly-negative {
        color: #f97316;
      }

      .value-cell.negative {
        color: #dc2626;
      }

      /* Probability colors (all green, varying intensity) */
      .value-cell.probability {
        color: #16a34a;
      }

      .value-cell.prob-very-high {
        color: #059669;
        font-weight: 600;
      }

      .value-cell.prob-high {
        color: #16a34a;
        font-weight: 500;
      }

      .value-cell.prob-medium {
        color: #22c55e;
      }

      .value-cell.prob-low {
        color: #4ade80;
      }

      .value-cell.prob-very-low {
        color: #86efac;
      }

      .note {
        margin: var(--spacing-md, 16px) 0 0 0;
        padding: var(--spacing-md, 16px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        line-height: 1.6;
      }

      .note strong {
        color: var(--text-primary, #1e293b);
      }

      .no-data {
        background: var(--surface-secondary, #f8fafc);
        border: 2px dashed var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-2xl, 48px);
        text-align: center;
        color: var(--text-secondary, #475569);
      }

      .no-data p {
        margin: 0;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .table-section {
          padding: var(--spacing-md, 16px);
        }

        .scroll-indicator-left,
        .scroll-indicator-right {
          display: block;
          position: absolute;
          top: 0;
          bottom: 0;
          width: 20px;
          pointer-events: none;
          z-index: 15;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .scroll-indicator-left {
          left: 0;
          background: linear-gradient(to right, var(--surface-primary, #ffffff) 0%, transparent 100%);
        }

        .scroll-indicator-right {
          right: 0;
          background: linear-gradient(to left, var(--surface-primary, #ffffff) 0%, transparent 100%);
        }

        /* Show indicators based on scroll position */
        .scroll-container.can-scroll-left .scroll-indicator-left {
          opacity: 1;
        }

        .scroll-container.can-scroll-right .scroll-indicator-right {
          opacity: 1;
        }

        .expected-returns-wrapper,
        .return-probabilities-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          overscroll-behavior-x: contain;
        }

        th, td {
          padding: var(--spacing-sm, 8px);
        }

        .label-cell {
          font-size: var(--font-size-sm, 0.875rem);
        }
      }
    `;
  }
}

// Register the custom element
customElements.define('return-probability-table', ReturnProbabilityTable);
