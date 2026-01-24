---
status: resolved
trigger: "Portfolio showing -100% CAGR and -$8M P10 outcome for tech giants portfolio"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:35:00Z
---

## Current Focus

hypothesis: CONFIRMED - Normal distribution sampling with high stddev produces impossible returns
test: Traced through regime-switching return generation
expecting: Find returns < -100% being generated
next_action: Implement fix to floor returns at -100% (total loss)

## Symptoms

expected: Positive CAGR (historically 8-18% for tech giants), positive terminal values
actual: -100.0% CAGR displayed, P10 outcome of -$8M (negative portfolio value impossible)
errors: No explicit errors, but mathematically impossible results
reproduction: Portfolio with AAPL, AMZN, GOOG, NVDA, MSFT at 20% each, $3M starting value, 15 years horizon, Conservative calibration mode, Regime-Switching (Bull/Bear) return model
started: Current behavior - need to verify if Conservative mode calibration is implemented correctly

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:10:00Z
  checked: regime-switching.ts return generation
  found: Returns generated as `mean + stddev * z` where z is standard normal (unbounded)
  implication: With high stddev (e.g., 80% for tech volatility), extreme z values (-3, -4, -5) can produce impossible negative returns like -200% or -360%

- timestamp: 2026-01-24T00:12:00Z
  checked: monte-carlo.ts portfolio value application
  found: `portfolioValue *= (1 + portfolioReturn)` with no floor
  implication: Return of -200% makes multiplier (1 + -2.0) = -1.0, flipping portfolio value to negative

- timestamp: 2026-01-24T00:14:00Z
  checked: metrics.ts CAGR calculation
  found: `if (endValue <= 0) return -1` (lines 62-64)
  implication: When portfolio goes negative, CAGR returns -1 (-100%), which is displayed

- timestamp: 2026-01-24T00:15:00Z
  checked: Stock data for AAPL and NVDA
  found: Historical returns include extreme values like +211.9% (AAPL 1998), +308.36% (NVDA 1997), -82.8% (NVDA 1998)
  implication: Regime calibration on these returns produces very high stddev values (likely 60-100%+)

## Resolution

root_cause: Normal distribution sampling in regime-switching model produces mathematically impossible returns (< -100%) when stddev is high. For volatile tech stocks (AAPL, NVDA, etc.), the bull regime stddev can be 60-100%+. When a z-score of -3 or worse is sampled, return = mean + stddev * z can go below -100%. A -200% return applied as portfolioValue *= (1 + -2.0) = portfolioValue * -1.0 makes the portfolio negative. CAGR calculation correctly returns -1 (-100%) for negative terminal values, but the underlying simulation is generating impossible returns.
fix: Floor annual returns at -100% (total loss) in the return generation. A portfolio position cannot lose more than 100% of its value in a given year.
verification: |
  1. TypeScript build succeeds (npm run build)
  2. Unit test confirms floor logic:
     - Returns < -100% floored to -100%
     - Returns >= -100% unchanged
     - Portfolio value cannot go negative (reaches 0 at total loss)
  3. -200% return (unfloored) would produce -$3M; (floored) produces $0
files_changed:
  - src/simulation/regime-switching.ts: Added Math.max(-1, return) floor in generateRegimeReturns and generateCorrelatedRegimeReturns
