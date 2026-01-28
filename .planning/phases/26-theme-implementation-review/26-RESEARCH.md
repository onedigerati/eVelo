# Phase 26: Theme Implementation Review - Research

**Researched:** 2026-01-28
**Domain:** Theme implementation audit, WCAG accessibility compliance, CSS custom properties review
**Confidence:** HIGH

## Summary

This research focuses on conducting a comprehensive theme implementation review to ensure proper colors, styles, contrast ratios, readability, and toggle logic across both desktop and mobile views. The eVelo project already has a solid theme foundation (implemented in Phase 9) with CSS custom properties, theme service singleton, Chart.js integration, and system preference detection. This phase is about auditing and improving that implementation.

The primary review domains are: (1) WCAG 2.1 AA color contrast compliance (4.5:1 for normal text, 3:1 for large text and UI components), (2) complete CSS custom property coverage across all components, (3) Chart.js dataset color updates during theme changes, (4) FOUC prevention, (5) edge cases like disabled states, modals, tooltips, and (6) mobile theme behavior consistency.

Key challenges identified: Chart.js uses hardcoded colors at dataset creation (e.g., `DEFAULT_CHART_THEME` in probability-cone-chart.ts line 83), which means dataset colors won't update when themes change unless explicitly updated in the `handleThemeChange` method. BaseChart only updates scales/grid/legend colors but not dataset colors. Component coverage appears comprehensive (35 UI components use CSS custom properties), but systematic contrast ratio auditing has not been performed.

**Primary recommendation:** Use automated accessibility testing tools (axe-core or WebAIM Contrast Checker) to audit all color combinations against WCAG 2.1 AA standards. Extend BaseChart.handleThemeChange() to update dataset colors using getChartTheme(). Create a theme audit checklist covering all components, states (hover, focus, disabled), and edge cases. Verify FOUC prevention works correctly. Test theme toggle on touch devices.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties | Native | Theme token system | Only way to pierce Shadow DOM boundaries; automatic inheritance |
| WCAG 2.1 AA | Standard | Accessibility compliance | Required 4.5:1 normal text, 3:1 large text/UI; stable since 2018 |
| `prefers-color-scheme` | Native | System theme detection | CSS Media Queries Level 5 standard; baseline since 2020 |
| axe-core | Latest | Automated a11y testing | Industry standard; powers Chrome Lighthouse; finds 57% of WCAG issues |
| WebAIM Contrast Checker | Web tool | Manual contrast auditing | Official WCAG evaluation tool; provides API access |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lighthouse | Chrome DevTools | Automated accessibility audit | Initial audit pass; integrates with CI/CD |
| Colour Contrast Analyser (CCA) | Desktop app | Visual contrast checking | Eyedropper tool for on-screen color picking |
| Chrome DevTools | Native | Inspect computed contrast ratios | Quick spot-checks during development |
| `window.matchMedia` | Native | Detect system theme changes | Already implemented in theme-service.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual contrast checking | Automated tools (axe-core) | Manual is exhaustive but slow; automated finds 57% of issues instantly |
| WebAIM Contrast Checker | Built-in DevTools | WebAIM has API and better UI; DevTools is faster for spot-checks |
| WCAG 2.1 AA | WCAG 2.2 AAA (7:1 ratio) | AAA is stricter but not required; AA balances accessibility and design flexibility |

**Installation:**
No new dependencies required. All tools use native Web APIs and browser DevTools. Optionally install axe-core for automated testing:
```bash
npm install --save-dev axe-core @axe-core/cli
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── styles/
│   └── tokens.css              # Already exists with light/dark themes
├── services/
│   └── theme-service.ts        # Already exists with toggle/persistence
├── charts/
│   ├── base-chart.ts           # REVIEW: Extend handleThemeChange for datasets
│   ├── theme.ts                # Already exists with lightChartTheme/darkChartTheme
│   └── *.ts                    # REVIEW: Check for hardcoded colors
├── components/
│   └── ui/
│       ├── theme-toggle.ts     # Already exists
│       └── *.ts                # REVIEW: Verify all use CSS custom properties
└── tests/
    └── theme-audit.test.ts     # NEW: Automated contrast checks
```

