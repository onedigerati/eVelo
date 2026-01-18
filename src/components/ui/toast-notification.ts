/**
 * Individual toast notification element.
 * Displays success, error, info, or warning messages.
 */
import { BaseComponent } from '../base-component';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export class ToastNotification extends BaseComponent {
  static get observedAttributes(): string[] {
    return ['type'];
  }

  /**
   * Get toast type.
   */
  get type(): ToastType {
    return (this.getAttribute('type') as ToastType) || 'info';
  }

  /**
   * Set toast type.
   */
  set type(val: ToastType) {
    this.setAttribute('type', val);
  }

  /**
   * Get icon based on toast type.
   */
  private getIcon(): string {
    switch (this.type) {
      case 'success':
        return '\u2713'; // checkmark
      case 'error':
        return '\u2715'; // x mark
      case 'warning':
        return '\u26A0'; // warning sign
      case 'info':
      default:
        return '\u2139'; // info symbol
    }
  }

  protected template(): string {
    return `
      <output class="toast">
        <span class="icon">${this.getIcon()}</span>
        <span class="message"><slot></slot></span>
        <button class="close" aria-label="Dismiss">&times;</button>
      </output>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: var(--toast-bg, #333);
        color: var(--toast-color, #fff);
        border-radius: var(--border-radius-md, 8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        animation: slide-in 0.3s ease;
        min-width: 200px;
        max-width: 400px;
      }

      :host([type="success"]) .toast {
        --toast-bg: var(--color-success, #22c55e);
      }

      :host([type="error"]) .toast {
        --toast-bg: var(--color-error, #ef4444);
      }

      :host([type="warning"]) .toast {
        --toast-bg: var(--color-warning, #f59e0b);
      }

      :host([type="info"]) .toast {
        --toast-bg: var(--color-primary, #3b82f6);
      }

      .icon {
        font-size: 1.2em;
      }

      .message {
        flex: 1;
      }

      .close {
        background: transparent;
        border: none;
        color: inherit;
        font-size: 1.2em;
        cursor: pointer;
        padding: 0 4px;
        opacity: 0.7;
        transition: opacity 0.15s ease;
      }

      .close:hover {
        opacity: 1;
      }

      @keyframes slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      :host(.removing) .toast {
        animation: fade-out 0.3s ease forwards;
      }

      @keyframes fade-out {
        to { opacity: 0; transform: translateY(10px); }
      }
    `;
  }

  protected afterRender(): void {
    const closeBtn = this.$('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.remove();
      });
    }
  }
}

// Register the custom element
customElements.define('toast-notification', ToastNotification);
