---
phase: 20-financial-calculation-audit
plan: 10
title: Sell Strategy UI Configuration
subsystem: ui
tags: [sell-strategy, ui, cost-basis, dividend-yield]
requires:
  - 20-01  # Risk Area Classification
  - 20-03  # Wire Configurable Liquidation Target
  - 20-04  # Wire Configurable Sell Config
provides:
  - UI controls for Sell strategy cost basis ratio
  - UI controls for Sell strategy dividend yield
  - Configuration passed through to all calculateSellStrategy calls
affects:
  - BBD vs Sell comparison accuracy
  - Strategy analysis section
  - Visual comparison charts
tech-stack:
  added: []
  patterns:
    - Simulation config extension pattern
    - UI config to calculation wiring
key-files:
  created: []
  modified:
    - src/components/app-root.ts
    - src/simulation/types.ts
    - src/components/ui/results-dashboard.ts
decisions:
  - id: sell-strategy-section
    decision: Created dedicated "Sell Strategy Comparison" param-section
    rationale: Keeps Sell-specific configuration separate from Tax Modeling
  - id: dividend-yield-separate
    decision: Sell strategy dividend yield is separate from Tax Modeling dividend yield
    rationale: Tax Modeling applies to BBD simulation; Sell strategy uses its own config for comparison
metrics:
  duration: 4 min
  completed: 2026-01-25
---

# Phase 20 Plan 10: Sell Strategy UI Configuration Summary

Added UI controls for cost basis ratio and dividend yield, exposing these as configurable parameters for the Sell strategy comparison calculations.

## What Was Done

### Task 1: Add Sell Strategy Inputs (bcc137d)

Added a new "Sell Strategy Comparison" param-section to the sidebar:

```html
<param-section title="Sell Strategy Comparison">
  <range-slider id="sell-cost-basis-ratio" value="40" min="5" max="95">
  <range-slider id="sell-dividend-yield" value="2" min="0" max="10">
</param-section>
```

Extended SimulationConfig with SellStrategyConfig interface:

```typescript
export interface SellStrategyConfig {
  costBasisRatio: number;  // 0.05-0.95
  dividendYield: number;   // 0-0.10
}
```

### Task 2: Wire Inputs to Calculation (cd03d22)

Updated results-dashboard.ts with helper methods:

```typescript
private getEffectiveCostBasisRatio(): number {
  return this._simulationConfig?.sellStrategy?.costBasisRatio ?? 0.4;
}

private getEffectiveSellDividendYield(): number {
  return this._simulationConfig?.sellStrategy?.dividendYield ?? 0.02;
}
```

Updated all 4 calculateSellStrategy call sites:
- updateKeyMetricsBanner
- updateStrategyAnalysis
- updateVisualComparisonCharts
- updateSellYearlyAnalysisTable

## UI Configuration

| Input | Range | Default | Purpose |
|-------|-------|---------|---------|
| Cost Basis Ratio | 5-95% | 40% | Fraction of portfolio that is original cost |
| Dividend Yield | 0-10% | 2% | Annual dividend yield for tax calculation |

## Impact

- Lower cost basis = more embedded gains = higher capital gains taxes on sale
- Higher dividend yield = more dividend taxes in Sell strategy
- Users can now model their actual portfolio characteristics
- BBD vs Sell comparison is more accurate for individual situations

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] TypeScript compiles without errors
- [x] Cost basis ratio configurable 5-95%
- [x] Dividend yield configurable 0-10%
- [x] Changes will trigger Sell strategy recalculation (via simulation re-run)
- [x] Tooltips explain what each setting means
