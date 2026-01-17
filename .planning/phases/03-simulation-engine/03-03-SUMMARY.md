---
phase: 03-simulation-engine
plan: 03
subsystem: simulation
tags: [regime-switching, markov-chain, monte-carlo, hamilton-model]

dependency-graph:
  requires:
    - 02-02 (correlation/distribution functions)
    - 03-01 (simulation types)
  provides:
    - nextRegime function for Markov transitions
    - generateRegimeReturns for single-asset regime simulation
    - generateCorrelatedRegimeReturns for multi-asset regime simulation
  affects:
    - 03-04 (main simulation engine will use regime-switching)

tech-stack:
  added: []
  patterns:
    - "Markov chain regime transitions"
    - "Hamilton (1989) regime-switching model"
    - "Cumulative probability selection"
    - "Shared regime sequence for correlated multi-asset returns"

key-files:
  created:
    - src/simulation/regime-switching.ts
  modified:
    - src/math/distributions.ts

decisions:
  - title: "Seeded RNG Support"
    choice: "Add optional rng parameter to normalRandom, lognormalRandom, correlatedSamples"
    rationale: "Enable reproducible Monte Carlo simulations; required for regime-switching functions"
  - title: "Shared Regime Sequence"
    choice: "All assets share same regime in generateCorrelatedRegimeReturns"
    rationale: "Realistic - markets move together during bull/bear/crash periods"
  - title: "Regime-First Generation"
    choice: "Generate complete regime sequence before generating returns"
    rationale: "Cleaner separation of concerns, enables regime analysis"

metrics:
  duration: "3 min"
  completed: "2026-01-17"
---

# Phase 03 Plan 03: Regime-Switching Returns Summary

Markov regime-switching return generation with configurable transition matrix and per-regime distributions (Hamilton 1989 model).

## Overview

Implemented a complete regime-switching return generation system that models realistic bull/bear/crash market sequences. Markets transition according to a Markov chain with configurable transition probabilities, and each regime generates returns from its own distribution.

## Tasks Completed

| # | Task | Commit | Key Output |
|---|------|--------|------------|
| 1 | Implement regime transition function | b8d162a | nextRegime with cumulative probability selection |
| 2 | Implement regime-based return generation | e61bac1 | generateRegimeReturns with regime tracking |
| 3 | Add multi-asset regime returns helper | 315fcfb | generateCorrelatedRegimeReturns with correlation structure |

## Key Implementation Details

### Regime Transition Function (nextRegime)

```typescript
export function nextRegime(
  current: MarketRegime,
  matrix: TransitionMatrix,
  rng: () => number
): MarketRegime
```

- Cumulative probability selection from transition matrix
- Accepts custom RNG for reproducibility
- Returns typed MarketRegime ('bull' | 'bear' | 'crash')

### Single-Asset Regime Returns (generateRegimeReturns)

```typescript
export function generateRegimeReturns(
  years: number,
  rng: () => number,
  initialRegime?: MarketRegime,
  matrix?: TransitionMatrix,
  params?: RegimeParamsMap
): RegimeReturnsResult
```

- Returns both returns array and regime sequence
- Defaults to bull initial regime
- Uses Box-Muller via normalRandom for return generation

### Multi-Asset Correlated Returns (generateCorrelatedRegimeReturns)

```typescript
export function generateCorrelatedRegimeReturns(
  years: number,
  numAssets: number,
  correlationMatrix: number[][],
  rng: () => number,
  ...
): CorrelatedRegimeReturnsResult
```

- All assets share same regime sequence (realistic market behavior)
- Uses Cholesky decomposition via correlatedSamples for correlation
- Returns [numAssets][years] structure for portfolio calculations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added seeded RNG support to distribution functions**

- **Found during:** Pre-task analysis
- **Issue:** normalRandom, lognormalRandom, correlatedSamples used Math.random() internally, preventing reproducible simulations
- **Fix:** Added optional `rng` parameter defaulting to Math.random
- **Files modified:** src/math/distributions.ts
- **Commit:** bb75cba

**2. [Rule 2 - Missing Critical] Changed correlatedSamples signature**

- **Found during:** Pre-task analysis
- **Issue:** Original signature generated n sets of k samples, but regime-switching needs k samples for n assets per year
- **Fix:** Changed to accept mean/stddev parameters and return single sample set
- **Files modified:** src/math/distributions.ts
- **Commit:** bb75cba

## Verification Results

- [x] `npm run build` succeeds without errors
- [x] nextRegime produces valid MarketRegime values
- [x] generateRegimeReturns produces correct length arrays
- [x] generateCorrelatedRegimeReturns produces [numAssets][years] shaped output
- [x] All functions accept seeded RNG for reproducibility
- [x] File has 182 lines (min_lines: 60 requirement met)

## Architecture Notes

The regime-switching module follows Hamilton (1989) methodology:

1. **Regime Persistence**: Bull markets are highly persistent (97% stay bull), bear markets have moderate persistence (95%), and crashes are short-lived (60%)

2. **Distribution Parameters**: Each regime has distinct mean and volatility:
   - Bull: +12% return, 12% volatility
   - Bear: -8% return, 20% volatility
   - Crash: -30% return, 35% volatility

3. **Correlation Handling**: Multi-asset returns maintain correlation structure within each regime through Cholesky decomposition

## Next Phase Readiness

- **Blockers:** None
- **Dependencies satisfied:** All functions exported and type-safe
- **Ready for:** 03-04 (Main simulation engine can now use regime-switching for `resamplingMethod: 'regime'`)
