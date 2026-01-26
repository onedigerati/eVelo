---
status: verifying
trigger: "Continue debugging cagr-calculation-conservative-mode - fix only partially worked"
created: 2026-01-24T01:00:00Z
updated: 2026-01-24T01:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - portfolioValue = 0 when underwater, but portfolio still has value
test: Fixed by syncing MC's portfolioValue with SBLOC's tracked value
expecting: CAGR and P10 will now show actual portfolio values, not zeros
next_action: User verification - run simulation with same params to confirm fix works

## Symptoms

expected: Positive CAGR (historically 8-18% for tech giants), positive terminal values, positive P10 outcome
actual: -100.0% CAGR displayed, P10 outcome of -$8M, but Median Terminal shows $63K (inconsistent!)
errors: No explicit errors, but mathematically impossible results
reproduction: Portfolio with AAPL, AMZN, GOOG, NVDA, MSFT at 20% each, $3M starting value, 15 years horizon, Conservative calibration mode, Regime-Switching return model
started: Previous fix (flooring returns at -100%) improved success rate from 2% to 32%, but core issue persists

## Eliminated

- hypothesis: Individual asset returns going below -100%
  evidence: Floor at -1 verified in generateCorrelatedRegimeReturns (lines 193-197), generateRegimeReturns (line 105)
  timestamp: 2026-01-24T01:05:00Z

- hypothesis: Portfolio weights not normalized (summing to 100 instead of 1)
  evidence: app-root.ts line 1074 shows `weight: weightPercent / 100` - correctly converts
  timestamp: 2026-01-24T01:07:00Z

## Evidence

- timestamp: 2026-01-24T01:00:00Z
  checked: Previous debug file and fix
  found: Return floor at -100% was added in 3 locations in regime-switching.ts
  implication: Individual asset returns cannot go below -100%, but issue persists

- timestamp: 2026-01-24T01:05:00Z
  checked: CAGR calculation path
  found: CAGR uses statistics.median from monte-carlo.ts (line 381), returns -1 when endValue <= 0
  implication: If CAGR is -100%, then median terminal portfolio value is <= 0

- timestamp: 2026-01-24T01:07:00Z
  checked: Symptom inconsistency
  found: "Median Terminal: $63K" vs "CAGR: -100%" are inconsistent. If median is $63K and initial is $3M, CAGR should be ~-24%, not -100%
  implication: TWO different "median" values are being displayed - statistics.median vs medianTerminalNetWorth

- timestamp: 2026-01-24T01:08:00Z
  checked: results-dashboard.ts display logic
  found: Key metrics banner shows `medianTerminalNetWorth = statistics.median - medianLoanBalance` (line 1257)
  implication: "Median Terminal" in key metrics is NET WORTH, not portfolio value

- timestamp: 2026-01-24T01:09:00Z
  checked: CAGR source
  found: CAGR calculated from `statistics.median` (raw portfolio value) in computeExtendedStats (line 982)
  implication: If CAGR is -100%, the raw median PORTFOLIO VALUE is <= 0

- timestamp: 2026-01-24T01:15:00Z
  checked: monte-carlo.ts line 216-218 (before fix)
  found: `if (yearResult.portfolioFailed) { portfolioValue = 0; }`
  implication: portfolioFailed means net worth <= 0, but code was setting portfolioValue = 0. This is semantically wrong - portfolio still has value even when underwater

- timestamp: 2026-01-24T01:20:00Z
  checked: SBLOC engine tracking
  found: SBLOC tracks its own portfolioValue independently (engine.ts line 178). After liquidations, SBLOC's newState.portfolioValue reflects actual value after forced sales
  implication: MC should sync to SBLOC's portfolio value, not zero it out

- timestamp: 2026-01-24T01:25:00Z
  checked: Fix implementation
  found: Replaced `portfolioValue = 0` with `portfolioValue = yearResult.newState.portfolioValue`
  implication: Terminal values now reflect actual portfolio values after SBLOC processing

## Resolution

root_cause: CONFIRMED - When portfolioFailed=true (net worth <= 0), monte-carlo.ts line 217 sets portfolioValue = 0. But portfolioFailed means NET WORTH (portfolio - loan) <= 0, NOT that portfolio value is 0. Example: $500K portfolio with $600K loan has negative net worth but the portfolio is worth $500K, not $0. With many iterations failing (68% with 32% success rate), more than 50% of terminal values are 0, making the median = 0, causing CAGR = -100%.
fix: Don't zero out portfolioValue when portfolioFailed. Instead, let the simulation continue with the actual SBLOC-tracked portfolio value. The portfolioFailed flag should be used for analysis only, not to override the portfolio value.
verification: |
  1. TypeScript build: PASSED (npm run build)
  2. Fix logic:
     - Before: portfolioFailed -> portfolioValue = 0 (WRONG: portfolio still has value)
     - After: portfolioFailed -> portfolioValue = SBLOC's newState.portfolioValue (CORRECT: actual value after liquidations)
  3. Expected behavior change:
     - Terminal values will now reflect actual portfolio values, not zeros
     - Median will be the median portfolio value, not zero
     - CAGR will be calculated from actual median (not -100% from zero median)
  4. User verification needed: Run simulation with same params to confirm improved results
files_changed:
  - src/simulation/monte-carlo.ts: Sync portfolioValue with SBLOC state instead of zeroing out on failure
