# Phase 29: Print-Optimized Dashboard - Research

**Researched:** 2026-01-29
**Domain:** Browser printing, Chart.js image export, Web Components patterns
**Confidence:** HIGH

## Summary

This phase implements a print feature for the eVelo dashboard. The research focused on three key areas: (1) detecting when simulation results are available to conditionally show the print icon, (2) converting Chart.js charts to static images for reliable print rendering, and (3) creating a print-optimized popup window that works across browsers.

The codebase already has a print.css file with `@media print` rules, but the current approach relies on printing the entire page which includes shadow DOM components that may not render correctly. The recommended approach is to open a new window with pre-rendered static content (charts as images) that bypasses Shadow DOM encapsulation issues.

**Primary recommendation:** Use `window.open()` to create a print preview window with charts converted to images via `Chart.toBase64Image()`, styled with explicit CSS (not relying on shadow DOM), and include a "Print" button that triggers `window.print()`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Chart.js | Already installed | `toBase64Image()` for chart export | Built-in API, no additional dependencies |
| Browser APIs | Native | `window.open()`, `window.print()` | Universal browser support, no library needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS @media print | Native | Print-specific styling in popup | Fallback styles if browser allows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New window | iframe + print | iframe has same-origin restrictions, harder to style |
| toBase64Image | canvas.toBlob() | Blob adds complexity, base64 is simpler for inline images |
| Manual HTML generation | PDF library (jsPDF) | PDF adds ~300KB bundle size, HTML is lighter |

**Installation:**
```bash
# No additional packages needed - all functionality is available via existing Chart.js and browser APIs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── ui/
│       └── print-report.ts          # New: Print preview generation logic
├── utils/
│   └── print-utils.ts               # New: Chart-to-image, window generation helpers
└── styles/
    └── print.css                    # Existing: @media print rules (may need updates)
```

### Pattern 1: Conditional Header Icon via Simulation State
**What:** Show/hide print icon based on simulation data availability
**When to use:** When results dashboard has data
**Example:**
```typescript
// Source: Existing pattern in app-root.ts for simulation-complete event
// Listen for simulation completion
document.addEventListener('simulation-complete', (e: CustomEvent) => {
  const printBtn = this.$('#btn-print');
  if (e.detail.result) {
    printBtn?.classList.remove('hidden');
  }
});

// Initial state: hidden (no results yet)
// Template: <button id="btn-print" class="header-btn hidden" ...>
```

### Pattern 2: Chart to Image Export
**What:** Convert Chart.js canvas to base64 image for print
**When to use:** Before generating print content
**Example:**
```typescript
// Source: Chart.js official API
// Access chart instance from custom element
const probabilityCone = dashboard.shadowRoot?.querySelector('probability-cone-chart');
const chartInstance = (probabilityCone as any)?.chart; // Chart.js instance

if (chartInstance) {
  // Export as PNG base64 data URL
  const imageDataUrl = chartInstance.toBase64Image('image/png', 1.0);
  // Use in print window: <img src="${imageDataUrl}" />
}
```

