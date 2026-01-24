---
phase: 18-fix-regime-switching
plan: 03
subsystem: simulation
tags: [regime-switching, monte-carlo, calibration, stress-testing, typescript]

# Dependency graph
requires:
  - phase: 18-02
    provides: "Regime calibration module with historical parameter estimation"
provides:
  - "Conservative calibration mode for stress-testing regime parameters"
  - "applyConservativeAdjustment function for Federal Reserve-style adjustments"
  - "calibrateRegimeModelWithMode entry point with mode parameter"
affects: [18-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stress-testing parameter adjustment pattern for conservative simulations"
    - "Mode-based calibration dispatch pattern"

key-files:
  created: []
  modified:
    - "src/simulation/regime-calibration.ts"

key-decisions:
  - "Conservative adjustments based on Federal Reserve stress test methodology"
  - "Bull regime reduced by 1 stddev (minimum 1pp), bear/crash by fixed amounts (2pp/3pp)"
  - "Volatility increases proportional to regime severity (15%/20%/25%)"

patterns-established:
  - "Conservative mode produces lower expected returns and higher volatility across all regimes"
  - "Historical calibration as base, conservative as stress-adjusted variant"

# Metrics
duration: 3min
completed: 2026-01-24
---

# Phase 18 Plan 03: Conservative Calibration Mode Summary

**Conservative calibration mode with Federal Reserve-style stress adjustments reducing returns by 1 stddev to 3pp and increasing volatility by 15-25%**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-24T17:26:32Z
- **Completed:** 2026-01-24T17:29:02Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Implemented `applyConservativeAdjustment` function applying stress-testing parameter adjustments
- Created `calibrateRegimeModelWithMode` as new main entry point accepting calibration mode
- Conservative mode reduces bull returns by 1 stddev, bear/crash by 2-3pp fixed amounts
- Conservative mode increases volatility by 15-25% across all regimes based on severity
- Documented expected behavior with concrete example transformation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add conservative adjustment function** - `fec4973` (feat)
2. **Task 2: Verify conservative mode produces expected changes** - `c78a4a7` (docs)

## Files Created/Modified
- `src/simulation/regime-calibration.ts` - Added conservative adjustment functions and mode-based calibration entry point

## Decisions Made
- **Adjustment methodology:** Used Federal Reserve stress test approach rather than simple percentage reductions
- **Bull regime adjustment:** Reduced by 1 stddev (minimum 1pp) to capture uncertainty in good times
- **Bear/crash adjustments:** Fixed 2pp and 3pp reductions to make negative regimes worse
- **Volatility scaling:** Progressive increases (15%/20%/25%) based on regime severity
- **Entry point pattern:** New `calibrateRegimeModelWithMode` function routes based on mode parameter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward with clear specifications.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 18-04 (Wire Conservative Mode):**
- `calibrateRegimeModelWithMode` exported and ready for integration
- `applyConservativeAdjustment` function available for testing
- Conservative mode produces demonstrably lower returns and higher volatility
- Documentation includes example transformation for validation

**Blockers:** None

**Notes:**
- The regimeCalibration UI setting currently has no effect - 18-04 will wire it to use these new functions
- Conservative mode will enable risk-averse users to run stress-tested simulations

---
*Phase: 18-fix-regime-switching*
*Completed: 2026-01-24*
