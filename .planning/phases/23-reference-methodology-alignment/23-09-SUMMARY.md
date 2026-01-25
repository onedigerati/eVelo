---
phase: 23-reference-methodology-alignment
plan: 09
subsystem: simulation
tags: [monte-carlo, percentiles, path-coherent, methodology, testing]

# Dependency graph
requires:
  - phase: 23-01
    provides: Bootstrap correlation preservation
  - phase: 23-02
    provides: Asset-specific regime calibration
  - phase: 23-04
    provides: 4-regime system with recovery state
  - phase: 23-05
    provides: Regime-switching survivorship bias
  - phase: 23-06
    provides: BBD dividend tax borrowing
  - phase: 23-07
    provides: Fat-tail distribution model
provides:
  - Path-coherent percentile extraction matching reference methodology
  - Comprehensive methodology alignment test suite
  - Documented point-wise vs path-coherent approaches
affects: [visualization, results-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Path-coherent percentile extraction (rank by terminal, extract complete paths)
    - Methodology documentation in JSDoc (point-wise vs path-coherent comparison)

key-files:
  created:
    - src/simulation/__tests__/methodology-alignment.test.ts
  modified:
    - src/simulation/monte-carlo.ts

key-decisions:
  - "Path-coherent percentiles as default (reference methodology)"
  - "Keep point-wise calculateYearlyPercentiles for future reference"
  - "Console logging shows which simulation represents each percentile"

patterns-established:
  - "extractPathCoherentPercentiles: rank simulations by terminal value, extract complete paths"
  - "PathCoherentResult interface: percentiles + simulation indices for traceability"
  - "Comprehensive methodology tests: bootstrap correlation, survivorship bias, path-coherent, 4-regime"

# Metrics
duration: 2min
completed: 2026-01-25
---

# Phase 23 Plan 09: Path-Coherent Percentiles Summary

**Path-coherent percentile extraction ranks simulations by terminal value and extracts complete paths, ensuring each percentile line represents one coherent journey rather than point-wise cross-sections**

## Performance

- **Duration:** 2 min 15 sec
- **Started:** 2026-01-25T22:25:10Z
- **Completed:** 2026-01-25T22:27:25Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Documented point-wise vs path-coherent percentile methodology differences in detailed JSDoc
- Implemented extractPathCoherentPercentiles function matching reference application methodology
- Created comprehensive methodology alignment test suite with 5 tests covering all reference alignment areas
- All tests pass: bootstrap correlation, survivorship bias (historical/conservative), path-coherent percentiles, 4-regime system

## Task Commits

Each task was committed atomically:

1. **Task 1-2: Audit and implement path-coherent percentiles** - `1924790` (feat)
2. **Task 3: Create methodology alignment tests** - `d198378` (test)

## Files Created/Modified
- `src/simulation/monte-carlo.ts` - Added extractPathCoherentPercentiles function, PathCoherentResult interface, and comprehensive JSDoc explaining methodology differences
- `src/simulation/__tests__/methodology-alignment.test.ts` - Created 5-test suite validating reference methodology alignment (bootstrap correlation, survivorship bias, path-coherent percentiles, 4-regime system)

## Decisions Made

**Path-coherent as default methodology:**
- Switched main runMonteCarlo to use extractPathCoherentPercentiles instead of calculateYearlyPercentiles
- Each percentile line now represents one complete simulation path (coherent market history)
- Terminal value ranking determines which simulation represents each percentile (P10, P25, P50, P75, P90)

**Console logging for transparency:**
- Shows which simulation index represents each percentile
- Displays terminal values for P10, P50, P90 simulations
- Enables verification that percentiles form monotonic ordering

**Kept point-wise implementation for reference:**
- calculateYearlyPercentiles function retained with detailed JSDoc
- Documents trade-offs between point-wise and path-coherent approaches
- Future developers can understand both methodologies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation straightforward, all tests passed on first run.

## Next Phase Readiness

- All Phase 23 reference methodology alignment work complete (9/9 plans)
- Path-coherent percentiles ensure realistic trajectory visualization
- Comprehensive test suite validates alignment across all methodology areas
- Ready for Phase 24 or production refinement

---
*Phase: 23-reference-methodology-alignment*
*Completed: 2026-01-25*
