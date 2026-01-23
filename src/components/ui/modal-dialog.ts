import { BaseComponent } from '../base-component';

/**
 * Options for showing a modal dialog.
 */
export interface ModalOptions {
  /** Modal title */
  title?: string;
  /** Modal subtitle/description */
  subtitle?: string;
  /** Modal type: 'prompt' shows text input, 'confirm' shows body text only, 'choice' shows 3 buttons */
  type?: 'prompt' | 'confirm' | 'choice';
  /** Default value for prompt input */
  defaultValue?: string;
  /** Text for confirm button (default: "OK") */
  confirmText?: string;
  /** Text for cancel button (default: "Cancel") */
  cancelText?: string;
  /** Text for alternate button (only for 'choice' type) */
  alternateText?: string;
}

/**
 * Modal dialog component for prompts and confirmations.
 *
 * Replaces native window.prompt() and window.confirm() with styled modals
 * that match the application design with blur backdrop effect.
 *
 * Usage:
 * ```typescript
 * const modal = this.$('#my-modal') as ModalDialog;
 *
 * // Prompt for input
 * const name = await modal.show({
 *   title: 'Save Portfolio',
 *   subtitle: 'Enter a name:',
 *   type: 'prompt',
 *   defaultValue: 'My Portfolio',
 * });
 *
 * // Confirm action
 * const confirmed = await modal.show({
 *   title: 'Delete',
 *   subtitle: 'Are you sure?',
 *   type: 'confirm',
 * });
 * ```
 *
 * @element modal-dialog
 */
export class ModalDialog extends BaseComponent {
  private _isOpen = false;
  private _options: ModalOptions = {};
  private _resolve: ((value: string | boolean | null) => void) | null = null;

  static get observedAttributes(): string[] {
    return ['title', 'subtitle', 'confirm-text', 'cancel-text'];
  }

  protected template(): string {
    const title = this._options.title || this.getAttribute('title') || '';
    const subtitle = this._options.subtitle || this.getAttribute('subtitle') || '';
    const confirmText = this._options.confirmText || this.getAttribute('confirm-text') || 'OK';
    const cancelText = this._options.cancelText || this.getAttribute('cancel-text') || 'Cancel';
    const alternateText = this._options.alternateText || '';
    const isPrompt = this._options.type === 'prompt';
    const isChoice = this._options.type === 'choice';
    const defaultValue = this._options.defaultValue || '';

    return `
      <div class="modal-overlay ${this._isOpen ? 'open' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-card">
          ${title ? `<h2 id="modal-title" class="modal-title">${title}</h2>` : ''}
          ${subtitle ? `<p class="modal-subtitle">${subtitle}</p>` : ''}
          ${isPrompt ? `
            <input type="text"
                   class="modal-input"
                   value="${this.escapeHtml(defaultValue)}"
                   aria-label="${title || 'Input'}" />
          ` : ''}
          <div class="modal-buttons ${isChoice ? 'three-buttons' : ''}">
            <button type="button" class="modal-btn cancel-btn">${cancelText}</button>
            ${isChoice && alternateText ? `<button type="button" class="modal-btn alternate-btn">${alternateText}</button>` : ''}
            <button type="button" class="modal-btn confirm-btn">${confirmText}</button>
          </div>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: contents;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--modal-backdrop, rgba(0, 0, 0, 0.3));
        backdrop-filter: blur(var(--modal-backdrop-blur, 4px));
        -webkit-backdrop-filter: blur(var(--modal-backdrop-blur, 4px));
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease;
      }

      .modal-overlay.open {
        opacity: 1;
        visibility: visible;
      }

      .modal-card {
        background: var(--surface-primary, #ffffff);
        border-radius: var(--border-radius-lg, 12px);
        padding: var(--spacing-lg, 24px);
        max-width: var(--modal-max-width, 360px);
        width: 90%;
        box-shadow: var(--modal-shadow, 0 10px 25px rgba(0, 0, 0, 0.15));
        transform: scale(0.95);
        transition: transform 0.15s ease;
      }

      .modal-overlay.open .modal-card {
        transform: scale(1);
      }

      .modal-title {
        margin: 0 0 var(--spacing-sm, 8px) 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .modal-subtitle {
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: 0.875rem;
        color: var(--text-secondary, #64748b);
        line-height: 1.5;
      }

      .modal-input {
        width: 100%;
        padding: var(--spacing-sm, 8px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-sm, 6px);
        font-size: 0.875rem;
        color: var(--text-primary, #1e293b);
        background: var(--surface-primary, #ffffff);
        box-sizing: border-box;
        margin-bottom: var(--spacing-md, 16px);
      }

      .modal-input:focus {
        outline: none;
        border-color: var(--color-primary, #0d9488);
        box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.15);
      }

      .modal-buttons {
        display: flex;
        gap: var(--spacing-sm, 8px);
        justify-content: flex-end;
        margin-top: var(--spacing-md, 20px);
      }

      .modal-btn {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-radius: var(--border-radius-sm, 6px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.15s ease, border-color 0.15s ease;
      }

      .cancel-btn {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        color: var(--text-primary, #1e293b);
      }

      .cancel-btn:hover {
        background: var(--surface-secondary, #f8fafc);
        border-color: var(--text-secondary, #64748b);
      }

      .confirm-btn {
        background: var(--color-primary, #0d9488);
        border: 1px solid var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
      }

      .confirm-btn:hover {
        background: var(--color-primary-hover, #0f766e);
        border-color: var(--color-primary-hover, #0f766e);
      }

      .alternate-btn {
        background: var(--color-success, #059669);
        border: 1px solid var(--color-success, #059669);
        color: var(--text-inverse, #ffffff);
      }

      .alternate-btn:hover {
        background: var(--color-success-hover, #047857);
        border-color: var(--color-success-hover, #047857);
      }

      .modal-buttons.three-buttons {
        flex-wrap: wrap;
        gap: var(--spacing-sm, 8px);
      }

      .modal-buttons.three-buttons .cancel-btn {
        order: 1;
      }

      .modal-buttons.three-buttons .alternate-btn {
        order: 2;
      }

      .modal-buttons.three-buttons .confirm-btn {
        order: 3;
      }
    `;
  }

