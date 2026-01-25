import { BaseComponent } from '../base-component';

/**
 * Range slider input component.
 * Provides a styled range input with optional label and value display.
 *
 * @example
 * <range-slider min="0" max="100" step="1" value="50" label="Amount" show-value></range-slider>
 */
export class RangeSlider extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['min', 'max', 'step', 'value', 'label', 'show-value', 'suffix'];
  }

  protected template(): string {
    const label = this.getAttribute('label');
    const showValue = this.hasAttribute('show-value') || this.hasAttribute('suffix');
    const value = this.getAttribute('value') ?? '0';
    const min = this.getAttribute('min') ?? '0';
    const max = this.getAttribute('max') ?? '100';
    const step = this.getAttribute('step') ?? '1';
    const suffix = this.getAttribute('suffix') ?? '';

    // Calculate initial fill percentage
    const numValue = parseFloat(value);
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);
    const fillPercent = ((numValue - numMin) / (numMax - numMin)) * 100;

    return `
      <div class="range-wrapper">
        ${label ? `<label class="label">${label}</label>` : ''}
        <div class="input-row">
          <input
            type="range"
            min="${min}"
            max="${max}"
            step="${step}"
            value="${value}"
            style="--fill-percent: ${fillPercent}%"
          />
          ${showValue ? `<span class="value-display">${value}${suffix}</span>` : ''}
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        max-width: 100%;
      }

      /* Shadow DOM reset - global box-sizing doesn't penetrate */
      *, *::before, *::after {
        box-sizing: border-box;
      }

      .range-wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
      }

      .label {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
      }

      .input-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        flex: 1;
        height: 8px;
        background: linear-gradient(
          to right,
          var(--color-primary, #0d9488) 0%,
          var(--color-primary, #0d9488) var(--fill-percent, 0%),
          var(--slider-track-bg, #e2e8f0) var(--fill-percent, 0%),
          var(--slider-track-bg, #e2e8f0) 100%
        );
        border-radius: var(--border-radius-sm, 4px);
        outline: none;
        cursor: pointer;
      }

      /* Webkit (Chrome, Safari, Edge) */
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        margin-top: -5px; /* Center on 8px track: -(18-8)/2 */
        background: var(--color-primary, #0d9488);
        border: 3px solid var(--surface-primary, #ffffff);
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        background: var(--color-primary-hover, #0f766e);
        transform: scale(1.1);
      }

      input[type="range"]::-webkit-slider-runnable-track {
        height: 8px;
        background: transparent;
        border-radius: var(--border-radius-sm, 4px);
      }

      /* Firefox */
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: var(--color-primary, #0d9488);
        border: 3px solid var(--surface-primary, #ffffff);
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      input[type="range"]::-moz-range-thumb:hover {
        background: var(--color-primary-hover, #0f766e);
        transform: scale(1.1);
      }

      input[type="range"]::-moz-range-track {
        height: 8px;
        background: transparent;
        border-radius: var(--border-radius-sm, 4px);
      }

      /* Firefox progress fill */
      input[type="range"]::-moz-range-progress {
        height: 8px;
        background: var(--color-primary, #0d9488);
        border-radius: var(--border-radius-sm, 4px) 0 0 var(--border-radius-sm, 4px);
      }

      .value-display {
        min-width: 48px;
        text-align: right;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-primary, #1e293b);
        font-variant-numeric: tabular-nums;
      }
    `;
  }

  protected override afterRender(): void {
    const input = this.$('input') as HTMLInputElement | null;
    if (input) {
      input.addEventListener('input', this.handleInput.bind(this));
      input.addEventListener('mouseup', this.handleMouseUp.bind(this));
      input.addEventListener('touchend', this.handleMouseUp.bind(this));
    }
  }

  private handleMouseUp(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);

    // Dispatch commit event to signal user has finalized slider adjustment
    this.dispatchEvent(
      new CustomEvent('commit', {
        bubbles: true,
        composed: true,
        detail: { value },
      })
    );
  }

  private handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    const suffix = this.getAttribute('suffix') ?? '';

    // Update fill percentage for the track gradient
    const min = parseFloat(this.getAttribute('min') ?? '0');
    const max = parseFloat(this.getAttribute('max') ?? '100');
    const fillPercent = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--fill-percent', `${fillPercent}%`);

    // Update value display if present
    const valueDisplay = this.$('.value-display');
    if (valueDisplay) {
      valueDisplay.textContent = `${this.formatValue(value)}${suffix}`;
    }

    // Dispatch change event
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value },
      })
    );
  }

  /**
   * Get the current value.
   */
  get value(): number {
    const input = this.$('input') as HTMLInputElement | null;
    return input ? parseFloat(input.value) : 0;
  }

  /**
   * Set the current value.
   */
  set value(val: number) {
    this.setAttribute('value', String(val));
    const input = this.$('input') as HTMLInputElement | null;
    if (input) {
      input.value = String(val);
      // Update fill percentage for the track gradient
      const min = parseFloat(this.getAttribute('min') ?? '0');
      const max = parseFloat(this.getAttribute('max') ?? '100');
      const fillPercent = ((val - min) / (max - min)) * 100;
      input.style.setProperty('--fill-percent', `${fillPercent}%`);
    }
    const valueDisplay = this.$('.value-display');
    if (valueDisplay) {
      const suffix = this.getAttribute('suffix') ?? '';
      valueDisplay.textContent = `${this.formatValue(val)}${suffix}`;
    }
  }

  /**
   * Format value to avoid floating-point display issues.
   * Rounds to the appropriate decimal places based on step.
   */
  private formatValue(value: number): string {
    const step = parseFloat(this.getAttribute('step') ?? '1');
    const stepStr = step.toString();
    const decimalIndex = stepStr.indexOf('.');
    const decimals = decimalIndex === -1 ? 0 : stepStr.length - decimalIndex - 1;
    const formatted = value.toFixed(decimals);

    // Only strip trailing zeros from decimal portion, not integer portion
    // e.g., "7.50" → "7.5", but "70" stays "70"
    if (decimals > 0) {
      return formatted.replace(/\.?0+$/, '') || '0';
    }
    return formatted;
  }
}

// Register the custom element
customElements.define('range-slider', RangeSlider);
