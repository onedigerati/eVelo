---
phase: 15
plan: 04
subsystem: visualization
tags: [fix, correlation-heatmap, estimate-labeling, ux, gap-closure]
requires:
  - 14-GAP-FINDINGS.md (VIZ-04)
provides:
  - Clear labeling of estimated values in correlation heatmap
  - isEstimate flag in HeatmapData interface
  - Visual distinction for fallback values
affects:
  - User trust in displayed data
  - Correlation heatmap clarity
tech-stack:
  patterns: [data-metadata-pairing, visual-indicator]
key-files:
  modified:
    - src/components/ui/results-dashboard.ts
    - src/charts/types.ts
    - src/charts/correlation-heatmap.ts
decisions:
  - Use "(est)" suffix for estimated values instead of separate column
  - Apply italic styling with slight opacity reduction for visual distinction
  - Add explanation note dynamically when estimates are present
metrics:
  duration: 9 min
  completed: 2026-01-22
---

# Phase 15 Plan 04: Fix Correlation Heatmap Misleading Fallback Values Summary

**One-liner:** Added (est) suffix and visual styling to correlation heatmap cells showing fallback estimates (8%/16%) instead of calculated values.

## What Was Done

### Task 1: Update calculateAssetStatistics to return estimate flags
- **File:** `src/components/ui/results-dashboard.ts`
- **Note:** This was already completed in a previous plan (the function already returns isEstimate array)
- Function signature already includes `isEstimate: boolean[]` in return type
- Returns `true` for assets without preset data, `false` for calculated values

### Task 2: Update heatmap data binding to include estimate flags
- **File:** `src/components/ui/results-dashboard.ts`
- **Line 788:** Added `isEstimate: assetStats.isEstimate` to heatmap data binding
- Heatmap component now receives metadata about which values are estimates

### Task 3: Update HeatmapData type and correlation-heatmap display
- **File:** `src/charts/types.ts`
  - Added `isEstimate?: boolean[]` to HeatmapData interface
- **File:** `src/charts/correlation-heatmap.ts`
  - Destructured `isEstimate` from data in updateDisplay method
  - Added CSS class `.estimated` for italic styling with 85% opacity
  - Added CSS class `.est-suffix` for smaller, faded "(est)" text
  - Modified body row generation to append "(est)" suffix when `isEstimate[row]` is true
  - Added dynamic note explaining "(est)" when any estimates are present

## Commits

| Hash | Type | Description |
|------|------|-------------|
| edc03e1 | fix | Add estimate indicators to correlation heatmap fallback values |

## Gap Closure

**VIZ-04 RESOLVED:**
- Severity: LOW
- Component: correlation-heatmap.ts, results-dashboard.ts, types.ts
- Issue: Fallback values (8% return, 16% volatility) were displayed without indication they are estimates

**Visual Changes:**
- Estimated values now display as: `8.00%(est)` instead of `8.00%`
- Estimated cells have italic text with slightly reduced opacity
- Note section explains: "(est) indicates estimated values using market average assumptions (8% return, 16% volatility) because historical data is unavailable for that asset."

**Impact:**
- Users can now distinguish between:
  - Calculated values: Based on actual historical preset data
  - Estimated values: Market average fallbacks used when data unavailable
- Improves transparency and user trust in displayed metrics

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```bash
# Verify isEstimate in HeatmapData type
grep -n "isEstimate" src/charts/types.ts
# Returns: 81:  isEstimate?: boolean[];

# Verify isEstimate passed to heatmap
grep -n "isEstimate: assetStats.isEstimate" src/components/ui/results-dashboard.ts
# Returns: 788:        isEstimate: assetStats.isEstimate,

# Verify (est) suffix logic
grep -n "est-suffix" src/charts/correlation-heatmap.ts
# Returns:
# 225:      .correlation-table .est-suffix {
# 333:        const estSuffix = isEst ? '<span class="est-suffix">(est)</span>' : '';

# Build verification
npm run build
# Completes successfully
```

## Files Changed

| File | Changes |
|------|---------|
| src/charts/types.ts | +2 lines (isEstimate field) |
| src/charts/correlation-heatmap.ts | +21 lines (CSS, logic, note) |
| src/components/ui/results-dashboard.ts | +1 line (data binding) |

## Phase 15 Completion Status

All 4 gaps from Phase 14 have been resolved:

| Gap | Severity | Status | Plan |
|-----|----------|--------|------|
| GAP-01 | HIGH | CLOSED (already fixed) | 15-01 |
| GAP-02 | MEDIUM | CLOSED | 15-02 |
| GAP-VIZ-07 | MEDIUM | CLOSED | 15-03 |
| VIZ-04 | LOW | CLOSED | 15-04 |

**Phase 15 is now complete.**
