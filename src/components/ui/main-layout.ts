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

  protected template(): string {
    return `
      <div class="layout">
        <div class="sidebar-area">
          <slot name="sidebar"></slot>
        </div>
        <div class="main-area">
          <header class="main-header">
            <button class="mobile-menu-btn" aria-label="Open menu">&#9776;</button>
            <slot name="header"></slot>
          </header>
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
        grid-template-columns: var(--sidebar-width, 320px) 1fr;
        height: 100%;
      }

      :host([sidebar-collapsed]) .layout {
        grid-template-columns: var(--sidebar-collapsed-width, 48px) 1fr;
      }

      .sidebar-area {
        grid-column: 1;
        overflow-y: auto;
        background: var(--surface-secondary, #f8fafc);
        border-right: 1px solid var(--border-color, #e2e8f0);
      }

      .main-area {
        grid-column: 2;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .main-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        background: var(--surface-primary, #ffffff);
      }

      .mobile-menu-btn {
        display: none;
        background: transparent;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: var(--spacing-xs, 4px);
        color: var(--text-primary, #1e293b);
      }

      .mobile-menu-btn:hover {
        color: var(--color-primary, #0d9488);
      }

      .mobile-menu-btn:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
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

        .main-area {
          grid-column: 1;
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

    // Mobile menu button opens sidebar overlay
    this.$('.mobile-menu-btn')?.addEventListener('click', () => {
      this.setAttribute('sidebar-open', '');
    });

    // Backdrop click closes sidebar overlay
    this.$('.sidebar-backdrop')?.addEventListener('click', () => {
      this.removeAttribute('sidebar-open');
    });
  }
}

// Register the custom element
customElements.define('main-layout', MainLayout);
