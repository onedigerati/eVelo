# Phase 9: Theming & Polish - Research

**Researched:** 2026-01-23
**Domain:** CSS theming, Shadow DOM styling, Chart.js theming, print layout, help UX
**Confidence:** HIGH

## Summary

Research focused on implementing light/dark theme toggle with persistence, updating Chart.js visualizations dynamically, generating print-friendly reports, and adding contextual help content to the eVelo financial calculator.

The eVelo codebase already has excellent theming foundations: CSS custom properties defined in `tokens.css` with dark theme placeholders, Shadow DOM components using `var(--token, fallback)` pattern, and IndexedDB settings schema with a `theme` field. The primary challenge is coordinating theme changes across Shadow DOM boundaries and updating Chart.js color schemes at runtime.

**Primary recommendation:** Use `data-theme` attribute on `<body>` or `:root` with CSS custom properties that automatically pierce Shadow DOM. Toggle theme with JavaScript that updates the attribute and persists to IndexedDB. Update Chart.js instances using the `.update()` method with new color configurations. Use `@media print` with `break-inside: avoid` for print layouts, and implement accessible tooltips with `aria-describedby` for help content.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Theming variables | Only way to pierce Shadow DOM boundaries; inherit automatically |
| `prefers-color-scheme` | Native | System theme detection | CSS Media Queries Level 5 standard; baseline since January 2020 |
| Dexie.js | Existing | Theme preference persistence | Already in project for IndexedDB; performant singleton pattern |
| Chart.js `.update()` | Native (4.x) | Dynamic chart theming | Built-in method for runtime updates without re-render |
| `@media print` | Native | Print-specific styles | Standard CSS print media query |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MutationObserver | Native | Watch theme attribute changes | Only if components need to react to theme changes beyond CSS |
| `window.matchMedia` | Native | Detect system theme changes | To implement "system" theme that follows OS preference |
| `beforeprint`/`afterprint` events | Native | Print event handling | If charts need DPI adjustments before printing |
| `adoptedStyleSheets` | Native | Shared stylesheet performance | Optional optimization for many components with identical theme styles |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS custom properties | CSS Shadow Parts (::part) | Parts expose internals for external styling; less flexible than variables |
| `data-theme` attribute | JavaScript class toggling | Attribute is more semantic and works with CSS selectors naturally |
| IndexedDB | localStorage | localStorage is synchronous (blocks UI); but acceptable for single theme string |
| `@media print` | Separate print stylesheet | Separate file adds HTTP request; inline `@media print` is simpler |

**Installation:**
No new dependencies required. All features use native Web APIs and existing libraries (Dexie.js, Chart.js).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── styles/
│   ├── tokens.css              # CSS custom properties (already exists with dark theme)
│   └── print.css               # Optional: print-specific overrides
├── components/
│   └── ui/
│       ├── theme-toggle.ts     # NEW: Theme switcher component
│       └── help-tooltip.ts     # NEW: Accessible tooltip component
├── charts/
│   ├── base-chart.ts           # MODIFY: Add theme-aware color config
│   └── theme.ts                # NEW: Chart color configurations for light/dark
└── services/
    └── theme-service.ts        # NEW: Theme management singleton
```

### Pattern 1: Theme Toggle with CSS Custom Properties
**What:** Apply `data-theme="dark"` or `data-theme="light"` to document root, with CSS custom properties defined for each theme
**When to use:** Always - this is the standard Web Components theming approach

**Example:**
```css
/* tokens.css - already mostly implemented */
:root {
  --color-primary: #0d9488;
  --surface-primary: #ffffff;
  --text-primary: #1e293b;
}

