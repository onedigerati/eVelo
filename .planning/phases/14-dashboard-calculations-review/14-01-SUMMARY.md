---
phase: 14-dashboard-calculations-review
plan: 01
subsystem: testing
tags: [calculation-verification, gap-analysis, percentile, monte-carlo, metrics]

# Dependency graph
requires:
  - phase: 11-complete-results-dashboard
    provides: "Results dashboard with calculation modules"
  - phase: 13-e2e-testing-agent-browser
    provides: "E2E testing infrastructure"
provides:
  - "Comprehensive gap analysis of all CALC requirements (CALC-01 through CALC-07)"
  - "14-GAP-FINDINGS.md documenting 2 calculation issues (1 critical, 1 minor)"
  - "Verified calculations: CAGR, volatility, TWRR, salary equivalent, margin call probability"
affects: [phase-15-calculation-fixes, future-calculation-modules]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Systematic calculation verification using grep pattern matching"
    - "Gap documentation template with evidence, impact, and resolution"
    - "Formula verification against CFA standards"

key-files:
  created:
    - ".planning/phases/14-dashboard-calculations-review/14-GAP-FINDINGS.md"
  modified: []

key-decisions:
  - "Prioritized percentile scale mismatch as HIGH severity - affects all dashboard percentile displays"
  - "Classified success rate inconsistency as MEDIUM severity - minimal practical impact due to floating point"
  - "Verified 5 calculation modules have correct formulas and edge case handling"

patterns-established:
  - "Gap documentation format: Requirement, Severity, Component, Description, Evidence, Expected Behavior, Impact, Proposed Resolution"
  - "Evidence-based analysis: direct code inspection with line numbers and comparisons"
  - "Manual test case verification for formulas (e.g., salary equivalent calculation)"

# Metrics
duration: 4min
completed: 2026-01-22
---

# Phase 14 Plan 01: Dashboard Calculations Review Summary

**Identified critical percentile scale bug (0-1 vs 0-100) in monte-carlo.ts affecting all simulation percentiles, verified 5 other calculation modules correct**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-22T23:48:27Z
- **Completed:** 2026-01-22T23:52:15Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- Discovered HIGH severity percentile scale mismatch in monte-carlo.ts (13 instances using 0-1 scale instead of 0-100)
- Verified 5 calculation modules are correctly implemented (metrics.ts, twrr.ts, salary-equivalent.ts, margin-call-probability.ts, return-probabilities.ts)
- Documented 2 gaps with code evidence, impact analysis, and proposed resolutions
- Created comprehensive gap findings document for Phase 14-02 reference

## Task Commits

Each task was committed atomically:

1. **Task 1: Inspect percentile scale usage with grep pattern** - `4e5d6d2` (docs)
   - Identified GAP-01 (percentile scale mismatch) and GAP-02 (success rate inconsistency)
   - Created 14-GAP-FINDINGS.md

2. **Task 2: Inspect success rate and other CALC requirements** - `d7809d4` (docs)
   - Verified CALC-03 (CAGR/Volatility), CALC-04 (Margin Call Probability), CALC-05 (Salary Equivalent), CALC-07 (TWRR)
   - Updated 14-GAP-FINDINGS.md with verified calculations section

## Files Created/Modified

- `.planning/phases/14-dashboard-calculations-review/14-GAP-FINDINGS.md` - Gap analysis document with 2 documented issues and 5 verified calculations

## Decisions Made

1. **Classified percentile bug as HIGH severity**
   - Affects: sblocTrajectory.loanBalance percentiles, estateAnalysis median, statistics.median, yearlyPercentiles for all years
   - Impact: Dashboard displays extremely low values (0.1% percentile instead of 10th percentile)
   - Rationale: Critical bug that makes all percentile displays inaccurate

2. **Classified success rate inconsistency as MEDIUM severity**
   - Impact: Minimal in practice (floating point values rarely exactly equal)
   - Rationale: Code inconsistency worth fixing but not affecting user experience

3. **Verified calculations match CFA standards**
   - CAGR formula: `(endValue/startValue)^(1/years) - 1` ✓
   - TWRR geometric linking: `∏(1 + Rᵢ) - 1` ✓
   - Salary equivalent: `withdrawal / (1 - taxRate)` ✓ (verified with test case)

## Deviations from Plan

None - plan executed exactly as written. Both tasks completed using grep pattern matching and file inspection as specified.

## Issues Encountered

None - systematic inspection approach worked efficiently. Grep pattern `percentile\(` immediately surfaced the scale mismatch across all usage sites.

## Gap Analysis Results

### GAP-01: Percentile Scale Mismatch (HIGH)
- **Location:** src/simulation/monte-carlo.ts (13 instances across 3 functions)
- **Issue:** Uses 0-1 scale (0.1, 0.5, 0.9) but percentile() expects 0-100 scale (10, 50, 90)
- **Impact:** All percentile calculations return values near minimum instead of intended percentiles
- **Evidence:** Line 87 in statistics.ts shows `index = (clampedP / 100) * (n - 1)` confirming 0-100 scale expectation
- **Resolution:** Multiply all percentile arguments by 100 (e.g., 0.1 → 10, 0.5 → 50, 0.9 → 90)

### GAP-02: Success Rate Inconsistency (MEDIUM)
- **Location:** monte-carlo.ts line 331 vs metrics.ts line 188
- **Issue:** monte-carlo.ts uses `>=` (includes break-even), metrics.ts uses `>` (strictly greater)
- **Impact:** Minimal (floating point equality is extremely rare)
- **Evidence:** JSDoc in metrics.ts says "above initial value" suggesting `>` is correct
- **Resolution:** Standardize on `>` operator (breaking even is not "success" in investment context)

### Verified Calculations (No Issues)
- ✓ CALC-03: CAGR and Volatility formulas correct
- ✓ CALC-04: Margin call probability monotonically increasing
- ✓ CALC-05: Salary equivalent formula verified ($50k at 37% = $79,365 ✓)
- ✓ CALC-07: TWRR geometric linking and annualization correct

## Next Phase Readiness

**Ready for Phase 14-02 (Visualization Verification):**
- Gap findings documented and ready for reference
- Calculation modules verified - can confidently test visualizations knowing formulas are correct
- Identified that percentile bug will affect all charts displaying P10/P50/P90 data

**Blocker identified:**
- GAP-01 (percentile scale mismatch) should be fixed before final deployment
- Current dashboard displays are showing incorrect percentile values
- Recommend creating follow-up phase to fix both gaps after Phase 14 verification complete

**Testing implications:**
- E2E visual tests may be passing with incorrect data (bug in calculations, not rendering)
- After fixing GAP-01, baseline screenshots will need to be recaptured

---
*Phase: 14-dashboard-calculations-review*
*Completed: 2026-01-22*
