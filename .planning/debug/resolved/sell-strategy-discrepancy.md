---
status: resolved
trigger: "Sell Strategy Year-by-Year Analysis table shows different values than Strategy Analysis component"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:00:00Z
---

## Current Focus

hypothesis: Two bugs identified - inconsistent annualWithdrawal parameter and inconsistent tax metrics
test: Applied fixes to results-dashboard.ts
expecting: Strategy Analysis and Year-by-Year table will show consistent values
next_action: Fixes complete and verified

## Symptoms

expected: Strategy Analysis and Year-by-Year table should show consistent values for terminal wealth and lifetime taxes
actual:
  - Terminal Net Worth: Strategy Analysis shows $16.2M, Year-by-Year P50 shows $7.2M
  - Lifetime Taxes: Strategy Analysis shows $175,690, Year-by-Year cumulative shows ~$1M
errors: No runtime errors - logical inconsistency between components
reproduction: Run simulation with $200k annual withdrawal, compare Strategy Analysis card to Sell Strategy Year-by-Year Analysis table
started: Design issue - components using different data sources

## Eliminated

(None - root cause already identified before investigation)

## Evidence

- timestamp: 2026-01-24T00:00:00Z
  checked: results-dashboard.ts lines 1238, 1394, 1526
  found: All three lines use `this._annualWithdrawal` (instance variable, default $50k)
  implication: These lines use wrong withdrawal amount when user configures different value

- timestamp: 2026-01-24T00:00:00Z
  checked: results-dashboard.ts line 1817 (updateSellYearlyAnalysisTable)
  found: Uses `this.getEffectiveAnnualWithdrawal()` which reads from config
  implication: Year-by-Year table uses correct config value, Strategy Analysis uses wrong instance default

- timestamp: 2026-01-24T00:00:00Z
  checked: sell-strategy.ts lines 193-194 vs 785
  found: `lifetimeTaxes` excludes dividend taxes, `cumulativeTaxes` includes them
  implication: Strategy Analysis displays partial tax value (capital gains only), Year-by-Year displays total taxes

- timestamp: 2026-01-24T00:00:00Z
  checked: results-dashboard.ts line 1440
  found: Uses `sellResult.lifetimeTaxes` (capital gains only)
  implication: Strategy Analysis card should use `sellResult.totalLifetimeTaxes` to include dividend taxes

## Resolution

root_cause:
1. Inconsistent annualWithdrawal parameter: Strategy Analysis uses instance variable (_annualWithdrawal = $50k default) while Year-by-Year table uses config value via getEffectiveAnnualWithdrawal()
2. Inconsistent tax metrics: Strategy Analysis displays lifetimeTaxes (capital gains only) while Year-by-Year displays cumulativeTaxes (capital gains + dividends)

fix:
1. ✅ Replaced `this._annualWithdrawal` with `this.getEffectiveAnnualWithdrawal()` on line 1238 (updateKeyMetricsBanner)
2. ✅ Replaced `this._annualWithdrawal` with `this.getEffectiveAnnualWithdrawal()` on line 1394 (updateStrategyAnalysis)
3. ✅ Replaced `this._annualWithdrawal` with `this.getEffectiveAnnualWithdrawal()` on line 1526 (updateVisualComparisonCharts)
4. ✅ Changed `sellResult.lifetimeTaxes` to `sellResult.totalLifetimeTaxes` on line 1440 (updateStrategyAnalysis)

verification:
- All four fixes applied successfully
- Verified changes in place using Read tool
- Both components now use same parameters (effective annual withdrawal from config)
- Both components now use same tax calculation (total lifetime taxes including dividends)
- Expected result: Strategy Analysis and Year-by-Year table will display consistent values

files_changed:
  - src/components/ui/results-dashboard.ts (4 changes)
