---
phase: 11-complete-results-dashboard
plan: 09
subsystem: ui-tables
tags: [performance-table, return-probabilities, percentiles, twrr, cagr]
dependency-graph:
  requires: [11-03]
  provides: [performance-summary-table, return-probability-matrix, percentile-metrics]
  affects: [11-12, 11-13]
tech-stack:
  added: []
  patterns: [reusable-table-components, percentile-matrix-calculation, color-coded-values]
key-files:
  created:
    - src/calculations/return-probabilities.ts
    - src/components/ui/performance-table.ts
    - src/components/ui/return-probability-table.ts
  modified:
    - src/components/ui/results-dashboard.ts
    - src/components/ui/index.ts
    - src/calculations/index.ts
decisions:
  - id: "11-09-001"
    description: "Percentile-based volatility approximation for performance table"
    rationale: "Terminal values don't contain intermediate data; estimate volatility from return dispersion"
  - id: "11-09-002"
    description: "Time horizon extrapolation for return probabilities"
    rationale: "Use implied CAGR from terminal values to estimate shorter horizon returns"
metrics:
  duration: "5 min"
  completed: "2026-01-20"
---

# Phase 11 Plan 09: Performance Tables Summary

Performance summary and return probability tables for detailed numerical analysis.

## One-Liner

Performance tables showing TWRR/balance/volatility across P10-P90 and return probability matrix by threshold/horizon.

## What Was Built

### 1. Return Probability Calculations (`src/calculations/return-probabilities.ts`)

New calculation module providing three core functions:

```typescript
// Calculate probability of achieving return thresholds at each horizon
calculateReturnProbabilities(
  terminalValues: Float64Array | number[],
  initialValue: number,
  maxHorizon: number,
  thresholds?: number[],  // Default: [0, 0.025, 0.05, 0.075, 0.10, 0.125]
  horizons?: number[]     // Default: [1, 3, 5, 10, 15]
): ReturnProbabilities

// Calculate expected CAGR at each percentile across horizons
calculateExpectedReturns(
  terminalValues: Float64Array | number[],
  initialValue: number,
  maxHorizon: number,
  horizons?: number[]
): ExpectedReturns

// Calculate performance summary data for table
calculatePerformanceSummary(
  terminalValues: Float64Array | number[],
  initialValue: number,
  timeHorizon: number,
  inflationRate?: number  // Default: 2.5%
): PerformanceSummaryData
```

Types exported:
- `ReturnProbabilities` - Threshold/horizon probability matrix
- `ExpectedReturns` - Percentile/horizon CAGR matrix
- `PerformanceRow` - Single metric row with P10-P90 values
- `PerformanceSummaryData` - All 6 metrics for table

### 2. PerformanceTable Component (`src/components/ui/performance-table.ts`)

Web component displaying performance metrics across percentiles:

| Metric | P10 | P25 | P50 | P75 | P90 |
|--------|-----|-----|-----|-----|-----|
| TWRR (nominal) | 4.83% | 9.23% | 15.85% | 18.12% | 22.70% |
| TWRR (real) | 2.27% | 6.57% | 13.02% | 15.24% | 19.70% |
| Portfolio End Balance (nominal) | $5.9M | $17.6M | $32.9M | $54.5M | $83.4M |
| Portfolio End Balance (real) | $4.1M | $12.2M | $22.7M | $37.6M | $57.6M |
| Annual Mean Return | 8.47% | 10.30% | 16.98% | 19.25% | 23.58% |
| Annualized Volatility | 26.20% | 15.01% | 15.96% | 15.95% | 15.44% |

Features:
- Color-coded values (green for positive returns, red for negative)
- Alternating row backgrounds with hover states
- Responsive horizontal scroll on mobile
- Explanatory note about TWRR and inflation adjustment

### 3. ReturnProbabilityTable Component (`src/components/ui/return-probability-table.ts`)

Two-section table component:

**Expected Annual Return Table:**
| Percentile | 1 Year | 3 Years | 5 Years | 10 Years | 15 Years |
|------------|--------|---------|---------|----------|----------|
| 10th | 12.63% | -9.07% | -8.51% | -3.58% | 4.83% |
| 25th | 1.26% | 4.64% | 7.78% | 11.93% | 9.23% |
| 50th | 8.56% | 19.03% | 13.83% | 13.60% | 15.85% |
| ... | ... | ... | ... | ... | ... |

**Annual Return Probabilities Table:**
| Return | 1 Year | 3 Years | 5 Years | 10 Years | 15 Years |
|--------|--------|---------|---------|----------|----------|
| >= 0.00% | 84.81% | 90.85% | 92.46% | 92.40% | 95.84% |
| >= 2.50% | 81.25% | 88.01% | 89.71% | 90.51% | 92.64% |
| >= 5.00% | 77.19% | 84.10% | 86.22% | 88.78% | 88.87% |
| ... | ... | ... | ... | ... | ... |

Features:
- Color-coded returns by magnitude (darker green = higher)
- All probability values in green with intensity by confidence
- Responsive horizontal scroll on mobile
- Explanatory notes for each table

### 4. Dashboard Integration

Modified `results-dashboard.ts` to:
- Import new components and calculation functions
- Add `<performance-table>` section after strategy analysis
- Add `<return-probability-table>` section for returns/probabilities
- Implement `updatePerformanceTable()` method
- Implement `updateReturnProbabilityTable()` method

## Commits

| Hash | Description |
|------|-------------|
| 320ba85 | feat(11-09): add return probability calculations |
| e6fea48 | feat(11-09): add PerformanceTable web component |
| fa15a75 | feat(11-09): add ReturnProbabilityTable web component |
| 77f6648 | feat(11-09): integrate performance tables into results dashboard |
| 19c85dc | feat(11-09): export performance table components and calculations |

## Technical Decisions

### 11-09-001: Percentile-Based Volatility Approximation

**Context:** Need to show volatility across percentiles but only have terminal values, not intermediate path data.

**Decision:** Estimate volatility from terminal value return dispersion. Calculate each simulation's implied CAGR, then measure deviation from median as proxy for volatility.

**Trade-off:** Approximation vs accurate path-based volatility. Acceptable for summary table purposes.

### 11-09-002: Time Horizon Extrapolation

**Context:** Simulation runs for N years (e.g., 30), but table shows shorter horizons (1, 3, 5 years).

**Decision:** Use implied CAGR from terminal values and assume consistent performance across horizons. Apply volatility adjustment for shorter periods (wider dispersion).

**Rationale:** Reasonable approximation for Monte Carlo analysis. A 30-year simulation achieving 8% CAGR likely had similar performance at intermediate points.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] `npm run build` succeeds
- [x] Performance table shows all 6 metrics
- [x] Return probability tables display correctly
- [x] Color coding works (green/red for returns, green intensity for probabilities)
- [x] Mobile horizontal scroll works
- [x] Note text present in both tables

## Next Phase Readiness

**Ready for:** Plans 11-11 (Enhanced Strategy Charts) and 11-12 (Recommendations)

**Dependencies satisfied:**
- Performance calculations available for insights generation
- Return probabilities can inform recommendation logic

**No blockers identified.**