[data-theme="dark"] {
  --color-primary: #14b8a6;
  --surface-primary: #0f172a;
  --text-primary: #f1f5f9;
}
```

```typescript
// Theme toggle implementation
function setTheme(theme: 'light' | 'dark' | 'system') {
  let resolvedTheme = theme;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    resolvedTheme = prefersDark ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', resolvedTheme);

  // Persist to IndexedDB
  db.settings.update('settings', { theme });
}
```

### Pattern 2: Chart.js Theme-Aware Colors
**What:** Define color configurations for light/dark themes, update charts when theme changes
**When to use:** For all Chart.js instances that use hardcoded colors

**Example:**
```typescript
// Source: https://www.chartjs.org/docs/latest/general/colors.html
// charts/theme.ts
export interface ChartTheme {
  primary: string;
  grid: string;
  text: string;
  // ... other colors
}

export const lightTheme: ChartTheme = {
  primary: '#2563eb',
  grid: '#e2e8f0',
  text: '#1e293b',
};

export const darkTheme: ChartTheme = {
  primary: '#60a5fa',
  grid: '#334155',
  text: '#f1f5f9',
};

// Update chart with new theme
function updateChartTheme(chart: Chart, theme: ChartTheme) {
  chart.options.scales.x.grid.color = theme.grid;
  chart.options.scales.y.grid.color = theme.grid;
  chart.options.scales.x.ticks.color = theme.text;
  chart.options.scales.y.ticks.color = theme.text;
  chart.update(); // Redraws with new colors
}
```

### Pattern 3: Accessible Tooltips with ARIA
**What:** Tooltips that appear on hover/focus with proper keyboard navigation and screen reader support
**When to use:** For inline help content that provides clarification

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tooltip_role
class HelpTooltip extends BaseComponent {
  protected template(): string {
    const content = this.getAttribute('content') || '';
    const id = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

    return `
      <button class="help-trigger" aria-describedby="${id}">
        <svg><!-- question mark icon --></svg>
      </button>
      <div role="tooltip" id="${id}" class="tooltip-content">
        ${content}
      </div>
    `;
  }

  protected afterRender(): void {
    const trigger = this.$('.help-trigger');
    const tooltip = this.$('.tooltip-content');

    // Show on focus/hover
    trigger?.addEventListener('focus', () => tooltip?.classList.add('visible'));
    trigger?.addEventListener('blur', () => tooltip?.classList.remove('visible'));

    // Dismiss on Escape
    trigger?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') tooltip?.classList.remove('visible');
    });
  }
}
```

### Pattern 4: Print-Friendly Layout
**What:** Hide UI chrome, adjust layout for paper, prevent awkward page breaks
**When to use:** For generating printable reports

**Example:**
```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing */
@media print {
  /* Hide interactive elements */
  header, footer, nav, .no-print, button {
    display: none !important;
  }

  /* Adjust layout for paper */
  body {
    font-size: 12pt;
    color: #000;
    background: #fff;
  }

  /* Prevent breaking important sections */
  .chart-container,
  .metric-card,
  table {
    break-inside: avoid;
  }

  /* Force page breaks where desired */
  .section-break {
    break-after: page;
  }
}

@page {
  margin: 0.75in;
  size: letter;
}
```

### Anti-Patterns to Avoid
- **Inline style strings in Shadow DOM for theming:** CSS custom properties automatically inherit; don't manually inject theme colors
- **Re-rendering charts to change theme:** Use `.update()` method; re-creating Chart.js instances is expensive
- **Using `display: none` on tooltip content:** Screen readers won't announce hidden content; use `visibility: hidden` or `opacity: 0` with absolute positioning
- **Storing theme in localStorage with polling:** Use IndexedDB with reactive updates; avoid synchronous localStorage access
- **Creating theme toggle without "system" option:** Users expect to follow OS preference; always provide light/dark/system choices

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip positioning | Custom absolute positioning logic | CSS anchor positioning or existing library pattern | Edge detection, scrolling, viewport clipping are complex edge cases |
| Theme detection from system | Manual OS detection | `window.matchMedia('(prefers-color-scheme: dark)')` | Native API handles all platforms and preferences |
| Print CSS reset | Custom print normalization | Standard `@media print` patterns | Browser defaults are well-tested; just hide/show specific elements |
| Chart color interpolation | Custom color gradients | Chart.js color plugins or defined palettes | Color accessibility (contrast ratios) requires expert tuning |
| Keyboard focus management | Custom focus trapping | Native focus-visible and tab-index | Browser handles focus order, skip links, and accessibility correctly |