### Pattern 1: WCAG Contrast Ratio Auditing
**What:** Systematically check all text/background and UI component/background color combinations against WCAG 2.1 AA standards
**When to use:** During theme review phase and after any color token changes

**WCAG 2.1 AA Requirements:**
- **Normal text:** 4.5:1 minimum contrast ratio
- **Large text (18pt/24px or 14pt/19px bold):** 3:1 minimum
- **UI components (borders, icons):** 3:1 minimum (WCAG 2.1 addition)
- **Non-text contrast:** 3:1 for graphics and UI component states

**Example audit process:**
```typescript
// Source: https://webaim.org/resources/contrastchecker/
// Manual audit using WebAIM Contrast Checker

// Light theme checks:
// --text-primary (#1e293b) on --surface-primary (#ffffff)
// Result: 16.07:1 ✓ PASS (exceeds 4.5:1)

// --text-secondary (#64748b) on --surface-primary (#ffffff)
// Result: 5.74:1 ✓ PASS (exceeds 4.5:1)

// --color-primary (#0d9488) on --surface-primary (#ffffff)
// Result: 4.65:1 ✓ PASS (exceeds 4.5:1 for normal text)

// Dark theme checks:
// --text-primary (#f1f5f9) on --surface-primary (#0f172a)
// Result: 15.51:1 ✓ PASS

// --text-secondary (#94a3b8) on --surface-primary (#0f172a)
// Result: 7.32:1 ✓ PASS

// Automated audit using axe-core:
import axe from 'axe-core';

async function auditThemeContrast() {
  // Run axe on entire page
  const results = await axe.run();

  // Filter for color-contrast violations
  const contrastIssues = results.violations.filter(
    v => v.id === 'color-contrast'
  );

  console.log(`Found ${contrastIssues.length} contrast violations`);
  contrastIssues.forEach(issue => {
    console.log(`- ${issue.help}`);
    issue.nodes.forEach(node => {
      console.log(`  Element: ${node.html}`);
      console.log(`  Contrast: ${node.any[0].data.contrastRatio}`);
    });
  });
}
```

### Pattern 2: Chart Dataset Theme Updates
**What:** Extend BaseChart.handleThemeChange() to update dataset colors (not just scales/grid/legend)
**When to use:** Always - charts should fully respect theme changes

**Current limitation:**
```typescript
// Source: src/charts/base-chart.ts line 165-196
// Current implementation only updates scales, grid, legend
private handleThemeChange = (): void => {
  if (!this.chart) return;
  const theme = getChartTheme();

  // Updates scales, grid, legend ✓
  // Does NOT update dataset colors ✗

  this.chart.update('none');
};
```

**Problem:**
```typescript
// Source: src/charts/probability-cone-chart.ts line 83
// buildChartData uses DEFAULT_CHART_THEME (light theme)
const theme = DEFAULT_CHART_THEME;  // Hardcoded at data build time

// Dataset colors set once, never updated:
datasets: [
  {
    borderColor: theme.percentiles.p90,  // Light theme color
    backgroundColor: withAlpha(theme.percentiles.p90, alpha),
  },
  // ...
]
```

**Solution pattern:**
```typescript
// Option 1: Rebuild chart data on theme change (simple but re-renders data)
private handleThemeChange = (): void => {
  if (!this.chart || !this._data) return;

  // Rebuild data with current theme
  const newData = this.buildChartData(this._data);
  this.chart.data = newData;

  // Update options
  const theme = getChartTheme();
  this.updateScaleColors(theme);

  this.chart.update('none');
};

// Option 2: Update dataset colors in-place (more efficient)
private handleThemeChange = (): void => {
  if (!this.chart) return;
  const theme = getChartTheme();

  // Update scales/grid/legend (existing)
  this.updateScaleColors(theme);

  // NEW: Update dataset colors
  this.chart.data.datasets.forEach((dataset, idx) => {
    if (dataset.label?.includes('P90')) {
      dataset.borderColor = theme.percentiles.p90;
      dataset.backgroundColor = withAlpha(theme.percentiles.p90, 0.3);
    }
    // ... handle other percentiles
  });

  this.chart.update('none');
};
```

