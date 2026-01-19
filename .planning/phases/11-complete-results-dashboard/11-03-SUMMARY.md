---
phase: 11-complete-results-dashboard
plan: 03
subsystem: simulation
tags: [monte-carlo, sbloc, margin-call, estate-analysis]

dependency-graph:
  requires: ["04-sbloc-engine", "03-simulation-engine", "11-01", "11-02"]
  provides: ["sbloc-integrated-simulation", "margin-call-statistics", "estate-analysis"]
  affects: ["future-sbloc-charts", "bbd-comparison-visualization"]

tech-stack:
  added: []
  patterns: ["sbloc-state-tracking", "margin-call-aggregation", "estate-comparison"]

key-files:
  created: []
  modified:
    - src/simulation/types.ts
    - src/simulation/monte-carlo.ts

decisions:
  - id: sbloc-optional-config
    choice: "Optional sbloc field in SimulationConfig"
    rationale: "Backward compatible - simulations without SBLOC continue to work"
  - id: margin-call-tracking
    choice: "Track first margin call year per iteration"
    rationale: "Enables cumulative probability calculation"
  - id: estate-analysis-simplified
    choice: "Simplified tax calculation (all gains above initial at 23.8%)"
    rationale: "Good approximation for BBD comparison without cost basis tracking"

metrics:
  duration: 4 min
  completed: 2026-01-19
---

# Phase 11 Plan 03: SBLOC Integration into Monte Carlo Summary

**One-liner:** Integrated SBLOC engine into Monte Carlo loop with loan balance percentiles, margin call statistics, and estate analysis output.

## What Was Built

### 1. Extended Simulation Types (src/simulation/types.ts)

Added SBLOC-specific configuration and output types:

- `SBLOCSimConfig`: Simulation-level SBLOC parameters (targetLTV, interestRate, annualWithdrawal, maintenanceMargin)
- `SBLOCTrajectory`: Loan balance percentiles by year (p10, p25, p50, p75, p90) plus cumulative withdrawals and interest
- `MarginCallStats`: Per-year margin call probabilities (annual and cumulative)
- `EstateAnalysis`: BBD vs Sell comparison (bbdNetEstate, sellNetEstate, bbdAdvantage)

### 2. SBLOC Integration in Simulation Loop (src/simulation/monte-carlo.ts)

Added SBLOC state tracking during simulation:

- Import SBLOC engine functions (`initializeSBLOCState`, `stepSBLOC`)
- Track SBLOC state per iteration per year (`sblocStates: SBLOCState[][]`)
- Track first margin call year per iteration (`marginCallYears: number[]`)
- Step SBLOC forward each year after portfolio return is applied
- Handle portfolio failure from forced liquidation

### 3. SBLOC Result Aggregation

After simulation loop, compute:

- **SBLOCTrajectory**: Aggregate loan balances across iterations into percentile bands
- **marginCallStats**: Count margin calls per year for probability calculation
- **estateAnalysis**: Compare BBD net estate (portfolio - loan) vs Sell net estate (portfolio - taxes)

## Key Code Patterns

### SBLOC State Initialization
```typescript
const prevState = year === 0
  ? initializeSBLOCState(sblocEngineConfig, initialValue)
  : sblocStates[i][year - 1];
```

### Margin Call Statistics Computation
```typescript
function computeMarginCallStats(marginCallYears, timeHorizon, iterations) {
  for (let year = 1; year <= timeHorizon; year++) {
    const callsThisYear = marginCallYears.filter(y => y === year).length;
    const callsByYear = marginCallYears.filter(y => y > 0 && y <= year).length;
    stats.push({
      year,
      probability: (callsThisYear / iterations) * 100,
      cumulativeProbability: (callsByYear / iterations) * 100,
    });
  }
}
```

### Estate Analysis
```typescript
const bbdNetEstate = medianPortfolio - medianLoan;
const embeddedGains = Math.max(0, medianPortfolio - initialValue);
const taxesIfSold = embeddedGains * 0.238;
const sellNetEstate = medianPortfolio - taxesIfSold;
estateAnalysis = {
  bbdNetEstate,
  sellNetEstate,
  bbdAdvantage: bbdNetEstate - sellNetEstate,
};
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npm run build` succeeds without errors
- [x] `npm run dev` starts without errors
- [x] Simulation types extended with SBLOC structures
- [x] SBLOC data included in simulation output when config provided
- [x] Backward compatible (simulation without SBLOC config works)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| e720905 | feat | Extend simulation types with SBLOC data structures |
| 45defa7 | feat | Integrate SBLOC stepping into simulation loop |
| 064e9b7 | feat | Aggregate SBLOC results after simulation |

## Next Steps

The simulation now produces all data needed for SBLOC-related visualizations:

1. **Margin Call Risk Chart**: Use `marginCallStats` for per-year probability display
2. **SBLOC Balance Chart**: Use `sblocTrajectory.loanBalance` percentiles
3. **BBD Comparison Chart**: Use `estateAnalysis` for bar chart comparison
4. **Extended Statistics**: Use margin call probability from `marginCallStats[timeHorizon-1].cumulativeProbability`

These can be wired up in the results dashboard in a future plan.
