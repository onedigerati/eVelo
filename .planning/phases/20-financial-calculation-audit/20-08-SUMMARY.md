---
phase: 20-financial-calculation-audit
plan: 08
subsystem: calculations
tags: [cagr, twrr, metrics, documentation, ui-labels]

# Dependency graph
requires:
  - phase: 05-financial-calculations
    provides: calculateCAGR and calculateTWRR functions
provides:
  - Updated CAGR documentation explaining median vs mean methodology
  - calculateMeanCAGR helper function for mean-based calculations
  - Clear dashboard labels (Median CAGR, TWRR Median)
  - TWRR documentation with limitations and future enhancement suggestions
affects: [users, dashboard-display, future-metric-enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Documentation explaining median-based Monte Carlo metrics

key-files:
  created: []
  modified:
    - src/calculations/metrics.ts
    - src/calculations/twrr.ts
    - src/components/ui/results-dashboard.ts

key-decisions:
  - "CAGR uses median terminal value - documented clearly with rationale"
  - "TWRR uses median path - documented limitation and future enhancement suggestion"
  - "Dashboard labels explicitly show 'Median' to inform users of methodology"

patterns-established:
  - "Metrics documentation: Explain statistical basis (median vs mean) in JSDoc"
  - "Label clarity: Dashboard metric labels should indicate calculation methodology"

# Metrics
duration: 6min
completed: 2026-01-24
---

# Phase 20 Plan 08: Clarify CAGR and TWRR Reporting Methodology Summary

**Updated CAGR and TWRR documentation to explain median-based methodology, added calculateMeanCAGR helper, and clarified dashboard labels to show "Median CAGR" and "TWRR (Median)"**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-24
- **Completed:** 2026-01-24
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- CAGR JSDoc updated to explain median vs mean methodology with clear rationale
- New calculateMeanCAGR helper function for future use cases needing mean-based CAGR
- Dashboard labels now show "Median CAGR" and "TWRR (Median)" for transparency
- TWRR documentation explains P50-only limitation and suggests future P10/P50/P90 enhancement

## Task Commits

Each task was committed atomically:

1. **Task 1: Update CAGR documentation and add mean CAGR calculation** - `2bf8495` (docs)
2. **Task 2: Update dashboard to use clearer metric labels** - `8b7ac1d` (feat)
3. **Task 3: Document TWRR methodology** - `0e650d7` (docs)

## Files Created/Modified
- `src/calculations/metrics.ts` - Enhanced CAGR JSDoc, added calculateMeanCAGR function
- `src/calculations/twrr.ts` - Added detailed documentation explaining median-only limitation
- `src/components/ui/results-dashboard.ts` - Updated labels to "Median CAGR" and "TWRR (Median)"

## Decisions Made
- **CAGR median explanation:** Documented that median is preferred because positive compounding creates right-skewed distributions where mean can be misleading
- **calculateMeanCAGR:** Added as helper function for scenarios where mean is needed, but kept as secondary option
- **Label format:** Used "Median CAGR" and "TWRR (Median)" rather than footnotes - direct and clear
- **TWRR future enhancement:** Documented suggestion for calculateTWRRDistribution() returning P10/P50/P90 values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Risk Areas #5 (CAGR Uses Median) and #10 (TWRR Shows P50 Only) addressed
- Documentation and UI both clarify the statistical methodology
- Future enhancement documented: TWRR could show P10/P50/P90 range

---
*Phase: 20-financial-calculation-audit*
*Completed: 2026-01-24*