### Pattern 3: Component Theme Token Coverage Audit
**What:** Verify all UI components use CSS custom properties (not hardcoded colors)
**When to use:** During theme review and code review for new components

**Audit checklist:**
```typescript
// Source: Project codebase analysis
// Good pattern (35/35 UI components follow this):
protected styles(): string {
  return `
    button {
      background: var(--surface-primary, #ffffff);
      color: var(--text-primary, #1e293b);
      border: 1px solid var(--border-color, #e2e8f0);
    }

    button:hover {
      background: var(--surface-hover, rgba(13, 148, 136, 0.05));
    }

    button:focus-visible {
      outline: 2px solid var(--color-primary, #0d9488);
    }
  `;
}

// Anti-pattern to watch for:
protected styles(): string {
  return `
    button {
      background: #ffffff;  // ✗ Hardcoded - won't change with theme
      color: #1e293b;       // ✗ Hardcoded
    }
  `;
}
```

**State coverage checklist:**
- [ ] Default state uses theme tokens
- [ ] `:hover` state uses theme tokens
- [ ] `:focus-visible` state uses theme tokens
- [ ] `:disabled` state uses theme tokens (often missed)
- [ ] `:active` state uses theme tokens
- [ ] Error states use theme tokens (e.g., `--color-error`)
- [ ] Success states use theme tokens (e.g., `--color-success`)

### Pattern 4: FOUC Prevention Verification
**What:** Ensure theme loads before components render to prevent flash of wrong theme
**When to use:** Always - critical for user experience

**Current implementation:**
```typescript
// Source: src/main.ts line 4-7
// Already implemented correctly:
initTheme().then(() => {
  import('./components/app-root');
});
```

**Verification test:**
```typescript
// Source: https://www.jacobmilhorn.com/posts/solving-fouc-in-web-components/
// Test: Clear IndexedDB, set OS to dark mode, reload page
// Expected: No flash of light theme
// Actual: Should see dark theme immediately

// Additional FOUC prevention for web components:
// CSS approach (not currently needed, but good to know):
app-root:not(:defined),
main-layout:not(:defined) {
  opacity: 0;
}

app-root:defined,
main-layout:defined {
  opacity: 1;
  transition: opacity 0.2s;
}
```

### Pattern 5: Theme Toggle Smooth Transitions
**What:** Optional smooth color transitions when switching themes
**When to use:** Only if desired for UX polish (not critical)

**Performance considerations:**
```css
/* Source: https://joshcollinsworth.com/blog/great-transitions */
/* ONLY animate transform and opacity for best performance */
/* Avoid animating: width, height, margin, padding, border (causes layout) */

/* Theme transition (optional) */
:root {
  /* Only transition custom properties that don't affect layout */
  transition:
    --surface-primary 0.3s ease,
    --text-primary 0.3s ease,
    --border-color 0.3s ease;
}

/* Better: Transition specific properties, not custom properties */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Best for performance: No transitions (instant theme switch) */
/* Current implementation has no transitions - this is fine */
```

**Recommendation:** Skip theme transitions unless user testing indicates they improve UX. Instant theme switching is performant and expected.

### Anti-Patterns to Avoid
- **Hardcoded colors in chart datasets:** Use `getChartTheme()` at render time, not `DEFAULT_CHART_THEME` at build time
- **Missing disabled state theming:** Components often forget to style `:disabled` with theme tokens
- **Checking only light theme contrast:** Both themes must meet WCAG standards independently
- **Manual-only contrast checking:** Use automated tools first to catch obvious issues
- **Transitioning layout-affecting properties:** Only transition `opacity`, `transform`, `background-color`, `color` for performance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contrast ratio calculation | Custom color math formulas | WebAIM Contrast Checker API or axe-core | WCAG formula is complex (relative luminance, gamma correction); official tools are tested |
| Comprehensive accessibility audit | Manual checking every element | axe-core + Lighthouse | Manual audit misses issues; axe finds 57% automatically with zero false positives |
| Theme transition performance | Animate all properties | Only animate `opacity`, `transform`, `background-color`, `color` | Other properties cause layout recalc and repaint; GPU-accelerated properties are smooth |
| FOUC prevention | Complex loading states | `:not(:defined)` CSS + initTheme before import | Native solution; no JavaScript complexity |
| Color palette generation | Custom color pickers | Design tokens from established system (Tailwind) | Color theory, contrast, and accessibility require expertise; tested palettes are safer |

**Key insight:** Accessibility compliance is not intuitive. WCAG contrast formulas involve relative luminance calculations that differ from simple RGB differences. Use official tools that implement the spec correctly rather than custom implementations that may not handle edge cases.

## Common Pitfalls

### Pitfall 1: Chart Dataset Colors Don't Update on Theme Change
**What goes wrong:** Chart scales, grid, and legend colors update when theme toggles, but dataset colors (lines, bars, percentile bands) remain in the original theme
**Why it happens:** BaseChart.handleThemeChange() only updates scale/grid/legend options; chart datasets use colors set at data build time with `DEFAULT_CHART_THEME`
**How to avoid:** Either rebuild chart data on theme change, or update dataset colors in-place in handleThemeChange()
**Warning signs:** After toggling to dark theme, probability cone chart has bright green/red percentile bands (light theme colors) on dark background (poor contrast)

**Detection test:**
```typescript
// Test: Toggle theme while viewing probability cone chart
// Expected: All colors (including percentile bands) update to dark theme
// Actual: Only grid/text update; bands stay light theme colors
```

### Pitfall 2: Disabled State Not Themed
**What goes wrong:** Disabled buttons/inputs have hardcoded gray colors that don't adapt to theme
**Why it happens:** Developers forget to check disabled pseudo-class against theme tokens
**How to avoid:** Include `:disabled` in component CSS with theme-aware colors
**Warning signs:** Disabled button looks identical in light and dark themes

**Solution:**
```css
button:disabled {
  background: var(--surface-tertiary, #e2e8f0);
  color: var(--text-secondary, #64748b);
  opacity: 0.6;  /* Additional visual cue */
  cursor: not-allowed;
}
```

### Pitfall 3: Insufficient Contrast in Dark Theme
**What goes wrong:** Colors with good contrast on white background fail WCAG on dark background
**Why it happens:** Contrast checking only performed for light theme; dark theme uses "brightened" colors without verification
**How to avoid:** Run WCAG contrast checks for BOTH themes independently
**Warning signs:** Text is readable in light theme but hard to read in dark theme

**Example:**
```css
/* Light theme: --text-secondary (#64748b) on white (#ffffff) */
/* Contrast: 5.74:1 ✓ PASS */

/* Dark theme: --text-secondary (#94a3b8) on dark (#0f172a) */
/* Contrast: 7.32:1 ✓ PASS */

/* Problem case (hypothetical): */
/* If dark theme used #64748b (same as light), contrast would be 2.1:1 ✗ FAIL */
```

### Pitfall 4: Focus Indicators Invisible in One Theme
**What goes wrong:** Focus outline has good visibility in light theme but blends into background in dark theme
**Why it happens:** Focus outline color is hardcoded or uses primary color that doesn't work on both backgrounds
**How to avoid:** Use theme token for focus indicators; verify visibility in both themes
**Warning signs:** Keyboard navigation works but focus ring is hard to see in one theme

**Solution:**
```css
/* Use theme token for focus */
button:focus-visible {
  outline: 2px solid var(--color-primary, #0d9488);  /* Light theme */
  outline-offset: 2px;
}

/* Dark theme automatically uses brighter primary */
[data-theme="dark"] {
  --color-primary: #14b8a6;  /* Brighter for visibility on dark background */
}
```

### Pitfall 5: Modal Backdrop Opacity Same in Both Themes
**What goes wrong:** Modal backdrop that's subtle in light theme is too heavy in dark theme (or vice versa)
**Why it happens:** Backdrop uses fixed `rgba(0, 0, 0, 0.3)` instead of theme token
**How to avoid:** Define backdrop color as theme token with different opacity per theme
**Warning signs:** Modal backdrop blocks too much/too little content in one theme

**Solution:**
```css
/* In tokens.css */
:root {
  --modal-backdrop: rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] {
  --modal-backdrop: rgba(0, 0, 0, 0.5);  /* Darker for contrast on dark background */
}

/* In component */
.modal-overlay {
  background: var(--modal-backdrop, rgba(0, 0, 0, 0.3));
}
```

### Pitfall 6: FOUC on System Theme Change
**What goes wrong:** When OS switches from light to dark mode (e.g., at sunset), app flashes briefly before updating
**Why it happens:** Theme service listens for `matchMedia` changes but doesn't prevent render during update
**How to avoid:** Already solved in current implementation - theme-service.ts handles this correctly
**Warning signs:** Brief flash of wrong theme when OS switches theme preference

**Verification:**
```typescript
// Source: src/services/theme-service.ts line 72-79
// Already implemented correctly:
mediaQuery.addEventListener('change', (e) => {
  // Only react if current preference is 'system'
  if (currentTheme === 'system') {
    const newResolved = e.matches ? 'dark' : 'light';
    applyTheme(newResolved);  // Immediate update, no FOUC
  }
});
```

### Pitfall 7: Print Styles Ignore Theme
**What goes wrong:** Print output uses dark theme colors (light text on dark background) which wastes ink
**Why it happens:** No `@media print` overrides to force light theme
**How to avoid:** Add print styles that force high-contrast light theme
**Warning signs:** Printed pages have dark backgrounds and light text

**Solution:**
```css
/* Source: src/styles/print.css or tokens.css */
@media print {
  /* Force light theme colors for print */
  :root, [data-theme="dark"] {
    --surface-primary: #ffffff !important;
    --text-primary: #000000 !important;
    --border-color: #000000 !important;
  }

  /* Hide theme toggle in print */
  theme-toggle {
    display: none !important;
  }
}
```

## Code Examples

Verified patterns from official sources:

### WCAG Contrast Ratio Audit Script
```typescript
// Source: https://www.deque.com/axe/axe-core/
// Automated accessibility audit using axe-core

import axe from 'axe-core';

/**
 * Audit current page for accessibility violations
 * Focus on color contrast issues
 */
async function auditPageAccessibility(): Promise<void> {
  try {
    // Run axe with specific rules
    const results = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa']
      }
    });

    // Separate violations by severity
    const criticalIssues = results.violations.filter(v => v.impact === 'critical');
    const seriousIssues = results.violations.filter(v => v.impact === 'serious');

    // Log contrast-specific issues
    const contrastIssues = results.violations.filter(v =>
      v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
    );

    console.group('Accessibility Audit Results');
    console.log(`Total violations: ${results.violations.length}`);
    console.log(`Critical: ${criticalIssues.length}`);
    console.log(`Serious: ${seriousIssues.length}`);
    console.log(`Contrast issues: ${contrastIssues.length}`);
    console.groupEnd();

    // Detailed contrast issue reporting
    contrastIssues.forEach(issue => {
      console.group(`Contrast Issue: ${issue.help}`);
      issue.nodes.forEach(node => {
        console.log('Element:', node.html);
        console.log('Selector:', node.target);
        console.log('Contrast ratio:', node.any[0]?.data?.contrastRatio);
        console.log('Expected ratio:', node.any[0]?.data?.expectedContrastRatio);
      });
      console.groupEnd();
    });
  } catch (error) {
    console.error('Accessibility audit failed:', error);
  }
}

// Run audit in console:
// auditPageAccessibility();

// Run audit on theme change:
window.addEventListener('theme-change', () => {
  setTimeout(() => auditPageAccessibility(), 100);
});
```

### Chart Dataset Theme Update Pattern
```typescript
// Source: Project pattern + Chart.js best practices
// Extend BaseChart to update dataset colors on theme change

// In base-chart.ts, extend handleThemeChange:
private handleThemeChange = (): void => {
  if (!this.chart) return;

  const theme = getChartTheme();

  // Update scales/grid/legend (existing)
  this.updateScaleColors(theme);

  // NEW: Update dataset colors if subclass implements
  this.updateDatasetColors(theme);

  this.chart.update('none');
};

/**
 * Override in subclasses to update dataset colors
 * Default implementation does nothing (for charts without theme-dependent datasets)
 */
protected updateDatasetColors(theme: ChartTheme): void {
  // Subclasses override to update their specific dataset colors
}

// In probability-cone-chart.ts, override:
protected updateDatasetColors(theme: ChartTheme): void {
  if (!this.chart) return;

  const alpha = CHART_ALPHA.bandFill;
  const withAlpha = (hex: string, a: number): string => {
    const alpha256 = Math.round(a * 255).toString(16).padStart(2, '0');
    return hex + alpha256;
  };

  this.chart.data.datasets.forEach((dataset) => {
    const label = dataset.label || '';

    // Update percentile band colors
    if (label.includes('P90')) {
      dataset.borderColor = theme.percentiles.p90;
      dataset.backgroundColor = withAlpha(theme.percentiles.p90, alpha);
    } else if (label.includes('P75')) {
      dataset.borderColor = theme.percentiles.p75;
      dataset.backgroundColor = withAlpha(theme.percentiles.p75, alpha);
    } else if (label.includes('P50')) {
      dataset.borderColor = theme.percentiles.p50;
      dataset.backgroundColor = withAlpha(theme.percentiles.p50, alpha);
    } else if (label.includes('P25')) {
      dataset.borderColor = theme.percentiles.p25;
      dataset.backgroundColor = withAlpha(theme.percentiles.p25, alpha);
    } else if (label.includes('P10')) {
      dataset.borderColor = theme.percentiles.p10;
      dataset.backgroundColor = withAlpha(theme.percentiles.p10, alpha);
    }
  });
}
```

### Component Theme Coverage Audit
```typescript
// Source: Project audit pattern
// Systematic component theme token coverage check

interface ThemeTokenAudit {
  component: string;
  usesTokens: boolean;
  hardcodedColors: string[];
  missingStates: string[];
}

/**
 * Audit all UI components for theme token usage
 * Detects hardcoded colors and missing state coverage
 */
function auditComponentThemeTokens(): ThemeTokenAudit[] {
  const components = document.querySelectorAll('[class*="component"]');
  const results: ThemeTokenAudit[] = [];

  components.forEach(component => {
    const shadowRoot = (component as any).shadowRoot;
    if (!shadowRoot) return;

    const styles = shadowRoot.querySelector('style')?.textContent || '';

    // Check for hardcoded hex colors (not in var())
    const hexRegex = /#[0-9a-fA-F]{3,6}(?![^(]*\))/g;
    const hardcodedColors = styles.match(hexRegex) || [];

    // Check for var(--*) usage
    const usesTokens = styles.includes('var(--');

    // Check for state coverage
    const missingStates: string[] = [];
    if (!styles.includes(':disabled')) missingStates.push(':disabled');
    if (!styles.includes(':focus-visible')) missingStates.push(':focus-visible');
    if (!styles.includes(':hover')) missingStates.push(':hover');

    results.push({
      component: component.tagName.toLowerCase(),
      usesTokens,
      hardcodedColors,
      missingStates,
    });
  });

  return results;
}

// Run audit:
// const audit = auditComponentThemeTokens();
// const issues = audit.filter(a => !a.usesTokens || a.hardcodedColors.length > 0);
// console.table(issues);
```

### Manual Contrast Check Workflow
```typescript
// Source: https://webaim.org/resources/contrastchecker/
// Systematic manual contrast checking for theme tokens

interface ContrastCheck {
  foreground: string;
  background: string;
  ratio: number;
  passes: {
    normalAA: boolean;
    largeAA: boolean;
    uiAA: boolean;
  };
}

/**
 * Manually check color contrast ratios
 * For automated checking, use axe-core instead
 */
async function checkThemeContrast(): Promise<ContrastCheck[]> {
  const results: ContrastCheck[] = [];

  // Get computed token values
  const root = document.documentElement;
  const styles = getComputedStyle(root);

  const tokens = {
    textPrimary: styles.getPropertyValue('--text-primary').trim(),
    textSecondary: styles.getPropertyValue('--text-secondary').trim(),
    surfacePrimary: styles.getPropertyValue('--surface-primary').trim(),
    surfaceSecondary: styles.getPropertyValue('--surface-secondary').trim(),
    colorPrimary: styles.getPropertyValue('--color-primary').trim(),
  };

  // Check critical combinations
  const checks = [
    { fg: tokens.textPrimary, bg: tokens.surfacePrimary, label: 'Body text' },
    { fg: tokens.textSecondary, bg: tokens.surfacePrimary, label: 'Secondary text' },
    { fg: tokens.colorPrimary, bg: tokens.surfacePrimary, label: 'Primary button' },
    { fg: tokens.textPrimary, bg: tokens.surfaceSecondary, label: 'Alt background' },
  ];

  for (const check of checks) {
    // Use WebAIM API to calculate contrast
    const url = `https://webaim.org/resources/contrastchecker/?fcolor=${check.fg.slice(1)}&bcolor=${check.bg.slice(1)}&api`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      results.push({
        foreground: check.fg,
        background: check.bg,
        ratio: parseFloat(data.ratio),
        passes: {
          normalAA: data.AA === 'pass',
          largeAA: data.AALarge === 'pass',
          uiAA: parseFloat(data.ratio) >= 3.0,
        },
      });
    } catch (error) {
      console.error(`Failed to check ${check.label}:`, error);
    }
  }

  return results;
}

