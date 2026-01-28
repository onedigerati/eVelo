# Phase 27: Dashboard FAB Navigation - Research

**Researched:** 2026-01-28
**Domain:** Floating Action Button (FAB) with navigation menu for Web Components
**Confidence:** HIGH

## Summary

This phase implements a floating action button (FAB) with a popup menu for navigating between sections of the results dashboard. The research confirms that vanilla JavaScript with Web Components is the correct approach for this project, following established patterns already present in the codebase.

The implementation should follow the W3C Menu Button Pattern for accessibility, use `position: fixed` for viewport-relative positioning, and leverage the existing BaseComponent infrastructure. The FAB must only appear after simulation results are available (not on the welcome screen), and the menu should provide smooth scrolling to dashboard sections using the native `scrollIntoView()` API.

Key findings indicate that the project already has established patterns for:
- Web Component structure (BaseComponent with Shadow DOM)
- Overlay click-outside dismissal (settings-panel pattern)
- Fixed positioning with z-index layering (modal-dialog, toast-container at z-index 1000)
- CSS custom properties for theming (tokens.css)
- ARIA accessibility patterns (theme-toggle, modal-dialog)

**Primary recommendation:** Create a `fab-navigation` Web Component extending BaseComponent, using the menu button pattern with role="menu" and role="menuitem", positioned at bottom-right with z-index 999 (below modals/toasts at 1000), and using `composedPath().includes(this)` for click-outside detection across Shadow DOM boundaries.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Web Components | ES2020+ | Component encapsulation | Project standard, framework-free |
| BaseComponent | N/A | Shadow DOM base class | Existing project infrastructure |
| CSS Custom Properties | CSS3 | Theming support | tokens.css already defines all tokens |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| scrollIntoView() | Native | Smooth scroll navigation | All modern browsers support behavior: 'smooth' |
| composedPath() | Native | Click-outside detection | Required for Shadow DOM event handling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom scroll | scroll-into-view-if-needed npm | Adds dependency for minimal benefit; native is sufficient |
| External FAB library | Syncfusion, Material | Against project constraint of no external UI libraries |

**Installation:**
```bash
# No installation needed - all native APIs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── ui/
│       ├── fab-navigation.ts      # New FAB component
│       └── index.ts               # Add export
```

### Pattern 1: BaseComponent Extension
**What:** Extend the existing BaseComponent class for Shadow DOM encapsulation
**When to use:** All UI components in eVelo
**Example:**
```typescript
// Source: Existing pattern from modal-dialog.ts, theme-toggle.ts
import { BaseComponent } from '../base-component';

export class FabNavigation extends BaseComponent {
  private _isOpen = false;
  private _isVisible = false;

  static get observedAttributes(): string[] {
    return ['visible'];
  }

  protected template(): string {
    return `
      <div class="fab-container">
        <button class="fab-button"
                aria-haspopup="menu"
                aria-expanded="${this._isOpen}"
                aria-controls="nav-menu"
                aria-label="Navigate to section">
          <!-- SVG icon here -->
        </button>
        <ul class="fab-menu ${this._isOpen ? 'open' : ''}"
            id="nav-menu"
            role="menu"
            aria-labelledby="fab-button">
          <!-- Menu items -->
        </ul>
      </div>
    `;
  }

  protected styles(): string { /* ... */ }
  protected afterRender(): void { /* ... */ }
}

customElements.define('fab-navigation', FabNavigation);
```

### Pattern 2: Fixed Positioning with Safe Area
**What:** Position FAB at bottom-right with respect for mobile safe areas
**When to use:** Any fixed viewport element
**Example:**
```css
/* Source: web.dev FAB component guide */
.fab-container {
  position: fixed;
  bottom: var(--fab-offset, 24px);
  right: var(--fab-offset, 24px);
  z-index: 999; /* Below modals (1000) */
}

/* Mobile safe area support */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .fab-container {
    bottom: calc(var(--fab-offset, 24px) + env(safe-area-inset-bottom));
    right: calc(var(--fab-offset, 24px) + env(safe-area-inset-right));
  }
}
```

