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
          <slot name="header"></slot>
        </header>
        <div class="mobile-toggle-row">
          <button class="mobile-menu-btn" aria-label="Toggle parameters sidebar">
            <span class="menu-label">eVelo Parameters</span>
            <span class="menu-icon" aria-hidden="true">&#9662;</span>
          </button>
        </div>
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

      /* Desktop only: collapsed sidebar width */
      @media (min-width: 769px) {
        :host([sidebar-collapsed]) .layout {
          grid-template-columns: var(--sidebar-collapsed-width, 48px) 1fr;
        }
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
        overflow: hidden;
        background: var(--surface-secondary, #f8fafc);
        border-right: 1px solid var(--border-color, #e2e8f0);
      }

      /* Custom scrollbar styling - hidden by default, show on hover */
      .main-content {
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
      }

      .main-content:hover {
        scrollbar-color: #b4bcc5 transparent;
      }

      .main-content::-webkit-scrollbar {
        width: 8px;
      }

      .main-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .main-content::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 4px;
      }

      /* Show scrollbar on hover */
      .main-content:hover::-webkit-scrollbar-thumb {
        background: #b4bcc5;
      }

      .main-content:hover::-webkit-scrollbar-thumb:hover {
        background: #8b96a6;
      }

      .main-area {
        grid-area: main;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .mobile-toggle-row {
        display: none;
      }

      .mobile-menu-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs, 4px);
        background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
        border: none;
        border-bottom: 2px solid #0d9488;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 700;
        cursor: pointer;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        color: #065f56;
        border-radius: 0;
        width: 100%;
        min-height: 48px;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        touch-action: manipulation;
        box-shadow: 0 2px 8px rgba(13, 148, 136, 0.2), 0 1px 3px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      }

      .mobile-menu-btn:hover {
        background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25), 0 2px 4px rgba(0,0,0,0.12);
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

      .menu-icon {
        color: #0d9488;
      }

      /* Dark theme */
      :host-context([data-theme="dark"]) .mobile-menu-btn {
        background: linear-gradient(135deg, #134e4a 0%, #115e59 100%);
        color: #ccfbf1;
        border-bottom-color: #0d9488;
      }

      :host-context([data-theme="dark"]) .mobile-menu-btn:hover {
        background: linear-gradient(135deg, #115e59 0%, #0f766e 100%);
      }

      :host-context([data-theme="dark"]) .menu-icon {
        color: #5eead4;
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: auto;
        padding: var(--spacing-lg, 24px);
        background: var(--surface-primary, #ffffff);
        /* Prevent content from exceeding viewport */
        max-width: 100%;
      }

      /* Reduce padding on mobile for more content space */
      @media (max-width: 768px) {
        .main-content {
          padding: var(--spacing-md, 16px) var(--spacing-sm, 8px);
        }
      }

      .sidebar-backdrop {
        display: none;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .layout {
          grid-template-areas:
            "header"
            "toggle"
            "sidebar"
            "main";
          grid-template-rows: auto auto auto 1fr;
          grid-template-columns: 1fr;
        }

        .mobile-toggle-row {
          grid-area: toggle;
          display: block;
          width: 100%;
        }

        .sidebar-area {
          grid-area: sidebar;
          position: relative;
          width: 100%;
          max-height: none;
          overflow: hidden;
          transition: opacity 0.3s ease;
          border-right: none;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }

        /* Hide sidebar when collapsed */
        :host([sidebar-collapsed]) .sidebar-area {
          display: none;
        }

        /* Hide main content when sidebar is expanded (NOT collapsed) */
        .main-area {
          display: none;
        }

        /* Show main content only when sidebar is collapsed */
        :host([sidebar-collapsed]) .main-area {
          display: flex;
        }

        .sidebar-backdrop {
          display: none;
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
    // On mobile, start with sidebar collapsed to show dashboard first
    if (window.matchMedia('(max-width: 768px)').matches) {
      this.setAttribute('sidebar-collapsed', '');
    }

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

    // Auto-collapse sidebar when simulation completes (mobile only)
    // Listen on document since event bubbles from app-root
    document.addEventListener('simulation-complete', () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        this.setAttribute('sidebar-collapsed', '');
      }
    });
  }
}

// Register the custom element
customElements.define('main-layout', MainLayout);
