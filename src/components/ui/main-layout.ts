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
          <button class="mobile-menu-btn" aria-label="Open menu">&#9776;</button>
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
        background: transparent;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: var(--spacing-sm, 8px);
        color: var(--text-inverse, #ffffff);
        border-radius: var(--border-radius-sm, 4px);
      }

      .mobile-menu-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .mobile-menu-btn:focus-visible {
        outline: 2px solid var(--text-inverse, #ffffff);
        outline-offset: 2px;
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
          display: block;
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