**Key insight:** Theming in Web Components with Shadow DOM is solved by CSS custom properties (the ONLY way to pierce Shadow DOM). Don't try to inject styles programmatically or use CSS Shadow Parts for theme variables - it adds complexity without benefit.

## Common Pitfalls

### Pitfall 1: FOUC (Flash of Unstyled Content) on Theme Load
**What goes wrong:** Web components render with wrong theme colors briefly before theme JavaScript executes
**Why it happens:** Theme attribute is set via JavaScript after HTML parses, causing initial render with default theme
**How to avoid:** Set `data-theme` attribute in HTML template based on stored preference, or use `:not(:defined)` pseudo-class to hide components until defined
**Warning signs:** Brief flash of light theme on page load when dark theme is saved

**Solution:**
```typescript
// Load theme before components render
async function initTheme() {
  const settings = await db.settings.get('settings');
  const theme = settings?.theme || 'system';

  // Set immediately, before component connectedCallback fires
  document.documentElement.setAttribute('data-theme', resolveTheme(theme));
}

// Call in main.ts before app-root renders
initTheme();
```

### Pitfall 2: Shadow DOM Doesn't Inherit Theme Variables
**What goes wrong:** Component styles use hardcoded colors instead of CSS custom properties
**Why it happens:** Developer assumes global CSS applies inside Shadow DOM
**How to avoid:** Always use `var(--token, fallback)` pattern in component styles; verify custom properties are defined at `:root` or `[data-theme]`
**Warning signs:** Component colors don't change when theme toggles

**Solution:**
Already implemented in eVelo! All components use `var(--surface-primary, #ffffff)` pattern. Just need to ensure all color values reference tokens, not hardcoded hex.

### Pitfall 3: Chart.js Colors Don't Update When Theme Changes
**What goes wrong:** Charts display with initial theme colors even after toggle
**Why it happens:** Chart.js doesn't watch CSS custom properties; colors are set once at chart creation
**How to avoid:** Listen for theme changes and call `chart.update()` with new color configuration
**Warning signs:** Charts remain light-themed after switching to dark mode

**Solution:**
```typescript
// In BaseChart or chart components
protected updateTheme(theme: ChartTheme): void {
  if (!this.chart) return;

  const options = this.chart.options;
  options.scales.x.grid.color = theme.grid;
  options.scales.x.ticks.color = theme.text;
  options.scales.y.grid.color = theme.grid;
  options.scales.y.ticks.color = theme.text;

  // Update datasets if using theme-based colors
  this.chart.data.datasets.forEach(dataset => {
    if (dataset.borderColor === lightTheme.primary) {
      dataset.borderColor = theme.primary;
    }
  });

  this.chart.update('none'); // 'none' animation mode for instant update
}
```

### Pitfall 4: Print Layout Shows Interactive UI Elements
**What goes wrong:** Buttons, navigation, sidebars appear in printed output
**Why it happens:** No `@media print` styles to hide non-printable elements
**How to avoid:** Add `.no-print` class to interactive elements and hide in `@media print { .no-print { display: none; } }`
**Warning signs:** Printed PDF includes "Save", "Export", navigation menus

### Pitfall 5: Tooltips Not Accessible to Keyboard Users
**What goes wrong:** Tooltips only show on hover, not on keyboard focus
**Why it happens:** Tooltip trigger only listens for `mouseenter`, not `focus`
**How to avoid:** Use `<button>` elements for triggers (focusable by default), show on both hover and focus events
**Warning signs:** Tab key doesn't reveal tooltip content; screen readers don't announce tooltip

**Solution:**
```typescript
// WCAG 1.4.13 requirements:
// 1. Dismissable (Escape key)
// 2. Hoverable (can move mouse over tooltip)
// 3. Persistent (doesn't disappear immediately)

trigger.addEventListener('focus', showTooltip);
trigger.addEventListener('blur', hideTooltip);
trigger.addEventListener('mouseenter', showTooltip);
trigger.addEventListener('mouseleave', hideTooltip);
trigger.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTooltip();
});
```

