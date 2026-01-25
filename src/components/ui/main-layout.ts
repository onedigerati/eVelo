import { BaseComponent } from '../base-component';

/**
 * Main layout orchestrator component.
 * Manages the overall page layout: sidebar on left, main content on right.
 *
 * @element main-layout
 * @attr {boolean} sidebar-collapsed - When present, sidebar is collapsed
 *
 * @example
 * <main-layout>
 *   <sidebar-panel slot="sidebar">...</sidebar-panel>
 *   <h1 slot="header">Dashboard</h1>
 *   <div>Main content goes here</div>
 * </main-layout>
 */
export class MainLayout extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['sidebar-collapsed'];
  }

  /**
   * Override to prevent re-render on attribute changes.
   * CSS handles the visual changes via :host([sidebar-collapsed]) selectors.
   * Re-rendering would destroy slot elements and break content distribution.
   */
  override attributeChangedCallback(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null
  ): void {
    // Do nothing - CSS handles sidebar-collapsed and sidebar-open states
    // Do NOT call render() as it would destroy slots and break layout
  }

  protected template(): string {
    return `
      <div class="layout">
        <header class="main-header">
          <button class="mobile-menu-btn" aria-label="Toggle parameters sidebar">
            <span class="menu-label">eVelo Parameters</span>
            <span class="menu-icon" aria-hidden="true">&#9662;</span>
          </button>
          <slot name="header"></slot>
        </header>
        <div class="sidebar-area">
          <slot name="sidebar"></slot>
        </div>
        <div class="main-area">
          <main class="main-content">
            <slot></slot>
          </main>
        </div>
        <div class="sidebar-backdrop" aria-hidden="true"></div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        height: 100vh;
      }

      .layout {
        display: grid;
        grid-template-areas:
          "header header"
          "sidebar main";
        grid-template-rows: auto 1fr;
        grid-template-columns: var(--sidebar-width, 320px) 1fr;
        height: 100%;
      }

      :host([sidebar-collapsed]) .layout {
        grid-template-columns: var(--sidebar-collapsed-width, 48px) 1fr;
      }

      .main-header {
        grid-area: header;
        display: flex;
        align-items: center;
      }

      /* Make slotted header element fill full width */
      .main-header ::slotted(*) {
        flex: 1;
      }

      .sidebar-area {
        grid-area: sidebar;
        overflow-y: auto;
        background: var(--surface-secondary, #f8fafc);
        border-right: 1px solid var(--border-color, #e2e8f0);
      }

      .main-area {
        grid-area: main;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .mobile-menu-btn {
        display: none;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs, 4px);
        background: var(--color-primary, #0d9488);
        border: none;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        cursor: pointer;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        color: var(--text-inverse, #ffffff);
        border-radius: var(--border-radius-sm, 4px);
        margin-left: var(--spacing-sm, 8px);
        min-width: 48px;
        min-height: 48px;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        touch-action: manipulation;
        transition: background 0.2s ease, transform 0.1s ease;
      }

      .mobile-menu-btn:hover {
        background: var(--color-primary-dark, #0f766e);
      }

      .mobile-menu-btn:focus-visible {
        outline: 2px solid var(--text-inverse, #ffffff);
        outline-offset: 2px;
      }

      .mobile-menu-btn:active {
        transform: scale(0.98);
      }

      .menu-label {
        white-space: nowrap;
      }

      .menu-icon {
        font-size: 0.75rem;
        transition: transform 0.3s ease;
      }

      :host([sidebar-collapsed]) .menu-icon {
        transform: rotate(180deg);
      }

      /* Dark theme */
      :host-context([data-theme="dark"]) .mobile-menu-btn {
        background: var(--color-primary, #0d9488);
      }

      :host-context([data-theme="dark"]) .mobile-menu-btn:hover {
        background: var(--color-primary-light, #14b8a6);
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: var(--spacing-lg, 24px);
        background: var(--surface-primary, #ffffff);
      }

      .sidebar-backdrop {
        display: none;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .layout {
          grid-template-areas:
            "header"
            "sidebar"
            "main";
          grid-template-rows: auto auto 1fr;
          grid-template-columns: 1fr;
        }

        .sidebar-area {
          position: relative;
          width: 100%;
          max-height: 60vh;
          overflow-y: auto;
          transform: translateY(0);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.3s ease;
          border-right: none;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        :host([sidebar-collapsed]) .sidebar-area {
          transform: translateY(-100%);
          max-height: 0;
          overflow: hidden;
          opacity: 0;
        }

        .sidebar-backdrop {
          display: none;
        }

        .mobile-menu-btn {
          display: flex;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .sidebar-area {
          transition: none;
        }
      }
    `;
  }

  protected override afterRender(): void {
    // Listen for 'toggle' event from sidebar-panel, update sidebar-collapsed attribute
    this.addEventListener('toggle', ((e: CustomEvent) => {
      if (e.detail.collapsed) {
        this.setAttribute('sidebar-collapsed', '');
      } else {
        this.removeAttribute('sidebar-collapsed');
      }
    }) as EventListener);

    // Mobile menu button toggles sidebar collapse
    this.$('.mobile-menu-btn')?.addEventListener('click', () => {
      if (this.hasAttribute('sidebar-collapsed')) {
        this.removeAttribute('sidebar-collapsed');
        // Also clear sidebar-panel's collapsed attribute
        const sidebarPanel = this.querySelector('sidebar-panel');
        sidebarPanel?.removeAttribute('collapsed');
      } else {
        this.setAttribute('sidebar-collapsed', '');
      }
    });

    // Auto-collapse sidebar when simulation runs (mobile only)
    this.addEventListener('simulation-start', () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        this.setAttribute('sidebar-collapsed', '');
      }
    });
  }
}

// Register the custom element
customElements.define('main-layout', MainLayout);
