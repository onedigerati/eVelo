# Phase 24: Mobile Dashboard Optimization - Research

**Researched:** 2026-01-26
**Domain:** Responsive web design, mobile data visualization, touch interaction patterns
**Confidence:** HIGH

## Summary

This research investigated mobile-responsive dashboard patterns for Chart.js visualizations and data tables on mobile viewports (≤768px). The eVelo dashboard already has basic responsive CSS media queries, but suffers from common mobile pitfalls: charts may clip horizontally, tables lack clear scroll indicators, and container sizing doesn't properly constrain chart dimensions.

The standard approach for 2026 involves: (1) Chart.js with `maintainAspectRatio: false` and explicit parent container heights, (2) horizontal scrolling tables with visual indicators and touch momentum, (3) single-column stacked layouts on mobile, and (4) `-webkit-overflow-scrolling: touch` for smooth iOS scrolling (though Safari 13+ enables this by default).

The current codebase has partial mobile support but needs systematic fixes: chart containers need proper height constraints, tables need scroll indicators, and the dashboard grid needs to enforce single-column layout consistently.

**Primary recommendation:** Fix chart container height constraints first (charts clip without explicit parent heights), then add visual scroll indicators to tables (users can't tell they're scrollable), then audit all cards for horizontal overflow on narrow viewports.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Chart.js | 4.x | Data visualization | Already in use; mobile-responsive by design with proper configuration |
| CSS Media Queries | - | Responsive breakpoints | Native CSS; @media (max-width: 768px) is industry standard mobile breakpoint |
| CSS Flexbox/Grid | - | Responsive layout | Native CSS; flexbox for 1D layouts, grid for dashboard cards |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| -webkit-overflow-scrolling | - | iOS momentum scrolling | Already used in some tables; ensures smooth touch scrolling on iOS |
| touch-action | CSS | Touch gesture control | Prevent default gestures when horizontal scroll needed |
| CSS Container Queries | - | Component-level responsiveness | Optional enhancement; shipped in all major browsers 2023+ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Horizontal scroll tables | Card/accordion layout | Better UX but requires major refactor; keep scroll for now |
| Fixed chart heights | Aspect ratio constraints | Aspect ratio causes clipping on narrow viewports |
| Media queries | Container queries | Container queries better for component reuse but add complexity |

**Installation:**
```bash
# No new dependencies needed - all solutions use existing libraries
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/ui/        # Already correct
│   ├── results-dashboard.ts
│   ├── *-table.ts        # Table components
│   └── *-chart.ts        # Chart wrappers
├── charts/               # Already correct
│   ├── base-chart.ts     # Shared Chart.js wrapper
│   └── *-chart.ts        # Specific chart types
└── styles/
    ├── tokens.css        # Design tokens (breakpoints, spacing)
    └── responsive.css    # Shared responsive utilities (optional)
```

### Pattern 1: Chart Container with Explicit Height
**What:** Chart.js requires parent containers with explicit heights for responsive sizing
**When to use:** All Chart.js instances on mobile viewports
**Example:**
```typescript
// Source: https://www.chartjs.org/docs/latest/configuration/responsive.html
// Component template
protected template(): string {
  return `
    <div class="chart-container">
      <probability-cone-chart id="cone-chart"></probability-cone-chart>
    </div>
  `;
}

// Component styles
protected styles(): string {
  return `
    .chart-container {
      position: relative;
      height: 400px;  /* REQUIRED: explicit height */
    }

    .chart-container probability-cone-chart {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    @media (max-width: 768px) {
      .chart-container {
        height: 280px;  /* Reduced for mobile */
      }
    }
  `;
}

// Chart configuration
protected getChartConfig(): ChartConfiguration {
  return {
    type: 'line',
    data: this._data,
    options: {
      responsive: true,
      maintainAspectRatio: false,  // REQUIRED: allows height control
      // ... other options
    }
  };
}
```

### Pattern 2: Horizontally Scrollable Table with Indicators
**What:** Tables wider than viewport with touch scrolling and visual scroll cues
**When to use:** Data tables with many columns that can't reasonably collapse
**Example:**
```typescript
// Source: https://www.nngroup.com/articles/mobile-tables/
protected template(): string {
  return `
    <div class="table-container">
      <div class="scroll-indicator left" aria-hidden="true">◀</div>
      <div class="table-wrapper">
        <table class="analysis-table">
          <!-- table content -->
        </table>
      </div>
      <div class="scroll-indicator right" aria-hidden="true">▶</div>
    </div>
  `;
}

protected styles(): string {
  return `
    .table-container {
      position: relative;
    }

    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;  /* Smooth iOS scrolling */
      scroll-behavior: smooth;
    }

    .analysis-table {
      min-width: 800px;  /* Forces horizontal scroll on narrow viewports */
    }

    /* Scroll indicators - show partial content */
    .scroll-indicator {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-primary);
      font-size: 1.5rem;
      opacity: 0.7;
      pointer-events: none;
      z-index: 10;
    }

    .scroll-indicator.left {
      left: 0;
    }

    .scroll-indicator.right {
      right: 0;
    }

    @media (max-width: 768px) {
      .table-wrapper {
        /* Add negative margin to show cut-off content */
        margin: 0 calc(-1 * var(--spacing-sm, 8px));
        padding: 0 var(--spacing-sm, 8px);
      }
    }
  `;
}
```

