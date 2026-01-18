---
phase: 06-visualizations
plan: 03
subsystem: charts
tags: [chart.js, web-components, histogram, bar-chart, visualization]

depends_on:
  requires: ["06-01"]
  provides: ["histogram-chart", "margin-call-chart", "bbd-comparison-chart"]
  affects: ["07-ui-assembly"]

tech_stack:
  added: []
  patterns:
    - "Risk-based color coding for probability visualization"
    - "Custom Chart.js plugins for annotations"
    - "createHistogramBins helper for data binning"

key_files:
  created:
    - src/charts/histogram-chart.ts
    - src/charts/margin-call-chart.ts
    - src/charts/bbd-comparison-chart.ts
  modified:
    - src/charts/index.ts
    - src/charts/donut-chart.ts
    - src/charts/sbloc-balance-chart.ts
    - src/charts/correlation-heatmap.ts

decisions:
  - id: DEC-0603-01
    choice: "Gradient colors for histogram bars"
    rationale: "Red-to-green gradient conveys value magnitude intuitively"
  - id: DEC-0603-02
    choice: "Risk threshold color coding for margin call"
    rationale: "0-5% green, 5-15% yellow, 15-30% orange, 30%+ red matches risk perception"
  - id: DEC-0603-03
    choice: "Custom afterDraw plugin for BBD advantage annotation"
    rationale: "Avoids adding annotation plugin dependency while providing clear visual"

metrics:
  duration: "3 min"
  completed: "2026-01-17"
---

# Phase 6 Plan 3: Bar Chart Components Summary

Bar chart components for histogram, margin call risk, and BBD comparison - enabling users to visualize distributions, risks, and strategy comparisons.

## One-liner

Three Chart.js bar chart Web Components: histogram for terminal value distribution, margin call probability by year with risk coloring, and BBD vs Sell comparison with advantage annotation.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create histogram chart component | 3c9e38c | src/charts/histogram-chart.ts |
| 2 | Create margin call probability chart | d8d3402 | src/charts/margin-call-chart.ts |
| 3 | Create BBD vs Sell comparison chart | 442092b | src/charts/bbd-comparison-chart.ts |
| 4 | Update module exports | 66b5a8a | src/charts/index.ts |

## Technical Implementation

### Histogram Chart (VIZ-02)

- `HistogramChart` Web Component extending BaseChart
- `createHistogramBins(values, binCount)` helper function for binning data
- Gradient bar colors: red (low values) through yellow to green (high values)
- Histogram styling: barPercentage=1, categoryPercentage=1 (no gaps)
- Compact currency formatting for bin range labels ($1.2M - $1.5M)

### Margin Call Probability Chart (VIZ-05)

- `MarginCallChart` Web Component extending BaseChart
- Risk-based color coding:
  - 0-5%: green (low risk)
  - 5-15%: yellow (moderate)
  - 15-30%: orange (elevated)
  - 30%+: red (high risk)
- Optional cumulative probability line overlay
- Mixed chart type (bar + line) when cumulative data provided

### BBD Comparison Chart (VIZ-07)

- `BBDComparisonChart` Web Component extending BaseChart
- `BBDComparisonChartData` interface for typed data
- Grouped bars: BBD (blue) vs Sell (gray)
- Custom afterDraw plugin for advantage annotation:
  - Shows "+$600,000 BBD Advantage" text
  - Draws dashed bracket connecting bar tops
- Tooltip shows breakdown with taxes and loan details

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed donut-chart type error**
- **Found during:** Task 1
- **Issue:** `getChartConfig()` return type didn't match doughnut-specific options (cutout property)
- **Fix:** Return type already updated to `DoughnutChartConfiguration`
- **Files modified:** src/charts/donut-chart.ts
- **Commit:** 3c9e38c

**2. [Rule 3 - Blocking] Fixed sbloc-balance-chart readonly array type**
- **Found during:** Task 2
- **Issue:** LINE_STYLES arrays were readonly tuples but assigned to mutable number[]
- **Fix:** Added explicit `as number[]` type assertions
- **Files modified:** src/charts/sbloc-balance-chart.ts
- **Commit:** d8d3402

**3. [Rule 3 - Blocking] Fixed correlation-heatmap type errors**
- **Found during:** Task 2
- **Issue:** ctx parameter implicit any, getCenterPoint not on Element type
- **Fix:** Added ScriptableContext type, cast element for getCenterPoint access
- **Files modified:** src/charts/correlation-heatmap.ts
- **Commit:** d8d3402

## Verification Results

- [x] npm run build succeeds without errors
- [x] tsc --noEmit passes
- [x] All three chart components registered as custom elements
- [x] Charts extend BaseChart properly

## Next Phase Readiness

Ready for remaining Phase 6 plans:
- 06-04: Specialized charts (waterfall, gauge)
- 06-05: Chart integration utilities

All bar chart components follow established BaseChart pattern and are exported via charts module barrel.
