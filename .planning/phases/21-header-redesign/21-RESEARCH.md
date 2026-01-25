# Phase 21: Header Redesign - Research

**Researched:** 2026-01-24
**Domain:** Web Components UI Design / Responsive Header
**Confidence:** HIGH

## Summary

Phase 21 requires transforming the current minimal header ("eVelo Portfolio Simulator" + two icon buttons) into an elegant, branded experience matching the reference application's visual quality. The header must communicate the app's identity and value proposition while maintaining responsive mobile functionality.

**Current State:** The header in `app-root.ts` is a simple flex layout with an h1 title and two icon buttons (guide and settings) slotted into `main-layout`. Mobile uses a hamburger menu (already implemented in `main-layout.ts`). No branding, tagline, or visual distinction.

**Reference Application:** Uses a dark teal header bar (#1B4B4B) with centered title, descriptive subtitle/tagline below, and icon buttons grouped in top-right. Professional typography and subtle gradient treatments create visual anchor.

**Primary recommendation:** Create a dedicated `app-header` web component with branded wordmark/logo treatment, tagline for value proposition, responsive icon button group, and dark theme support. Use CSS custom properties from `tokens.css` for theming and maintain 768px mobile breakpoint.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety | Project standard, already in use |
| Web Components | Native | Custom elements | Framework-free architecture per project decisions |
| CSS Custom Properties | Native | Theming | Already established in tokens.css |
| Shadow DOM | Open mode | Encapsulation | Project standard for dev tools inspection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `clamp()` | Native | Fluid typography | Responsive font scaling without breakpoint bloat |
| CSS `@media` | Native | Responsive layouts | Mobile breakpoint at 768px (project standard) |
| CSS Container Queries | Native (2026) | Component-level responsiveness | If header needs to adapt to parent container (likely not needed) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom header component | Modify main-layout | Header component allows better encapsulation and reusability |
| SVG logo | Icon font / PNG | SVG is scalable, themeable, and modern standard for 2026 |
| Fixed positioning | Sticky positioning | Sticky works better on mobile with virtual keyboard (position: sticky preferred) |

**Installation:**
```bash
# No new dependencies required - using native Web Components
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── app-header.ts        # New branded header component
│   │   ├── main-layout.ts       # Existing (minimal changes to slot)
│   │   └── ...
│   └── app-root.ts              # Update header slot content
├── styles/
│   └── tokens.css               # Add header-specific tokens if needed
└── assets/
    └── logo.svg                 # eVelo logo/wordmark (optional)
```

### Pattern 1: Web Component with Shadow DOM
**What:** Custom element extending `BaseComponent` with encapsulated styles
**When to use:** All UI components in this project
**Example:**
```typescript
// Source: Project pattern from existing components
export class AppHeader extends BaseComponent {
  protected template(): string {
    return `
      <header class="app-header">
        <div class="header-brand">
          <h1 class="brand-title">eVelo</h1>
          <p class="brand-tagline">Tax-Efficient Portfolio Simulation</p>
        </div>
        <div class="header-actions">
          <slot name="actions"></slot>
        </div>
      </header>
    `;
  }

  protected styles(): string {
    return `
      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-md) var(--spacing-lg);
        background: var(--color-primary);
        color: var(--text-inverse);
      }

      @media (max-width: 768px) {
        .brand-tagline {
          font-size: var(--font-size-sm);
        }
      }
    `;
  }
}
```

### Pattern 2: Responsive Icon Button Group
**What:** Flex container with gap spacing, hover states, and accessible keyboard navigation
**When to use:** Action buttons in headers and toolbars
**Example:**
```typescript
// Source: Existing pattern from app-root.ts header-buttons
const headerButtons = `
  <div class="header-buttons">
    <button class="header-btn" aria-label="User Guide" title="User Guide">
      <svg>...</svg>
    </button>
    <button class="header-btn" aria-label="Settings" title="Settings">
      <svg>...</svg>
    </button>
  </div>
`;
```

### Pattern 3: Fluid Typography with clamp()
**What:** Responsive font sizing without breakpoints
**When to use:** Headers and titles that need smooth scaling
**Example:**
```css
/* Source: 2026 responsive design best practices */
.brand-title {
  font-size: clamp(1.5rem, 3vw + 0.5rem, 2.5rem);
}

.brand-tagline {
  font-size: clamp(0.875rem, 1.5vw + 0.25rem, 1rem);
}
```

### Pattern 4: Mobile Hamburger Menu (Already Implemented)
**What:** Mobile-only menu button that triggers sidebar overlay
**When to use:** Mobile viewport (max-width: 768px)
**Example:**
```typescript
// Source: main-layout.ts (lines 31, 83-100, 164-166)
// Already implemented - no changes needed
// Mobile menu button appears automatically at 768px breakpoint
```

