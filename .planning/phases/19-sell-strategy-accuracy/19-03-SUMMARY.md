---
phase: 19-sell-strategy-accuracy
plan: 03
subsystem: calculations
tags: [monte-carlo, sell-strategy, percentiles, return-derivation, typescript]

# Dependency graph
requires:
  - phase: 19-01
    provides: Fixed order of operations (withdrawal before returns)
  - phase: 19-02
    provides: Dividend tax modeling in sell strategy
provides:
  - Documented return derivation approach ensuring BBD and Sell use identical market paths
  - Year-0 percentile initialization for valid growth rate calculations
  - Defensive handling for missing percentile data with warnings
affects: [future sell strategy enhancements, comparison mode improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Year-0 initialization pattern for growth rate calculations
    - Defensive data validation with console warnings

key-files:
  created: []
  modified:
    - src/calculations/sell-strategy.ts
    - src/components/ui/results-dashboard.ts

key-decisions:
  - "Add year-0 percentile data in results-dashboard before passing to calculateSellStrategy (not in simulation output)"
  - "Document return derivation approach comprehensively to ensure understanding of fair comparison"

patterns-established:
  - "Year-0 initialization: When calculating growth rates, ensure year 0 data exists representing initial state"
  - "Defensive validation: Warn if input data is incomplete rather than silently using fallback"

# Metrics
duration: 4min
completed: 2026-01-24
---

# Phase 19 Plan 03: Return Derivation Accuracy Summary

**Documented and ensured identical return paths for BBD and Sell strategy comparison via year-0 percentile initialization and comprehensive return derivation documentation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-24T15:31:50Z
- **Completed:** 2026-01-24T15:36:25Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Comprehensive documentation explaining return derivation approach in sell-strategy.ts
- Year-0 percentile initialization ensuring valid growth rate calculations from initial value
- Defensive handling for missing percentile data with console warnings for debugging

## Task Commits

Each task was committed atomically:

1. **Task 1: Review and document growth rate extraction** - `3ea104d` (docs)
2. **Task 2: Add year-0 percentile initialization** - `8d4493d` (feat)
3. **Task 3: Verify integration in results-dashboard** - `900650c` (feat)

## Files Created/Modified
- `src/calculations/sell-strategy.ts` - Added comprehensive return derivation documentation and defensive data validation
- `src/components/ui/results-dashboard.ts` - Added year-0 percentile initialization in all three calculateSellStrategy invocations

## Decisions Made

**Key Decision: Year-0 initialization location**
- Decision: Add year-0 data in results-dashboard.ts before passing to calculateSellStrategy
- Rationale: Simulation output (yearlyPercentiles) starts at year 1 by design. Rather than modify core simulation output structure, we add year-0 initialization at the integration point where we know the initial value.
- Pattern: Year 0 represents portfolio state at simulation start (all percentiles equal initial value), enabling growth calculation: (year1Value - initialValue) / initialValue

**Documentation Approach**
- Added comprehensive documentation block explaining return derivation philosophy
- Documented that BBD advantage comes from tax deferral, compound growth, and stepped-up basis—NOT from different market assumptions
- Added detailed JSDoc to extractGrowthRates function with formula and examples

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. The issue of missing year-0 data was correctly identified in the plan and resolved as specified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Return derivation approach is now clearly documented and validated
- Year-0 initialization ensures no missing data warnings during simulation
- Sell strategy now receives identical market return paths as BBD for fair comparison
- Ready for Phase 19 Plan 04 (final sell strategy verification and testing)

**Verification:**
- Build passes without TypeScript errors
- Year-0 data correctly added to all calculateSellStrategy invocations
- Defensive warnings in place to catch future data issues
- Logic verified via test demonstrating growth rate calculation works for year 1

---
*Phase: 19-sell-strategy-accuracy*
*Completed: 2026-01-24*
