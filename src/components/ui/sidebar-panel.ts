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

  protected template(): string {
    const isCollapsed = this.hasAttribute('collapsed');
    return `
      <aside class="sidebar">
        <button class="toggle-btn"
                aria-label="Toggle sidebar"
                aria-expanded="${!isCollapsed}">
          <span class="icon">${isCollapsed ? '>' : '<'}</span>
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
        justify-content: center;
        width: 100%;
        padding: var(--spacing-md, 16px);
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        cursor: pointer;
        font-size: 1rem;
        color: var(--text-secondary, #64748b);
        transition: background 0.2s ease;
      }

      .toggle-btn:hover {
        background: var(--surface-tertiary, #e2e8f0);
      }

      .toggle-btn:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: -2px;
      }

      :host([collapsed]) .toggle-btn .icon {
        transform: rotate(180deg);
      }

      .icon {
        transition: transform 0.3s ease;
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
