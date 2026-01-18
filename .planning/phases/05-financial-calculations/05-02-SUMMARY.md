---
phase: 05-financial-calculations
plan: 02
subsystem: calculations
tags: [twrr, margin-call, probability, cfa-standard, time-weighted-return]

# Dependency graph
requires:
  - phase: 05-01
    provides: Core metrics types (TWRRResult, MarginCallProbability)
  - phase: 03-simulation-engine
    provides: YearlyPercentiles type for TWRR input
  - phase: 04-sbloc-engine
    provides: MarginCallEvent type for probability analysis
provides:
  - TWRR calculation (CFA-standard time-weighted returns)
  - Margin call probability by year with cumulative tracking
  - Period return chaining and annualization utilities
affects:
  - 05-03 (estate analysis may use TWRR)
  - 05-04 (salary equivalent may reference margin call risk)
  - 06-visualization (charts displaying margin call probability by year)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function pattern for financial calculations
    - Geometric return linking for TWRR
    - Monotonically increasing cumulative probability

key-files:
  created:
    - src/calculations/twrr.ts
    - src/calculations/margin-call-probability.ts
  modified: []

key-decisions:
  - "Use median (p50) for TWRR calculation as representative outcome"
  - "Cumulative probability enforces monotonic increase via Math.max"
  - "Return NaN for invalid inputs (zero/negative start values)"
  - "Empty array handling returns zero return (no periods)"

patterns-established:
  - "CFA-standard TWRR formula: geometric linking of period returns"
  - "Iteration-based counting for margin call probability (not event-based)"
  - "First-call-year tracking for accurate cumulative probability"

# Metrics
duration: 3min
completed: 2026-01-17
---

# Phase 5 Plan 2: TWRR and Margin Call Probability Summary

**CFA-standard TWRR calculation with geometric return linking, plus per-year margin call probability analysis with cumulative risk tracking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-17
- **Completed:** 2026-01-17
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- Time-Weighted Rate of Return (TWRR) calculation using CFA-standard methodology
- Period return calculation with proper edge case handling
- Geometric return chaining for cumulative returns
- Annualization of total returns to per-period rates
- Margin call event aggregation from simulation results
- Per-year margin call probability calculation
- Cumulative margin call probability with monotonic guarantee

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TWRR calculation** - `96890bf` (feat)
2. **Task 2: Create margin call probability by year** - `5bc9eed` (feat)

## Files Created

- `src/calculations/twrr.ts` - Time-weighted rate of return calculations
  - calculatePeriodReturn: Single-period return formula
  - chainReturns: Geometric linking of period returns
  - annualizeReturn: Convert cumulative to annualized rate
  - calculateTWRR: Main entry point from yearly percentiles

- `src/calculations/margin-call-probability.ts` - Margin call risk analysis
  - aggregateMarginCallEvents: Count events per year from simulation runs
  - calculateMarginCallProbability: Convert counts to percentages
  - calculateMarginCallRisk: Main entry point for external callers

## Decisions Made

- **Use median (p50) for TWRR:** Represents typical simulation outcome, more robust than mean to outliers
- **Monotonic cumulative probability:** Use Math.max to ensure cumulative never decreases even with data gaps
- **NaN for invalid inputs:** Return NaN when startValue <= 0 or periods <= 0 (signals invalid calculation)
- **Iteration-based counting:** Count iterations with margin calls, not total events (one iteration can have multiple calls)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TWRR calculation ready for visualization layer
- Margin call probability ready for risk charts
- Both modules integrate with existing simulation types
- Ready for 05-03 (estate analysis)

---
*Phase: 05-financial-calculations*
*Completed: 2026-01-17*
