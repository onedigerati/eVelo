---
phase: 23-reference-methodology-alignment
plan: 04
subsystem: simulation-engine
tags: [regime-switching, survivorship-bias, monte-carlo, calibration]

# Dependency graph
requires:
  - phase: 23-02
    provides: 4-regime market model with calibration framework
  - phase: 23-03
    provides: Fat-tail distribution model for comparison
provides:
  - Survivorship bias adjustment in regime-switching model (1.5% historical, 2.0% conservative)
  - Conservative transition matrix usage based on calibration mode
  - Return clamping at -99% to +500%
affects: [23-05, 23-06, simulation-accuracy, regime-model]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Survivorship bias constants by calibration mode"
    - "Conservative vs historical matrix selection"
    - "Return clamping for extreme tail protection"

key-files:
  created: []
  modified:
    - src/simulation/types.ts
    - src/simulation/regime-switching.ts
    - src/simulation/monte-carlo.ts

key-decisions:
  - "Applied 1.5% survivorship bias for historical mode, 2.0% for conservative"
  - "Used conservative transition matrix when calibrationMode is 'conservative'"
  - "Clamped returns at -99% min and +500% max to prevent extreme sampling artifacts"

patterns-established:
  - "Survivorship bias adjustment: SURVIVORSHIP_BIAS constant provides mode-specific adjustments"
  - "Transition matrix selection: Conservative mode uses CONSERVATIVE_TRANSITION_MATRIX for stress testing"
  - "Return clamping: MIN_RETURN_CLAMP and MAX_RETURN_CLAMP constants protect against sampling extremes"

# Metrics
duration: 9min
completed: 2026-01-25
---

# Phase 23 Plan 04: Survivorship Bias Adjustment Summary

**Regime-switching model applies 1.5% (historical) or 2.0% (conservative) survivorship bias adjustment with conservative transition matrix support**

## Performance

- **Duration:** 9 min
- **Started:** 2026-01-25T22:10:53Z
- **Completed:** 2026-01-25T22:19:24Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added SURVIVORSHIP_BIAS constant with mode-specific values (historical: 1.5%, conservative: 2.0%)
- Updated regime return generation to apply survivorship bias before sampling
- Wired calibration mode through Monte Carlo with conservative transition matrix support
- Added return clamping constants (-99% to +500%) for extreme tail protection

## Task Commits

Each task was committed atomically:

1. **Task 1: Add survivorship bias constants to types.ts** - `0d93693` (feat)
2. **Task 2: Apply survivorship bias in regime return generation** - Already committed in `e8f2ee9` (chore)
3. **Task 3: Wire calibration mode through Monte Carlo** - Already committed in `2e3adce` (feat)

**Note:** Tasks 2 and 3 were already committed as part of prior work on fat-tail and dividend tax integration.

## Files Created/Modified
- `src/simulation/types.ts` - Added SURVIVORSHIP_BIAS constant with historical (1.5%) and conservative (2.0%) values
- `src/simulation/regime-switching.ts` - Updated generateRegimeReturns and generateCorrelatedRegimeReturns to accept calibrationMode parameter and apply survivorship bias adjustment to means before sampling; added MIN_RETURN_CLAMP and MAX_RETURN_CLAMP constants
- `src/simulation/monte-carlo.ts` - Imported CONSERVATIVE_TRANSITION_MATRIX; updated generateIterationReturns to pass calibrationMode to generateCorrelatedRegimeReturns and use conservative matrix when mode is 'conservative'; added console logging for survivorship bias and transition matrix selection

## Decisions Made
- **Survivorship bias values:** Used 1.5% for historical (empirical studies) and 2.0% for conservative (stress testing)
- **Transition matrix selection:** Conservative mode automatically uses CONSERVATIVE_TRANSITION_MATRIX for increased downside risk
- **Return clamping:** Applied -99% minimum (total loss protection) and +500% maximum (extreme tail protection) to prevent sampling artifacts from normal distribution
- **Logging:** Added console logs to confirm survivorship bias and transition matrix selection for transparency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FAT_TAIL_PARAMS import conflict**
- **Found during:** Task 2 (Compilation)
- **Issue:** FAT_TAIL_PARAMS imported as both type and value, causing duplicate identifier error
- **Fix:** Removed type import of FAT_TAIL_PARAMS, kept only value import
- **Files modified:** src/simulation/monte-carlo.ts
- **Verification:** Build passes without errors
- **Committed in:** Commit message includes "Fix FAT_TAIL_PARAMS import (type vs value conflict)"

**2. [Rule 2 - Missing Critical] Added dividendTaxesBorrowed to fat-tail debug stats**
- **Found during:** Task 3 (Compilation)
- **Issue:** SBLOCDebugStats interface requires dividendTaxesBorrowed field but fat-tail branch was missing it
- **Fix:** Added dividendTaxesBorrowed with zero values to fat-tail debug stats object
- **Files modified:** src/simulation/monte-carlo.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** Already committed in task 3

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for compilation. No scope creep.

## Issues Encountered
None - plan executed smoothly after fixing compilation errors

## User Setup Required
None - no external service configuration required

## Next Phase Readiness
- Survivorship bias adjustment integrated and operational
- Ready for sell strategy alignment (23-05) which will use same bias-adjusted returns
- Conservative mode stress testing now available for risk analysis
- Return clamping prevents extreme sampling artifacts in long-horizon simulations

---
*Phase: 23-reference-methodology-alignment*
*Completed: 2026-01-25*
