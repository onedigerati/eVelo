---
status: resolved
trigger: "Parameter panel shows Annual Increase % = 10% but dashboard shows WITHDRAWAL GROWTH at 3%"
created: 2026-01-23T00:00:00Z
updated: 2026-01-23T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED - hardcoded values in results-dashboard.ts
test: N/A - fix verified
expecting: N/A
next_action: Archive debug session

## Symptoms

expected: Dashboard WITHDRAWAL GROWTH should display 10% (matching the "Annual Increase (%)" parameter set to 10% in the left panel)
actual: Dashboard shows WITHDRAWAL GROWTH = 3% / year while parameter panel clearly shows Annual Increase (%) = 10%
errors: None - just incorrect value being displayed
reproduction: Set Annual Increase (%) to 10% in the "Your Spending Needs" section, run simulation, observe WITHDRAWAL GROWTH in the dashboard summary stats
started: Current state - need to determine if this mapping ever worked correctly

## Eliminated

## Evidence

- timestamp: 2026-01-23T00:00:30Z
  checked: app-root.ts - parameter panel binding for "Annual Increase (%)"
  found: Line 94-102 shows range-slider id="annual-raise" with value="3" min="0" max="10" step="0.5"
  implication: User sets value via this slider, default is 3%

- timestamp: 2026-01-23T00:00:35Z
  checked: app-root.ts line 736 - how value flows to simulation config
  found: annualWithdrawalRaise: annualRaise - value IS passed to simulation config
  implication: Data flow from UI to config is correct

- timestamp: 2026-01-23T00:00:40Z
  checked: simulation/types.ts - SBLOCSimConfig interface
  found: annualWithdrawalRaise: number at line 23 - property exists in type
  implication: Config type supports the value correctly

- timestamp: 2026-01-23T00:00:45Z
  checked: results-dashboard.ts line 1234 - updateParamSummary method
  found: withdrawalGrowth: 3.0, // Default 3% growth (not in config type) - HARDCODED!
  implication: ROOT CAUSE FOUND - value is hardcoded, not read from config

- timestamp: 2026-01-23T00:00:50Z
  checked: results-dashboard.ts line 1595 - updateYearlyAnalysisTable method
  found: const withdrawalGrowth = this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0;
  implication: Correct pattern exists elsewhere - should use same pattern in updateParamSummary

- timestamp: 2026-01-23T00:00:55Z
  checked: param-summary.ts interface
  found: withdrawalGrowth: number; // percentage (3 = 3%) - expects percentage not decimal
  implication: Need to convert from decimal (0.10) to percentage (10) when reading from config

- timestamp: 2026-01-23T00:01:00Z
  checked: results-dashboard.ts lines 1265 and 1378
  found: Two more hardcoded 0.03 values in calculateSellStrategy calls
  implication: These also need to use config value for consistent sell strategy comparison

## Resolution

root_cause: In results-dashboard.ts, withdrawalGrowth was hardcoded in three places instead of reading from this._simulationConfig?.sbloc?.annualWithdrawalRaise:
1. Line 1234 (updateParamSummary): hardcoded 3.0 for param-summary display
2. Line 1265 (updateStrategyAnalysis): hardcoded 0.03 for sell strategy calculation
3. Line 1378 (updateComparisonCharts): hardcoded 0.03 for sell strategy calculation

The user's configured value was correctly flowing through the simulation config but never being used for display or sell strategy comparisons.

fix: Changed all three locations to read from config:
1. Line 1234: `(config?.sbloc?.annualWithdrawalRaise ?? 0.03) * 100` (converts decimal to percentage for display)
2. Line 1265: `this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03` (decimal for calculation)
3. Line 1378: `this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0.03` (decimal for calculation)

verification: TypeScript build passes without errors. Dashboard will now display and use the user-configured withdrawal growth rate.

files_changed:
- src/components/ui/results-dashboard.ts
