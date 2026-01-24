import { BaseComponent } from '../base-component';

/**
 * Accessible help tooltip component following WCAG 1.4.13
 * Provides contextual help on hover, focus, and keyboard interaction
 *
 * @element help-tooltip
 * @attr {string} content - Tooltip text content
 * @attr {string} position - Tooltip position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 *
 * @example
 * <help-tooltip content="Loan-to-Value ratio explanation" position="top"></help-tooltip>
 */
export class HelpTooltip extends BaseComponent {
  private tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  private hideTimeout: number | null = null;

  static override get observedAttributes(): string[] {
    return ['content', 'position'];
  }

  protected template(): string {
    const content = this.getAttribute('content') || '';
    const position = this.getAttribute('position') || 'top';

    return `
      <button class="help-trigger"
              aria-describedby="${this.tooltipId}"
              type="button"
              aria-label="Help">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <text x="7" y="10" text-anchor="middle" font-size="9" fill="currentColor">?</text>
        </svg>
      </button>
      <div role="tooltip"
           id="${this.tooltipId}"
           class="tooltip-content ${position}"
           aria-hidden="true">
        ${content}
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: inline-flex;
        position: relative;
        vertical-align: middle;
      }

      .help-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--text-secondary, #64748b);
        cursor: help;
        transition: color 0.15s ease;
      }

      .help-trigger:hover {
        color: var(--color-primary, #0d9488);
      }

      .help-trigger:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
        border-radius: 2px;
      }

      .tooltip-content {
        position: absolute;
        max-width: 250px;
        padding: 8px 12px;
        background: var(--surface-tertiary, #1e293b);
        color: var(--text-on-dark, #ffffff);
        font-size: 12px;
        line-height: 1.4;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease;
        pointer-events: none;
        white-space: normal;
      }

      .tooltip-content.visible {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      /* Position variants */
      .tooltip-content.top {
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
      }

      .tooltip-content.bottom {
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
      }

      .tooltip-content.left {
        right: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
      }

      .tooltip-content.right {
        left: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
      }

      /* Tooltip arrow (optional visual enhancement) */
      .tooltip-content::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 6px solid transparent;
      }

      .tooltip-content.top::before {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: var(--surface-tertiary, #1e293b);
      }

      .tooltip-content.bottom::before {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: var(--surface-tertiary, #1e293b);
      }

      .tooltip-content.left::before {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: var(--surface-tertiary, #1e293b);
      }

      .tooltip-content.right::before {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: var(--surface-tertiary, #1e293b);
      }

      /* Dark theme adjustments */
      [data-theme="dark"] .tooltip-content {
        background: var(--surface-secondary, #f8fafc);
        color: var(--text-primary, #1e293b);
      }

      [data-theme="dark"] .tooltip-content.top::before {
        border-top-color: var(--surface-secondary, #f8fafc);
      }

      [data-theme="dark"] .tooltip-content.bottom::before {
        border-bottom-color: var(--surface-secondary, #f8fafc);
      }

      [data-theme="dark"] .tooltip-content.left::before {
        border-left-color: var(--surface-secondary, #f8fafc);
      }

      [data-theme="dark"] .tooltip-content.right::before {
        border-right-color: var(--surface-secondary, #f8fafc);
      }
    `;
  }

  protected override afterRender(): void {
    const trigger = this.$('.help-trigger');
    const tooltip = this.$('.tooltip-content');

    if (!trigger || !tooltip) return;

    // Show tooltip
    const show = () => {
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
    };

    // Hide tooltip immediately
    const hide = () => {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    };

    // Hide tooltip with delay (allows moving to tooltip)
    const delayedHide = () => {
      this.hideTimeout = window.setTimeout(hide, 100);
    };

    // Show events
    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('focus', show);
    tooltip.addEventListener('mouseenter', show);

    // Hide events
    trigger.addEventListener('mouseleave', delayedHide);
    trigger.addEventListener('blur', hide);
    tooltip.addEventListener('mouseleave', hide);

    // Dismiss on Escape
    trigger.addEventListener('keydown', (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        hide();
        (trigger as HTMLElement).blur();
      }
    });
  }

  override disconnectedCallback(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }
}

// Register the custom element
customElements.define('help-tooltip', HelpTooltip);