### Pattern 3: Print Window Generation
**What:** Create popup window with print-ready content
**When to use:** When user clicks print button
**Example:**
```typescript
// Source: MDN Web Docs - window.open()
function openPrintWindow(content: string): void {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Please allow popups for this site to use the print feature.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>eVelo Dashboard Report</title>
      <style>${getPrintStyles()}</style>
    </head>
    <body>
      ${content}
      <button onclick="window.print()">Print Report</button>
    </body>
    </html>
  `);
  printWindow.document.close();
}
```

### Pattern 4: Force Light Theme for Print
**What:** Ensure print content uses light theme regardless of app theme
**When to use:** Always in print preview
**Example:**
```typescript
// Source: Existing theme detection pattern in theme.ts
// When generating print content, always use light theme variables
const printStyles = `
  :root {
    --surface-primary: #ffffff;
    --surface-secondary: #f8fafc;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --border-color: #e2e8f0;
    --color-primary: #0d9488;
  }
`;
// Do NOT reference [data-theme="dark"] in print window
```

### Anti-Patterns to Avoid
- **Direct Shadow DOM printing:** Shadow DOM styles may not render in print; extract content to plain HTML
- **Relying on canvas in print:** Canvas elements often render blank; convert to images first
- **Animated charts in print window:** Set `animation: false` or wait for render completion
- **Opening print dialog immediately:** Give user a preview with explicit "Print" button

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart image export | Canvas manipulation | `chart.toBase64Image()` | Handles DPI, format, quality |
| Print dialog control | Custom print logic | `window.print()` | Browser handles print dialog UX |
| Page break control | Manual pagination | CSS `break-inside: avoid` | Browser print engine handles layout |
| Popup blocking detection | Guessing | Check `window.open()` return value | Returns null if blocked |

**Key insight:** The browser's print engine is highly optimized. Focus on generating well-structured HTML with proper CSS hints rather than trying to control pagination manually.

## Common Pitfalls

### Pitfall 1: Blank Charts in Print Window
**What goes wrong:** Charts appear as blank rectangles in the print window
**Why it happens:** Canvas elements don't transfer when cloning DOM or writing new document
**How to avoid:** Always convert charts to base64 images before including in print content
**Warning signs:** Works in dev tools preview but prints blank

### Pitfall 2: Shadow DOM Styles Not Applied
**What goes wrong:** Components lose all styling in print window
**Why it happens:** Shadow DOM encapsulates styles; they don't transfer to new document
**How to avoid:** Write explicit CSS in the print window, don't rely on component styles
**Warning signs:** Print preview looks unstyled

### Pitfall 3: Popup Blocker Prevents Print Window
**What goes wrong:** Print window never opens, user confused
**Why it happens:** Browsers block popups not triggered by direct user action
**How to avoid:** Only call `window.open()` in direct click handler, not in async callbacks
**Warning signs:** Works sometimes, fails other times

### Pitfall 4: Dark Theme Bleeding into Print
**What goes wrong:** Print has dark background, wastes ink, hard to read
**Why it happens:** Theme CSS variables or dark mode styles included
**How to avoid:** Explicitly set light theme colors in print window, ignore app theme
**Warning signs:** Print preview looks dark

### Pitfall 5: Charts Render at Wrong Size
**What goes wrong:** Charts too small or pixelated in print
**Why it happens:** Canvas resolution tied to screen display size
**How to avoid:** Before export, ensure chart has rendered at desired size; consider responsive: false for print capture
**Warning signs:** Images look blurry or tiny

### Pitfall 6: Page Breaks Mid-Section
**What goes wrong:** Chart gets split across two pages
**Why it happens:** Browser doesn't know where to break
**How to avoid:** Wrap each section in element with `break-inside: avoid`
**Warning signs:** Preview shows awkward page breaks

## Code Examples

Verified patterns from official sources:

### Extracting Chart Image from Web Component
```typescript
// Source: Existing BaseChart pattern + Chart.js API
function extractChartImage(
  dashboard: HTMLElement,
  chartSelector: string
): string | null {
  // Navigate shadow DOM to find chart component
  const chartElement = dashboard.shadowRoot?.querySelector(chartSelector);
  if (!chartElement) return null;

  // Access Chart.js instance (stored as protected property)
  const chartInstance = (chartElement as any).chart;
  if (!chartInstance) return null;

  // Export as PNG data URL (Chart.js v4+ API)
  return chartInstance.toBase64Image('image/png', 1.0);
}
```

### Complete Print Content Generator
```typescript
// Source: Combination of codebase patterns + research
interface PrintableData {
  paramSummaryHtml: string;
  keyMetricsHtml: string;
  chartImages: {
    probabilityCone: string | null;
    histogram: string | null;
    sblocBalance: string | null;
    marginCall: string | null;
    bbdComparison: string | null;
  };
  tableHtmls: {
    yearlyAnalysis: string;
    performance: string;
  };
}

