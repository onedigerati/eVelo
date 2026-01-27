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
        background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
        border: none;
        border-bottom: 2px solid #0d9488;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 700;
        color: #065f56;
        box-shadow: 0 2px 8px rgba(13, 148, 136, 0.2), 0 1px 3px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      }

      .toggle-btn:hover {
        background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25), 0 2px 4px rgba(0,0,0,0.12);
      }

      .toggle-btn:focus-visible {
        outline: 2px solid #0d9488;
        outline-offset: 2px;
      }

      .toggle-label {
        font-weight: 700;
        font-size: var(--font-size-sm, 0.875rem);
        white-space: nowrap;
        transition: writing-mode 0.3s ease, opacity 0.3s ease;
      }

      .toggle-icon {
        font-size: 0.875rem;
        transition: transform 0.3s ease;
        flex-shrink: 0;
        color: #0d9488;
      }

      /* Desktop collapsed: vertical text using writing-mode */
      :host([collapsed]) .toggle-btn {
        justify-content: center;
        padding: var(--spacing-lg, 24px) var(--spacing-sm, 8px);
        height: 100%;
        flex-direction: column;
        border-bottom: none;
        border-right: 2px solid #5eead4;
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
        background: linear-gradient(135deg, #134e4a 0%, #115e59 100%);
        color: #ccfbf1;
        border-bottom-color: #0d9488;
      }

      :host-context([data-theme="dark"]) .toggle-btn:hover {
        background: linear-gradient(135deg, #115e59 0%, #0f766e 100%);
      }

      :host-context([data-theme="dark"]) .toggle-icon {
        color: #5eead4;
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

      /* Custom scrollbar styling - subtle by default, prominent on hover */
      .sidebar-content {
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
      }

      .sidebar-content:hover {
        scrollbar-color: #b4bcc5 transparent;
      }

      .sidebar-content::-webkit-scrollbar {
        width: 8px;
      }

      .sidebar-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .sidebar-content::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 4px;
      }

      /* Show scrollbar on hover */
      .sidebar-content:hover::-webkit-scrollbar-thumb {
        background: #b4bcc5;
      }

      .sidebar-content:hover::-webkit-scrollbar-thumb:hover {
        background: #8b96a6;
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