### Pitfall 6: Print Cuts Charts or Tables in Half
**What goes wrong:** Page breaks occur in the middle of charts or data tables
**Why it happens:** Browser default page break algorithm doesn't know which elements should stay together
**How to avoid:** Use `break-inside: avoid` on containers that shouldn't split across pages
**Warning signs:** Printed report has chart title on one page, chart on next page

**Solution:**
```css
@media print {
  .chart-container,
  .metric-card,
  table,
  .section {
    break-inside: avoid;
  }
}
```

## Code Examples

Verified patterns from official sources:

### Theme Toggle Component
```typescript
// Source: Project pattern + https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
import { BaseComponent } from '../base-component';
import { db } from '../../data/db';

export class ThemeToggle extends BaseComponent {
  protected template(): string {
    return `
      <div class="theme-toggle">
        <button data-theme="light" aria-label="Light theme">☀️</button>
        <button data-theme="dark" aria-label="Dark theme">🌙</button>
        <button data-theme="system" aria-label="System theme">💻</button>
      </div>
    `;
  }

  protected afterRender(): void {
    this.$$('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme') as 'light' | 'dark' | 'system';
        this.setTheme(theme);
      });
    });
  }

  private async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    let resolvedTheme = theme;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', resolvedTheme);

    // Persist preference
    await db.settings.update('settings', { theme });

    // Notify charts to update
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: resolvedTheme } }));
  }

  protected styles(): string {
    return `
      .theme-toggle {
        display: flex;
        gap: var(--spacing-sm, 8px);
      }

      button {
        padding: var(--spacing-sm, 8px);
        border: 1px solid var(--border-color, #e2e8f0);
        background: var(--surface-primary, #fff);
        border-radius: var(--border-radius-md, 8px);
        cursor: pointer;
      }

      button:hover {
        background: var(--surface-secondary, #f8fafc);
      }
    `;
  }
}
```

### System Theme Preference Watcher
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
// services/theme-service.ts
export class ThemeService {
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange);
  }

  private handleSystemThemeChange = async (e: MediaQueryListEvent) => {
    const settings = await db.settings.get('settings');

    // Only update if user selected "system" theme
    if (settings?.theme === 'system') {
      const theme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
    }
  };
}
```

### Chart Theme Update in BaseChart
```typescript
// Source: https://www.chartjs.org/docs/latest/general/colors.html
// charts/base-chart.ts - add to existing class
export abstract class BaseChart extends BaseComponent {
  // ... existing code ...

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('theme-change', this.handleThemeChange);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('theme-change', this.handleThemeChange);
  }

  private handleThemeChange = (e: CustomEvent) => {
    if (!this.chart) return;

    const isDark = e.detail.theme === 'dark';
    const colors = isDark ? darkChartTheme : lightChartTheme;

    // Update grid and text colors
    const xScale = this.chart.options.scales?.x;
    const yScale = this.chart.options.scales?.y;

    if (xScale) {
      xScale.grid.color = colors.grid;
      xScale.ticks.color = colors.text;
    }

    if (yScale) {
      yScale.grid.color = colors.grid;
      yScale.ticks.color = colors.text;
    }

    this.chart.update('none'); // Update without animation
  };
}
```

### Print-Friendly Report Layout
```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing */
@media print {
  /* Hide UI chrome */
  header,
  footer,
  nav,
  .sidebar,
  .theme-toggle,
  button,
  .no-print {
    display: none !important;
  }

  /* Reset layout for paper */
  body {
    font-size: 12pt;
    color: #000;
    background: #fff;
  }

  /* Single column layout */
  .results-dashboard {
    display: block;
    width: 100%;
  }

  /* Prevent breaking important sections */
  .chart-container,
  .metric-card,
  .key-metrics-banner,
  table {
    break-inside: avoid;
  }

  /* Ensure charts are visible */
  canvas {
    max-width: 100%;
    height: auto !important;
  }

  /* Add page breaks between major sections */
  .section-break {
    break-after: page;
  }

  /* Show URLs for links */
  a[href]:after {
    content: " (" attr(href) ")";
  }
}