### Pattern 3: Click Outside with composedPath
**What:** Detect clicks outside component across Shadow DOM boundaries
**When to use:** Any dismissible overlay/menu
**Example:**
```typescript
// Source: lamplightdev.com - Shadow DOM click detection
private handleDocumentClick = (event: MouseEvent): void => {
  if (!event.composedPath().includes(this)) {
    this.close();
  }
};

connectedCallback(): void {
  super.connectedCallback();
  document.addEventListener('click', this.handleDocumentClick);
}

disconnectedCallback(): void {
  super.disconnectedCallback();
  document.removeEventListener('click', this.handleDocumentClick);
}
```

### Pattern 4: Menu Button ARIA Pattern
**What:** Accessible menu button with keyboard navigation
**When to use:** Any popup menu trigger
**Example:**
```typescript
// Source: W3C APG Menu Button Pattern
private handleKeyDown = (event: KeyboardEvent): void => {
  if (!this._isOpen) {
    // Closed state
    if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      this.open();
      this.focusFirstItem();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.open();
      this.focusLastItem();
    }
  } else {
    // Open state
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        this.focusButton();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPrevItem();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirstItem();
        break;
      case 'End':
        event.preventDefault();
        this.focusLastItem();
        break;
    }
  }
};
```

### Pattern 5: Smooth Scroll Navigation
**What:** Scroll to element with smooth animation and offset for fixed headers
**When to use:** In-page navigation
**Example:**
```typescript
// Source: MDN scrollIntoView documentation
private scrollToSection(sectionId: string): void {
  // Navigate through Shadow DOM to find target
  const mainLayout = document.querySelector('main-layout');
  const mainContent = mainLayout?.shadowRoot?.querySelector('.main-content');
  const dashboard = mainContent?.querySelector('comparison-dashboard, results-dashboard');
  const section = dashboard?.shadowRoot?.querySelector(`#${sectionId}`);

  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.close();
  }
}
```

### Anti-Patterns to Avoid
- **Inline event handlers in template:** Use afterRender() to attach listeners
- **Direct DOM manipulation outside Shadow DOM:** Always query through shadowRoot
- **z-index wars:** Use established layering (content < FAB 999 < modals 1000 < toasts 1000)
- **Omitting aria-expanded:** Required for screen readers to know menu state
- **Using `event.target` for click-outside:** Fails with Shadow DOM retargeting

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll animation | Custom requestAnimationFrame loop | `scrollIntoView({ behavior: 'smooth' })` | Native is smoother, respects prefers-reduced-motion |
| Click outside detection | `event.target !== this` | `event.composedPath().includes(this)` | Shadow DOM retargets events |
| Theme switching | Manual class toggling | CSS custom properties from tokens.css | Already implemented project-wide |
| Icon SVGs | Icon font or external library | Inline SVG in template | Matches existing pattern, no dependencies |

**Key insight:** The eVelo codebase already has all necessary infrastructure. The FAB is a composition of existing patterns (BaseComponent + fixed positioning + ARIA menu + theme tokens) rather than a novel implementation.

## Common Pitfalls

### Pitfall 1: Shadow DOM Event Retargeting
**What goes wrong:** Click events inside Shadow DOM have their `event.target` set to the host element when observed from document level, causing click-outside detection to fail.
**Why it happens:** Browser encapsulation behavior for Shadow DOM
**How to avoid:** Use `event.composedPath().includes(this)` instead of `event.target !== this`
**Warning signs:** Menu closes when clicking inside it; menu doesn't close when clicking outside

### Pitfall 2: z-index Stacking with Shadow DOM
**What goes wrong:** FAB appears behind other content or above modals
**Why it happens:** Shadow DOM creates new stacking contexts; parent z-index doesn't cascade
**How to avoid:** Position FAB at document root level (inside app-root), use z-index 999 consistently
**Warning signs:** Visual layering issues, FAB visible during modal dialogs

### Pitfall 3: Mobile Keyboard/Viewport Issues
**What goes wrong:** FAB moves unexpectedly when virtual keyboard appears or gets clipped
**Why it happens:** `position: fixed` is relative to viewport which changes with keyboard
**How to avoid:** Test on actual mobile devices; consider hiding FAB when keyboard is visible via `visualViewport` API
**Warning signs:** FAB jumps position on mobile input focus

### Pitfall 4: Missing Keyboard Trap Management
**What goes wrong:** Focus escapes menu unexpectedly or gets lost
**Why it happens:** Tab key not intercepted, no roving tabindex
**How to avoid:** Set menu items to `tabindex="-1"`, manage focus with arrow keys, trap Tab/Shift+Tab
**Warning signs:** Can't navigate menu with keyboard; focus goes to page content while menu is open

### Pitfall 5: Scroll Position Offset
**What goes wrong:** Section scrolls behind fixed header or FAB obscures target
**Why it happens:** `scrollIntoView` scrolls element to viewport edge, ignoring fixed elements
**How to avoid:** Use `scroll-margin-top` CSS on target sections, or use `block: 'start'` with offset
**Warning signs:** User has to scroll manually after FAB navigation to see section title

### Pitfall 6: Cross-Shadow-DOM Element Query
**What goes wrong:** Cannot find target section elements for scrolling
**Why it happens:** `querySelector` doesn't traverse Shadow DOM boundaries
**How to avoid:** Chain queries through each shadow root: `document.querySelector('main-layout')?.shadowRoot?.querySelector('.main-content')?.querySelector('comparison-dashboard')?.shadowRoot?.querySelector('#section-id')`
**Warning signs:** Null reference errors; scroll doesn't work; console shows element not found

## Code Examples

Verified patterns from official sources and existing codebase:

### FAB Button with SVG Icon
```typescript
// Source: Existing theme-toggle.ts pattern
protected template(): string {
  return `
    <div class="fab-container" aria-hidden="${!this._isVisible}">
      <button class="fab-button"
              id="fab-trigger"
              aria-haspopup="menu"
              aria-expanded="${this._isOpen}"
              aria-controls="fab-menu"
              aria-label="Jump to section">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <!-- Navigation/menu icon - consider chart or list icon for eVelo brand -->
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor"
                stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <ul class="fab-menu ${this._isOpen ? 'open' : ''}"
          id="fab-menu"
          role="menu"
          aria-labelledby="fab-trigger">
        ${this.menuItems.map(item => `
          <li role="none">
            <a href="#${item.id}"
               role="menuitem"
               tabindex="-1"
               data-section="${item.id}">
              ${item.label}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}
