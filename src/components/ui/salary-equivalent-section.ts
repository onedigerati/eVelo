/**
 * Salary Equivalent Section Web Component
 *
 * Prominent banner section that highlights the tax advantage of BBD withdrawals
 * vs taxable income. Shows the withdrawal amount, equivalent taxable salary,
 * and annual tax savings in an eye-catching teal gradient banner.
 *
 * Reference: MonteCarlo-result-panel-5.png - teal banner with:
 * - "Your Annual Withdrawal Tax-Free" header
 * - Large withdrawal amount
 * - "Is equivalent to earning a taxable salary of:" with equivalent amount
 * - Explanation text about tax savings
 */
import { BaseComponent } from '../base-component';

/**
 * Props for the salary equivalent section.
 */
export interface SalaryEquivalentProps {
  /** Annual SBLOC withdrawal amount */
  withdrawal: number;
  /** Pre-tax salary equivalent to have same after-tax income */
  taxableEquivalent: number;
  /** Annual tax savings from using BBD strategy */
  taxSavings: number;
  /** Effective tax rate used for calculation */
  taxRate: number;
}

/**
 * Salary equivalent banner component showing the tax advantage of BBD.
 *
 * Usage:
 * ```html
 * <salary-equivalent-section
 *   id="salary-section"
 * ></salary-equivalent-section>
 *
 * <script>
 *   const section = document.querySelector('#salary-section');
 *   section.withdrawal = 165000;
 *   section.taxableEquivalent = 220000;
 *   section.taxSavings = 55000;
 *   section.taxRate = 0.25;
 * </script>
 * ```
 */
export class SalaryEquivalentSection extends BaseComponent {
  /** Annual withdrawal amount */
  private _withdrawal: number = 0;
  /** Taxable salary equivalent */
  private _taxableEquivalent: number = 0;
  /** Annual tax savings */
  private _taxSavings: number = 0;
  /** Effective tax rate */
  private _taxRate: number = 0.37;

  /**
   * Set annual withdrawal amount.
   */
  set withdrawal(value: number) {
    this._withdrawal = value;
    this.updateDisplay();
  }

  /**
   * Get annual withdrawal amount.
   */
  get withdrawal(): number {
    return this._withdrawal;
  }

  /**
   * Set taxable salary equivalent.
   */
  set taxableEquivalent(value: number) {
    this._taxableEquivalent = value;
    this.updateDisplay();
  }

  /**
   * Get taxable salary equivalent.
   */
  get taxableEquivalent(): number {
    return this._taxableEquivalent;
  }

  /**
   * Set annual tax savings.
   */
  set taxSavings(value: number) {
    this._taxSavings = value;
    this.updateDisplay();
  }

  /**
   * Get annual tax savings.
   */
  get taxSavings(): number {
    return this._taxSavings;
  }

  /**
   * Set effective tax rate.
   */
  set taxRate(value: number) {
    this._taxRate = value;
    this.updateDisplay();
  }

  /**
   * Get effective tax rate.
   */
  get taxRate(): number {
    return this._taxRate;
  }

  /**
   * Set all props at once for convenience.
   */
  set data(props: SalaryEquivalentProps | null) {
    if (!props) {
      this._withdrawal = 0;
      this._taxableEquivalent = 0;
      this._taxSavings = 0;
      this._taxRate = 0.37;
    } else {
      this._withdrawal = props.withdrawal;
      this._taxableEquivalent = props.taxableEquivalent;
      this._taxSavings = props.taxSavings;
      this._taxRate = props.taxRate;
    }
    this.updateDisplay();
  }

  protected template(): string {
    return `
      <div class="salary-banner">
        <div class="banner-content">
          <p class="banner-header">Your Annual Withdrawal Tax-Free</p>
          <p class="withdrawal-amount" id="withdrawal-amount">$0</p>
          <p class="equivalent-text">Is equivalent to earning a taxable salary of:</p>
          <p class="equivalent-amount" id="equivalent-amount">$0</p>
          <p class="explanation" id="explanation">
            Based on your withdrawal plan, you save approximately $0 in annual taxes
            by using the Buy Borrow Die strategy (based on 2024 federal tax rates for single filer)
          </p>
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

      .salary-banner {
        background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%);
        border-radius: var(--radius-lg, 12px);
        padding: var(--spacing-xl, 32px) var(--spacing-lg, 24px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .salary-banner:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px -4px rgba(13, 148, 136, 0.3), 0 8px 16px -4px rgba(0, 0, 0, 0.15);
      }

      .banner-content {
        text-align: center;
        color: white;
      }

      .banner-header {
        font-size: var(--font-size-base, 1rem);
        font-weight: 500;
        margin: 0 0 var(--spacing-sm, 8px) 0;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .withdrawal-amount {
        font-size: clamp(2rem, 5vw, 3rem);
        font-weight: 700;
        margin: 0 0 var(--spacing-md, 16px) 0;
        letter-spacing: -0.02em;
      }

      .equivalent-text {
        font-size: var(--font-size-sm, 0.875rem);
        margin: 0 0 var(--spacing-sm, 8px) 0;
        opacity: 0.85;
      }

      .equivalent-amount {
        font-size: clamp(1.5rem, 4vw, 2.25rem);
        font-weight: 600;
        margin: 0 0 var(--spacing-lg, 24px) 0;
        letter-spacing: -0.01em;
      }

      .explanation {
        font-size: var(--font-size-sm, 0.875rem);
        margin: 0;
        opacity: 0.8;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        line-height: 1.5;
        overflow-wrap: break-word;
        word-wrap: break-word;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .salary-banner {
          padding: var(--spacing-lg, 24px) var(--spacing-md, 16px);
          border-radius: var(--radius-md, 8px);
        }

        .banner-header {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .withdrawal-amount {
          margin-bottom: var(--spacing-sm, 8px);
        }

        .equivalent-amount {
          margin-bottom: var(--spacing-md, 16px);
        }

        .explanation {
          font-size: var(--font-size-xs, 0.75rem);
        }
      }

      @media (max-width: 480px) {
        .salary-banner {
          padding: var(--spacing-md, 16px);
        }

        .banner-header {
          font-size: 0.75rem;
        }

        .equivalent-text {
          font-size: 0.75rem;
        }

        .explanation {
          font-size: 0.65rem;
          line-height: 1.4;
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateDisplay();
  }

  /**
   * Update the display with current values.
   */
  private updateDisplay(): void {
    const withdrawalEl = this.$('#withdrawal-amount');
    const equivalentEl = this.$('#equivalent-amount');
    const explanationEl = this.$('#explanation');

    if (!withdrawalEl || !equivalentEl || !explanationEl) return;

    // Format currency
    const formatCurrency = (value: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    };

    withdrawalEl.textContent = formatCurrency(this._withdrawal);
    equivalentEl.textContent = formatCurrency(this._taxableEquivalent);

    // Update explanation with tax savings
    const taxRatePercent = Math.round(this._taxRate * 100);
    explanationEl.textContent = `Based on your withdrawal plan, you save approximately ${formatCurrency(this._taxSavings)} in annual taxes by using the Buy Borrow Die strategy (based on ${taxRatePercent}% effective tax rate)`;
  }
}

// Register the custom element
customElements.define('salary-equivalent-section', SalaryEquivalentSection);
