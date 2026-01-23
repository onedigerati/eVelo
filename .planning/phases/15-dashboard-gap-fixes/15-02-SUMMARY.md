---
phase: 15
plan: 02
subsystem: simulation
tags: [monte-carlo, metrics, success-rate, gap-closure]
dependency-graph:
  requires: [14-GAP-FINDINGS]
  provides: [consistent-success-rate-definition]
  affects: [dashboard-metrics, simulation-output]
tech-stack:
  added: []
  patterns: [strict-comparison-operator]
key-files:
  created: []
  modified: [src/simulation/monte-carlo.ts]
decisions:
  - "Standardized on `>` (strictly greater) operator for success rate"
  - "Success = terminal value strictly above initial value (not at-or-above)"
metrics:
  duration: 2 min
  completed: 2026-01-22
---

# Phase 15 Plan 02: Fix Success Rate Definition Inconsistency Summary

Standardized success rate calculation to use `>` operator across codebase, matching documentation that defines success as "ending above the initial portfolio value."

## What Was Done

### Task 1: Fix success rate operator in calculateStatistics

**Changed in `src/simulation/monte-carlo.ts` line 331:**

Before:
```typescript
const successCount = values.filter(v => v >= initialValue).length;
```

After:
```typescript
const successCount = values.filter(v => v > initialValue).length;
```

### Task 2: Verify consistency and build

Verified both files now use the same operator:
- `monte-carlo.ts`: `v > initialValue` (line 331)
- `metrics.ts`: `terminalValues[i] > initialValue` (line 188)

Build completed successfully with no errors.

## Standardized Definition

**Success Rate Definition:**
> Success = terminal portfolio value is strictly greater than initial portfolio value

This aligns with:
1. JSDoc documentation: "Success is defined as ending above the initial portfolio value"
2. The semantic meaning of "above" (not "at or above")
3. CFA-standard interpretation: preserving principal means gaining value

## Gap Resolution

| Gap ID | Severity | Status | Resolution |
|--------|----------|--------|------------|
| GAP-02 | MEDIUM | FIXED | Changed `>=` to `>` in monte-carlo.ts |

## Impact Analysis

**Practical Impact:** Minimal. The probability of a terminal value being exactly equal to the initial value (e.g., $1,000,000.00000000) is effectively zero in Monte Carlo simulations with continuous distributions.

**Semantic Impact:** Significant. Code now correctly reflects documentation and matches the metrics module, eliminating confusion for future maintainers.

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File | Change |
|------|--------|
| `src/simulation/monte-carlo.ts` | Changed `>=` to `>` in success rate calculation |

## Commits

| Hash | Message |
|------|---------|
| 1172a58 | fix(15-02): standardize success rate to use strict greater-than operator |

## Verification Results

1. Grep for `>= initialValue` in monte-carlo.ts: **No matches found**
2. Grep for `> initialValue` in monte-carlo.ts: **Line 331 shows corrected operator**
3. Build status: **Passed**

## Next Phase Readiness

Ready for 15-03 (GAP-VIZ-07: Array indexing in updateComparisonLineChart).
