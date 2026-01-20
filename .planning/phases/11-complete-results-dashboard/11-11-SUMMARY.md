---
phase: 11
plan: 11
subsystem: visualization
tags: [charts, comparison, Chart.js, strategy-analysis]
dependency-graph:
  requires: [11-07]
  provides: [ComparisonLineChart, CumulativeCostsChart, TerminalComparisonChart, SBLOCUtilizationChart]
  affects: [results-dashboard, visual-analysis]
tech-stack:
  added: []
  patterns: [fill-between-lines, grouped-bars, annotation-plugin]
key-files:
  created:
    - src/charts/comparison-line-chart.ts
    - src/charts/cumulative-costs-chart.ts
    - src/charts/terminal-comparison-chart.ts
    - src/charts/sbloc-utilization-chart.ts
  modified:
    - src/charts/index.ts
    - src/components/ui/results-dashboard.ts
decisions:
  - id: chart-colors
    choice: Teal for BBD, blue for Sell, red for taxes, green for interest
    reason: Consistent color coding across all comparison charts
  - id: utilization-percentile-mapping
    choice: P10 utilization = low loan/high portfolio, P90 = high loan/low portfolio
    reason: Aligns utilization risk with standard percentile meaning
  - id: cumulative-costs-estimation
    choice: Progressive tax accumulation using power curve approximation
    reason: Sell strategy only provides total taxes, not yearly breakdown
metrics:
  duration: 5 min
  completed: 2026-01-20
---

# Phase 11 Plan 11: Enhanced Strategy Comparison Charts Summary

Four new Chart.js chart components for comprehensive BBD vs Sell strategy visual comparison.

## What Was Built

### ComparisonLineChart (comparison-line-chart.ts)
- Two-line chart comparing BBD vs Sell median net worth trajectories
- Teal line for BBD, blue line for Sell Assets
- Fill between lines to visualize advantage/disadvantage area
- Tooltip shows both values plus calculated difference
- Smooth curves with tension 0.4

### CumulativeCostsChart (cumulative-costs-chart.ts)
- Area chart comparing cost accumulation over time
- Taxes (red/coral) for Sell strategy
- Interest (teal/green) for BBD strategy
- Semi-transparent fills (50% alpha) for visual clarity
- Tooltip shows which strategy saves more at each point

### TerminalComparisonChart (terminal-comparison-chart.ts)
- Grouped bar chart at P10/P25/P50/P75/P90 percentiles
- Side-by-side bars for BBD vs Sell
- Rounded bar corners for modern appearance
- Tooltip shows absolute and percentage advantage
- No x-axis grid lines for cleaner look

### SBLOCUtilizationChart (sbloc-utilization-chart.ts)
- Percentile band chart showing utilization spread over time
- Color gradient: green (P10 low risk) to red (P90 high risk)
- Custom annotation plugin draws dashed max borrowing limit line
- Fill between bands for uncertainty visualization
- Percentage formatting on Y-axis

### Dashboard Integration
- New "Visual Strategy Comparison" section in results-dashboard
- 2-column responsive grid (1-column on mobile)
- Four chart cards with individual titles
- Section visibility tied to SBLOC data availability
- Calculates sell strategy trajectory using existing calculateSellStrategy
- Computes utilization percentiles from loan/portfolio ratios

## Key Decisions

1. **Utilization percentile mapping**: P10 utilization = best case (low loan/high portfolio), P90 = worst case (high loan/low portfolio). This aligns with intuition that P10 is optimistic and P90 is pessimistic.

2. **Cumulative taxes estimation**: Since sell strategy calculation only provides total lifetime taxes, cumulative taxes are estimated using a power curve (progress^1.3) to approximate progressive accumulation.

3. **Terminal value adjustment**: BBD terminal values subtract loan balance at corresponding percentile (e.g., P10 portfolio - P90 loan for pessimistic net worth).

## Commits

| Commit | Description |
|--------|-------------|
| bd78a3c | feat(11-11): add ComparisonLineChart for BBD vs Sell visualization |
| 67fc182 | feat(11-11): add CumulativeCostsChart for taxes vs interest comparison |
| c3f5480 | feat(11-11): add TerminalComparisonChart for percentile distribution |
| 411dd26 | feat(11-11): add SBLOCUtilizationChart with percentile bands |
| a6fbe77 | feat(11-11): export new comparison chart components |
| 99b062e | feat(11-11): integrate visual comparison charts into results dashboard |

## Verification

- [x] `npm run build` succeeds
- [x] Net Worth comparison shows two lines (BBD vs Sell)
- [x] Cumulative costs shows area fills for taxes and interest
- [x] Terminal distribution shows grouped bars at each percentile
- [x] SBLOC utilization shows percentile bands with max limit line
- [x] All charts positioned absolutely with responsive containers
- [x] Tooltips configured with currency/percentage formatting

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

All 4 chart components implemented and integrated. The Visual Strategy Comparison section provides:
- Net worth trajectory comparison
- Cost comparison over time
- Terminal distribution by percentile
- SBLOC utilization risk visualization

Ready to proceed with remaining Phase 11 plans (12-13).