### Pattern 3: Responsive Grid to Single Column
**What:** Dashboard grid collapses from 2-column to 1-column on mobile
**When to use:** Card-based dashboard layouts
**Example:**
```css
/* Source: Current eVelo implementation (correct pattern) */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg, 24px);
}

.full-width {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;  /* Single column on mobile */
    gap: var(--spacing-md, 16px);
  }
}
```

### Pattern 4: Touch-Friendly Sticky Headers
**What:** Table headers remain visible during vertical scroll
**When to use:** Tables with more than 10 rows
**Example:**
```css
/* Source: Current eVelo yearly-analysis-table.ts (correct pattern) */
.analysis-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--surface-secondary, #f8fafc);
}

.sticky-col {
  position: sticky;
  left: 0;  /* First column stays visible during horizontal scroll */
  background: var(--surface-secondary, #f8fafc);
  z-index: 5;
}
```

### Anti-Patterns to Avoid
- **Fixed aspect ratios on charts**: `maintainAspectRatio: true` (default) causes charts to overflow horizontally on narrow viewports. Always set to `false` for mobile.
- **Missing parent container heights**: Chart.js can't determine size without explicit parent height. Charts will collapse or fail to render.
- **overflow-x: hidden on body/html**: Prevents table horizontal scrolling. Only hide overflow on specific containers.
- **width: 100% on flex children with scrollbars**: Scrollbar is inside element width, parent clips it. Use `min-width: 0` instead (from CLAUDE.md).
- **Horizontal scroll without visual indicators**: Users can't tell content is scrollable. Always show cut-off content or arrows.
- **Small touch targets (<44px)**: iOS Human Interface Guidelines require minimum 44x44pt touch targets.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart responsive behavior | Custom resize listeners | Chart.js `responsive: true` | Chart.js has battle-tested resize detection via ResizeObserver |
| Momentum scrolling | Custom touch event handlers | `-webkit-overflow-scrolling: touch` | Native iOS momentum scrolling, no JS needed |
| Responsive breakpoints | JS window.innerWidth checks | CSS media queries | Declarative, performant, handles orientation changes |
| Sticky table headers | JS scroll position tracking | `position: sticky` | Native CSS, works with transforms, no JS overhead |
| Viewport units for mobile | Fixed pixel heights | `vh`, `dvh` (dynamic viewport height) | Accounts for mobile browser chrome (address bar) |

**Key insight:** Mobile browsers have matured significantly. Native CSS solutions (sticky positioning, overflow scrolling, container queries) outperform JS polyfills. Use CSS-first, add JS only when CSS can't solve the problem.

## Common Pitfalls

### Pitfall 1: Chart.js Charts Overflow Horizontally on Mobile
**What goes wrong:** Charts render wider than viewport, causing horizontal page scroll
**Why it happens:** Chart.js defaults to `maintainAspectRatio: true`, which preserves aspect ratio even when parent container is narrow. If parent width is 375px and aspect ratio is 2:1, chart tries to be 750px wide.
**How to avoid:**
1. Set `maintainAspectRatio: false` in chart options
2. Give parent container explicit height (not just width)
3. Use relative units for container sizing (%, vh, vw)
**Warning signs:**
- Horizontal scrollbar on mobile viewport
- Chart canvas wider than screen
- `offsetWidth > window.innerWidth` in DevTools

### Pitfall 2: Tables Appear Broken (No Horizontal Scroll Visible)
**What goes wrong:** Wide tables are scrollable but users don't know it; data appears cut off
**Why it happens:** No visual indication of scrollability; content is perfectly aligned with viewport edge
**How to avoid:**
1. Show partial content beyond fold (negative margins + padding technique)
2. Add scroll indicators (arrows or fade gradients)
3. Use `scroll-snap-type` to hint at additional columns
4. Freeze first column so row labels remain visible
**Warning signs:**
- Users report "missing data"
- Table feels "broken" on mobile
- No visual cue that more content exists