```

### Theme-Aware Styling
```css
/* Source: tokens.css pattern */
.fab-button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary, #0d9488);
  color: var(--text-inverse, #ffffff);
  cursor: pointer;
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-button:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-hover, 0 12px 40px rgba(26, 36, 36, 0.15));
  background: var(--color-primary-hover, #0f766e);
}

.fab-button:focus-visible {
  outline: 2px solid var(--color-primary, #0d9488);
  outline-offset: 2px;
}

/* Menu styling */
.fab-menu {
  position: absolute;
  bottom: calc(100% + var(--spacing-sm, 8px));
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
}

.fab-menu.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.fab-menu a {
  display: block;
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  color: var(--text-primary, #1e293b);
  text-decoration: none;
  font-size: var(--font-size-sm, 0.875rem);
  white-space: nowrap;
}

.fab-menu a:hover,
.fab-menu a:focus {
  background: var(--surface-secondary, #f8fafc);
  outline: none;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .fab-button,
  .fab-menu {
    transition: none;
  }
}
```

### Keyboard Navigation Handler
```typescript
// Source: W3C APG Menu Button Pattern
private setupKeyboardNavigation(): void {
  const button = this.$('.fab-button') as HTMLButtonElement;
  const menu = this.$('.fab-menu') as HTMLElement;

  button?.addEventListener('keydown', (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
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
  });

  menu?.addEventListener('keydown', (e: KeyboardEvent) => {
    const items = this.$$('.fab-menu a') as NodeListOf<HTMLElement>;
    const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);

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
      case 'Enter':
      case ' ':
        // Allow default link behavior
        break;
      case 'Tab':
        // Close menu on tab out
        this.close();
        break;
    }
  });
}

private focusItem(index: number): void {
  const items = this.$$('.fab-menu a') as NodeListOf<HTMLElement>;
  if (items.length === 0) return;

  // Handle negative index (last item)
  const targetIndex = index < 0 ? items.length - 1 : index;
  items[targetIndex]?.focus();
}
```

### Visibility Control with Simulation State
```typescript
// Source: Existing pattern from results-dashboard.ts
public show(): void {
  this._isVisible = true;
  this.setAttribute('visible', '');
  this.render();
}

public hide(): void {
  this._isVisible = false;
  this.removeAttribute('visible');
  this._isOpen = false; // Also close menu
  this.render();
}

// In app-root or comparison-dashboard:
// Listen for simulation-complete event
document.addEventListener('simulation-complete', () => {
  const fab = document.querySelector('fab-navigation');
  fab?.show();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| onclick attributes | addEventListener in lifecycle | ES6+ (2015) | Better separation, testability |
| jQuery animations | CSS transitions + scrollIntoView | 2020+ | Native performance, no dependencies |
| Material icons CDN | Inline SVG | Current | No external requests, theme-able |
| focus() only | focus() + focusVisible polyfill | 2022 | Better keyboard styling |

**Deprecated/outdated:**
- `scroll-behavior: smooth` on `html` element alone: Now prefer explicit `scrollIntoView({ behavior: 'smooth' })` for programmatic control
- `position: fixed` without safe-area-inset: Modern mobile requires env() support

## Open Questions

Things that couldn't be fully resolved:

1. **Exact section list for menu**
   - What we know: Dashboard has ~15 sections with IDs (key-metrics-section, param-summary-section, etc.)
   - What's unclear: Which sections should appear in menu (all? only visible? only major ones?)
   - Recommendation: Start with major visible sections (Key Metrics, Portfolio Composition, Charts, Strategy Analysis, Recommendations, Tables); make list configurable via property

2. **FAB icon design**
   - What we know: Should match eVelo brand aesthetic, not generic Material icons
   - What's unclear: Exact icon design (lightning bolt? chart? list? custom logo?)
   - Recommendation: Use a simple list/menu icon initially; can be refined in implementation

3. **Mobile behavior variations**
   - What we know: FAB should work on mobile with 48px touch target
   - What's unclear: Should menu appear differently on mobile (full-width bottom sheet vs popup)?
   - Recommendation: Start with same popup behavior; observe usability in testing

## Sources

### Primary (HIGH confidence)
- [MDN scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) - Scroll API documentation
- [W3C Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) - ARIA patterns for menu buttons
- [W3C Navigation Menu Button Example](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/examples/menu-button-links/) - HTML structure and keyboard handling
- Existing codebase: `modal-dialog.ts`, `theme-toggle.ts`, `settings-panel.ts`, `toast-container.ts` - Established patterns

### Secondary (MEDIUM confidence)
- [web.dev FAB Component](https://web.dev/articles/building/a-fab-component) - FAB implementation guide with CSS positioning and accessibility
- [lamplightdev Shadow DOM Clicks](https://lamplightdev.com/blog/2021/04/10/how-to-detect-clicks-outside-of-a-web-component/) - composedPath() for click-outside detection

### Tertiary (LOW confidence)
- WebSearch results for mobile FAB behavior - General best practices, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native APIs, matches existing codebase
- Architecture: HIGH - Direct application of existing BaseComponent pattern
- Pitfalls: HIGH - Shadow DOM gotchas well-documented, verified in existing code
- Menu sections: MEDIUM - Section IDs known, but which to include is design decision

**Research date:** 2026-01-28
**Valid until:** 60 days (stable APIs, no expected changes)
