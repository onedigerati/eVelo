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
    // Use teal brand color for tooltip background
    const tooltipBg = '#0d9488';
    const tooltipBgDark = '#14b8a6';

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
        width: 16px;
        height: 16px;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--color-primary, #0d9488);
        cursor: help;
        transition: color 0.15s ease, transform 0.15s ease;
      }

      .help-trigger:hover {
        color: var(--color-primary-hover, #0f766e);
        transform: scale(1.1);
      }

      .help-trigger:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
        border-radius: 50%;
      }

      .tooltip-content {
        position: absolute;
        min-width: 200px;
        max-width: 300px;
        padding: 12px 16px;
        background: ${tooltipBg};
        color: #ffffff;
        font-size: 13px;
        font-weight: 450;
        line-height: 1.6;
        letter-spacing: 0.01em;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        pointer-events: none;
        white-space: normal;
        overflow-wrap: break-word;
        word-wrap: break-word;
        text-align: left;
      }

      .tooltip-content.visible {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      /* Position variants - use bottom as default to avoid clipping at sidebar edge */
      .tooltip-content.top {
        bottom: calc(100% + 10px);
        left: 0;
      }

      .tooltip-content.bottom {
        top: calc(100% + 10px);
        left: 0;
      }

      .tooltip-content.left {
        right: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
      }

      .tooltip-content.right {
        left: calc(100% + 10px);
        top: 50%;
        transform: translateY(-50%);
      }

      /* Tooltip arrow */
      .tooltip-content::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 8px solid transparent;
      }

      .tooltip-content.top::before {
        top: 100%;
        left: 16px;
        border-top-color: ${tooltipBg};
      }

      .tooltip-content.bottom::before {
        bottom: 100%;
        left: 16px;
        border-bottom-color: ${tooltipBg};
      }

      .tooltip-content.left::before {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: ${tooltipBg};
      }

      .tooltip-content.right::before {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: ${tooltipBg};
      }

      /* Dark theme - use :host-context to detect theme outside shadow DOM */
      :host-context([data-theme="dark"]) .tooltip-content {
        background: ${tooltipBgDark};
        box-shadow: 0 4px 16px rgba(20, 184, 166, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      :host-context([data-theme="dark"]) .tooltip-content.top::before {
        border-top-color: ${tooltipBgDark};
      }

      :host-context([data-theme="dark"]) .tooltip-content.bottom::before {
        border-bottom-color: ${tooltipBgDark};
      }

      :host-context([data-theme="dark"]) .tooltip-content.left::before {
        border-left-color: ${tooltipBgDark};
      }

      :host-context([data-theme="dark"]) .tooltip-content.right::before {
        border-right-color: ${tooltipBgDark};
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
