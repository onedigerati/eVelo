import { BaseComponent } from '../base-component';

/**
 * Option type for select input.
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Select dropdown component.
 * Provides a styled select input with options from JSON attribute.
 *
 * @example
 * <select-input
 *   label="Strategy"
 *   value="bbd"
 *   options='[{"value":"bbd","label":"Buy Borrow Die"},{"value":"sell","label":"Sell & Reinvest"}]'
 * ></select-input>
 */
export class SelectInput extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['options', 'value', 'label'];
  }

  private getOptions(): SelectOption[] {
    const optionsAttr = this.getAttribute('options');
    if (!optionsAttr) return [];

    try {
      return JSON.parse(optionsAttr) as SelectOption[];
    } catch {
      console.warn('select-input: Invalid options JSON');
      return [];
    }
  }

  protected template(): string {
    const label = this.getAttribute('label');
    const value = this.getAttribute('value') ?? '';
    const options = this.getOptions();

    const optionsHtml = options
      .map(
        (opt) =>
          `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
      )
      .join('');

    return `
      <div class="select-wrapper">
        ${label ? `<label class="label">${label}</label>` : ''}
        <div class="select-container">
          <select>${optionsHtml}</select>
          <span class="arrow"></span>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .select-wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
      }

      .label {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #64748b);
      }

      .select-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      select {
        width: 100%;
        padding: var(--spacing-sm, 8px) var(--spacing-xl, 32px) var(--spacing-sm, 8px) var(--spacing-md, 16px);
        font-size: var(--font-size-md, 1rem);
        font-family: var(--font-family, system-ui, sans-serif);
        color: var(--text-primary, #1e293b);
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      select:focus {
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
      }

      select:hover:not(:focus) {
        border-color: var(--color-primary, #0d9488);
      }

      .arrow {
        position: absolute;
        right: var(--spacing-md, 16px);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid var(--text-secondary, #64748b);
        pointer-events: none;
      }
    `;
  }

  protected override afterRender(): void {
    const select = this.$('select') as HTMLSelectElement | null;
    if (select) {
      select.addEventListener('change', this.handleChange.bind(this));
    }
  }

  private handleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

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
  get value(): string {
    const select = this.$('select') as HTMLSelectElement | null;
    return select?.value ?? '';
  }

  /**
   * Set the current value.
   */
  set value(val: string) {
    this.setAttribute('value', val);
    const select = this.$('select') as HTMLSelectElement | null;
    if (select) {
      select.value = val;
    }
  }

  /**
   * Set options programmatically.
   */
  set options(opts: SelectOption[]) {
    this.setAttribute('options', JSON.stringify(opts));
  }
}
