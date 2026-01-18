---
phase: 04-sbloc-engine
plan: 03
subsystem: sbloc
tags: [sbloc, forced-liquidation, haircut, margin-call, simulation-engine, step-function]

dependency-graph:
  requires:
    - phase: 04-01
      provides: SBLOCConfig, SBLOCState, LiquidationEvent types, interest accrual
    - phase: 04-02
      provides: calculateLTV, detectMarginCall, isInWarningZone for engine integration
  provides:
    - calculateLiquidationAmount: forced sale amount to restore safe LTV
    - calculateHaircutLoss: dollar loss from forced liquidation discount
    - executeForcedLiquidation: execute sale and return new state with event
    - canRecoverFromMarginCall: check if portfolio is terminally underwater
    - initializeSBLOCState: create initial state for simulation
    - stepSBLOC: main simulation step function (one year advance)
    - SBLOCYearResult: comprehensive step output type
  affects:
    - 04-04 (SBLOC integration tests will exercise stepSBLOC)
    - Phase 05+ (Monte Carlo will call stepSBLOC in iteration loop)
    - Phase 08 (UI will display liquidation events and trajectory)

tech-stack:
  added: []
  patterns:
    - "Safety buffer pattern: target 80% of maintenance margin after liquidation"
    - "Haircut formula: assetsToSell = excessLoan / (1 - haircutRate)"
    - "Step order: return -> withdrawal -> interest -> LTV -> margin -> liquidate"
    - "Comprehensive result type: SBLOCYearResult with all year events"

key-files:
  created:
    - src/sbloc/liquidation.ts
    - src/sbloc/engine.ts
  modified:
    - src/sbloc/index.ts

key-decisions:
  - "Target LTV after liquidation = maintenanceMargin * 0.8 (safety buffer prevents immediate re-trigger)"
  - "Interest applied inline in stepSBLOC rather than calling accrueInterest (better step order control)"
  - "Portfolio failure check: net worth <= 0 (portfolio - loan)"
  - "Liquidation returns full result: newState, event, portfolioFailed flag"
  - "Step function increments yearsSinceStart to track simulation progress"

patterns-established:
  - "Liquidation amount formula: assetsToSell = excessLoan / (1 - haircut)"
  - "Step function pattern: pure function returning SBLOCYearResult with comprehensive output"
  - "Recovery check pattern: maxProceeds = portfolio * (1 - haircut) vs loanBalance"

metrics:
  duration: 3 min
  completed: 2026-01-18
---

# Phase 04 Plan 03: Forced Liquidation and SBLOC Engine Summary

**Forced liquidation with 80% safety target and main step function integrating all SBLOC components for Monte Carlo simulation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-18T02:29:01Z
- **Completed:** 2026-01-18T02:32:31Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 1

## Accomplishments

- Forced liquidation calculation targeting 80% of maintenance margin for safety buffer
- Haircut loss tracking (5% default forced sale discount)
- Portfolio recovery check to detect terminal failure conditions
- Main SBLOC step function integrating return, withdrawal, interest, margin check, and liquidation
- Complete barrel export with all 5 SBLOC modules (types, interest, ltv, margin-call, liquidation, engine)
- SBLOC-05 (forced liquidation) and SBLOC-06 (loan balance trajectory) requirements satisfied

## Task Commits

Each task was committed atomically:

1. **Task 1: Create forced liquidation module** - `590e8b3` (feat)
2. **Task 2: Create SBLOC engine and barrel export** - `f06a52c` (feat)

## Files Created/Modified

- `src/sbloc/liquidation.ts` (332 lines) - Forced liquidation calculation and execution
- `src/sbloc/engine.ts` (257 lines) - Main simulation step function
- `src/sbloc/index.ts` (63 lines) - Updated barrel export with liquidation and engine

## Decisions Made

1. **Safety buffer at 80% of maintenance margin** - After liquidation, LTV targets 80% of maintenance margin (e.g., 40% if maintenance is 50%). This prevents immediate re-triggering from small further declines.

2. **Inline interest calculation in step function** - Rather than calling `accrueInterest`, the step function applies interest inline. This provides better control over the exact order of operations (withdrawal added first, then interest on total).

3. **Portfolio failure = net worth <= 0** - A portfolio is considered failed when portfolio value minus loan balance is zero or negative, regardless of whether liquidation occurred.

4. **Comprehensive step result type** - `SBLOCYearResult` includes: newState, marginCallTriggered, liquidationEvent, portfolioFailed, interestCharged, withdrawalMade. This enables detailed trajectory tracking for analysis.

5. **Year increment in step** - `yearsSinceStart` is automatically incremented in the step function, tracking simulation progress.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification Results

- [x] `npm run build` succeeds without errors
- [x] `src/sbloc/liquidation.ts` exports calculateLiquidationAmount, calculateHaircutLoss, executeForcedLiquidation, canRecoverFromMarginCall
- [x] `src/sbloc/engine.ts` exports initializeSBLOCState, stepSBLOC, SBLOCYearResult
- [x] `src/sbloc/index.ts` re-exports all types and functions from 5 modules
- [x] stepSBLOC correctly sequences: return -> withdrawal -> interest -> margin check -> liquidation
- [x] All imports resolve correctly between modules
- [x] No TypeScript errors

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Blockers:** None
- **Dependencies satisfied:** Complete SBLOC module ready for Monte Carlo integration
- **Ready for:** 04-04 (integration tests and edge case validation)

### SBLOC Module Status

The sbloc module is now feature-complete for basic BBD simulation:

| File | Purpose | Line Count |
|------|---------|------------|
| types.ts | Type definitions and defaults | 316 |
| interest.ts | Compound interest calculations | 245 |
| ltv.ts | Loan-to-value calculations | 242 |
| margin-call.ts | Margin call detection | 270 |
| liquidation.ts | Forced liquidation | 332 |
| engine.ts | Main step function | 257 |
| index.ts | Barrel export | 63 |
| **Total** | | **1,725** |

---
*Phase: 04-sbloc-engine*
*Completed: 2026-01-18*