### Anti-Patterns to Avoid
- **Inline styles in template():** Use CSS custom properties and classes for all styling
- **Fixed positioning on mobile:** Use `position: sticky` or static - fixed headers interfere with mobile virtual keyboard
- **Icon-only buttons without labels:** Always include `aria-label` and `title` for accessibility
- **Hard-coded colors:** Use CSS custom properties from `tokens.css` for theme support

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon library | Custom SVG management system | Inline SVG icons in template | Project already uses inline SVG pattern (see header-btn examples) |
| Theming system | Custom theme switching | CSS custom properties with `data-theme` attribute | Already implemented project-wide in tokens.css |
| Responsive breakpoints | Custom resize listeners | CSS @media queries | Native, performant, standard approach |
| Logo rendering | Complex canvas/WebGL | SVG element or CSS typography | SVG is themeable, scalable, accessible |

**Key insight:** The project already has established patterns for theming, responsive design, and icon rendering. Don't reinvent these - extend existing patterns.

## Common Pitfalls

### Pitfall 1: Fixed Header on Mobile
**What goes wrong:** Header with `position: fixed` overlaps content when mobile keyboard appears, causing layout shifts
**Why it happens:** Mobile browsers dynamically resize viewport when keyboard shows
**How to avoid:** Use `position: static` or `position: sticky` instead of `position: fixed`
**Warning signs:** Header overlaps content on mobile input focus

