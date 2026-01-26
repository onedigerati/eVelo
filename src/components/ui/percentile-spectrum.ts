/**
 * Percentile Spectrum Web Component
 *
 * Displays P10/P50/P90 as a horizontal spectrum bar with color-coded value boxes.
 * Used for Terminal Net Worth Distribution and Total Debt visualizations.
 *
 * Reference: Visual P10/P50/P90 spectrum displays from reference application
 */
import { BaseComponent } from '../base-component';

/**
 * Props for the percentile spectrum component
 */
export interface PercentileSpectrumProps {
  /** Section title */
  title: string;
  /** 10th percentile value (worst case) */
  p10: number;
  /** 50th percentile value (median) */
  p50: number;
  /** 90th percentile value (best case) */
  p90: number;
  /** Value formatter type */
  formatter: 'currency' | 'percent';
}

/**
 * Horizontal spectrum showing P10/P50/P90 distribution with colored value boxes.
 *
 * Usage:
 * ```html
 * <percentile-spectrum
 *   title="TERMINAL NET WORTH DISTRIBUTION"
 *   .p10="${value10}"
 *   .p50="${value50}"
 *   .p90="${value90}"
 *   formatter="currency">
 * </percentile-spectrum>
 * ```
 */
export class PercentileSpectrum extends BaseComponent {
  /** Section title */
  private _title: string = 'DISTRIBUTION';

  /** P10 value */
  private _p10: number = 0;

  /** P50 value */
  private _p50: number = 0;

  /** P90 value */
  private _p90: number = 0;

  /** Formatter type */
  private _formatter: 'currency' | 'percent' = 'currency';

  /**
   * Set the title
   */
  set title(value: string) {
    this._title = value;
    this.updateDisplay();
  }

  get title(): string {
    return this._title;
  }

  /**
   * Set the P10 (worst case) value
   */
  set p10(value: number) {
    this._p10 = value;
    this.updateDisplay();
  }

  get p10(): number {
    return this._p10;
  }

  /**
   * Set the P50 (median) value
   */
  set p50(value: number) {
    this._p50 = value;
    this.updateDisplay();
  }

  get p50(): number {
    return this._p50;
  }

  /**
   * Set the P90 (best case) value
   */
  set p90(value: number) {
    this._p90 = value;
    this.updateDisplay();
  }

  get p90(): number {
    return this._p90;
  }

  /**
   * Set the formatter type
   */
  set formatter(value: 'currency' | 'percent') {
    this._formatter = value;
    this.updateDisplay();
  }

  get formatter(): 'currency' | 'percent' {
    return this._formatter;
  }

