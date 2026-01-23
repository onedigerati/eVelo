---
phase: quick
plan: 007
subsystem: ui-components
tags: [portfolio, visualization, dashboard, donut-chart, chart.js]
depends_on:
  requires: [quick-006]
  provides: [portfolio-viz-card-component, full-width-portfolio-section]
  affects: [results-dashboard]
tech-stack:
  added: []
  patterns: [portfolio-viz-card]
key-files:
  created:
    - src/components/ui/portfolio-viz-card.ts
  modified:
    - src/components/ui/results-dashboard.ts
decisions:
  - "Dedicated portfolio-viz-card component for reusable donut+bars display"
  - "Full width layout for both Portfolio Composition and Asset Correlations"
  - "PORTFOLIO_COLORS constant for consistent asset coloring across dashboard"
metrics:
  duration: 3 min
  completed: 2026-01-22
---

# Quick 007: Replace Portfolio Composition Layout Summary

**One-liner:** Replaced dashboard Portfolio Composition section with donut+bars card and made Asset Correlations full width.

## What Was Done

### Task 1: Create portfolio-viz-card component
Created a new reusable `portfolio-viz-card` component that displays:
- Light teal card background (#f0fdfa) with teal border (#99f6e4)
- Header with pie chart icon, "Portfolio Composition" title, and asset count subtitle
- 120x120px donut chart with 70% cutout and center "N ASSETS" text
- Horizontal asset bars sorted by weight descending with color swatches

The component receives data via a `data` property with the `PortfolioVizCardData` interface and properly cleans up Chart.js instances on disconnect.

### Task 2: Update results-dashboard to use portfolio-viz-card
- Added import for `portfolio-viz-card` component
- Added `PORTFOLIO_COLORS` constant (10 colors) for consistent asset coloring
- Replaced the old `<donut-chart>` section with `<portfolio-viz-card>` (full width)
- Updated Asset Correlations section to full width
- Added CSS rule for `.portfolio-viz-section`
- Updated `updateCharts()` to populate portfolio-viz-card with asset data including names from preset lookup
- Removed unused `DonutChartData` import

## Commits

| Hash | Type | Message |
|------|------|---------|
| 0a6136f | feat | create portfolio-viz-card component for donut + bars display |
| 09cb38f | feat | replace Portfolio Composition with portfolio-viz-card in dashboard |

## Verification

- [x] Build compiles without errors
- [x] Portfolio Composition card has teal background
- [x] Donut chart shows with center "N ASSETS" label
- [x] Horizontal bars sorted by weight with color swatches
- [x] Portfolio Composition spans full width of dashboard
- [x] Asset Correlations appears below Portfolio Composition
- [x] Asset Correlations spans full width

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

### Created
- `src/components/ui/portfolio-viz-card.ts` - New 318-line component

### Modified
- `src/components/ui/results-dashboard.ts`
  - Added portfolio-viz-card import
  - Added PORTFOLIO_COLORS constant
  - Changed Portfolio Composition from donut-chart to portfolio-viz-card
  - Changed Asset Correlations to full width
  - Updated updateCharts() method
  - Removed unused DonutChartData import
