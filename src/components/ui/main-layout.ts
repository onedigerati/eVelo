import { BaseComponent } from '../base-component';

/**
 * Main layout orchestrator component.
 * Manages the overall page layout: sidebar on left, main content on right.
 *
 * @element main-layout
 * @attr {boolean} sidebar-collapsed - When present, sidebar is collapsed
 * @attr {boolean} sidebar-open - Mobile only - when present, sidebar overlay is visible
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
    return ['sidebar-collapsed', 'sidebar-open'];
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
            "main";
          grid-template-columns: 1fr;
        }

        /* Override collapsed state on mobile - sidebar is overlay, not collapsed */
        :host([sidebar-collapsed]) .layout {
          grid-template-columns: 1fr;
        }

        .sidebar-area {
          position: fixed;
          left: 0;
          top: 0;
          height: 100%;
          width: var(--sidebar-width, 320px);
          z-index: 100;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }

        :host([sidebar-open]) .sidebar-area {
          transform: translateX(0);
        }

        :host([sidebar-open]) .sidebar-backdrop {
          display: block;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99;
        }

        .mobile-menu-btn {
          display: block;
        }
      }
    `;
  }

  protected override afterRender(): void {
    // Listen for 'toggle' event from sidebar-panel, update sidebar-collapsed attribute
    this.addEventListener('toggle', ((e: CustomEvent) => {
      if (e.detail.collapsed) {
        this.setAttribute('sidebar-collapsed', '');
        // On mobile, also close the overlay when sidebar is collapsed
        // This removes the backdrop that would otherwise cover the main content
        this.removeAttribute('sidebar-open');
      } else {
        this.removeAttribute('sidebar-collapsed');
      }
    }) as EventListener);

    // Mobile menu button opens sidebar overlay
    this.$('.mobile-menu-btn')?.addEventListener('click', () => {
      this.setAttribute('sidebar-open', '');
      // Clear any collapsed state so sidebar content is visible
      this.removeAttribute('sidebar-collapsed');
      // Also clear sidebar-panel's collapsed attribute (content hidden via display:none)
      const sidebarPanel = this.querySelector('sidebar-panel');
      sidebarPanel?.removeAttribute('collapsed');
    });

    // Backdrop click closes sidebar overlay
    this.$('.sidebar-backdrop')?.addEventListener('click', () => {
      this.removeAttribute('sidebar-open');
    });
  }
}

// Register the custom element
customElements.define('main-layout', MainLayout);
