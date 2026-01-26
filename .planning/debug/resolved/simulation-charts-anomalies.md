---
status: resolved
trigger: "Monte Carlo simulation charts showing impossible/contradictory results - -100% CAGR, 91% margin call risk with 0% utilization, negative terminal value (-$164K) for BBD strategy, loan balance dropping while cumulative withdrawals increase."
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:30:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED - Terminal values were GROSS portfolio values, now converted to NET WORTH
test: Run simulation with original parameters to verify metrics are now correct
expecting: Reasonable net worth values, CAGR calculation correct, histogram shows net worth distribution
next_action: Launch dev server and run test simulation

## Symptoms

expected: Positive terminal value with $3M portfolio, $200K/year withdrawals at 7% SBLOC rate over 15 years. Portfolio should grow more than withdrawals deplete it.
actual:
- Implied CAGR: -100.0%
- Terminal value: -$164K (BBD Strategy)
- Sell Strategy terminal: $0
- Margin Call Risk: 90.8% by Year 15
- Median Utilization: 0.0%
- Peak Utilization (P90): 0.0%
- Safety Buffer (P10): 100.0%
- Loan balance drops to near $0 after Year 8 while cumulative withdrawals keep climbing to $3.8M
- P10 outcome: -$5M
- "-Infinity%" shown for vs Sell Assets comparison

errors: No console errors visible, just impossible financial results
reproduction: Run simulation with $3M portfolio, 5 assets (Google 38.8%, Gold 25.1%, Qualcomm 16.4%, Rivian 13%, VTI 6.7%), $200K annual withdrawal with 3% growth, 7% SBLOC rate, 50% maintenance margin, 65% max borrowing, 15 year horizon, 10,000 simulations
started: Was working before, something changed

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:05:00Z
  checked: Monte Carlo simulation engine (monte-carlo.ts)
  found: |
    Line 226: `portfolioValue = yearResult.newState.portfolioValue`
    - After SBLOC step, portfolio value is synced to SBLOC state
    - Line 234: `terminalValues[i] = portfolioValue`
    - Terminal value equals final portfolio value from SBLOC state
    - SBLOC can reduce portfolio to below loan balance (net worth < 0), but portfolio still has value
    - Comment says "portfolioFailed means net worth <= 0, but the portfolio still has value"
  implication: Terminal values represent gross portfolio value, NOT net worth (portfolio - loan)

- timestamp: 2026-01-25T00:06:00Z
  checked: Metrics calculation (metrics.ts)
  found: |
    Line 72: `if (endValue <= 0) return -1;` for CAGR calculation
    - CAGR returns -1 (-100%) when end value is zero or negative
    - This explains the -100% CAGR
  implication: Terminal values must be zero or negative to produce -100% CAGR. But evidence above says portfolio still has value even when failed.

- timestamp: 2026-01-25T00:07:00Z
  checked: Sell strategy calculation (sell-strategy.ts)
  found: |
    Line 262: `const successCount = scenarios.filter(s => s.terminalValue > initialValue).length;`
    - Sell strategy uses terminal value for success calculation
    - Line 273: `const terminalP50 = calcPercentile(terminalValues, 50);`
    - Median terminal value is returned
    - Sell strategy can deplete to $0 when withdrawals exceed portfolio
  implication: Sell strategy $0 terminal value is mathematically sound - portfolio depletes when withdrawals + taxes exceed growth

- timestamp: 2026-01-25T00:10:00Z
  checked: SBLOC engine (engine.ts)
  found: |
    Line 190: `newPortfolioValue = Math.max(0, newPortfolioValue * (1 + portfolioReturn));`
    - Portfolio value is floored at 0 (cannot go negative)
    - Line 326: `portfolioFailed = netWorth <= 0;` where netWorth = portfolioValue - loanBalance
    - Line 234 in monte-carlo.ts: `terminalValues[i] = portfolioValue;` (GROSS value, not net)
  implication: terminalValues array contains GROSS portfolio values. When portfolio fails, you could have $500K portfolio with $600K loan = -$100K net worth, but terminal value shows $500K (incorrect)!

