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
    return ['title', 'open'];
  }

  protected template(): string {
    const title = this.getAttribute('title') || 'Section';
    const isOpen = this.hasAttribute('open') ? 'open' : '';

    return `
      <details ${isOpen}>
        <summary>
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
      }

      details {
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-md, 16px);
        cursor: pointer;
        user-select: none;
        list-style: none;
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        transition: background 0.2s ease;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      summary::marker {
        display: none;
      }

      summary:hover {
        background: var(--surface-tertiary, #e2e8f0);
      }

      summary:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: -2px;
      }

      .section-title {
        font-size: var(--font-size-md, 1rem);
      }

      .chevron {
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid var(--text-secondary, #64748b);
        transition: transform 0.2s ease;
      }

      details[open] .chevron {
        transform: rotate(180deg);
      }

      .section-content {
        padding: 0 var(--spacing-md, 16px) var(--spacing-md, 16px);
      }
    `;
  }
}

// Register the custom element
customElements.define('param-section', ParamSection);
