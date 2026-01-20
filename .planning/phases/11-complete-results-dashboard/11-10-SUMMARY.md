---
phase: 11
plan: 10
subsystem: results-dashboard
tags: [ui, components, table, percentiles, withdrawals]

dependency-graph:
  requires: ["11-03"]
  provides: ["YearlyAnalysisTable component", "calculateWithdrawals helper"]
  affects: ["11-12"]

tech-stack:
  added: []
  patterns: ["sticky header table", "color-coded values", "withdrawal projection"]

key-files:
  created:
    - src/components/ui/yearly-analysis-table.ts
  modified:
    - src/components/ui/results-dashboard.ts
    - src/components/ui/index.ts

decisions:
  - decision: "Include calculateWithdrawals helper in same file"
    why: "Keeps withdrawal calculation logic colocated with table component"
  - decision: "Use compact currency notation for values >= 1M"
    why: "Maintains readability in narrow columns"
  - decision: "3% annual withdrawal growth default"
    why: "Standard inflation-adjusted withdrawal growth assumption"

metrics:
  duration: 4 min
  completed: 2026-01-20
---

# Phase 11 Plan 10: Year-by-Year Analysis Table Summary

YearlyAnalysisTable component showing detailed year-by-year breakdown with withdrawals and net worth percentiles (P10-P90), sticky headers, and color-coded values.

## What Was Built

### 1. YearlyAnalysisTable Component (`yearly-analysis-table.ts`)

New web component displaying year-by-year financial projections:

**Layout:**
- Section header with chart icon and title "Year-by-Year Percentile Analysis"
- Scrollable table with sticky headers
- Columns: Year, Annual Withdrawal, Cumulative Withdrawal, P10/P25/P50/P75/P90 Net Worth

**Features:**
- Sticky header row (stays visible while scrolling)
- Scrollable body (max-height 500px with overflow)
- Color coding:
  - Green: positive net worth values
  - Red: negative net worth values
  - Teal highlight for median (P50) column
- Currency formatting with compact notation ($1.2M for large values)
- Alternating row backgrounds
- Hover highlighting

**Types:**
- `YearlyPercentileData`: Year with P10-P90 values
- `WithdrawalData`: Annual and cumulative withdrawal arrays
- `YearlyAnalysisTableProps`: Component input interface

### 2. Withdrawal Calculation Helper

`calculateWithdrawals()` function computing annual and cumulative withdrawals:
- Initial withdrawal amount
- Annual growth rate (default 3%)
- Time horizon in years
- Returns `{ annual: number[], cumulative: number[] }`

### 3. Dashboard Integration

Added yearly-analysis-table section to results-dashboard:
- Positioned at bottom of dashboard
- Uses current year as start year
- Calculates withdrawals from config with 3% growth
- Transforms yearly percentiles with calendar years

### 4. Component Export

Updated UI components barrel export with:
- `YearlyAnalysisTable` class
- Type exports: `YearlyAnalysisTableProps`, `YearlyPercentileData`, `WithdrawalData`
- Helper export: `calculateWithdrawals`

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Sticky header implementation | Uses CSS `position: sticky` with `top: 0` for thead |
| Compact currency notation | Values >= $1M use Intl notation for readability |
| Withdrawal growth default | 3% matches typical inflation adjustment |
| Color coding by sign | Positive green, negative red matches financial convention |

## Verification Results

- [x] `npm run build` succeeds (493.80 kB bundle)
- [x] Table displays all years (from yearlyPercentiles)
- [x] Withdrawals calculated correctly with growth
- [x] Percentile values available from simulation data
- [x] Color coding implemented (green/red for positive/negative)
- [x] Scrollable on long time horizons (max-height 500px)
- [x] Mobile horizontal scroll (min-width 800px table, overflow-x auto)

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/yearly-analysis-table.ts` | Created - new component |
| `src/components/ui/results-dashboard.ts` | Added section and update method |
| `src/components/ui/index.ts` | Added exports |

## Commits

1. `feat(11-10): create YearlyAnalysisTable component` - 2a29708
2. `feat(11-10): integrate yearly analysis table into dashboard` - 8a783dd
3. `feat(11-10): export YearlyAnalysisTable from UI components` - 6d943ad

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Plan 11-10 complete. Ready to proceed with:
- Plan 11-11: Enhanced Strategy Charts (BBD vs Sell comparison charts)
