---
phase: 19-sell-strategy-accuracy
plan: 02
subsystem: calculations
tags: [sell-strategy, dividend-taxes, tax-modeling, monte-carlo]

# Dependency graph
requires:
  - phase: 11-complete-results-dashboard
    provides: Sell strategy calculation framework
provides:
  - Dividend tax modeling in Sell strategy
  - Annual dividend tax deduction from portfolio
  - Separate tracking of capital gains vs dividend taxes
  - Total lifetime tax aggregation
affects: [19-03, 19-04, results-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dividend tax deducted at start of each year before withdrawal"
    - "Default 2% dividend yield (S&P 500 historical average)"
    - "Qualified dividend tax rate defaults to capital gains rate"
    - "Separate tracking for capital gains and dividend taxes"

key-files:
  created: []
  modified:
    - src/calculations/sell-strategy.ts

key-decisions:
  - "Default dividend yield 2% based on S&P 500 historical average"
  - "Treat all dividends as qualified (taxed at capital gains rate)"
  - "Dividend taxes reduce portfolio (Sell) vs borrowed to pay (BBD)"
  - "Dividend tax applied first, before withdrawal and growth"

patterns-established:
  - "Order of operations: 1) Dividend tax, 2) Withdrawal + capital gains tax, 3) Growth"
  - "totalLifetimeTaxes aggregates both capital gains and dividend taxes"
  - "Median dividend taxes calculated across all scenarios"

# Metrics
duration: 11min
completed: 2026-01-24
---

# Phase 19 Plan 02: Dividend Tax Modeling Summary

**Dividend tax calculation added to Sell strategy with 2% default yield, annual deduction from portfolio before withdrawals, and separate tracking of capital gains vs dividend taxes**

## Performance

- **Duration:** 11 min
- **Started:** 2026-01-24T19:28:37Z
- **Completed:** 2026-01-24T19:39:55Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Extended SellStrategyConfig with dividendYield and dividendTaxRate fields
- Implemented dividend tax deduction in both scenario functions (runSingleSellScenario and runInterpolatedScenario)
- Added separate tracking for lifetimeDividendTaxes and totalLifetimeTaxes in results
- Documented order of operations: dividend tax → withdrawal → growth

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend SellStrategyConfig with dividend fields** - `fcf2da3` (feat)
2. **Task 2: Implement dividend tax calculation in scenario functions** - `6dc0a62` (feat)
3. **Task 3: Update interpolated scenarios helper** - (included in Task 2)

## Files Created/Modified
- `src/calculations/sell-strategy.ts` - Added dividend tax configuration fields, calculation logic in year loop, and result aggregation

## Decisions Made

**1. Default dividend yield of 2%**
- Rationale: S&P 500 historical average is ~1.5-2%
- Makes Sell strategy calculations realistic without requiring user input
- User can override via optional config field

**2. Treat all dividends as qualified**
- Rationale: Simplifies tax calculation (qualified dividends taxed at capital gains rate)
- Conservative assumption for long-term investors
- Note added to JSDoc for transparency

**3. Dividend taxes paid from portfolio (Sell) vs borrowed (BBD)**
- Rationale: Key difference between strategies
- Sell strategy: liquidate assets to pay dividend taxes
- BBD strategy: borrow against portfolio to pay taxes
- Accelerates portfolio depletion in Sell strategy

**4. Order of operations: dividend tax first**
- Rationale: Matches reference implementation
- Dividend income calculated on full portfolio value
- Reduces portfolio before withdrawal calculation
- More accurate tax drag modeling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**File linter interference:**
- Problem: File was being modified by linter/formatter between Edit operations
- Solution: Used Python scripts to apply multiple changes atomically
- Impact: Minor delay, no functional issues

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:**
- Dividend tax modeling complete
- All configuration fields documented
- Default values established
- Tests pass, build succeeds

**For comparison accuracy:**
- Sell strategy now models both capital gains and dividend taxes
- Apples-to-apples comparison with BBD strategy requires both plans (19-01 and 19-02)
- Plan 19-01 handles order of operations fix
- Plan 19-02 handles dividend tax modeling
- Combined effect: more accurate Sell strategy disadvantage calculation

**Metrics affected:**
- `lifetimeDividendTaxes` - new field in SellStrategyResult
- `totalLifetimeTaxes` - now includes both tax types
- Terminal values will be lower due to dividend tax drag
- Success rate may decrease (portfolio depletes faster)

---
*Phase: 19-sell-strategy-accuracy*
*Completed: 2026-01-24*
