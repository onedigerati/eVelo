---
phase: 03-simulation-engine
plan: 02
subsystem: simulation
tags: [bootstrap, resampling, autocorrelation, politis-white, monte-carlo]

# Dependency graph
requires:
  - phase: 02-core-math
    provides: mean function for autocorrelation calculation
  - phase: 03-01
    provides: simulation types.ts with interfaces
provides:
  - simpleBootstrap function for IID resampling
  - blockBootstrap function for autocorrelation-preserving resampling
  - optimalBlockLength function for Politis-White block size selection
affects: [03-03, 03-04, monte-carlo simulation]

# Tech tracking
tech-stack:
  added: []
  patterns: [politis-white-2004, moving-block-bootstrap]

key-files:
  created: [src/simulation/bootstrap.ts]
  modified: []

key-decisions:
  - "Use Math.floor for index calculation (not round) to avoid index out of bounds"
  - "Clamp block length to [3, n/4] for reasonable bounds"
  - "Handle short series (n < 12) gracefully by returning max(3, n/2)"
  - "Guard against perfect autocorrelation (rhoSquared >= 1)"

patterns-established:
  - "Seeded RNG pattern: accept rng function parameter for reproducibility"
  - "Auto-calculation with override: optional parameter with smart default"
  - "Defensive throws: empty input throws immediately"

# Metrics
duration: 2min
completed: 2026-01-17
---

# Phase 3 Plan 2: Bootstrap Resampling Summary

**Simple and block bootstrap resampling with Politis-White automatic block length selection for Monte Carlo return generation**

## Performance

- **Duration:** 2 min 25 sec
- **Started:** 2026-01-17T23:40:21Z
- **Completed:** 2026-01-17T23:42:46Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Implemented simple bootstrap for IID resampling with replacement
- Implemented Politis-White (2004) automatic block length selection based on autocorrelation
- Implemented moving block bootstrap preserving time-series structure
- All methods accept seeded RNG for reproducibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement simple bootstrap resampling** - `fcb51d3` (feat)
2. **Task 2: Implement Politis-White automatic block length** - `f3d105d` (feat)
3. **Task 3: Implement moving block bootstrap** - `e5ec999` (feat)

## Files Created/Modified
- `src/simulation/bootstrap.ts` - Bootstrap resampling module with simpleBootstrap, optimalBlockLength, and blockBootstrap functions (161 lines)

## Decisions Made
- Used Math.floor for index calculation (not round) to avoid index out of bounds errors
- Block length clamped to [3, n/4] range per Politis-White recommendations
- Short series (n < 12) handled by returning max(3, n/2) since autocorrelation estimate would be unreliable
- Perfect autocorrelation (rhoSquared >= 1) returns n/4 as maximum block size
- Block size sanitized to not exceed series length when explicitly provided

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed the plan specification directly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Bootstrap module complete and ready for Monte Carlo integration
- simpleBootstrap available for SIM-04 requirement
- blockBootstrap available for SIM-05 requirement
- Both methods compatible with seedrandom via RNG function parameter

---
*Phase: 03-simulation-engine*
*Completed: 2026-01-17*
