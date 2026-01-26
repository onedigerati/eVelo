---
phase: 20
plan: 03
subsystem: calculations
tags: [sell-strategy, success-rate, metrics, comparison]
dependency-graph:
  requires: [20-01]
  provides: [unified-success-rate-definition]
  affects: [20-04, 20-07]
tech-stack:
  patterns: [unified-metric-definition]
key-files:
  modified: [src/calculations/sell-strategy.ts]
decisions:
  - id: success-definition
    choice: "terminal > initial for both BBD and Sell"
    rationale: "Apples-to-apples comparison requires same success criteria"
metrics:
  duration: 2 min
  completed: 2026-01-24
---

# Phase 20 Plan 03: Unify Success Rate Definitions Summary

**One-liner:** Sell strategy success rate now uses same definition as BBD (terminal > initial) for fair comparison

## What Was Built

Updated the Sell strategy success rate calculation to use the identical definition as BBD strategy, addressing Risk Area #6 from the Phase 20 audit.

### Changes Made

1. **Success rate calculation** (lines 220-223):
   - Changed from: `scenarios.filter(s => !s.depleted)`
   - Changed to: `scenarios.filter(s => s.terminalValue > initialValue)`

2. **Depletion probability** now calculated separately (lines 225-227):
   - Still available as distinct risk metric
   - No longer coupled to success rate

3. **JSDoc documentation** on `successRate` field (lines 42-51):
   - Clarifies the stricter definition
   - Explains difference from "not depleted"

4. **Inline documentation block** (lines 106-136):
   - Table showing example outcomes
   - Historical context of the change
   - Explains why unified definition matters

## Technical Details

### Before (Inconsistent)

| Strategy | Success Definition | What It Measures |
|----------|-------------------|------------------|
| BBD | terminal > initial | Portfolio grew |
| Sell | !depleted | Portfolio survived |

### After (Unified)

| Strategy | Success Definition | What It Measures |
|----------|-------------------|------------------|
| BBD | terminal > initial | Portfolio grew |
| Sell | terminal > initial | Portfolio grew |

### Impact on Metrics

The new definition is **stricter** for Sell strategy:
- Old: Success if portfolio has any value remaining (e.g., $1 is "success")
- New: Success only if portfolio exceeds initial value

This means Sell success rates will be **lower** after this change, reflecting a more accurate comparison with BBD.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2d2d37f | fix | Unify success rate definition with BBD strategy |
| a87ab53 | docs | Add inline documentation explaining success rate definition |

## Verification

- [x] `npx tsc --noEmit` passes
- [x] Success rate uses `terminal > initial` (same as BBD in metrics.ts)
- [x] depletionProbability tracked separately
- [x] JSDoc updated
- [x] Inline documentation present

## Next Steps

- Plan 20-04: Add configurable cost basis (currently hardcoded at 40%)
- Plan 20-07: Expand scenario count from 9 to full distribution
