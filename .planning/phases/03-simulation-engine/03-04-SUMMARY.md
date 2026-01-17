---
phase: 03-simulation-engine
plan: 04
subsystem: simulation
tags: [monte-carlo, web-worker, comlink, simulation-engine]

dependency-graph:
  requires:
    - 03-01 (simulation types and vite-plugin-comlink setup)
    - 03-02 (bootstrap resampling functions)
    - 03-03 (regime-switching return generation)
  provides:
    - runMonteCarlo core simulation function
    - simulation.worker.ts Web Worker entry point
    - runSimulation main thread API
    - cancelSimulation for abort support
  affects:
    - Phase 04 (Portfolio scenarios will consume simulation output)
    - Phase 08 (UI will call runSimulation with progress)

tech-stack:
  added:
    - seedrandom (seeded random number generation)
  patterns:
    - "Batch processing with event loop yielding"
    - "AbortSignal for cancellation"
    - "Comlink.transfer() for zero-copy typed array transfer"
    - "Lazy worker initialization"
    - "Comlink.proxy() for cross-thread callbacks"

key-files:
  created:
    - src/simulation/monte-carlo.ts
    - src/simulation/simulation.worker.ts
  modified:
    - src/simulation/index.ts
    - package.json (seedrandom dependency)

decisions:
  - title: "Batch Size for Progress"
    choice: "BATCH_SIZE = 1000 iterations"
    rationale: "Balance between progress granularity and overhead; yields ~10-100 progress updates for typical iteration counts"
  - title: "Seeded RNG via seedrandom"
    choice: "Use seedrandom library for reproducible simulation"
    rationale: "Industry-standard seeded PRNG; enables reproducible results for debugging and verification"
  - title: "Yield Between Batches"
    choice: "setTimeout(resolve, 0) between batch iterations"
    rationale: "Prevents worker from blocking; allows progress messages to be sent even though worker is single-threaded"

metrics:
  duration: "3 min"
  completed: "2026-01-17"
---

# Phase 03 Plan 04: Monte Carlo Simulation Summary

Monte Carlo core with Web Worker, progress reporting, and cancellation support via Comlink for non-blocking simulation (SIM-01, SIM-02, SIM-03, SIM-08).

## Overview

Completed the simulation engine stack with three layers:
1. **monte-carlo.ts** - Core simulation loop with batch processing and AbortSignal support
2. **simulation.worker.ts** - Web Worker entry point with Comlink for cross-thread communication
3. **index.ts** - Main thread API with lazy worker initialization and progress proxy

## Tasks Completed

| # | Task | Commit | Key Output |
|---|------|--------|------------|
| 1 | Create Monte Carlo core simulation | 6f58f49 | runMonteCarlo with batch processing, cancellation, all resampling methods |
| 2 | Create Web Worker with Comlink | d16e962 | simulate(), cancel(), healthCheck() worker functions |
| 3 | Create main thread API | a66258e | runSimulation(), cancelSimulation(), terminateWorker() exports |

## Key Implementation Details

### Monte Carlo Core (runMonteCarlo)

```typescript
export async function runMonteCarlo(
  config: SimulationConfig,
  portfolio: PortfolioConfig,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<SimulationOutput>
```

- Batch processing with BATCH_SIZE = 1000 iterations per batch
- AbortSignal check between batches for cancellation
- Seeded RNG via seedrandom for reproducibility
- Supports all three resampling methods (simple, block, regime)
- Calculates terminal values, yearly percentiles, and statistics
- Yields to event loop between batches (setTimeout 0)

### Web Worker (simulation.worker.ts)

```typescript
export async function simulate(...): Promise<SimulationOutput>
export function cancel(): void
export function healthCheck(): string
```

- AbortController wraps runMonteCarlo for cancellation
- Comlink.transfer() for zero-copy Float64Array transfer
- Health check enables main thread to verify worker readiness

### Main Thread API (index.ts)

```typescript
export async function runSimulation(...): Promise<SimulationOutput>
export function cancelSimulation(): void
export function terminateWorker(): void
```

- Lazy worker initialization (created on first use)
- Comlink.proxy() wraps progress callback for cross-thread calls
- Re-exports bootstrap and regime-switching functions for direct use
- Health check before simulation ensures worker is ready

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npm run build` succeeds without errors
- [x] `npm run dev` starts and worker loads without errors
- [x] runSimulation importable from simulation module
- [x] All three resampling methods implemented (simple, block, regime)
- [x] Progress callback receives updates during simulation
- [x] cancelSimulation aborts via AbortController
- [x] monte-carlo.ts has 193 lines (min_lines: 100 requirement met)
- [x] simulation.worker.ts has 66 lines (min_lines: 40 requirement met)
- [x] index.ts has 105 lines (min_lines: 50 requirement met)

## Architecture Notes

### Simulation Flow

```
Main Thread                    Web Worker
    |                              |
    |-- runSimulation() ---------> |
    |   (Comlink.proxy progress)   |
    |                              |-- runMonteCarlo()
    |                              |   (batch loop)
    |<-- onProgress(percent) ----- |   (check abort)
    |<-- onProgress(percent) ----- |   (yield event loop)
    |                              |
    |<-- SimulationOutput -------- |
        (Comlink.transfer)
```

### Key Patterns

1. **Batch Processing**: 1000 iterations per batch balances progress granularity with processing efficiency
2. **Zero-Copy Transfer**: Float64Array.buffer transferred, not copied, for performance
3. **Lazy Initialization**: Worker created only when needed, reducing initial load
4. **AbortSignal Pattern**: Standard browser API for cancellation, integrates with fetch/etc.

## Success Criteria Met

- [x] SIM-01 (configurable iterations 1,000-100,000)
- [x] SIM-02 (multi-asset portfolio via PortfolioConfig)
- [x] SIM-03 (time horizon 10-50 years)
- [x] SIM-08 (inflation adjustment via inflationRate/inflationAdjusted)
- [x] Web Worker prevents UI blocking
- [x] Progress reporting works via callback
- [x] Cancellation works via AbortSignal

## Next Phase Readiness

- **Blockers:** None
- **Dependencies satisfied:** Complete simulation API exported with types
- **Ready for:** Phase 04 (Portfolio scenarios can now run full simulations)