@page {
  margin: 0.75in;
  size: letter portrait;
}

/* First page might have different margins */
@page :first {
  margin-top: 1in;
}
```

### Accessible Help Tooltip
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tooltip_role
// components/ui/help-tooltip.ts
export class HelpTooltip extends BaseComponent {
  private tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  static override get observedAttributes(): string[] {
    return ['content', 'position'];
  }

  protected template(): string {
    const content = this.getAttribute('content') || '';
    const position = this.getAttribute('position') || 'top';

    return `
      <button
        class="help-trigger"
        aria-describedby="${this.tooltipId}"
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
          <text x="8" y="12" text-anchor="middle" fill="currentColor">?</text>
        </svg>
      </button>
      <div
        role="tooltip"
        id="${this.tooltipId}"
        class="tooltip-content ${position}"
        aria-hidden="true"
      >
        ${content}
      </div>
    `;
  }

  protected afterRender(): void {
    const trigger = this.$('.help-trigger') as HTMLElement;
    const tooltip = this.$('.tooltip-content') as HTMLElement;

    if (!trigger || !tooltip) return;

    const show = () => {
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
    };

    const hide = () => {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    };

    // WCAG 1.4.13: Show on hover and focus
    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', hide);
    trigger.addEventListener('focus', show);
    trigger.addEventListener('blur', hide);

    // WCAG 1.4.13: Dismissable with Escape
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hide();
        trigger.blur();
      }
    });

    // WCAG 1.4.13: Hoverable - keep visible when hovering tooltip
    tooltip.addEventListener('mouseenter', show);
    tooltip.addEventListener('mouseleave', hide);
  }

  protected styles(): string {
    return `
      :host {
        display: inline-block;
        position: relative;
      }

      .help-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--text-secondary, #64748b);
        cursor: help;
      }

      .help-trigger:hover,
      .help-trigger:focus {
        color: var(--color-primary, #0d9488);
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }

      .tooltip-content {
        position: absolute;
        max-width: 250px;
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: var(--surface-primary, #fff);
        color: var(--text-primary, #1e293b);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--border-radius-md, 8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: var(--font-size-sm, 0.875rem);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        pointer-events: none;
      }

      .tooltip-content.visible {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      /* Position variants */
      .tooltip-content.top {
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
      }

      .tooltip-content.bottom {
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
      }

      .tooltip-content.left {
        right: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
      }

      .tooltip-content.right {
        left: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
      }
    `;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `page-break-*` properties | `break-*` properties | CSS Fragmentation Level 3 (2018+) | Modern properties work across paged media, multi-column, and regions |
| Separate print stylesheet `<link media="print">` | Inline `@media print` rules | Performance best practice (~2020+) | Reduces HTTP requests, simpler maintenance |
| CSS Shadow Parts for theming | CSS Custom Properties | Web Components best practice (2020+) | Variables pierce Shadow DOM automatically; parts expose too much |
| Class-based theme toggle | `data-theme` attribute | Semantic HTML trend (2022+) | Attributes are more semantic and work better with CSS selectors |
| Color scheme plugins for Chart.js | Manual theme config with `.update()` | Chart.js 4.x (2023+) | Plugins add bundle size; manual config is simple and flexible |

**Deprecated/outdated:**
- `page-break-inside: avoid` → Use `break-inside: avoid` (legacy property still works but modern syntax preferred)
- Storing theme in cookies → Use localStorage/IndexedDB (cookies sent with every request, unnecessary overhead)
- Inline `<style>` in every Shadow DOM → Use `adoptedStyleSheets` for shared styles (performance optimization for 100+ components)

## Open Questions

Things that couldn't be fully resolved:

1. **Chart.js print DPI optimization**
   - What we know: Chart.js has `devicePixelRatio` config option for high-DPI rendering
   - What's unclear: Whether charts need manual DPI adjustment before print or if browsers handle it automatically
   - Recommendation: Start without DPI adjustments; add `beforeprint` event handler with `devicePixelRatio: 2` only if print quality is poor

2. **Tooltip overflow on small screens**
   - What we know: Tooltips can overflow viewport edges on mobile
   - What's unclear: Whether to implement auto-positioning (detect edge, flip tooltip) or accept overflow
   - Recommendation: Start with simple fixed positioning (top/bottom/left/right); add edge detection only if user testing shows problems

3. **Theme transition animations**
   - What we know: Can animate CSS custom properties with `transition` on `:root`
   - What's unclear: Whether smooth theme transitions improve UX or feel gimmicky
   - Recommendation: No transitions initially (instant theme switch); add opt-in smooth transitions if users request

4. **Help content authoring**
   - What we know: Tooltip content comes from `content` attribute
   - What's unclear: Whether to support HTML in tooltips or plain text only; where to store help text (inline attributes vs external data)
   - Recommendation: Plain text initially for accessibility; consider Markdown-to-HTML if complex formatting needed

## Sources

### Primary (HIGH confidence)
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) - Official spec reference
- [MDN: CSS Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) - Print media query best practices
- [Chart.js: Colors](https://www.chartjs.org/docs/latest/general/colors.html) - Official color configuration documentation
- [MDN: ARIA tooltip role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/tooltip_role) - Official accessibility guidance
- [W3C: Tooltip Pattern (APG)](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) - Official ARIA design patterns
- [MDN: ShadowRoot.adoptedStyleSheets](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets) - Official API documentation
- Project files: `src/styles/tokens.css`, `src/data/schemas/settings.ts` - Existing theme infrastructure

### Secondary (MEDIUM confidence)
- [Shadow DOM: Building Encapsulated Web Components](https://dev.to/mukhilpadmanabhan/shadow-dom-building-perfectly-encapsulated-web-components-441f) - CSS custom properties piercing Shadow DOM
- [Open-wc: Styles Piercing Shadow DOM](https://open-wc.org/guides/knowledge/styling/styles-piercing-shadow-dom/) - Web Components theming patterns
- [Go Make Things: Styling Shadow DOM with CSS Variables](https://gomakethings.com/styling-the-shadow-dom-with-css-variables-in-web-components/) - Practical theming implementation
- [Chameleon: Contextual Help UX Patterns](https://www.chameleon.io/blog/contextual-help-ux) - Help content best practices
- [Accessibly: Tooltip Accessibility](https://accessiblyapp.com/blog/tooltip-accessibility/) - WCAG compliance for tooltips
- [DEV: LocalStorage vs IndexedDB](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5) - Storage comparison
- [Pixel Free Studio: Print Styles Pitfalls](https://blog.pixelfreestudio.com/print-styles-gone-wrong-avoiding-pitfalls-in-media-print-css/) - Print CSS best practices
- [Jacob Milhorn: Solving FOUC in Web Components](https://www.jacobmilhorn.com/posts/solving-fouc-in-web-components/) - FOUC prevention patterns

### Tertiary (LOW confidence)
- [GitHub: Chart.js Dark Mode Discussion #9214](https://github.com/chartjs/Chart.js/discussions/9214) - Community discussion on theme support
- [CanvasJS: Print Method](https://canvasjs.com/docs/charts/methods/chart/print/) - Alternative charting library approach
- Various Stack Overflow and blog posts on tooltip positioning, theme toggle implementations - Used for pattern validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native APIs and existing libraries; official documentation verified
- Architecture: HIGH - CSS custom properties + Shadow DOM is well-established pattern; verified with MDN and W3C sources
- Chart.js theming: HIGH - Official documentation confirms `.update()` method; tested pattern in community
- Print layout: HIGH - Standard CSS media queries; MDN official guidance
- Help tooltips: HIGH - W3C ARIA Authoring Practices Guide provides canonical pattern
- Pitfalls: MEDIUM - Based on community experience and common issues; not all verified in production

**Research date:** 2026-01-23
**Valid until:** ~60 days (theming patterns are stable; no fast-moving dependencies)
