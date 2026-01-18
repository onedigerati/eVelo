---
phase: 06-visualizations
plan: 02
subsystem: charts
tags: [chart.js, line-charts, web-components, visualization]
dependency-graph:
  requires: [06-01]
  provides: [probability-cone-chart, sbloc-balance-chart]
  affects: [06-05, 07-xx]
tech-stack:
  added: []
  patterns: [percentile-band-visualization, multi-line-chart]
key-files:
  created:
    - src/charts/probability-cone-chart.ts
    - src/charts/sbloc-balance-chart.ts
  modified:
    - src/charts/index.ts
decisions:
  - id: line-fill-strategy
    choice: "Use fill: '-1' to fill between adjacent percentile datasets"
    reason: "Chart.js fill property creates smooth bands between lines"
metrics:
  duration: 4 min
  completed: 2026-01-17
---

# Phase 06 Plan 02: Line Charts Summary

**One-liner:** Probability cone and SBLOC balance line charts using Chart.js with percentile band visualization and multi-series support.

## What Was Built

### 1. Probability Cone Chart Component
- **File:** `src/charts/probability-cone-chart.ts` (245 lines)
- Web Component extending BaseChart for percentile band visualization
- Displays P10/P25/P50/P75/P90 percentile lines with filled bands between them
- Color scheme: green (optimistic) -> blue (median) -> red (pessimistic)
- Currency formatting with Intl.NumberFormat compact notation
- Tooltip shows all percentile values at hovered year
- Registered as `<probability-cone-chart>` custom element

### 2. SBLOC Balance Chart Component
- **File:** `src/charts/sbloc-balance-chart.ts` (210 lines)
- Web Component extending BaseChart for multi-line time series
- Supports multiple datasets: loan balance, cumulative withdrawals, interest accrued
- Line styles: solid (primary), dashed (secondary), dotted (tertiary)
- Currency formatting for Y-axis labels
- Registered as `<sbloc-balance-chart>` custom element

### 3. Module Exports
- Added exports for both chart components in `src/charts/index.ts`
- Charts accessible via barrel import from charts module

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Band fill strategy | `fill: '-1'` between datasets | Chart.js fill property creates smooth bands between percentile lines |
| Alpha handling | Hex + alpha suffix | Convert CHART_ALPHA values to 2-digit hex suffix for transparency |
| Line style array | Typed as `number[]` | Avoid readonly inference that conflicts with Chart.js types |

## Verification Results

- [x] npm run build succeeds without errors
- [x] tsc --noEmit passes
- [x] Both chart components registered as custom elements
- [x] Charts extend BaseChart properly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed readonly array type error in LINE_STYLES**
- **Found during:** Task 2
- **Issue:** TypeScript inferred `as const` readonly arrays incompatible with Chart.js `borderDash: number[]`
- **Fix:** Explicitly type LINE_STYLES as `Record<string, number[]>`
- **Commit:** Part of sbloc-balance-chart creation

**Note:** The sbloc-balance-chart.ts was committed in a previous session as part of commit d8d3402. Task 2 implementation was already present in the codebase.

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| src/charts/probability-cone-chart.ts | Created | +245 |
| src/charts/sbloc-balance-chart.ts | Created | +210 |
| src/charts/index.ts | Modified | +6 |

## Commit History

| Commit | Message |
|--------|---------|
| 3d9da2c | feat(06-02): create probability cone chart component |
| d8d3402 | feat(06-03): create margin call probability chart (included sbloc-balance-chart) |
| 8a3edce | feat(06-02): add probability cone and SBLOC balance exports |

## Usage Examples

### Probability Cone Chart
```typescript
import { ProbabilityConeChart } from './charts';

const chart = document.querySelector('probability-cone-chart') as ProbabilityConeChart;
chart.data = {
  years: [0, 1, 2, 3, 4, 5],
  bands: {
    p10: [100000, 95000, 90000, 85000, 80000, 75000],
    p25: [100000, 102000, 105000, 108000, 110000, 115000],
    p50: [100000, 107000, 115000, 123000, 132000, 141000],
    p75: [100000, 112000, 125000, 140000, 157000, 175000],
    p90: [100000, 118000, 140000, 165000, 195000, 230000],
  }
};
```

### SBLOC Balance Chart
```typescript
import { SBLOCBalanceChart } from './charts';

const chart = document.querySelector('sbloc-balance-chart') as SBLOCBalanceChart;
chart.data = {
  labels: ['Year 0', 'Year 1', 'Year 2', 'Year 3'],
  datasets: [
    { label: 'Loan Balance', data: [0, 50000, 102500, 157600] },
    { label: 'Cumulative Withdrawals', data: [0, 50000, 100000, 150000] },
    { label: 'Interest Accrued', data: [0, 0, 2500, 7600] }
  ]
};
```

## Next Phase Readiness

**Ready for:**
- 06-03: Histogram and bar charts (already completed in parallel)
- 06-04: Donut chart for portfolio composition (already completed)
- 06-05: Chart container component integrating all chart types

**Dependencies satisfied:**
- BaseChart infrastructure from 06-01
- Chart type definitions from 06-01
- Line chart components ready for portfolio visualization
