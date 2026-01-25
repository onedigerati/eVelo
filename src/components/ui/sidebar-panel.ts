import { BaseComponent } from '../base-component';

/**
 * Collapsible sidebar container component.
 * Provides a toggle button to expand/collapse the sidebar content.
 *
 * @element sidebar-panel
 * @attr {boolean} collapsed - When present, sidebar is collapsed
 * @fires toggle - Dispatched when collapsed state changes
 *
 * @example
 * <sidebar-panel>
 *   <param-section title="Portfolio" open>...</param-section>
 * </sidebar-panel>
 */
export class SidebarPanel extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['collapsed'];
  }

  /**
   * Override to prevent re-render on attribute changes.
   * CSS handles the collapsed state. We manually update the icon.
   * Re-rendering would destroy slots and break content distribution.
   */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) return;

    // Only update the icon and aria attributes, don't re-render
    if (name === 'collapsed') {
      const isCollapsed = newValue !== null;
      const icon = this.$('.toggle-icon');
      const toggleBtn = this.$('.toggle-btn');
      if (icon) {
        icon.textContent = isCollapsed ? '\u25B8' : '\u25C2';
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
        toggleBtn.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} parameters sidebar`);
      }
    }
  }

  protected template(): string {
    const isCollapsed = this.hasAttribute('collapsed');
    return `
      <aside class="sidebar">
        <button class="toggle-btn"
                aria-label="${isCollapsed ? 'Expand' : 'Collapse'} parameters sidebar"
                aria-expanded="${!isCollapsed}">
          <span class="toggle-label">eVelo Parameters</span>
          <span class="toggle-icon" aria-hidden="true">${isCollapsed ? '\u25B8' : '\u25C2'}</span>
        </button>
        <div class="sidebar-content">
          <slot></slot>
        </div>
        <div class="sidebar-footer">
          <slot name="footer"></slot>
        </div>
      </aside>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        height: 100%;
      }

      .sidebar {
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100%;
        width: var(--sidebar-width, 320px);
        background: var(--surface-secondary, #f8fafc);
        border-right: 1px solid var(--border-color, #e2e8f0);
        transition: width 0.3s ease;
        overflow: hidden;
      }

      :host([collapsed]) .sidebar {
        width: var(--sidebar-collapsed-width, 48px);
      }

      :host([collapsed]) .sidebar-content {
        display: none;
      }

      :host([collapsed]) .sidebar-footer {
        display: none;
      }

      .toggle-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-sm, 8px);
        width: 100%;
        padding: var(--spacing-md, 16px);
        background: var(--color-primary, #0d9488);
        border: none;
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        cursor: pointer;
        font-size: 1rem;
        color: var(--text-inverse, #ffffff);
        transition: background 0.2s ease;
      }

      .toggle-btn:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .toggle-btn:focus-visible {
        outline: 2px solid var(--text-inverse, #ffffff);
        outline-offset: -2px;
      }

      .toggle-label {
        font-weight: 600;
        font-size: var(--font-size-sm, 0.875rem);
        white-space: nowrap;
        transition: writing-mode 0.3s ease, opacity 0.3s ease;
      }

      .toggle-icon {
        font-size: 0.875rem;
        transition: transform 0.3s ease;
        flex-shrink: 0;
      }

      /* Desktop collapsed: vertical text using writing-mode */
      :host([collapsed]) .toggle-btn {
        justify-content: center;
        padding: var(--spacing-lg, 24px) var(--spacing-sm, 8px);
        height: 100%;
        flex-direction: column;
      }

      :host([collapsed]) .toggle-label {
        writing-mode: vertical-rl;
        text-orientation: mixed;
      }

      :host([collapsed]) .toggle-icon {
        transform: rotate(90deg);
        margin-top: var(--spacing-sm, 8px);
      }

      /* Dark theme support */
      :host-context([data-theme="dark"]) .toggle-btn {
        background: var(--color-primary, #0d9488);
      }

      :host-context([data-theme="dark"]) .toggle-btn:hover {
        background: var(--color-primary-light, #14b8a6);
      }

      /* Mobile: Always horizontal label, hide icon */
      @media (max-width: 768px) {
        .toggle-btn {
          display: none; /* Hide on mobile - main-layout handles mobile toggle */
        }
      }

      .sidebar-content {
        overflow-y: auto;
        padding: var(--spacing-sm, 8px);
      }

      .sidebar-footer {
        padding: var(--spacing-md, 16px);
        border-top: 1px solid var(--border-color, #e2e8f0);
        background: var(--surface-secondary, #f8fafc);
      }
    `;
  }

  protected override afterRender(): void {
    const toggleBtn = this.$('.toggle-btn');
    toggleBtn?.addEventListener('click', this.handleToggle.bind(this));
  }

  private handleToggle(): void {
    const isCollapsed = this.hasAttribute('collapsed');

    if (isCollapsed) {
      this.removeAttribute('collapsed');
    } else {
      this.setAttribute('collapsed', '');
    }

    this.dispatchEvent(
      new CustomEvent('toggle', {
        bubbles: true,
        composed: true,
        detail: { collapsed: !isCollapsed },
      })
    );
  }
}

// Register the custom element
customElements.define('sidebar-panel', SidebarPanel);