### Pitfall 3: Flex Child Scrollbar Clipping (from CLAUDE.md)
**What goes wrong:** Scrollable element's scrollbar is clipped by parent with `overflow: hidden`
**Why it happens:** When flex child uses `width: 100%`, its scrollbar (inside `offsetWidth`) extends beyond parent's content box
**How to avoid:**
1. Use `min-width: 0` instead of `width: 100%` on flex children
2. Remove `overflow: hidden` from parent if not needed
3. Debug with `offsetWidth - clientWidth` to detect scrollbar presence
**Warning signs:**
- Scrollbar appears in DevTools but not visually
- Element is scrollable programmatically but no scrollbar visible
- `element.offsetWidth > parent.offsetWidth`

### Pitfall 4: Chart Height Collapses to 0px
**What goes wrong:** Chart container has no height, chart doesn't render or renders as 1px tall
**Why it happens:** Parent container has no explicit height; `height: 100%` resolves to 0 when parent height is auto
**How to avoid:**
1. Always set explicit height in CSS (px, vh, rem)
2. If using flexbox, ensure parent has `min-height` or `flex: 1` with bounded ancestor
3. Check DevTools Computed tab: parent should have non-zero height
**Warning signs:**
- Chart doesn't appear on mobile
- Canvas element has 0 or 1px height in DevTools
- Chart renders on desktop but not mobile

### Pitfall 5: iOS Safari Horizontal Bounce (Overscroll)
**What goes wrong:** Page bounces left/right when user scrolls horizontally near edge
**Why it happens:** iOS elastic scrolling applies to all scrollable axes, even when content fits
**How to avoid:**
1. Set `overflow-x: hidden` on `<html>` or `<body>` only if entire page fits horizontally
2. Use `overscroll-behavior-x: contain` on scrollable containers
3. Ensure dashboard cards never exceed viewport width
**Warning signs:**
- White space appears to left/right of page on mobile
- Page "bounces" left/right when scrolling
- User reports "page feels broken"

## Code Examples

Verified patterns from official sources:

### Chart.js Responsive Configuration
```typescript
// Source: https://www.chartjs.org/docs/latest/configuration/responsive.html
protected getChartConfig(): ChartConfiguration {
  return {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // ... other options
    }
  };
}

// Parent container must have explicit height
// Template
protected template(): string {
  return `
    <div class="chart-container" style="position: relative; height: 400px;">
      <canvas id="chart-canvas"></canvas>
    </div>
  `;
}
```

### Mobile-Optimized Table Wrapper
```typescript
// Source: Current eVelo implementation (correlation-heatmap.ts, yearly-analysis-table.ts)
protected styles(): string {
  return `
    .table-container {
      overflow-x: auto;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;  /* iOS momentum scrolling */
    }

    .analysis-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 800px;  /* Forces scroll on mobile */
    }

    /* Mobile-specific adjustments */
    @media (max-width: 768px) {
      .table-container {
        /* Negative margin shows cut-off content */
        margin: 0 calc(-1 * var(--spacing-sm, 8px));
        padding: 0 var(--spacing-sm, 8px);
      }

      .analysis-table {
        font-size: var(--font-size-xs, 0.75rem);
      }

      .analysis-table th,
      .analysis-table td {
        padding: var(--spacing-xs, 4px);
        min-width: 48px;
        white-space: nowrap;
      }
    }
  `;
}
```

### Responsive Dashboard Grid
```typescript
// Source: Current eVelo results-dashboard.ts (correct pattern)
protected styles(): string {
  return `
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg, 24px);
    }

    .full-width {
      grid-column: 1 / -1;
    }

    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
        gap: var(--spacing-md, 16px);
      }

      .chart-section,
      .stats-section {
        padding: var(--spacing-md, 16px);
      }

      .chart-container {
        height: 280px;  /* Explicit height for mobile */
      }
    }

    @media (max-width: 480px) {
      .chart-container {
        height: 240px;  /* Further reduced for small phones */
      }
    }
  `;
}
```

