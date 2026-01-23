import { BaseComponent } from '../base-component';

/**
 * Checkbox input component with styled toggle appearance.
 * Provides a styled checkbox with label support.
 *
 * @element checkbox-input
 * @attr {string} label - Label text displayed next to checkbox
 * @attr {boolean} checked - When present, checkbox is checked
 * @attr {boolean} disabled - When present, checkbox is disabled
 *
 * @example
 * <checkbox-input label="Enable feature" checked></checkbox-input>
 */
export class CheckboxInput extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['label', 'checked', 'disabled'];
  }

  protected template(): string {
    const label = this.getAttribute('label') || '';
    const checked = this.hasAttribute('checked');
    const disabled = this.hasAttribute('disabled');

    return `
      <label class="checkbox-wrapper ${disabled ? 'disabled' : ''}">
        <input
          type="checkbox"
          ${checked ? 'checked' : ''}
          ${disabled ? 'disabled' : ''}
        />
        <span class="checkmark">
          <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        ${label ? `<span class="label-text">${label}</span>` : ''}
      </label>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .checkbox-wrapper {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        cursor: pointer;
        user-select: none;
      }

      .checkbox-wrapper.disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }

      .checkmark {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: var(--surface-primary, #ffffff);
        border: 2px solid var(--border-color, #cbd5e1);
        border-radius: var(--radius-sm, 4px);
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .checkmark svg {
        width: 12px;
        height: 12px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
      }

      input[type="checkbox"]:checked + .checkmark {
        background: var(--color-primary, #0d9488);
        border-color: var(--color-primary, #0d9488);
      }

      input[type="checkbox"]:checked + .checkmark svg {
        opacity: 1;
        transform: scale(1);
      }

      input[type="checkbox"]:focus-visible + .checkmark {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      .checkbox-wrapper:hover .checkmark {
        border-color: var(--color-primary, #0d9488);
      }

      .label-text {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-primary, #1e293b);
        line-height: 1.4;
      }
    `;
  }

  protected override afterRender(): void {
    const input = this.$('input') as HTMLInputElement | null;
    if (input) {
      input.addEventListener('change', this.handleChange.bind(this));
    }
  }

  private handleChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { checked: input.checked },
      })
    );
  }

  /**
   * Get the current checked state.
   */
  get checked(): boolean {
    const input = this.$('input') as HTMLInputElement | null;
    return input?.checked ?? false;
  }

  /**
   * Set the checked state.
   */
  set checked(val: boolean) {
    if (val) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
    const input = this.$('input') as HTMLInputElement | null;
    if (input) {
      input.checked = val;
    }
  }
}

// Register the custom element
customElements.define('checkbox-input', CheckboxInput);
