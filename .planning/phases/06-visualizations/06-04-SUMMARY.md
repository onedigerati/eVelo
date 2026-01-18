---
phase: 06-visualizations
plan: 04
subsystem: charts
tags: [donut-chart, heatmap, correlation, portfolio, chart.js, matrix]

dependency-graph:
  requires: ["06-01"]
  provides: ["donut-chart-component", "correlation-heatmap-component"]
  affects: ["07-ui-shell"]

tech-stack:
  added: []
  patterns: ["chartjs-chart-matrix", "diverging-color-scale", "golden-angle-colors"]

key-files:
  created:
    - src/charts/donut-chart.ts
    - src/charts/correlation-heatmap.ts
  modified:
    - src/charts/index.ts

decisions:
  - id: "D-0604-01"
    summary: "Golden angle color generation for >5 assets"
    context: "Need unlimited colors for portfolios with many assets"
    choice: "Use 137.5 degree HSL rotation"
    rationale: "Maximizes visual distinction between adjacent colors"

metrics:
  duration: "2 min"
  completed: "2026-01-17"
---

# Phase 06 Plan 04: Portfolio and Correlation Charts Summary

Portfolio donut chart with dynamic coloring and correlation heatmap with diverging color scale.

## What Was Built

### Task 1: Portfolio Donut Chart Component
Created DonutChart Web Component for portfolio composition visualization.

**Features:**
- Doughnut chart with 60% cutout creating donut appearance
- Default color palette for up to 5 assets (blue, green, red, purple, orange)
- Golden angle color generation for portfolios with more than 5 assets
- Legend at bottom showing asset names with percentages
- Tooltip displaying allocation on hover
- Center text plugin drawing "Portfolio" in donut hole
- Dynamic data updates via property setter

**Implementation:**
- Extends BaseChart for Shadow DOM and lifecycle management
- Uses Chart.js doughnut type with custom configuration
- Custom legend label generator calculates percentages
- afterDraw plugin for center text rendering

### Task 2: Correlation Heatmap Component
Created CorrelationHeatmap Web Component for asset correlation matrix visualization.

**Features:**
- Matrix chart using chartjs-chart-matrix plugin
- Diverging color scale: red (negative) to white (zero) to blue (positive)
- Cell labels showing correlation values (e.g., "0.75")
- Contrast-aware text color (dark on light, light on dark backgrounds)
- Tooltip showing "Asset A vs Asset B: X.XX"
- Category scales on both axes with labels

**Color Scale:**
- -1.0: #dc2626 (red - strong negative correlation)
- -0.5: #fca5a5 (light red)
-  0.0: #ffffff (white - no correlation)
- +0.5: #93c5fd (light blue)
- +1.0: #2563eb (blue - strong positive correlation)

**Implementation:**
- Extends BaseChart for Shadow DOM and lifecycle management
- Registers MatrixController and MatrixElement from chartjs-chart-matrix
- interpolateColor helper for correlation to color conversion
- afterDatasetsDraw plugin for cell value labels
- Brightness calculation for text contrast

### Task 3: Module Exports
Updated charts/index.ts barrel export.

**Exports added:**
- DonutChart class and component
- CorrelationHeatmap class and interpolateColor helper

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7452a14 | feat | create portfolio donut chart component |
| d8d3402 | feat | create correlation heatmap (via 06-03) |
| 66b5a8a | chore | update module exports (via 06-03) |

## Verification

- [x] npm run build succeeds without errors
- [x] tsc --noEmit passes
- [x] Both chart components registered as custom elements
- [x] Heatmap uses chartjs-chart-matrix correctly
- [x] Charts extend BaseChart properly
- [x] donut-chart.ts: 230 lines (min 70)
- [x] correlation-heatmap.ts: 305 lines (min 80)

## Deviations from Plan

None - plan executed exactly as written.

Note: Some commits were interleaved with parallel plan execution (06-02, 06-03, 06-04 wave). The correlation-heatmap and exports were committed as part of 06-03 plan execution, which already included these components to fix blocking type errors.

## Files

```
src/charts/
  donut-chart.ts       (230 lines) - Portfolio composition visualization
  correlation-heatmap.ts (305 lines) - Asset correlation matrix
  index.ts             (19 lines) - All 8 chart exports
```

## Component Usage

### Donut Chart
```html
<donut-chart></donut-chart>
```
```javascript
const chart = document.querySelector('donut-chart');
chart.data = {
  segments: [
    { label: 'Stocks', value: 60 },
    { label: 'Bonds', value: 30 },
    { label: 'Cash', value: 10 }
  ]
};
```

### Correlation Heatmap
```html
<correlation-heatmap></correlation-heatmap>
```
```javascript
const heatmap = document.querySelector('correlation-heatmap');
heatmap.data = {
  labels: ['Stocks', 'Bonds', 'REITs'],
  matrix: [
    [1.0, -0.3, 0.6],
    [-0.3, 1.0, 0.2],
    [0.6, 0.2, 1.0]
  ]
};
```

## Phase 6 Completion Status

All visualization requirements now covered:
- VIZ-01: Probability cone chart (06-02)
- VIZ-02: SBLOC balance chart (06-02)
- VIZ-03: Portfolio donut chart (06-04)
- VIZ-04: Correlation heatmap (06-04)
- VIZ-05: Histogram chart (06-03)
- VIZ-06: Margin call chart (06-03)
- VIZ-07: BBD comparison chart (06-03)