  protected template(): string {
    return `
      <div class="spectrum-container">
        <h4 class="spectrum-title" id="title">${this._title}</h4>

        <div class="spectrum-bar-container">
          <!-- Labels above the bar -->
          <div class="label-row">
            <div class="label left">
              <span class="label-text">10TH PERCENTILE</span>
              <span class="label-subtext">(WORST CASE)</span>
            </div>
            <div class="label center">
              <span class="label-text teal">MEDIAN</span>
              <span class="label-subtext">(50TH PERCENTILE)</span>
            </div>
            <div class="label right">
              <span class="label-text">90TH PERCENTILE</span>
              <span class="label-subtext">(BEST CASE)</span>
            </div>
          </div>

          <!-- Gradient bar -->
          <div class="gradient-bar"></div>

          <!-- Value boxes -->
          <div class="value-row">
            <div class="value-box p10" id="p10-box">
              <span id="p10-value">$0</span>
            </div>
            <div class="value-box p50" id="p50-box">
              <span id="p50-value">$0</span>
            </div>
            <div class="value-box p90" id="p90-box">
              <span id="p90-value">$0</span>
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

      .spectrum-container {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        padding: var(--spacing-lg, 24px);
        transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .spectrum-container:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(26, 36, 36, 0.12));
        border-color: var(--color-primary, #0d9488);
      }

      .spectrum-title {
        margin: 0 0 var(--spacing-lg, 24px) 0;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        text-align: center;
        letter-spacing: 0.05em;
      }

      .spectrum-bar-container {
        position: relative;
      }

      .label-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--spacing-sm, 8px);
      }

      .label {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
      }

      .label.left {
        align-items: flex-start;
      }

      .label.center {
        align-items: center;
      }

      .label.right {
        align-items: flex-end;
      }

      .label-text {
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        color: var(--text-secondary, #475569);
        letter-spacing: 0.02em;
      }

      .label-text.teal {
        color: var(--color-primary, #0d9488);
      }

      .label-subtext {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
        font-weight: 400;
      }

      .gradient-bar {
        height: 8px;
        border-radius: 4px;
        background: linear-gradient(
          to right,
          #f87171 0%,
          #fb923c 25%,
          #fbbf24 50%,
          #a3e635 75%,
          #22c55e 100%
        );
        margin: var(--spacing-md, 16px) 0;
      }

      .value-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        position: relative;
      }

      .value-box {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-radius: var(--radius-md, 6px);
        font-weight: 600;
        min-width: 100px;
      }

      .value-box.p10 {
        background: #fecaca;
        color: #dc2626;
      }

      .value-box.p50 {
        background: #ffffff;
        border: 2px solid var(--color-primary, #0d9488);
        color: var(--color-primary, #0d9488);
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        font-size: var(--font-size-xl, 1.25rem);
        min-width: 140px;
      }

      .value-box.p90 {
        background: #bbf7d0;
        color: #16a34a;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .spectrum-container {
          padding: var(--spacing-md, 16px);
        }

        .spectrum-title {
          font-size: var(--font-size-xs, 0.75rem);
          margin-bottom: var(--spacing-md, 16px);
        }

        .label-text {
          font-size: 0.6rem;
        }

        .label-subtext {
          font-size: 0.55rem;
        }

        .gradient-bar {
          height: 6px;
          margin: var(--spacing-sm, 8px) 0;
        }

        .value-row {
          flex-wrap: wrap;
          gap: var(--spacing-xs, 4px);
        }

        .value-box {
          min-width: 60px;
          flex: 1;
          padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
          font-size: var(--font-size-xs, 0.75rem);
        }

        .value-box.p50 {
          min-width: 80px;
          flex: 1.5;
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
          font-size: var(--font-size-base, 1rem);
        }
      }

      @media (max-width: 480px) {
        .spectrum-container {
          padding: var(--spacing-sm, 8px);
        }

        .label-row {
          display: none;
        }

        .value-row {
          flex-direction: column;
          gap: var(--spacing-xs, 4px);
          align-items: stretch;
        }

        .value-box {
          width: 100%;
          min-width: unset;
          font-size: var(--font-size-xs, 0.75rem);
        }

        .value-box.p50 {
          min-width: unset;
          font-size: var(--font-size-sm, 0.875rem);
          order: -1;
        }

        .value-box::before {
          font-size: 0.6rem;
          margin-right: var(--spacing-sm, 8px);
        }

        .value-box.p10::before {
          content: "10th %ile: ";
          font-weight: normal;
        }

        .value-box.p50::before {
          content: "Median: ";
          font-weight: normal;
        }

        .value-box.p90::before {
          content: "90th %ile: ";
          font-weight: normal;
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateDisplay();
  }

  /**
   * Format a number based on the current formatter setting
   */
  private formatValue(value: number): string {
    if (this._formatter === 'percent') {
      return `${(value * 100).toFixed(1)}%`;
    }

    // Currency formatting with appropriate notation
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: value >= 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 1000000 ? 1 : 0,
    }).format(value);
  }

  /**
   * Update the display with current values
   */
  private updateDisplay(): void {
    const titleEl = this.$('#title');
    const p10Value = this.$('#p10-value');
    const p50Value = this.$('#p50-value');
    const p90Value = this.$('#p90-value');

    if (titleEl) titleEl.textContent = this._title;
    if (p10Value) p10Value.textContent = this.formatValue(this._p10);
    if (p50Value) p50Value.textContent = this.formatValue(this._p50);
    if (p90Value) p90Value.textContent = this.formatValue(this._p90);
  }
}

// Register the custom element
customElements.define('percentile-spectrum', PercentileSpectrum);
