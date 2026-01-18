---
phase: 05-financial-calculations
plan: 03
subsystem: calculations
tags: [estate, bbd, stepped-up-basis, capital-gains, salary-equivalent, tax-advantage]

# Dependency graph
requires:
  - phase: 05-01
    provides: Core metrics types (EstateAnalysis, BBDComparison, SalaryEquivalent)
  - phase: 05-02
    provides: TWRR and margin call probability modules
provides:
  - Estate analysis calculations (net estate, embedded gains, stepped-up basis savings)
  - BBD vs Sell strategy comparison with quantified advantage
  - Salary equivalent calculation for tax-free withdrawal value
  - Complete calculations module barrel export
affects:
  - 05-04 (may import from barrel export)
  - 06-visualization (charts displaying estate analysis and BBD comparison)
  - 07-reporting (executive summary using estate metrics)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Barrel export pattern for module organization
    - Pure function pattern for estate calculations
    - Edge case handling for invalid tax rates

key-files:
  created:
    - src/calculations/estate.ts
    - src/calculations/salary-equivalent.ts
    - src/calculations/index.ts
  modified: []

key-decisions:
  - "Stepped-up basis savings = embedded gains * capital gains rate (23.8% default)"
  - "BBD advantage = BBD net estate - Sell net estate (positive means BBD is better)"
  - "Return 0 for embedded gains in loss scenarios (no negative gains)"
  - "Salary equivalent = withdrawal / (1 - taxRate)"
  - "Handle 100% tax rate edge case by returning Infinity"

patterns-established:
  - "Estate parameter types (EstateAnalysisParams, BBDComparisonParams)"
  - "Barrel re-export pattern for calculation module"
  - "Default config pattern with override capability"

# Metrics
duration: 2min
completed: 2026-01-17
---

# Phase 5 Plan 3: Estate Calculations and Module Export Summary

**Estate analysis with stepped-up basis tax savings, BBD vs Sell comparison, salary equivalent for tax-free withdrawals, plus complete barrel export for calculations module**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-17
- **Completed:** 2026-01-17
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Embedded capital gains calculation (unrealized appreciation)
- Stepped-up basis tax savings quantification (the "Die" advantage)
- Complete estate analysis at simulation end
- BBD vs Sell strategy comparison with quantified advantage
- Tax-if-sold helper for capital gains calculation
- Salary equivalent calculation for tax-free withdrawal value
- Barrel export consolidating entire calculations module
- All types, functions, and configs exported from single entry point

## Task Commits

Each task was committed atomically:

1. **Task 1: Create estate calculations** - `2c1770a` (feat)
2. **Task 2: Create salary equivalent and barrel export** - `3030be8` (feat)

## Files Created

- `src/calculations/estate.ts` (315 lines) - Estate and BBD tax advantage calculations
  - calculateEmbeddedCapitalGains: Unrealized appreciation
  - calculateSteppedUpBasisSavings: Tax avoided at death
  - calculateTaxIfSold: Capital gains tax if portfolio sold
  - calculateEstateAnalysis: Complete estate position
  - calculateBBDComparison: BBD vs Sell strategy advantage

- `src/calculations/salary-equivalent.ts` (114 lines) - Tax-free withdrawal equivalent
  - calculateSalaryEquivalent: Pre-tax salary needed for same after-tax amount
  - Edge case handling for zero withdrawal and invalid tax rates

- `src/calculations/index.ts` (107 lines) - Barrel export for calculations module
  - Re-exports all types from types.ts
  - Re-exports all functions from metrics, twrr, margin-call-probability, estate, salary-equivalent
  - Exports DEFAULT_CALCULATION_CONFIG
  - Exports parameter types for estate functions

## Decisions Made

- **Return 0 for negative embedded gains:** Loss scenarios don't have embedded gains to worry about
- **Salary equivalent at 100% tax rate returns Infinity:** Signals impossible scenario clearly
- **BBD advantage can be negative:** When loan balance exceeds tax savings, selling is better
- **Estate tax exemption in output for context:** Helps users understand if estate taxes apply

## Deviations from Plan

None - plan executed exactly as written. The estate.ts file was already created in a prior session but was untracked; committed as part of Task 1.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete calculations module available via `import { ... } from '@/calculations'`
- All estate and BBD metrics ready for visualization
- Salary equivalent ready for display in results summary
- Ready for 05-04 (if additional calculations needed) or Phase 6 (visualization)

---
*Phase: 05-financial-calculations*
*Completed: 2026-01-17*
