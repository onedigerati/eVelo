---
phase: 12-monthly-withdrawal-simulation
plan: 01
subsystem: sbloc-engine
tags: [sbloc, monthly, compounding, simulation]

dependency_graph:
  requires: [04-sbloc-engine]
  provides: [monthly-step-functions, return-distribution]
  affects: [12-02-integration]

tech_stack:
  added: []
  patterns: [monthly-substep-aggregation, backward-compatible-wrapper]

key_files:
  created:
    - src/sbloc/monthly.ts
  modified:
    - src/sbloc/index.ts

decisions:
  - Monthly compounding calculated by dividing rate by 12 and applying 12 times
  - Backward compatibility via direct delegation when monthlyWithdrawal is false
  - yearsSinceStart only increments at year boundary (month 11)
  - Margin call and liquidation tracking uses first occurrence per year

metrics:
  duration: 4 min
  completed: 2026-01-22
---

# Phase 12 Plan 01: Monthly Step Functions Summary

**One-liner:** Monthly SBLOC step functions with return distribution and backward-compatible year wrapper

## Objective

Create monthly step functions for SBLOC simulation enabling more accurate interest accrual and earlier margin call detection when monthlyWithdrawal flag is set.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create monthly.ts with return distribution and step functions | 0bc00df | src/sbloc/monthly.ts |
| 2 | Update barrel export to include monthly module | c36ff39 | src/sbloc/index.ts |
| 3 | Validate backward compatibility | a89bc45 | src/sbloc/monthly.ts |

## Key Implementations

### annualToMonthlyReturns()
- Converts annual return to 12 equal monthly returns
- Formula: `monthlyReturn = (1 + annualReturn)^(1/12) - 1`
- Returns array of 12 identical values that compound to original annual return

### stepSBLOCMonth()
- Executes single month of SBLOC simulation
- Uses 1/12 of annual withdrawal and 1/12 of interest rate
- Handles yearsSinceStart correctly (only increments at month 11)

### stepSBLOCYear()
- Wrapper function orchestrating annual vs monthly mode
- When `monthlyWithdrawal === false`: delegates directly to stepSBLOC (identical results)
- When `monthlyWithdrawal === true`: processes 12 monthly substeps with aggregation
- Tracks first margin call, first liquidation, accumulated interest/withdrawals

## Expected Differences (Monthly vs Annual)

| Aspect | Annual Mode | Monthly Mode |
|--------|-------------|--------------|
| Interest Rate | 7.4% nominal = 7.4% effective | 7.4% nominal = 7.66% effective |
| Interest Timing | After full annual withdrawal | After each monthly withdrawal |
| Margin Call Checks | 1 per year | 12 per year |
| Total Withdrawal | $50k | $50k (12 x $4,166.67) |

## Verification Results

- TypeScript compiles without errors
- Build succeeds (620.71 kB bundle)
- All functions exported via barrel
- Function signatures match expected types

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 02: Integration into Monte Carlo simulation
- stepSBLOCYear() ready to replace stepSBLOC() calls in monte-carlo.ts
- monthlyWithdrawal flag can be added to SimulationConfig
