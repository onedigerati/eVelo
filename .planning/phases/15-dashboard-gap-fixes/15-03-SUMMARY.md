---
phase: 15
plan: 03
subsystem: visualization
tags: [fix, array-indexing, chart-data, gap-closure]
requires:
  - 14-GAP-FINDINGS.md (GAP-VIZ-07)
provides:
  - Correct array indexing in BBD comparison charts
  - Correct array indexing in SBLOC utilization chart
affects:
  - Visual comparison accuracy
  - BBD vs Sell net worth trajectory
  - SBLOC utilization percentile display
tech-stack:
  patterns: [array-index-vs-value]
key-files:
  modified:
    - src/components/ui/results-dashboard.ts
decisions:
  - Use idx (array index) instead of year (year value) for yearlyPercentiles access
metrics:
  duration: 6 min
  completed: 2026-01-22
---

# Phase 15 Plan 03: Fix Array Indexing in BBD Comparison Charts Summary

**One-liner:** Fixed GAP-VIZ-07 by changing yearlyPercentiles[year] to yearlyPercentiles[idx] in two chart update functions.

## What Was Done

### Task 1: Fix array indexing in updateComparisonLineChart
- **File:** `src/components/ui/results-dashboard.ts`
- **Line 1387:** Changed `yearlyPercentiles[year]` to `yearlyPercentiles[idx]`
- **Issue:** `year` contains the actual year number (1, 2, 3...) but `yearlyPercentiles` is a 0-indexed array
- **Fix:** Use `idx` which is the proper array index (0, 1, 2...)

### Task 2: Fix similar pattern in updateSBLOCUtilizationChart
- **File:** `src/components/ui/results-dashboard.ts`
- **Line 1499:** Changed `yearlyPercentiles[year]` to `yearlyPercentiles[idx]`
- **Same issue:** Using year value as index instead of array position

### Task 3: TypeScript compilation verification
- Build completed successfully after fixes
- No type errors related to array access
- Both functions now correctly access yearlyPercentiles data

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 962dbdd | fix | Correct array indexing in BBD comparison charts |

## Gap Closure

**GAP-VIZ-07 RESOLVED:**
- Severity: MEDIUM (HIGH PRIORITY)
- Component: results-dashboard.ts
- Functions fixed:
  - `updateComparisonLineChart()` - BBD vs Sell net worth trajectory
  - `updateSBLOCUtilizationChart()` - SBLOC utilization percentile bands

**Root Cause:**
The `years` array from `sblocTrajectory` contains year values (1, 2, 3...), not array indices. When iterating with `.map((year, idx) => ...)` or `for (let idx = 0; idx < years.length; idx++)`, the `year` variable holds the year number while `idx` holds the array position. Using `year` to index into `yearlyPercentiles[]` caused incorrect or undefined data access.

**Impact Before Fix:**
- BBD vs Sell comparison chart showed incorrect portfolio values
- SBLOC utilization chart showed incorrect utilization percentages
- Could cause undefined values or access wrong year's data

**Impact After Fix:**
- Charts now display correct data for each time period
- Array access properly aligned between SBLOC trajectory and yearly percentiles

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```bash
# Verify no instances of incorrect pattern remain
grep -n "yearlyPercentiles\[year\]" src/components/ui/results-dashboard.ts
# Returns: No matches found

# Verify corrected pattern exists
grep -n "yearlyPercentiles\[idx\]" src/components/ui/results-dashboard.ts
# Returns:
# 1388:      const portfolio = this._data!.yearlyPercentiles[idx]?.p50 || 0;
# 1500:      const yearData = this._data!.yearlyPercentiles[idx];

# Build verification
npm run build
# Completes successfully
```

## Files Changed

| File | Changes |
|------|---------|
| src/components/ui/results-dashboard.ts | 2 lines changed (year -> idx) |

## Next Steps

- GAP-VIZ-07: CLOSED
- Remaining gaps for Phase 15:
  - 15-04: VIZ-04 (LOW) - Fallback value labeling in correlation heatmap
