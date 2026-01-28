import { BaseComponent } from '../base-component';

/**
 * Dashboard section configuration for navigation menu.
 */
interface NavSection {
  id: string;
  label: string;
}

/**
 * Floating Action Button (FAB) navigation component.
 *
 * Provides quick access to dashboard sections via a floating button
 * that opens a styled menu. Clicking a menu item scrolls to the
 * corresponding section.
 *
 * Features:
 * - Fixed position at bottom-right of viewport
 * - Popup menu with section links
 * - Smooth scroll navigation
 * - Click-outside and Escape key dismissal
 * - Full keyboard navigation (W3C Menu Button Pattern)
 * - Theme-aware styling
 * - Reduced motion support
 *
 * Usage:
 * ```html
 * <fab-navigation></fab-navigation>
 * ```
 *
 * ```typescript
 * const fab = document.querySelector('fab-navigation') as FabNavigation;
 * fab.show(); // Show FAB after simulation completes
 * fab.hide(); // Hide FAB (e.g., on welcome screen)
 * ```
 *
 * @element fab-navigation
 */
export class FabNavigation extends BaseComponent {
  private _isOpen = false;
  private _isVisible = false;
  private _boundDocumentClick: ((e: MouseEvent) => void) | null = null;

  /**
   * Dashboard sections available for navigation.
   * Order matches typical reading flow through dashboard.
   */
  private readonly navSections: NavSection[] = [
    { id: 'key-metrics-section', label: 'Key Metrics' },
    { id: 'param-summary-section', label: 'Parameters' },
    { id: 'net-worth-spectrum-section', label: 'Portfolio Outlook' },
    { id: 'strategy-analysis-section', label: 'Strategy Analysis' },
    { id: 'visual-comparison-section', label: 'Visual Comparison' },
    { id: 'recommendations-section', label: 'Recommendations' },
    { id: 'performance-table-section', label: 'Performance Tables' },
    { id: 'yearly-analysis-section', label: 'Yearly Analysis' },
  ];

  static get observedAttributes(): string[] {
    return ['visible'];
  }

  protected template(): string {
    const menuItems = this.navSections
      .map(
        (section) => `
        <li role="none">
          <a href="#${section.id}"
             role="menuitem"
             tabindex="-1"
             data-section="${section.id}">${section.label}</a>
        </li>
      `
      )
      .join('');

    return `
      <div class="fab-container" aria-hidden="${!this._isVisible}">
        <button class="fab-button"
                id="fab-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded="${this._isOpen}"
                aria-controls="fab-menu"
                aria-label="Jump to section">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <!-- Navigation list icon with dots -->
            <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
            <line x1="10" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
            <line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="6" cy="18" r="1.5" fill="currentColor"/>
            <line x1="10" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <ul class="fab-menu ${this._isOpen ? 'open' : ''}"
            id="fab-menu"
            role="menu"
            aria-labelledby="fab-trigger">
          ${menuItems}
        </ul>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: contents;
      }

      /* FAB Container - Fixed position at bottom-right */
      .fab-container {
        position: fixed;
        bottom: calc(24px + env(safe-area-inset-bottom, 0px));
        right: calc(24px + env(safe-area-inset-right, 0px));
        z-index: 999;
      }

      .fab-container[aria-hidden="true"] {
        display: none;
      }

      /* FAB Button - 56px circular button */
      .fab-button {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
        cursor: pointer;
        box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        touch-action: manipulation;
        -webkit-tap-highlight-color: rgba(13, 148, 136, 0.2);
      }

      .fab-button:hover {
        transform: scale(1.05);
        box-shadow: var(--shadow-hover, 0 12px 40px rgba(26, 36, 36, 0.15));
        background: var(--color-primary-hover, #0f766e);
      }

      .fab-button:active {
        transform: scale(0.98);
      }

      .fab-button:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 3px;
      }

      .fab-button svg {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      /* FAB Menu - Popup above button */
      .fab-menu {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        background: var(--surface-primary, #ffffff);
        border-radius: var(--border-radius-lg, 12px);
        box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
        padding: var(--spacing-sm, 8px) 0;
        min-width: 200px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(8px) scale(0.95);
        transform-origin: bottom right;
        transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
        list-style: none;
        margin: 0;
        border: 1px solid var(--border-color, #e2e8f0);
      }

      .fab-menu.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }

      /* Menu Items */
      .fab-menu li {
        margin: 0;
        padding: 0;
      }

      .fab-menu a {
        display: block;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        color: var(--text-primary, #1e293b);
        text-decoration: none;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        white-space: nowrap;
        transition: background-color 0.1s ease, color 0.1s ease;
      }

      .fab-menu a:hover {
        background: var(--surface-secondary, #f8fafc);
        color: var(--color-primary, #0d9488);
      }

      .fab-menu a:focus {
        background: var(--surface-secondary, #f8fafc);
        color: var(--color-primary, #0d9488);
        outline: none;
      }

      .fab-menu a:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: -2px;
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .fab-button,
        .fab-menu,
        .fab-menu a {
          transition: none;
        }

        .fab-button:hover {
          transform: none;
        }
      }

      /* Mobile optimization - larger touch target */
      @media (max-width: 768px) {
        .fab-container {
          bottom: calc(80px + env(safe-area-inset-bottom, 0px));
        }

        .fab-button {
          width: 60px;
          height: 60px;
        }

        .fab-menu {
          min-width: 220px;
        }

        .fab-menu a {
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
          min-height: 44px;
          display: flex;
          align-items: center;
        }
      }
    `;
  }

