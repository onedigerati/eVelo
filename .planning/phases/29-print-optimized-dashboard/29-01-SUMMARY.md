---
phase: 29
plan: 01
subsystem: print
tags: [print, chart-export, header-ui, browser-apis]

dependency_graph:
  requires: []
  provides:
    - print-utils module with chart image extraction
    - print-utils module with HTML generation
    - conditional print button in header
  affects:
    - 29-02 (wiring print functionality)

tech_stack:
  added: []
  patterns:
    - Chart.js toBase64Image for chart export
    - window.open for print preview popup
    - event-driven UI visibility

file_tracking:
  key_files:
    created:
      - src/utils/print-utils.ts
    modified:
      - src/components/app-root.ts

decisions:
  - id: print-window-approach
    choice: "Use window.open with pre-rendered HTML instead of @media print"
    reason: "Shadow DOM styles don't transfer to print; charts need image conversion"

metrics:
  duration: 3 min
  completed: 2026-01-30
---

# Phase 29 Plan 01: Print Infrastructure Summary

**One-liner:** Print utility module with Chart.js image extraction (toBase64Image) and conditional header button shown after simulation-complete event.

## What Was Built

### 1. Print Utilities Module (`src/utils/print-utils.ts`)
Created a comprehensive utility module (491 lines) for print functionality:

**Functions:**
- `extractChartImage(shadowRoot, selector)` - Extracts single chart as base64 PNG via Chart.js toBase64Image API
- `extractAllChartImages(dashboard)` - Extracts all 9 dashboard charts (cone, histogram, sbloc, margin, bbd, comparison line, cumulative costs, terminal comparison, utilization)
- `extractTableHtml(shadowRoot, selector)` - Clones and extracts table HTML from shadow DOM
- `generatePrintHtml(data)` - Generates complete print-ready HTML document with inline CSS, light theme, proper page breaks
- `openPrintWindow(htmlContent)` - Opens print preview window with popup blocker detection

**Interfaces:**
- `ChartImages` - Optional string fields for each chart type
- `KeyMetrics` - initialValue, terminalValue, successRate, cagr, withdrawalRate
- `ParamSummary` - timeHorizon, iterations, inflationRate, sblocRate, maxLtv
- `PrintableData` - Complete data structure combining metrics, params, charts, timestamp

### 2. Conditional Print Button (`src/components/app-root.ts`)
Added printer icon button to header:
- Positioned before guide button for logical flow (Print, Guide, Theme, Settings)
- Hidden by default with `.header-btn.hidden` style
- Revealed on `simulation-complete` event
- Placeholder click handler logs to console (wiring in Plan 02)
- SVG printer icon from Feather/Lucide (20x20, stroke-based)

## Key Technical Decisions

1. **Window.open approach over @media print** - Shadow DOM encapsulation prevents styles from transferring to print; new window receives pre-rendered HTML with all styles inline.

2. **Chart.js toBase64Image** - Converts canvas charts to static PNG images (1.0 quality) for reliable print rendering; avoids blank canvas issues.

3. **Light theme always** - Print document uses explicit light colors regardless of app theme to save ink and ensure readability.

4. **Break-inside: avoid** - Each section wrapped with CSS to prevent awkward page breaks mid-chart.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] `npm run build` completes without TypeScript errors
- [x] src/utils/print-utils.ts exists with all 5 functions exported (491 lines > 150 minimum)
- [x] Print button has `hidden` class in initial template
- [x] simulation-complete event listener removes hidden class
- [x] Print button styling matches existing header buttons (circular, 40x40px)
- [x] Key link: toBase64Image pattern found in print-utils.ts
- [x] Key link: simulation-complete + btn-print pattern found in app-root.ts

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| src/utils/print-utils.ts | Created | +491 |
| src/components/app-root.ts | Modified | +26 |

## Next Phase Readiness

**Ready for Plan 02:** Print utilities are complete and ready to be wired into the click handler. The handler will need to:
1. Get dashboard reference
2. Call extractAllChartImages()
3. Build PrintableData from current simulation state
4. Call generatePrintHtml() and openPrintWindow()
