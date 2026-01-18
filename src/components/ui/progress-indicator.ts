/**
 * Progress indicator component with determinate and indeterminate modes.
 * Used to show simulation progress or loading states.
 */
import { BaseComponent } from '../base-component';

export class ProgressIndicator extends BaseComponent {
  static get observedAttributes(): string[] {
    return ['value', 'indeterminate', 'label'];
  }

  /**
   * Get current progress value (0-100).
   */
  get value(): number {
    return parseInt(this.getAttribute('value') || '0', 10);
  }

  /**
   * Set progress value, clamped to 0-100.
   */
  set value(val: number) {
    const clamped = Math.min(100, Math.max(0, val));
    this.setAttribute('value', String(clamped));
  }

  /**
   * Check if in indeterminate mode.
   */
  get indeterminate(): boolean {
    return this.hasAttribute('indeterminate');
  }

  /**
   * Set indeterminate mode.
   */
  set indeterminate(val: boolean) {
    if (val) {
      this.setAttribute('indeterminate', '');
    } else {
      this.removeAttribute('indeterminate');
    }
  }

  /**
   * Get label text.
   */
  get label(): string {
    return this.getAttribute('label') || '';
  }

  /**
   * Set label text.
   */
  set label(val: string) {
    this.setAttribute('label', val);
  }

  /**
   * Update the progress bar and text when attributes change.
   */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    // Only update if rendered and value actually changed
    if (oldValue === newValue) return;

    const bar = this.$('.progress-bar') as HTMLElement | null;
    const text = this.$('.progress-text') as HTMLElement | null;
    const label = this.$('.progress-label') as HTMLElement | null;

    if (name === 'value' && bar && text) {
      const val = parseInt(newValue || '0', 10);
      bar.style.width = `${val}%`;
      text.textContent = `${val}%`;
    } else if (name === 'label' && label) {
      label.textContent = newValue || '';
    }
  }

  protected template(): string {
    const isIndeterminate = this.indeterminate;
    const currentValue = this.value;
    const labelText = this.label;

    return `
      <div class="progress-wrapper">
        ${labelText ? `<span class="progress-label">${labelText}</span>` : ''}
        <div class="progress-container"
             role="progressbar"
             ${isIndeterminate ? '' : `aria-valuenow="${currentValue}"`}
             aria-valuemin="0"
             aria-valuemax="100"
             ${isIndeterminate ? 'aria-busy="true"' : ''}>
          <div class="progress-bar" style="width: ${isIndeterminate ? '30%' : currentValue + '%'}"></div>
          <span class="progress-text">${isIndeterminate ? 'Processing...' : currentValue + '%'}</span>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .progress-wrapper {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .progress-label {
        font-size: 0.875rem;
        color: var(--text-secondary, #666);
      }

      .progress-container {
        position: relative;
        height: 24px;
        background: var(--surface-tertiary, #e5e5e5);
        border-radius: var(--border-radius-lg, 12px);
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background: var(--color-primary, #3b82f6);
        transition: width 0.2s ease;
      }

      .progress-text {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-primary, #333);
      }

      :host([indeterminate]) .progress-bar {
        width: 30%;
        animation: indeterminate 1.5s infinite linear;
      }

      @keyframes indeterminate {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
    `;
  }
}

// Register the custom element
customElements.define('progress-indicator', ProgressIndicator);