  protected afterRender(): void {
    const overlay = this.$('.modal-overlay');
    const cancelBtn = this.$('.cancel-btn');
    const confirmBtn = this.$('.confirm-btn');
    const alternateBtn = this.$('.alternate-btn');
    const input = this.$('.modal-input') as HTMLInputElement | null;

    // Click outside to cancel
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.cancel();
      }
    });

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      this.cancel();
    });

    // Confirm button
    confirmBtn?.addEventListener('click', () => {
      this.confirm();
    });

    // Alternate button (for 'choice' type)
    alternateBtn?.addEventListener('click', () => {
      this.alternate();
    });

    // Keyboard handling
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.confirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancel();
        }
      });
    }

    // Global escape key when open
    if (this._isOpen) {
      this.handleEscape = this.handleEscape.bind(this);
      document.addEventListener('keydown', this.handleEscape);
    }

    // Focus input on open
    if (this._isOpen && input) {
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }
  }

  private handleEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this._isOpen) {
      e.preventDefault();
      this.cancel();
    }
  }

  /**
   * Show the modal dialog and return a promise that resolves when closed.
   *
   * @param options - Modal configuration options
   * @returns Promise resolving to:
   *   - For 'prompt' type: string value or null if cancelled
   *   - For 'confirm' type: true if confirmed, false if cancelled
   */
  public show(options: ModalOptions = {}): Promise<string | boolean | null> {
    return new Promise((resolve) => {
      this._options = options;
      this._resolve = resolve;
      this._isOpen = true;
      this.render();
    });
  }

  /**
   * Hide the modal dialog.
   */
  public hide(): void {
    this._isOpen = false;
    document.removeEventListener('keydown', this.handleEscape);
    this.render();
  }

  private cancel(): void {
    let result: string | boolean | null;
    if (this._options.type === 'choice') {
      result = 'cancel';
    } else if (this._options.type === 'confirm') {
      result = false;
    } else {
      result = null;
    }
    this.hide();
    this._resolve?.(result);
    this._resolve = null;
  }

  private confirm(): void {
    let result: string | boolean;

    if (this._options.type === 'prompt') {
      const input = this.$('.modal-input') as HTMLInputElement;
      result = input?.value || '';
    } else if (this._options.type === 'choice') {
      result = 'confirm';
    } else {
      result = true;
    }

    this.hide();
    this._resolve?.(result);
    this._resolve = null;
  }

  private alternate(): void {
    this.hide();
    this._resolve?.('alternate');
    this._resolve = null;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('modal-dialog', ModalDialog);
