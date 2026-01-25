---
phase: 23-reference-methodology-alignment
plan: 06
subsystem: simulation
tags: [monte-carlo, sbloc, dividend-tax, bbd-strategy, tax-modeling]

# Dependency graph
requires:
  - phase: 23-05
    provides: Integrated sell strategy with same market returns as BBD
provides:
  - BBD dividend tax handling via SBLOC borrowing
  - Tax modeling configuration wired to SBLOC engine
  - Estate analysis with dividend tax comparison
  - Debug stats tracking dividend taxes borrowed
affects: [23-07, 23-08, 23-09, tax-modeling, estate-comparison]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BBD borrows to pay dividend taxes (portfolio stays whole)"
    - "Sell strategy liquidates to pay same taxes (reduces compound growth)"
    - "Dividend taxes only applied once per year (monthly mode: first month only)"

key-files:
  created: []
  modified:
    - src/sbloc/types.ts
    - src/sbloc/engine.ts
    - src/sbloc/monthly.ts
    - src/simulation/monte-carlo.ts
    - src/simulation/types.ts

key-decisions:
  - "Dividend tax applied after returns, before withdrawals (matches reference order)"
  - "Monthly mode: dividend tax only in first month (avoid 12x application)"
  - "Estate analysis uses integrated sell strategy median (fair comparison)"
  - "Dividend taxes tracked in loan balance (forgiven at death by step-up)"

patterns-established:
  - "Tax modeling configuration extracted to SBLOC config"
  - "Dividend tax borrowing increases LOC balance, not portfolio reduction"
  - "Console logging shows BBD vs Sell tax handling difference"

# Metrics
duration: 10.5min
completed: 2026-01-25
---

# Phase 23 Plan 06: BBD Dividend Tax Borrowing

**BBD borrows via SBLOC to pay dividend taxes (portfolio stays whole), while Sell strategy liquidates to pay same taxes (reduces compound growth) - key BBD advantage tracked in estate analysis**

## Performance

- **Duration:** 10.5 min
- **Started:** 2026-01-25T22:10:54Z
- **Completed:** 2026-01-25T22:21:21Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- BBD dividend tax handling via SBLOC borrowing (portfolio preserved)
- Tax modeling config wired to SBLOC engine (dividendYield, dividendTaxRate)
- Estate analysis tracks dividend taxes borrowed vs Sell taxes paid
- Debug stats include dividend tax metrics (median, mean, max)
- Console logging shows BBD advantage: borrow vs liquidate

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dividend tax handling to SBLOC step function** - `37af3a0` (feat)
2. **Task 2: Wire dividend tax config through Monte Carlo** - `2e3adce` (feat)
3. **Task 3: Update estate analysis for dividend tax borrowing** - `ebeda51` (feat)

## Files Created/Modified

- `src/sbloc/types.ts` - Added dividendYield and dividendTaxRate to SBLOCConfig
- `src/sbloc/engine.ts` - Implemented dividend tax borrowing in stepSBLOC, added dividendTaxBorrowed to result
- `src/sbloc/monthly.ts` - Dividend tax only in first month (monthly mode), aggregated in year result
- `src/simulation/monte-carlo.ts` - Wire tax config to SBLOC, track dividend taxes, estate analysis integration
- `src/simulation/types.ts` - Added dividendTaxesBorrowed to SBLOCDebugStats, medianDividendTaxesBorrowed to EstateAnalysis

## Decisions Made

**Dividend tax order of operations:**
- Applied AFTER portfolio returns, BEFORE withdrawals
- Matches reference application methodology (see 23-REFERENCE-METHODOLOGY.md section 3)
- Ensures tax calculated on current year portfolio value

**Monthly mode handling:**
- Dividend tax only applied in first month of year (month 0)
- Prevents 12x multiplication of annual tax
- Aggregated correctly in year result

**Estate analysis integration:**
- Uses integrated sell strategy median for fair comparison
- Tracks median dividend taxes borrowed (in loan at death, forgiven)
- Logs detailed breakdown: BBD advantage with tax comparison

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation straightforward following reference methodology.

## Next Phase Readiness

**Ready for:**
- 23-07: Bootstrap correlation preservation (shared year index)
- 23-08: 4-regime system with recovery state
- 23-09: Further reference methodology alignment

**Tax modeling now complete:**
- BBD borrows dividend taxes via SBLOC (portfolio stays whole)
- Sell liquidates to pay dividend taxes (reduces compound growth)
- Estate analysis properly compares both strategies
- Debug stats track dividend taxes borrowed

**Key insight delivered:**
BBD's ability to borrow dividend taxes (rather than liquidate) is a measurable advantage. These taxes are "in the loan" at death and forgiven by step-up basis, while Sell strategy must pay the same taxes by selling assets (reducing compound growth potential).

---
*Phase: 23-reference-methodology-alignment*
*Completed: 2026-01-25*
