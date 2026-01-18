---
phase: 04-sbloc-engine
plan: 02
subsystem: sbloc
tags: [sbloc, ltv, loan-to-value, margin-call, risk-monitoring, collateral]

dependency-graph:
  requires:
    - phase: 04-01
      provides: SBLOCConfig, SBLOCState, MarginCallEvent types for LTV and margin calculations
  provides:
    - calculateLTV: core loan-to-value ratio calculation
    - calculateMaxBorrowing: max borrowable amount from collateral
    - getEffectiveLTV: weighted average LTV for multi-asset portfolios
    - isWithinBorrowingLimit: safety check for additional borrowing
    - calculateAvailableCredit: remaining borrowing capacity
    - detectMarginCall: triggers MarginCallEvent when LTV >= maxLTV
    - isInWarningZone: detects elevated risk (maintenanceMargin <= LTV < maxLTV)
    - calculateMarginBuffer: distance to warning/margin call in dollars and percent
    - calculateDropToMarginCall: percentage portfolio drop tolerance
  affects:
    - 04-03 (liquidation/withdrawal logic will use margin call detection)
    - 04-04 (SBLOC state machine will coordinate LTV tracking and margin calls)
    - Phase 08 (UI will display LTV gauges, warning zones, margin buffers)

tech-stack:
  added: []
  patterns:
    - "Pure functions for all calculations (no mutations)"
    - "Recalculate LTV internally for accuracy vs cached state"
    - "Threshold math: portfolio = loan / targetLTV"
    - "Buffer calculations: positive = safe, negative = past threshold"

key-files:
  created:
    - src/sbloc/ltv.ts
    - src/sbloc/margin-call.ts
  modified:
    - src/sbloc/index.ts

key-decisions:
  - "Recalculate LTV in margin call functions rather than trusting cached currentLTV"
  - "Return Infinity for LTV when collateral is zero but loan exists (degenerate case)"
  - "Clamp available credit to 0 (never negative available credit)"
  - "MarginBuffer type with both dollar and percent metrics for UI flexibility"
  - "calculateDropToMarginCall returns negative when already past margin call threshold"

patterns-established:
  - "Threshold calculation pattern: threshold_portfolio = loan / target_ltv"
  - "Buffer pattern: buffer = current - threshold (positive = safe, negative = past)"
  - "Multi-asset LTV: weighted sum of (value * class_limit) / total_value"
  - "Type exports in barrel: separate type exports from value exports"

metrics:
  duration: 3 min
  completed: 2026-01-18
---

# Phase 04 Plan 02: LTV and Margin Call Detection Summary

**LTV calculation and margin call detection with weighted multi-asset portfolios and comprehensive risk buffer metrics**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-18T02:23:53Z
- **Completed:** 2026-01-18T02:26:30Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 1

## Accomplishments

- LTV calculation with edge case handling (zero collateral returns Infinity)
- Weighted average LTV for multi-asset portfolios (equity/bond/cash classes)
- Margin call detection that triggers at LTV >= maxLTV threshold
- Warning zone detection between maintenance margin and max LTV
- Comprehensive margin buffer metrics (dollars until warning, dollars until margin call, percent buffer)
- Drop tolerance calculation showing percentage portfolio can fall before margin call

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LTV calculation module** - `7dc446b` (feat)
2. **Task 2: Create margin call detection module** - `0791de3` (feat)

## Files Created/Modified

- `src/sbloc/ltv.ts` (242 lines) - LTV calculation, max borrowing, effective LTV, credit availability
- `src/sbloc/margin-call.ts` (270 lines) - Margin call detection, warning zone, buffer calculations
- `src/sbloc/index.ts` (41 lines) - Updated barrel export with LTV and margin call functions

## Decisions Made

1. **Recalculate LTV internally** - Functions like `detectMarginCall` and `isInWarningZone` recalculate LTV from loan/portfolio values rather than trusting the cached `currentLTV` in state. This ensures accuracy if state is stale.

2. **Return Infinity for zero collateral** - When loan exists but collateral is zero, `calculateLTV` returns `Infinity` to represent the degenerate case (effectively infinite leverage).

3. **Clamp available credit to zero** - `calculateAvailableCredit` returns `Math.max(0, available)` since negative available credit is meaningless (you can't borrow negative amounts).

4. **MarginBuffer with multiple metrics** - The `MarginBuffer` type provides both dollar amounts (for absolute terms) and percentage (for relative terms), giving UI flexibility in presentation.

5. **Negative buffer indicates past threshold** - `calculateDropToMarginCall` returns negative values when already past margin call (e.g., -0.077 means 7.7% over the limit), which is useful for severity indication.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification Results

- [x] `npm run build` succeeds without errors
- [x] `src/sbloc/ltv.ts` exports calculateLTV, calculateMaxBorrowing, getEffectiveLTV, isWithinBorrowingLimit, calculateAvailableCredit
- [x] `src/sbloc/margin-call.ts` exports detectMarginCall, isInWarningZone, calculateMarginBuffer, calculateDropToMarginCall
- [x] `margin-call.ts` imports and uses functions from `ltv.ts`
- [x] No TypeScript errors
- [x] LTV calculations match expected formulas:
  - 500k/1M = 0.50 (50% LTV)
  - maxBorrowing(1M, 0.65) = 650k
  - availableCredit with 400k loan, 1M portfolio, 0.65 LTV = 250k
- [x] Margin call triggers at LTV >= maxLTV
- [x] Warning zone correctly detected between maintenance and max

## Next Phase Readiness

- **Blockers:** None
- **Dependencies satisfied:** LTV and margin call detection ready
- **Ready for:** 04-03 (Liquidation and withdrawal logic can now use detectMarginCall, calculateLTV, calculateAvailableCredit)

---
*Phase: 04-sbloc-engine*
*Completed: 2026-01-18*
