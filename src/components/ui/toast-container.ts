/**
 * Toast container - manages toast notification lifecycle.
 * Singleton container that displays toasts in a fixed position.
 */
import { BaseComponent } from '../base-component';
import type { ToastType } from './toast-notification';

export class ToastContainer extends BaseComponent {
  protected template(): string {
    return `
      <div id="toast-container" role="status" aria-live="polite" aria-atomic="false">
        <!-- Toasts inserted here -->
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      #toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column-reverse;
        gap: 8px;
        z-index: 1000;
        pointer-events: none;
      }

      /* Mobile: center toasts at bottom */
      @media (max-width: 480px) {
        #toast-container {
          left: 16px;
          right: 16px;
        }
      }
    `;
  }

  /**
   * Show a toast notification.
   * @param message - Text to display
   * @param type - 'success' | 'error' | 'info' | 'warning'
   * @param duration - Auto-dismiss after ms (default 5000, 0 = no auto-dismiss)
   */
  public show(
    message: string,
    type: ToastType = 'info',
    duration = 2000
  ): void {
    const container = this.$('#toast-container');
    if (!container) return;

    const toast = document.createElement('toast-notification');
    toast.setAttribute('type', type);
    toast.textContent = message;
    container.appendChild(toast);

    // Limit to 3 visible toasts (remove oldest)
    const toasts = container.querySelectorAll('toast-notification');
    if (toasts.length > 3) {
      toasts[0].remove();
    }

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  }

  /**
   * Show a success toast.
   */
  public success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /**
   * Show an error toast.
   */
  public error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  /**
   * Show an info toast.
   */
  public info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  /**
   * Show a warning toast.
   */
  public warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }
}

// Register the custom element
customElements.define('toast-container', ToastContainer);
