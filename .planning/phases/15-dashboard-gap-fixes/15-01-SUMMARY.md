---
phase: 15
plan: 01
subsystem: simulation
tags: [monte-carlo, percentile, statistics, gap-closure]
dependency-graph:
  requires: [14-GAP-FINDINGS]
  provides: [correct-percentile-calculations]
  affects: [probability-cone, sbloc-utilization, all-percentile-displays]
tech-stack:
  added: []
  patterns: [0-100-percentile-scale]
key-files:
  created: []
  modified: [src/simulation/monte-carlo.ts]
decisions:
  - "Percentile function uses 0-100 scale (not 0-1)"
  - "All 13 percentile calls corrected from 0.1/0.25/0.5/0.75/0.9 to 10/25/50/75/90"
metrics:
  duration: 0 min (already fixed)
  completed: 2026-01-22
---

# Phase 15 Plan 01: Fix Percentile Scale Mismatch Summary

Corrected all percentile function calls in monte-carlo.ts to use the 0-100 scale expected by the statistics module.

## What Was Done

### Pre-execution Discovery

Upon execution, discovered that GAP-01 was **already fixed** in commit `1172a58` during the 15-02 plan execution. The commit message focused on GAP-02 (success rate operator) but the diff shows all 13 percentile scale corrections were included.

### Verification of Fix

All success criteria verified as complete:

1. **No instances of `percentile(*, 0.X)` in monte-carlo.ts** - Confirmed via grep
2. **All percentile calls use 10, 25, 50, 75, 90 values** - Confirmed (13 instances)
3. **Build completes without errors** - Confirmed
4. **Pattern matches metrics.ts lines 151-155** - Confirmed

### Corrected Call Sites (13 total)

| Location | Line | Before | After |
|----------|------|--------|-------|
| loanBalance.p10 | 223 | `percentile(yv, 0.1)` | `percentile(yv, 10)` |
| loanBalance.p25 | 224 | `percentile(yv, 0.25)` | `percentile(yv, 25)` |
| loanBalance.p50 | 225 | `percentile(yv, 0.5)` | `percentile(yv, 50)` |
| loanBalance.p75 | 226 | `percentile(yv, 0.75)` | `percentile(yv, 75)` |
| loanBalance.p90 | 227 | `percentile(yv, 0.9)` | `percentile(yv, 90)` |
| cumulativeInterest.medianLoan | 243 | `percentile(yv, 0.5)` | `percentile(yv, 50)` |
| estateAnalysis.medianLoan | 254 | `percentile(..., 0.5)` | `percentile(..., 50)` |
| calculateStatistics.median | 335 | `percentile(values, 0.5)` | `percentile(values, 50)` |
| calculateYearlyPercentiles.p10 | 349 | `percentile(values, 0.1)` | `percentile(values, 10)` |
| calculateYearlyPercentiles.p25 | 350 | `percentile(values, 0.25)` | `percentile(values, 25)` |
| calculateYearlyPercentiles.p50 | 351 | `percentile(values, 0.5)` | `percentile(values, 50)` |
| calculateYearlyPercentiles.p75 | 352 | `percentile(values, 0.75)` | `percentile(values, 75)` |
| calculateYearlyPercentiles.p90 | 353 | `percentile(values, 0.9)` | `percentile(values, 90)` |

## Gap Resolution

| Gap ID | Severity | Status | Resolution |
|--------|----------|--------|------------|
| GAP-01 | HIGH | FIXED | All 13 percentile calls corrected in monte-carlo.ts |

## Impact Analysis

**Before Fix:**
- All percentile calculations returned values near the minimum of the distribution
- P10/P25/P50/P75/P90 values were essentially identical (all near P0)
- Dashboard displayed nonsensical "percentile" values

**After Fix:**
- Percentile calculations correctly return P10 < P25 < P50 < P75 < P90 values
- Probability cone chart shows realistic wealth distribution
- SBLOC utilization bands display correctly
- All percentile-based metrics reflect true distribution

## Technical Root Cause

The `percentile()` function in `src/math/statistics.ts` (line 74) documents:
```typescript
@param p - Percentile value (0-100, not 0-1)
```

But monte-carlo.ts was passing decimal values (0.1, 0.5, 0.9) as if the parameter expected the 0-1 scale.

## Deviations from Plan

**Deviation 1: Fix already applied**

The fix was applied during 15-02 plan execution, included in commit `1172a58` alongside the GAP-02 fix. This plan execution verified the fix rather than applying it.

This is acceptable because:
- The work is complete and correct
- Both gaps were identified in the same file
- Combining fixes in one commit is reasonable

## Files Modified

| File | Change |
|------|--------|
| `src/simulation/monte-carlo.ts` | 13 percentile calls corrected (0.X -> X0 scale) |

## Commits

| Hash | Message | Notes |
|------|---------|-------|
| 1172a58 | fix(15-02): standardize success rate to use strict greater-than operator | Also includes GAP-01 fix |

## Verification Results

1. Grep for `percentile(.*0\.` in monte-carlo.ts: **No matches found**
2. Grep for `percentile(.*[0-9][0-9])` in monte-carlo.ts: **13 matches found (all correct)**
3. Build status: **Passed**
4. Pattern consistency with metrics.ts: **Confirmed**

## Next Phase Readiness

Ready for 15-03 (GAP-VIZ-07: Array indexing in updateComparisonLineChart).