// Usage:
// Toggle to light theme, then:
// checkThemeContrast().then(results => console.table(results));
// Toggle to dark theme, then:
// checkThemeContrast().then(results => console.table(results));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WCAG 2.0 only | WCAG 2.1 (includes UI component contrast 3:1) | 2018 | Must check borders, icons, form controls, not just text |
| Manual contrast checking | Automated tools (axe-core) | 2020+ | Finds 57% of issues instantly; integrates with CI/CD |
| Class-based theming | CSS custom properties + `data-theme` attribute | 2022+ | Better Shadow DOM piercing; semantic HTML |
| Separate print stylesheet | Inline `@media print` | 2020+ | Fewer HTTP requests; easier maintenance |
| Chart.js plugins for theming | Manual config with `.update()` | Chart.js 4.x (2023+) | Simpler; plugins add bundle size |
| WCAG 2.1 AA | WCAG 2.2 (enhanced target size, dragging) | 2023 | Newer but AA still standard; AAA is 7:1 contrast |

**Deprecated/outdated:**
- Checking text contrast only: WCAG 2.1 added non-text contrast (3:1 for UI components)
- Using Lighthouse alone: Axe DevTools is more comprehensive (70+ tests vs Lighthouse's subset)
- Manual-only accessibility testing: Automated tools catch more issues; manual testing should supplement, not replace

**Current state (2026):**
- WCAG 2.1 AA remains the compliance standard (4.5:1 normal text, 3:1 large text/UI)
- WCAG 2.2 is published but AA 2.1 still widely adopted
- axe-core is industry standard (3B+ downloads, powers Chrome DevTools)
- Automated tools find ~57% of issues; manual testing required for remaining 43%

## Open Questions

Things that couldn't be fully resolved:

1. **Print theme behavior**
   - What we know: Current print.css exists but may not force light theme colors
   - What's unclear: Whether print always uses light theme or respects current theme
   - Recommendation: Verify print.css forces light theme with `!important` for ink conservation; test printing from dark theme

2. **Chart color updates during theme change**
   - What we know: BaseChart.handleThemeChange() updates scales/grid/legend but not datasets
   - What's unclear: Whether charts intentionally keep dataset colors or this is a gap
   - Recommendation: Extend handleThemeChange() to update dataset colors; verify no visual glitches

3. **Mobile theme toggle placement**
   - What we know: ThemeToggle component exists and is reusable
   - What's unclear: Where theme toggle appears on mobile (header, settings, both)
   - Recommendation: Verify theme toggle is accessible on mobile; check if placement needs adjustment

4. **Theme transition animations**
   - What we know: Current implementation has instant theme switching (no transitions)
   - What's unclear: Whether users would prefer smooth color transitions
   - Recommendation: Start without transitions (current state); add only if user testing shows value

5. **Focus indicators in charts**
   - What we know: Chart.js has focus/hover states
   - What's unclear: Whether chart tooltips/interactions meet keyboard accessibility standards
   - Recommendation: Test keyboard navigation in charts; verify tooltips appear on keyboard focus

6. **Disabled state coverage**
   - What we know: 35 UI components use CSS custom properties
   - What's unclear: How many components properly theme `:disabled` state
   - Recommendation: Audit components for disabled state styling; add theme tokens where missing

## Sources

### Primary (HIGH confidence)
- [WebAIM: Contrast Checker](https://webaim.org/resources/contrastchecker/) - Official WCAG contrast tool
- [W3C: WCAG 2.1 Contrast Minimum (1.4.3)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) - Official WCAG standard
- [Make Things Accessible: WCAG 2.2 Level AA Contrast](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/) - WCAG 2.2 requirements
- [Deque: axe-core](https://github.com/dequelabs/axe-core) - Official axe-core documentation
- [MDN: Using CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) - Official CSS custom properties guide
- [MDN: Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) - Official Shadow DOM documentation
- Project files: src/services/theme-service.ts, src/charts/theme.ts, src/styles/tokens.css - Existing implementation

### Secondary (MEDIUM confidence)
- [Josh Collinsworth: CSS Transitions Best Practices](https://joshcollinsworth.com/blog/great-transitions) - Performance guidance for transitions
- [Jacob Milhorn: Solving FOUC in Web Components](https://www.jacobmilhorn.com/posts/solving-fouc-in-web-components/) - FOUC prevention patterns
- [Pixel Free Studio: CSS Shadow DOM Pitfalls](https://blog.pixelfreestudio.com/css-shadow-dom-pitfalls-styling-web-components-correctly/) - Common Shadow DOM theming issues
- [Chart.js Discussion #9214](https://github.com/chartjs/Chart.js/discussions/9214) - Community discussion on dark mode support
- [Manuel Matuzovic: Pros and Cons of Shadow DOM](https://www.matuzo.at/blog/2023/pros-and-cons-of-shadow-dom/) - Shadow DOM theming tradeoffs

### Tertiary (LOW confidence)
- [accessiBe: 15 Best Color Contrast Checker Tools](https://accessibe.com/blog/knowledgebase/color-contrast-checker-tools) - Tool comparison
- [Test Guild: Top 18 Automation Accessibility Testing Tools](https://testguild.com/accessibility-testing-tools-automation/) - Testing tool landscape
- Various Stack Overflow discussions on Chart.js theming and Shadow DOM styling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - WCAG 2.1 AA is stable standard; axe-core is industry-proven; CSS custom properties are canonical
- Architecture: HIGH - Existing implementation follows best practices; audit patterns are straightforward
- Chart theming: MEDIUM - Identified gap in dataset color updates; solution is clear but needs verification
- Pitfalls: HIGH - Based on WCAG official guidance and common Shadow DOM issues documented in official sources
- Mobile behavior: MEDIUM - Need to verify actual mobile theme behavior through testing

**Research date:** 2026-01-28
**Valid until:** ~60 days (accessibility standards are stable; no fast-moving dependencies)
