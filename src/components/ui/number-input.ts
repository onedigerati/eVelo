import { BaseComponent } from '../base-component';

/**
 * Numeric input component with validation.
 * Provides a styled number input with optional label and suffix.
 *
 * @example
 * <number-input min="0" max="100" step="0.1" value="50" label="Rate" suffix="%"></number-input>
 */
export class NumberInput extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['min', 'max', 'step', 'value', 'label', 'suffix'];
  }

  protected template(): string {
    const label = this.getAttribute('label');
    const suffix = this.getAttribute('suffix');
    const value = this.getAttribute('value') ?? '';
    const min = this.getAttribute('min');
    const max = this.getAttribute('max');
    const step = this.getAttribute('step') ?? '1';

    return `
      <div class="input-wrapper">
        ${label ? `<label class="label">${label}</label>` : ''}
        <div class="input-row">
          <input
            type="number"
            value="${value}"
            step="${step}"
            ${min !== null ? `min="${min}"` : ''}
            ${max !== null ? `max="${max}"` : ''}
          />
          ${suffix ? `<span class="suffix">${suffix}</span>` : ''}
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

      .input-wrapper {
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
        position: relative;
      }

      input[type="number"] {
        width: 100%;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        font-size: var(--font-size-md, 1rem);
        font-family: var(--font-family, system-ui, sans-serif);
        color: var(--text-primary, #1e293b);
        background: var(--input-bg, var(--surface-primary, #ffffff));
        border: 1px solid var(--input-border, var(--border-color, #e2e8f0));
        border-radius: var(--border-radius-md, 8px);
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }

      input[type="number"]:hover {
        border-color: var(--border-color-hover, #cbd5e1);
      }

      input[type="number"]:focus {
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        background: var(--surface-primary, #ffffff);
      }

      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button {
        opacity: 1;
      }

      .suffix {
        position: absolute;
        right: var(--spacing-md, 16px);
        color: var(--text-secondary, #64748b);
        font-size: var(--font-size-sm, 0.875rem);
        pointer-events: none;
      }

      /* Add padding to input when suffix is present */
      :host([suffix]) input[type="number"] {
        padding-right: calc(var(--spacing-md, 16px) + 2em);
      }

      /* Focus visible state */
      input[type="number"]:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      /* Disabled state */
      input[type="number"]:disabled {
        background: var(--surface-disabled, #f3f4f6);
        color: var(--text-disabled, #9ca3af);
        border-color: var(--border-disabled, #d1d5db);
        cursor: not-allowed;
        opacity: 0.7;
      }

      :host([disabled]) .label {
        color: var(--text-disabled, #9ca3af);
      }

      :host([disabled]) .suffix {
        color: var(--text-disabled, #9ca3af);
      }
    `;
  }

  protected override afterRender(): void {
    const input = this.$('input') as HTMLInputElement | null;
    if (input) {
      input.addEventListener('input', this.handleInput.bind(this));
      input.addEventListener('change', this.handleChange.bind(this));
      input.addEventListener('keydown', this.handleKeydown.bind(this));
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const value = input.valueAsNumber;

      // Dispatch commit event to signal user has finalized input
      this.dispatchEvent(
        new CustomEvent('commit', {
          bubbles: true,
          composed: true,
          detail: { value: isNaN(value) ? null : value },
        })
      );
    }
  }

  private handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.valueAsNumber;

    this.dispatchEvent(
      new CustomEvent('input', {
        bubbles: true,
        composed: true,
        detail: { value: isNaN(value) ? null : value },
      })
    );
  }

  private handleChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.valueAsNumber;

    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value: isNaN(value) ? null : value },
      })
    );
  }

  /**
   * Get the current value.
   */
  get value(): number | null {
    const input = this.$('input') as HTMLInputElement | null;
    if (!input) return null;
    const val = input.valueAsNumber;
    return isNaN(val) ? null : val;
  }

  /**
   * Set the current value.
   */
  set value(val: number | null) {
    this.setAttribute('value', val !== null ? String(val) : '');
    const input = this.$('input') as HTMLInputElement | null;
    if (input) {
      input.value = val !== null ? String(val) : '';
    }
  }
}

// Register the custom element
customElements.define('number-input', NumberInput);