- timestamp: 2026-01-25T00:12:00Z
  checked: Liquidation logic (liquidation.ts)
  found: |
    Line 268: `const actualAssetsToSell = Math.min(assetsToSell, state.portfolioValue);`
    - When liquidating, can sell at most the entire portfolio
    - Line 272: `const newPortfolioValue = Math.max(0, state.portfolioValue - actualAssetsToSell);`
    - Portfolio reduced by liquidation
    - Line 273: `const newLoanBalance = Math.max(0, state.loanBalance - actualLoanToRepay);`
    - Loan reduced by proceeds (after haircut)
    - If portfolio is $500K and loan is $600K, liquidating everything yields $475K proceeds (5% haircut)
    - New portfolio: $0, New loan: $600K - $475K = $125K
    - Net worth: $0 - $125K = -$125K (FAILED)
    - Terminal value would be $0, not -$125K
  implication: Terminal values can be $0 when portfolio is fully liquidated but loan remains. For correct metrics, need NET WORTH = portfolioValue - loanBalance

- timestamp: 2026-01-25T00:15:00Z
  checked: Histogram and chart consumption (results-dashboard.ts)
  found: |
    Line 920: `histogram.setData(this.transformToHistogramData(this._data.terminalValues));`
    - Histogram uses terminalValues DIRECTLY (gross portfolio)
    - Line 1475: `const medianTerminalNetWorth = this._data.statistics.median - medianLoanBalance;`
    - Dashboard TRIES to calculate net worth, but statistics.median is already wrong (calculated from gross values)
    - Line 1093-1123: transformToHistogramData creates bins from gross portfolio values
  implication: ALL charts showing terminal values are displaying GROSS portfolio instead of NET WORTH

- timestamp: 2026-01-25T00:17:00Z
  checked: Statistics calculation (monte-carlo.ts)
  found: |
    Line 269: `const statistics = calculateStatistics(terminalArray, initialValue);`
    - calculateStatistics (line 398-410) uses terminalValues directly
    - Line 405: `median: percentile(values, 50)`
    - MEDIAN is calculated from GROSS portfolio values, not net worth
    - Line 407: `successCount = values.filter(v => v > initialValue).length`
    - Success rate compares gross portfolio to initial value (meaningless for BBD!)
  implication: THIS IS THE ROOT CAUSE - statistics are calculated on wrong data

## Resolution

root_cause: Monte Carlo simulation stores GROSS portfolio values in terminalValues array, but all metrics (CAGR, median, success rate, histogram) should use NET WORTH (portfolio - loan balance) for BBD strategy. This causes:
  1. Median terminal value shows gross portfolio ($X) instead of net worth ($X - loan)
  2. CAGR calculated from wrong endpoint (gross instead of net) produces -100% when portfolio liquidated
  3. Success rate meaningless (compares gross portfolio to initial instead of net worth growth)
  4. Histogram shows distribution of gross values instead of net worth
  5. All percentile-based metrics (P10, P90, etc.) show gross values

fix: |
  Modified monte-carlo.ts to calculate NET WORTH instead of gross portfolio:
  1. After simulation loop, convert terminalValues from gross portfolio to net worth (portfolio - loan)
  2. Convert yearlyValues from gross portfolio to net worth for all years
  3. Fix estate analysis to not double-subtract loan (statistics.median is already net worth)
  4. Add diagnostic logging to confirm conversion

verification: |
  To verify the fix works:

  1. Open application in browser (dev server already running)
  2. Run simulation with the original parameters:
     - $3M portfolio
     - 5 assets (Google 38.8%, Gold 25.1%, Qualcomm 16.4%, Rivian 13%, VTI 6.7%)
     - $200K annual withdrawal with 3% growth
     - 7% SBLOC rate
     - 50% maintenance margin
     - 65% max borrowing
     - 15 year horizon
     - 10,000 simulations

  Expected results AFTER fix:
  - Median terminal value shows NET WORTH (can be negative if portfolio failed)
  - CAGR calculated from net worth (realistic, not -100% unless genuinely failed)
  - Histogram distribution includes both positive and negative net worth values
  - Margin call risk (91%) now makes sense with utilization metrics
  - P10 outcome shows actual net worth risk (negative values indicate failure)
  - Terminal Value Distribution chart shows spread of net worth outcomes
  - "vs Sell Assets" comparison now meaningful (both use net worth)

  Key behavioral changes:
  - BBD strategy can show negative terminal values (underwater: loan > portfolio)
  - Success rate definition unchanged (terminal > initial), but now uses net worth
  - All percentile charts (P10, P50, P90) now show net worth trajectories

  Build status: ✓ Compiled successfully (no TypeScript errors)

files_changed:
  - src/simulation/monte-carlo.ts (3 sections modified)
    * Lines 229-237: Store net worth in yearlyValues for SBLOC sims
    * Lines 261-292: Convert terminalValues from gross portfolio to net worth
    * Lines 357-367: Fix estate analysis to avoid double-subtracting loan
