---
phase: 20-financial-calculation-audit
plan: 05
subsystem: simulation
tags: [sbloc, withdrawal, inflation, growth-rate, monte-carlo]

# Dependency graph
requires:
  - phase: 04-sbloc-engine
    provides: Base SBLOC engine with annual withdrawal support
provides:
  - Inflation-adjusted withdrawal support in SBLOC engine
  - withdrawalGrowthRate configuration field
  - Documentation linking SBLOCConfig and SBLOCSimConfig growth fields
affects: [20-07, 20-09, simulation-accuracy]

# Tech tracking
tech-stack:
  added: []
  patterns: [external-growth-computation, stateless-engine-design]

key-files:
  created: []
  modified:
    - src/sbloc/types.ts
    - src/sbloc/engine.ts
    - src/simulation/types.ts
    - src/simulation/monte-carlo.ts

key-decisions:
  - "Growth computed externally in Monte Carlo to keep SBLOC engine stateless"
  - "withdrawalGrowthRate defaults to 3% for standalone engine use"
  - "Monte Carlo passes pre-computed withdrawal each year via annualWithdrawal"

patterns-established:
  - "External growth computation: Monte Carlo computes inflation-adjusted withdrawal externally, passes as flat annualWithdrawal to SBLOC engine"
  - "Dual growth fields: SBLOCConfig.withdrawalGrowthRate for standalone use, SBLOCSimConfig.annualWithdrawalRaise for Monte Carlo"

# Metrics
duration: 4min
completed: 2026-01-24
---

# Phase 20 Plan 05: SBLOC Withdrawal Growth Summary

**Inflation-adjusted withdrawal support with configurable growth rate (default 3%) and documented Monte Carlo wiring**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-24T16:33:00Z (original commits)
- **Completed:** 2026-01-24T22:45:00Z (documentation tasks)
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- Added withdrawalGrowthRate field to SBLOCConfig with 3% default
- Implemented inflation-adjusted withdrawals: withdrawal_year_N = annualWithdrawal * (1 + rate)^N
- Documented the design pattern where Monte Carlo computes growth externally
- Linked SBLOCSimConfig.annualWithdrawalRaise and SBLOCConfig.withdrawalGrowthRate concepts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add withdrawalGrowthRate to SBLOC config** - `3a35d0a` (feat)
2. **Task 2: Implement withdrawal growth in stepSBLOC** - `6224c79` (feat)
3. **Task 3: Document annualWithdrawalRaise in SBLOCSimConfig** - `ba82509` (docs)
4. **Task 4: Document external growth computation in monte-carlo** - `6a46436` (docs)

## Files Created/Modified
- `src/sbloc/types.ts` - Added withdrawalGrowthRate field with JSDoc
- `src/sbloc/engine.ts` - Implemented withdrawal growth formula in stepSBLOC
- `src/simulation/types.ts` - Expanded documentation for annualWithdrawalRaise
- `src/simulation/monte-carlo.ts` - Added comment explaining external growth design

## Decisions Made
- **Stateless engine design:** Monte Carlo computes effectiveWithdrawal externally rather than having the engine track growth internally. This keeps the SBLOC engine simple and stateless.
- **Default 3% growth:** Matches typical historical inflation for realistic retirement simulations.
- **Dual documentation:** Both SBLOCConfig.withdrawalGrowthRate (standalone) and SBLOCSimConfig.annualWithdrawalRaise (Monte Carlo) are documented with their relationship explained.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as specified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Withdrawal growth now properly modeled for inflation-adjusted spending
- Ready for Risk Area #9 (Inflation Erosion) verification
- Monte Carlo integration documented for future maintainability

---
*Phase: 20-financial-calculation-audit*
*Completed: 2026-01-24*
