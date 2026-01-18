import { BaseComponent } from '../base-component';

/**
 * Expandable help/guide content component.
 * Wraps native details/summary with styling for help sections.
 *
 * @element help-section
 * @attr {string} title - Help section heading
 * @attr {boolean} open - When present, section is initially expanded
 * @attr {string} icon - Optional icon (defaults to question mark)
 *
 * @example
 * <help-section title="What is SBLOC?" icon="💡">
 *   <p>A Securities-Backed Line of Credit allows you to...</p>
 * </help-section>
 */
export class HelpSection extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['title', 'open', 'icon'];
  }

  protected template(): string {
    const title = this.getAttribute('title') || 'Help';
    const icon = this.getAttribute('icon') || '?';
    const isOpen = this.hasAttribute('open') ? 'open' : '';

    return `
      <details ${isOpen} class="help-details">
        <summary class="help-summary">
          <span class="help-icon">${icon}</span>
          <span class="help-title">${title}</span>
          <span class="chevron">&#9660;</span>
        </summary>
        <div class="help-content">
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

      .help-details {
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--border-radius-md, 8px);
        margin-bottom: var(--spacing-sm, 8px);
      }

      .help-summary {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        cursor: pointer;
        user-select: none;
        list-style: none;
      }

      .help-summary::-webkit-details-marker {
        display: none;
      }

      .help-summary::marker {
        display: none;
      }

      .help-summary:hover {
        background: var(--surface-tertiary, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
      }

      .help-summary:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: -2px;
        border-radius: var(--border-radius-md, 8px);
      }

      .help-icon {
        font-size: 1.2em;
        flex-shrink: 0;
      }

      .help-title {
        flex: 1;
        font-weight: 500;
        color: var(--text-primary, #1e293b);
      }

      .chevron {
        transition: transform 0.2s ease;
        color: var(--text-secondary, #64748b);
        font-size: 0.75em;
      }

      .help-details[open] .chevron {
        transform: rotate(180deg);
      }

      .help-content {
        padding: 0 var(--spacing-md, 16px) var(--spacing-md, 16px);
        color: var(--text-secondary, #64748b);
        font-size: var(--font-size-sm, 0.875rem);
        line-height: 1.6;
      }

      .help-content p {
        margin: 0 0 var(--spacing-sm, 8px);
      }

      .help-content p:last-child {
        margin-bottom: 0;
      }

      .help-content ul,
      .help-content ol {
        margin: 0 0 var(--spacing-sm, 8px);
        padding-left: var(--spacing-lg, 24px);
      }

      .help-content li {
        margin-bottom: var(--spacing-xs, 4px);
      }

      .help-content code {
        background: var(--surface-tertiary, #e2e8f0);
        padding: 2px 4px;
        border-radius: var(--border-radius-sm, 4px);
        font-size: 0.9em;
      }
    `;
  }
}

// Register the custom element
customElements.define('help-section', HelpSection);
