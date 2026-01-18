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
        height: 6px;
        background: var(--surface-tertiary, #e2e8f0);
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
        background: var(--color-primary, #0d9488);
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        background: var(--color-primary-hover, #0f766e);
      }

      input[type="range"]::-webkit-slider-runnable-track {
        height: 6px;
        background: var(--surface-tertiary, #e2e8f0);
        border-radius: var(--border-radius-sm, 4px);
      }

      /* Firefox */
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: var(--color-primary, #0d9488);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      input[type="range"]::-moz-range-thumb:hover {
        background: var(--color-primary-hover, #0f766e);
      }

      input[type="range"]::-moz-range-track {
        height: 6px;
        background: var(--surface-tertiary, #e2e8f0);
        border-radius: var(--border-radius-sm, 4px);
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
    }
  }

  private handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    const suffix = this.getAttribute('suffix') ?? '';

    // Update value display if present
    const valueDisplay = this.$('.value-display');
    if (valueDisplay) {
      valueDisplay.textContent = `${input.value}${suffix}`;
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
    }
    const valueDisplay = this.$('.value-display');
    if (valueDisplay) {
      const suffix = this.getAttribute('suffix') ?? '';
      valueDisplay.textContent = `${val}${suffix}`;
    }
  }
}

// Register the custom element
customElements.define('range-slider', RangeSlider);
