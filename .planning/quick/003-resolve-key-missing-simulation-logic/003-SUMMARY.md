---
phase: quick
plan: 003
subsystem: simulation
tags: [monte-carlo, sbloc, configuration]

# Dependency graph
requires:
  - phase: 03-simulation-engine
    provides: Monte Carlo simulation with SBLOC integration
  - phase: 04-sbloc-engine
    provides: stepSBLOC and initializeSBLOCState functions
  - phase: 11-complete-results-dashboard
    provides: SBLOCSimConfig interface with all fields
provides:
  - Full SBLOC config parameter support in simulation
  - Annual withdrawal raises
  - Configurable liquidation haircut
  - Configurable withdrawal start year
  - Initial LOC balance support
affects: [simulation accuracy, sbloc customization, future config additions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Extract config values before loop for performance
    - Helper functions for cumulative calculations with raises

key-files:
  created: []
  modified:
    - src/simulation/monte-carlo.ts

key-decisions:
  - "Extract SBLOC config values before iteration loops for cleaner code"
  - "Calculate effective withdrawal per-year with raise formula: base * (1 + rate)^(years-1)"
  - "Add helper functions for cumulative withdrawal calculations"

patterns-established:
  - "Withdrawal raise formula: base * Math.pow(1 + raiseRate, yearsOfWithdrawals - 1)"
  - "Calculate cumulative values accounting for variable rates"

# Metrics
duration: 11min
completed: 2026-01-22
---

# Quick Task 003: Resolve Key Missing Simulation Logic

**Wired 4 missing SBLOC config parameters (liquidationHaircut, withdrawalStartYear, annualWithdrawalRaise, initialLocBalance) to monte-carlo.ts simulation**

## Performance

- **Duration:** 11 min
- **Started:** 2026-01-22T04:31:49Z
- **Completed:** 2026-01-22T04:43:06Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced hardcoded `liquidationHaircut: 0.05` with `config.sbloc.liquidationHaircut`
- Replaced hardcoded `startYear: 0` with `config.timeline?.withdrawalStartYear ?? 0`
- Implemented annual withdrawal raises using `config.sbloc.annualWithdrawalRaise`
- Passed `config.sbloc.initialLocBalance` to `initializeSBLOCState`
- Updated `cumulativeWithdrawals` and `cumulativeInterest` calculations to account for raises

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire SBLOC config parameters in monte-carlo.ts** - `4c93afd` (fix)

## Files Created/Modified
- `src/simulation/monte-carlo.ts` - Wired missing SBLOC config parameters, added helper functions for cumulative withdrawal calculations

## Decisions Made

**Extract SBLOC config values before iteration loops:**
- Set up `sblocBaseWithdrawal`, `sblocRaiseRate`, and `sblocWithdrawalStartYear` before the iteration loop
- Cleaner code with config values available throughout

**Calculate effective withdrawal per-year:**
- Formula: `base * Math.pow(1 + raiseRate, yearsOfWithdrawals - 1)`
- Year 0 uses base withdrawal, subsequent years apply compound raise
- `yearsOfWithdrawals = Math.max(0, year - withdrawalStartYear)` handles start delay

**Add helper functions for cumulative calculations:**
- `calculateCumulativeWithdrawals()` for trajectory data
- `calculateCumulativeWithdrawalAtYear()` for interest calculation
- Both account for withdrawal start year and annual raises

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward. All 4 config parameters already existed in `SBLOCSimConfig` interface and the SBLOC engine functions already supported them.

## Verification

- TypeScript compiles without errors (`tsc --noEmit`)
- Build succeeds (`npm run build`)
- No hardcoded `0.05` or `startYear: 0` in SBLOC section
- Config values properly used:
  - `config.sbloc.liquidationHaircut` on line 150
  - `config.timeline?.withdrawalStartYear` on line 92
  - `config.sbloc.annualWithdrawalRaise` on line 91
  - `config.sbloc.initialLocBalance` on line 158

## Next Phase Readiness

Simulation now fully respects all SBLOC configuration parameters. Users can customize:
- Liquidation haircut rate
- Withdrawal start year (delay withdrawals)
- Annual withdrawal raise percentage
- Initial LOC balance (existing debt)

---
*Quick Task: 003*
*Completed: 2026-01-22*