function generatePrintHtml(data: PrintableData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>eVelo Simulation Report</title>
      <style>
        /* Reset and base */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #1e293b;
          background: #fff;
          padding: 0.5in;
        }

        /* Header */
        .report-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #0d9488;
        }
        .report-header h1 {
          font-size: 24pt;
          color: #0d9488;
          margin-bottom: 4px;
        }
        .report-header .timestamp {
          font-size: 10pt;
          color: #64748b;
        }

        /* Sections */
        .section {
          margin-bottom: 24px;
          break-inside: avoid;
        }
        .section h2 {
          font-size: 14pt;
          color: #0d9488;
          margin-bottom: 12px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e2e8f0;
        }

        /* Chart images */
        .chart-image {
          max-width: 100%;
          height: auto;
          margin: 8px 0;
        }

        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
          text-align: left;
        }
        th {
          background: #f8fafc;
          font-weight: 600;
        }

        /* Print button (hidden when actually printing) */
        .print-actions {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
        }
        .print-btn {
          background: #0d9488;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
        }
        .print-btn:hover {
          background: #0f766e;
        }

        @media print {
          .print-actions { display: none; }
          body { padding: 0; }
        }

        @page {
          size: letter portrait;
          margin: 0.75in;
        }
      </style>
    </head>
    <body>
      <div class="print-actions">
        <button class="print-btn" onclick="window.print()">Print Report</button>
        <button class="print-btn" onclick="window.close()" style="background:#64748b">Close</button>
      </div>

      <header class="report-header">
        <h1>eVelo Simulation Report</h1>
        <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
      </header>

      <section class="section">
        <h2>Simulation Parameters</h2>
        ${data.paramSummaryHtml}
      </section>

      <section class="section">
        <h2>Key Metrics</h2>
        ${data.keyMetricsHtml}
      </section>

      ${data.chartImages.probabilityCone ? `
      <section class="section">
        <h2>Portfolio Projection</h2>
        <img class="chart-image" src="${data.chartImages.probabilityCone}" alt="Probability cone chart">
      </section>
      ` : ''}

      ${data.chartImages.histogram ? `
      <section class="section">
        <h2>Terminal Value Distribution</h2>
        <img class="chart-image" src="${data.chartImages.histogram}" alt="Histogram chart">
      </section>
      ` : ''}

      ${data.chartImages.sblocBalance ? `
      <section class="section">
        <h2>SBLOC Balance Projection</h2>
        <img class="chart-image" src="${data.chartImages.sblocBalance}" alt="SBLOC balance chart">
      </section>
      ` : ''}

      ${data.chartImages.marginCall ? `
      <section class="section">
        <h2>Margin Call Risk</h2>
        <img class="chart-image" src="${data.chartImages.marginCall}" alt="Margin call risk chart">
      </section>
      ` : ''}

      ${data.chartImages.bbdComparison ? `
      <section class="section">
        <h2>BBD vs Sell Strategy Comparison</h2>
        <img class="chart-image" src="${data.chartImages.bbdComparison}" alt="BBD comparison chart">
      </section>
      ` : ''}

      <section class="section">
        <h2>Yearly Analysis</h2>
        ${data.tableHtmls.yearlyAnalysis}
      </section>

      <section class="section">
        <h2>Performance Summary</h2>
        ${data.tableHtmls.performance}
      </section>
    </body>
    </html>
  `;
}
```

### Header Button Pattern (Matching Existing Icons)
```typescript
// Source: Existing app-root.ts header button pattern
// Add to header-buttons div in app-root template:
`<button id="btn-print" class="header-btn hidden" aria-label="Print report" title="Print report">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
</button>`

// Reuse existing .header-btn styles (40x40px, circular, rgba background)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @media print on main page | Dedicated print window | Long-standing best practice | Avoids Shadow DOM issues |
| Canvas cloning | toBase64Image() | Chart.js v2+ | Reliable chart export |
| Synchronous popup | User-triggered popup | Browser security changes ~2020 | Must be in direct click handler |

**Deprecated/outdated:**
- `document.execCommand('print')`: Deprecated, use `window.print()`
- Print-specific stylesheets via `<link media="print">`: Still works but popup approach is more reliable for complex components

## Open Questions

Things that couldn't be fully resolved:

1. **Chart Resolution for Print**
   - What we know: toBase64Image uses current canvas size
   - What's unclear: Optimal canvas size for 300 DPI print quality
   - Recommendation: Test with typical chart sizes; may need to temporarily resize chart before capture

2. **Table Data Extraction**
   - What we know: Tables are in shadow DOM of custom elements
   - What's unclear: Best approach to extract formatted table HTML
   - Recommendation: Either query shadow DOM directly or expose a `getTableHtml()` method on table components

3. **Mobile Print UX**
   - What we know: Mobile browsers support window.print() and popups differently
   - What's unclear: Exact UX on iOS Safari, Android Chrome
   - Recommendation: Test on mobile; may need responsive print styles

## Sources

### Primary (HIGH confidence)
- [Chart.js API Documentation](https://www.chartjs.org/docs/latest/developers/api.html) - toBase64Image method
- [MDN window.open()](https://developer.mozilla.org/en-US/docs/Web/API/Window/open) - popup window API
- [MDN @media print](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing) - print media queries

### Secondary (MEDIUM confidence)
- Existing codebase patterns: app-root.ts header buttons, base-chart.ts Chart.js integration
- Existing print.css: Current print styles (useful as reference)

### Tertiary (LOW confidence)
- Community patterns for Shadow DOM printing (various approaches, not definitively "best")

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only built-in browser APIs and existing Chart.js
- Architecture: HIGH - Following established patterns in codebase
- Pitfalls: HIGH - Well-documented browser behaviors

**Research date:** 2026-01-29
**Valid until:** 60+ days (stable browser APIs and Chart.js methods)
