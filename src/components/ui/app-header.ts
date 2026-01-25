import { BaseComponent } from '../base-component';

/**
 * Application header component with branding and action buttons.
 * Displays eVelo wordmark, tagline, and slotted action buttons.
 *
 * @element app-header
 * @slot actions - Container for header action buttons (theme toggle, settings, etc.)
 *
 * @example
 * <app-header>
 *   <div slot="actions">
 *     <button aria-label="Settings">Settings</button>
 *     <button aria-label="Help">Help</button>
 *   </div>
 * </app-header>
 */
export class AppHeader extends BaseComponent {
  protected template(): string {
    return `
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-wordmark">
            <span class="brand-icon" aria-hidden="true">&#9889;</span>
            <h1 class="brand-title">eVelo</h1>
          </div>
          <p class="brand-tagline">Tax-Efficient Portfolio Strategy Simulator</p>
        </div>
        <div class="header-actions">
          <slot name="actions"></slot>
        </div>
      </header>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
      }

      .header-brand {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
      }

      .brand-wordmark {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      .brand-icon {
        font-size: clamp(1.25rem, 2.5vw + 0.5rem, 1.75rem);
        line-height: 1;
      }

      .brand-title {
        margin: 0;
        font-size: clamp(1.25rem, 2.5vw + 0.5rem, 1.75rem);
        font-weight: 700;
        font-family: var(--font-family, system-ui, -apple-system, sans-serif);
        letter-spacing: -0.02em;
        line-height: 1;
      }

      .brand-tagline {
        margin: 0;
        font-size: clamp(0.75rem, 1.5vw + 0.25rem, 0.875rem);
        opacity: 0.9;
        font-weight: 400;
        letter-spacing: 0.01em;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      /* Slotted action buttons styling */
      ::slotted(button),
      ::slotted([role="button"]) {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: var(--text-inverse, #ffffff);
        border-radius: var(--border-radius-md, 8px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        cursor: pointer;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        transition: background-color 0.15s ease, border-color 0.15s ease;
      }

      ::slotted(button:hover),
      ::slotted([role="button"]:hover) {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.4);
      }

      ::slotted(button:focus-visible),
      ::slotted([role="button"]:focus-visible) {
        outline: 2px solid var(--text-inverse, #ffffff);
        outline-offset: 2px;
      }

      /* Mobile responsive: hide tagline */
      @media (max-width: 768px) {
        .app-header {
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        }

        .brand-tagline {
          display: none;
        }

        .header-actions {
          gap: var(--spacing-xs, 4px);
        }

        ::slotted(button),
        ::slotted([role="button"]) {
          padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        }
      }

      /* Dark theme adjustments */
      :host-context([data-theme="dark"]) .app-header {
        background: var(--color-primary, #14b8a6);
      }

      :host-context([data-theme="dark"]) ::slotted(button),
      :host-context([data-theme="dark"]) ::slotted([role="button"]) {
        background: rgba(0, 0, 0, 0.2);
        border-color: rgba(0, 0, 0, 0.3);
      }

      :host-context([data-theme="dark"]) ::slotted(button:hover),
      :host-context([data-theme="dark"]) ::slotted([role="button"]:hover) {
        background: rgba(0, 0, 0, 0.3);
        border-color: rgba(0, 0, 0, 0.4);
      }
    `;
  }
}

// Register the custom element
customElements.define('app-header', AppHeader);
