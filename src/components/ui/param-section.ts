import { BaseComponent } from '../base-component';

/**
 * Collapsible parameter group using native details/summary.
 * Provides a styled disclosure widget for organizing form sections.
 *
 * @element param-section
 * @attr {string} title - Section heading text
 * @attr {boolean} open - When present, section is initially expanded
 *
 * @example
 * <param-section title="Portfolio Settings" open>
 *   <input type="text" name="portfolio-name" />
 * </param-section>
 */
export class ParamSection extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['title', 'open', 'icon'];
  }

  protected template(): string {
    const title = this.getAttribute('title') || 'Section';
    const icon = this.getAttribute('icon') || '';
    const isOpen = this.hasAttribute('open') ? 'open' : '';

    return `
      <details ${isOpen}>
        <summary>
          ${icon ? `<span class="section-icon">${icon}</span>` : ''}
          <span class="section-title">${title}</span>
          <span class="chevron" aria-hidden="true"></span>
        </summary>
        <div class="section-content">
          <slot></slot>
        </div>
      </details>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        margin-bottom: var(--spacing-md, 16px);
        max-width: 100%;
      }

      /* Shadow DOM reset - global box-sizing doesn't penetrate */
      *, *::before, *::after {
        box-sizing: border-box;
      }

      details {
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--border-radius-lg, 12px);
        border-left: 4px solid var(--color-primary, #0d9488);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        overflow: hidden;
      }

      summary {
        display: flex;
        align-items: center;
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        cursor: pointer;
        user-select: none;
        list-style: none;
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        transition: background 0.2s ease;
        gap: var(--spacing-sm, 8px);
      }

      summary::-webkit-details-marker {
        display: none;
      }

      summary::marker {
        display: none;
      }

      summary:hover {
        background: var(--surface-hover, rgba(0, 0, 0, 0.02));
      }

      summary:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: -2px;
      }

      .section-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        color: var(--section-icon-color, var(--color-primary, #0d9488));
      }

      .section-icon svg {
        width: 20px;
        height: 20px;
      }

      .section-title {
        flex: 1;
        font-size: var(--font-size-sm, 0.875rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-primary, #1e293b);
      }

      .chevron {
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid var(--text-secondary, #64748b);
        transition: transform 0.2s ease;
        flex-shrink: 0;
      }

      details[open] .chevron {
        transform: rotate(180deg);
      }

      .section-content {
        padding: 0 var(--spacing-lg, 24px) var(--spacing-lg, 24px);
      }
    `;
  }
}

// Register the custom element
customElements.define('param-section', ParamSection);