**Source:** [Mobile-First Website Header Designs](https://www.strikingly.com/blog/posts/mobile-first-header-design-optimizing-small-screens), [Responsive Design Best Practices 2026](https://pxlpeak.com/blog/web-design/responsive-design-best-practices)

### Pitfall 2: Inaccessible Icon Buttons
**What goes wrong:** Icon-only buttons without text labels are unusable for screen reader users
**Why it happens:** Developers assume visual icon is self-explanatory
**How to avoid:** Always include `aria-label` and `title` attributes on icon buttons
**Warning signs:** Screen reader announces "button" without describing what it does

**Source:** [Accessibility for Hamburger Menu](https://medium.com/@linlinghao/accessibility-for-hamburger-menu-a37fa9617a89), [Accessible Hamburger Menu](http://www.ashleysheridan.co.uk/blog/Making+an+Accessible+Hamburger+Menu)

### Pitfall 3: Missing aria-expanded for Togglable Elements
**What goes wrong:** Screen readers don't announce whether menu/panel is open or closed
**Why it happens:** Developers only toggle visual state, not ARIA state
**How to avoid:** Use `aria-expanded="true"` and `aria-expanded="false"` dynamically
**Warning signs:** Screen reader doesn't announce state changes

**Source:** [7 steps for building accessible hamburger menus](https://www.erwinhofman.com/blog/build-web-accessible-hamburger-dropdown-menus/)

### Pitfall 4: Poor Contrast in Dark Mode
**What goes wrong:** Header text unreadable in dark theme due to insufficient contrast
**Why it happens:** Colors chosen for light theme don't meet WCAG contrast requirements in dark mode
**How to avoid:** Test contrast ratios in both themes (4.5:1 minimum for normal text, 3:1 for large text)
**Warning signs:** Text difficult to read in dark mode

**Source:** Project requirement "Accessible with proper contrast ratios"

## Code Examples

Verified patterns from project and official sources:

### Creating a Web Component Header
```typescript
// Source: Project pattern from base-component.ts and existing UI components
import { BaseComponent } from '../base-component';

export class AppHeader extends BaseComponent {
  protected template(): string {
    return `
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-wordmark">
            <span class="brand-icon">⚡</span>
            <h1 class="brand-title">eVelo</h1>
          </div>
          <p class="brand-tagline">Tax-Efficient Portfolio Strategy Simulator</p>
        </div>
        <div class="header-actions">
          <slot name="actions"></slot>
        </div>
      </header>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      .header-brand {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
      }

      .brand-wordmark {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      .brand-icon {
        font-size: 1.5rem;
      }

      .brand-title {
        margin: 0;
        font-size: clamp(1.25rem, 2.5vw + 0.5rem, 1.75rem);
        font-weight: 700;
        line-height: 1.2;
      }

      .brand-tagline {
        margin: 0;
        font-size: clamp(0.75rem, 1.5vw + 0.25rem, 0.875rem);
        opacity: 0.9;
        font-weight: 400;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .app-header {
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        }

        .brand-tagline {
          display: none; /* Hide tagline on very small screens */
        }
      }

      /* Dark theme support */
      :host([data-theme="dark"]) .app-header {
        background: var(--surface-secondary, #1e293b);
        border-bottom-color: var(--border-color, #334155);
      }
    `;
  }
}

customElements.define('app-header', AppHeader);
```

### Accessible Icon Button Pattern
```typescript
// Source: Existing pattern from app-root.ts (lines 429-441)
// Example of proper accessible icon button markup
const iconButton = `
  <button
    id="btn-guide"
    class="header-btn"
    aria-label="User Guide"
    title="User Guide"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
         viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  </button>
`;
```

### Keyboard Navigation and Focus Styles
```css
/* Source: Accessibility best practices and existing project patterns */
.header-btn {
  background: transparent;
  border: none;
  padding: var(--spacing-xs, 4px);
  border-radius: var(--border-radius-sm, 4px);
  color: var(--text-inverse, #ffffff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.header-btn:focus-visible {
  outline: 2px solid var(--text-inverse, #ffffff);
  outline-offset: 2px;
}

.header-btn:active {
  transform: scale(0.95);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Media queries for all responsive sizing | Container queries + clamp() | 2024-2025 | Components respond to parent size, not just viewport |
| Fixed header on mobile | Sticky or static positioning | 2023-2024 | Better mobile keyboard handling, less layout shift |
| Icon fonts (FontAwesome, etc.) | Inline SVG | 2022-2023 | Better control, theming, and performance |
| JavaScript resize listeners | CSS @media queries | Always preferred | Native, performant, no JS needed |

**Deprecated/outdated:**
- **position: fixed for mobile headers:** Causes issues with virtual keyboard - use `position: sticky` or static
- **Separate mobile/desktop templates:** Use responsive CSS instead of conditional rendering
- **Hard-coded hex colors:** Use CSS custom properties for theme support

## Open Questions

Things that couldn't be fully resolved:

1. **Should eVelo have a logo/icon or just wordmark?**
   - What we know: Reference app uses centered text title with subtle styling
   - What's unclear: Whether eVelo brand should have a distinctive icon/symbol
   - Recommendation: Start with emoji icon (⚡ for "velocity") or simple geometric shape, easy to refine later

2. **Exact tagline wording**
   - What we know: Should communicate value proposition (tax efficiency, strategy simulation)
   - What's unclear: Ideal length and phrasing
   - Recommendation: "Tax-Efficient Portfolio Strategy Simulator" (7 words, clear, descriptive)

3. **Should theme toggle be in header or settings panel?**
   - What we know: Reference app has theme toggle in header; eVelo has it in settings panel
   - What's unclear: User expectation and discoverability
   - Recommendation: Keep in settings panel for now (already implemented), could add to header later if user feedback requests it

## Sources

### Primary (HIGH confidence)
- Project codebase analysis:
  - `src/components/app-root.ts` (lines 426-443, 574-613) - Current header implementation
  - `src/components/ui/main-layout.ts` (lines 30-31, 74-100, 114-150) - Mobile responsive pattern
  - `src/styles/tokens.css` - Design tokens and theming system
  - `references/PortfolioStrategySimulator.html` (lines 1686-1724, 2036-2061) - Reference app header styling
  - `BaseComponent` pattern - Project standard for web components

### Secondary (MEDIUM confidence)
- [Responsive Design Best Practices 2026](https://pxlpeak.com/blog/web-design/responsive-design-best-practices) - Container queries, fluid typography, modern CSS techniques
- [Mobile-First Website Header Designs](https://www.strikingly.com/blog/posts/mobile-first-header-design-optimizing-small-screens) - Fixed vs sticky positioning, mobile considerations
- [How to Create a Responsive Header](https://medium.com/@sanderdesnaijer/how-to-create-a-responsive-header-that-adapts-to-desktop-mobile-layouts-and-scroll-behavior-html-5a244b280543) - Desktop/mobile layout patterns
- [Best Practices for Website Header Design in 2025](https://www.webdew.com/blog/website-header-design) - Header components and best practices
- [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) - Web Components specification
- [How to Use Web Components with TypeScript](https://blog.pixelfreestudio.com/how-to-use-web-components-with-typescript/) - TypeScript integration patterns

### Tertiary (LOW confidence - marked for validation)
- [7 steps for building accessible hamburger menus](https://www.erwinhofman.com/blog/build-web-accessible-hamburger-dropdown-menus/) - ARIA patterns
- [Accessibility for Hamburger Menu](https://medium.com/@linlinghao/accessibility-for-hamburger-menu-a37fa9617a89) - Keyboard navigation
- [Making an Accessible Hamburger Menu](http://www.ashleysheridan.co.uk/blog/Making+an+Accessible+Hamburger+Menu) - Button semantics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using established project patterns (Web Components, TypeScript, CSS custom properties)
- Architecture: HIGH - Patterns verified in existing codebase components
- Pitfalls: HIGH - Based on documented accessibility standards and project requirements

**Research date:** 2026-01-24
**Valid until:** 60 days (stable web standards, established project patterns)