  protected afterRender(): void {
    const button = this.$('.fab-button') as HTMLButtonElement | null;
    const menu = this.$('.fab-menu') as HTMLElement | null;
    const menuItems = this.$$('.fab-menu a') as NodeListOf<HTMLAnchorElement>;

    if (!button || !menu) return;

    // FAB button click - toggle menu
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Menu item clicks - scroll to section
    menuItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sectionId = item.dataset.section;
        if (sectionId) {
          this.scrollToSection(sectionId);
        }
      });
    });

    // Keyboard navigation on button
    button.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleButtonKeydown(e);
    });

    // Keyboard navigation in menu
    menu.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleMenuKeydown(e, button);
    });

    // Register click-outside listener when open
    if (this._isOpen && !this._boundDocumentClick) {
      this._boundDocumentClick = (e: MouseEvent) => this.handleDocumentClick(e);
      document.addEventListener('click', this._boundDocumentClick);
    }

    // Focus first menu item when opening
    if (this._isOpen && menuItems.length > 0) {
      requestAnimationFrame(() => {
        menuItems[0]?.focus();
      });
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Clean up document click listener
    if (this._boundDocumentClick) {
      document.removeEventListener('click', this._boundDocumentClick);
      this._boundDocumentClick = null;
    }
  }

  /**
   * Handle document clicks for click-outside detection.
   * Uses composedPath to work correctly with Shadow DOM.
   */
  private handleDocumentClick(e: MouseEvent): void {
    // Check if click was inside this component using composedPath
    // This correctly handles Shadow DOM event retargeting
    if (!e.composedPath().includes(this)) {
      this.close();
    }
  }

  /**
   * Handle keyboard events on the FAB button.
   */
  private handleButtonKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.open();
        this.focusItem(0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.open();
        this.focusItem(0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.open();
        this.focusItem(-1); // Last item
        break;
    }
  }

  /**
   * Handle keyboard events within the menu.
   */
  private handleMenuKeydown(e: KeyboardEvent, button: HTMLButtonElement): void {
    const items = this.$$('.fab-menu a') as NodeListOf<HTMLElement>;
    const currentIndex = Array.from(items).indexOf(
      this.shadow.activeElement as HTMLElement
    );

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        button?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.focusItem((currentIndex + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusItem((currentIndex - 1 + items.length) % items.length);
        break;
      case 'Home':
        e.preventDefault();
        this.focusItem(0);
        break;
      case 'End':
        e.preventDefault();
        this.focusItem(items.length - 1);
        break;
      case 'Tab':
        // Close menu on tab out
        this.close();
        break;
    }
  }

  /**
   * Focus a menu item by index.
   * @param index - Index of item to focus (-1 for last item)
   */
  private focusItem(index: number): void {
    const items = this.$$('.fab-menu a') as NodeListOf<HTMLElement>;
    if (items.length === 0) return;

    // Handle negative index (last item)
    const targetIndex = index < 0 ? items.length - 1 : index;
    items[targetIndex]?.focus();
  }

  /**
   * Scroll to a dashboard section by ID.
   * Traverses through Shadow DOM chain to find the target element.
   *
   * @param sectionId - ID of the section element to scroll to
   */
  private scrollToSection(sectionId: string): void {
    // Navigate through Shadow DOM chain:
    // document → main-layout → .main-content → dashboard → section
    const mainLayout = document.querySelector('main-layout');
    if (!mainLayout?.shadowRoot) {
      console.warn('[FAB] main-layout not found');
      return;
    }

    const mainContent = mainLayout.shadowRoot.querySelector('.main-content');
    if (!mainContent) {
      console.warn('[FAB] .main-content not found');
      return;
    }

    // Dashboard could be either comparison-dashboard or results-dashboard
    const dashboard =
      mainContent.querySelector('comparison-dashboard') ||
      mainContent.querySelector('results-dashboard');

    if (!dashboard?.shadowRoot) {
      console.warn('[FAB] dashboard not found');
      return;
    }

    // For comparison-dashboard, we need to look inside its results-dashboard children
    let section: Element | null = null;

    if (dashboard.tagName.toLowerCase() === 'comparison-dashboard') {
      // Try to find in the comparison dashboard structure
      // It has desktop-grid with two results-dashboard panels
      const resultsDashboards = dashboard.shadowRoot.querySelectorAll(
        'results-dashboard'
      );
      for (const rd of resultsDashboards) {
        section = rd.shadowRoot?.querySelector(`#${sectionId}`) ?? null;
        if (section) break;
      }
    } else {
      // Direct results-dashboard
      section = dashboard.shadowRoot.querySelector(`#${sectionId}`);
    }

    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.close();
    } else {
      console.warn(`[FAB] Section #${sectionId} not found`);
    }
  }

  /**
   * Show the FAB navigation button.
   * Call after simulation results are available.
   */
  public show(): void {
    this._isVisible = true;
    this.setAttribute('visible', '');
    this.render();
  }

  /**
   * Hide the FAB navigation button.
   * Call when on welcome screen or no results available.
   */
  public hide(): void {
    this._isVisible = false;
    this.removeAttribute('visible');
    this._isOpen = false; // Also close menu if open
    // Clean up click listener
    if (this._boundDocumentClick) {
      document.removeEventListener('click', this._boundDocumentClick);
      this._boundDocumentClick = null;
    }
    this.render();
  }

  /**
   * Open the navigation menu.
   */
  public open(): void {
    if (!this._isOpen) {
      this._isOpen = true;
      this.render();
    }
  }

  /**
   * Close the navigation menu.
   */
  public close(): void {
    if (this._isOpen) {
      this._isOpen = false;
      // Clean up click listener
      if (this._boundDocumentClick) {
        document.removeEventListener('click', this._boundDocumentClick);
        this._boundDocumentClick = null;
      }
      this.render();
    }
  }

  /**
   * Toggle the navigation menu open/closed.
   */
  public toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}

customElements.define('fab-navigation', FabNavigation);