### Sticky Column + Header Pattern
```typescript
// Source: Current eVelo yearly-analysis-table.ts (correct pattern)
protected styles(): string {
  return `
    .analysis-table thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--surface-secondary, #f8fafc);
    }

    .sticky-col {
      position: sticky;
      left: 0;
      background: var(--surface-secondary, #f8fafc);
      z-index: 5;  /* Below header, above content */
    }

    /* Ensure scrollbar doesn't clip sticky elements */
    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
  `;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `-webkit-overflow-scrolling: touch` required | Safari 13+ has it by default | 2019 (Safari 13) | Still safe to include for older iOS devices |
| Media queries only | Container queries + media queries | 2023 (browser support stable) | Components can adapt to container, not just viewport |
| `vh` units with mobile issues | `dvh` (dynamic viewport height) | 2023 (supported in modern browsers) | Accounts for mobile browser chrome (address bar) |
| Manual resize observers | Chart.js built-in ResizeObserver | Chart.js 3.0 (2021) | No manual resize handling needed |
| CSS Grid not mobile-ready | CSS Grid with auto-fit/auto-fill | 2017+ (IE11 deprecated) | Single source of truth for responsive grids |

**Deprecated/outdated:**
- **IE11 mobile polyfills**: IE11 officially deprecated 2022; remove all polyfills
- **Modernizr for feature detection**: Modern browsers have stable feature support; use `@supports` CSS instead
- **jQuery for touch events**: Use native `touch-action` CSS and pointer events
- **Fixed 320px mobile breakpoint**: Smallest modern phone is 360px (Galaxy S8); use 375px or 360px minimum

## Open Questions

Things that couldn't be fully resolved:

1. **Container query adoption timeline**
   - What we know: Supported in all major browsers since 2023, excellent progressive enhancement
   - What's unclear: Whether eVelo should refactor to container queries now or defer to Phase 25+
   - Recommendation: Defer to future phase; media queries work fine for current scope

2. **Chart.js performance on low-end mobile**
   - What we know: Chart.js can struggle with >10,000 data points on low-end devices
   - What's unclear: Whether eVelo simulation result datasets exceed performance thresholds on mobile
   - Recommendation: Test on low-end Android device; consider data downsampling if performance issues detected

3. **Mobile browser address bar height variations**
   - What we know: Mobile browser chrome (address bar) shrinks on scroll, changing viewport height
   - What's unclear: Whether this causes layout shift issues in eVelo dashboard
   - Recommendation: Use `dvh` units if available, fallback to `vh`; test on iOS Safari and Chrome mobile

4. **Optimal mobile chart aspect ratios**
   - What we know: Desktop 2:1 or 16:9 aspect ratios may not work well on mobile portrait
   - What's unclear: What aspect ratio provides best readability for probability cone and histograms on 375px wide screen
   - Recommendation: Use explicit heights (280px mobile, 400px desktop) rather than aspect ratios

## Sources

### Primary (HIGH confidence)
- [Chart.js Responsive Configuration](https://www.chartjs.org/docs/latest/configuration/responsive.html) - Official Chart.js documentation
- [Mobile Tables: Best Practices - Nielsen Norman Group](https://www.nngroup.com/articles/mobile-tables/) - UX research on mobile table patterns
- [CSS Container Queries - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) - Official browser documentation
- Current eVelo codebase - `src/components/ui/results-dashboard.ts`, `src/charts/base-chart.ts`, `src/charts/correlation-heatmap.ts`, `src/components/ui/yearly-analysis-table.ts`

### Secondary (MEDIUM confidence)
- [Responsive Design with Chart.js - Medium](https://medium.com/@francesco.saviano87/build-responsive-dashboards-with-chart-js-fc5f7cc42f52) - Community best practices verified against official docs
- [Mobile Dashboard UI Best Practices - Toptal](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui) - Design patterns from industry practitioners
- [Responsive Tables UX - Tenscope](https://www.tenscope.com/post/responsive-table-design-ux-faster) - User research on table patterns
- [Tables Best Practice for Mobile - WebOsmotic](https://webosmotic.com/blog/tables-best-practice-for-mobile-ux-design/) - Mobile-specific table guidance

### Tertiary (LOW confidence)
- [Container Queries in 2026 - LogRocket](https://blog.logrocket.com/container-queries-2026/) - Forward-looking perspective on container queries
- [Mobile Data Tables Design - Bootcamp](https://medium.com/design-bootcamp/designing-user-friendly-data-tables-for-mobile-devices-c470c82403ad) - Design patterns not yet verified in production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Chart.js responsive behavior verified in official docs and current codebase
- Architecture: HIGH - Patterns verified in existing eVelo implementation and official documentation
- Pitfalls: HIGH - Common issues documented in Chart.js GitHub issues and eVelo CLAUDE.md

**Research date:** 2026-01-26
**Valid until:** 2026-04-26 (90 days - stable domain, slow-moving standards)
