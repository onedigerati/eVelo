# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-17)

**Core value:** Accurate, trustworthy Monte Carlo simulation of the BBD strategy with clear visualization of risk and outcomes — enabling users to make informed decisions about leveraged wealth preservation.
**Current focus:** Phase 3 Complete — Ready for Phase 4

## Current Position

Phase: 3 of 10 (Simulation Engine)
Plan: 4 of 4 complete
Status: Phase complete
Last activity: 2026-01-17 — Completed 03-04-PLAN.md (Monte Carlo Simulation)

Progress: ██████████ 100% (Phase 3)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 2.75 min
- Total execution time: 22 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 5 min | 2.5 min |
| 02-core-math | 2/2 | 5 min | 2.5 min |
| 03-simulation-engine | 4/4 | 12 min | 3 min |

**Recent Trend:**
- Last 5 plans: 03-01 (4 min), 03-02 (2 min), 03-03 (3 min), 03-04 (3 min)
- Trend: Consistent velocity

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- TypeScript + Web Components over React/Vue (framework-free for single-file bundling)
- Chart.js over TradingView (need donut/histogram support)
- IndexedDB over LocalStorage (larger storage for historical data)
- Vite + vite-plugin-singlefile for build (from research)
- Comlink for Web Worker ergonomics (from research)
- Dexie.js for IndexedDB wrapper (from research)
- simple-statistics for statistical functions (from research)

**From 01-01:**
- Manual project setup over create-vite template for minimal dependencies
- ES2022 target for modern browser features
- noEmit in TypeScript (Vite handles transpilation)

**From 01-02:**
- Abstract base class pattern for Web Components (enforces template/styles)
- Shadow DOM in open mode for dev tools inspection
- Helper methods $() and $$() for shadow DOM querying
- Types organized in src/types/ with index.ts re-exports

**From 02-01:**
- Kahan summation for floating point accumulation precision
- 6 decimal places default precision for statistical output
- Sample variance (N-1) as default over population variance

**From 02-02:**
- Clamp correlation to [-1, 1] for floating point edge cases
- Return null from Cholesky when not positive-definite (graceful handling)
- Box-Muller transform for normal distribution sampling
- Math module barrel export for clean API

**From 03-01:**
- comlink() plugin before viteSingleFile() in plugins array
- Separate worker config with plugins: () => [comlink()]
- Float64Array for terminal values enables transferable objects
- Simulation module structure: types.ts for interfaces, index.ts as barrel
- MarketRegime union type: 'bull' | 'bear' | 'crash'
- Percentile conventions: p10, p25, p50, p75, p90 as standard buckets

**From 03-02:**
- Seeded RNG pattern: accept rng function parameter for reproducibility
- Auto-calculation with override: optional parameter with smart default (blockSize)
- Politis-White (2004) rule for block length: clamp to [3, n/4] range
- Guard against perfect autocorrelation (rhoSquared >= 1) and short series (n < 12)
- Math.floor for index calculation to avoid out-of-bounds

**From 03-03:**
- Seeded RNG added to normalRandom, lognormalRandom, correlatedSamples in math module
- correlatedSamples signature changed: returns single sample set with mean/stddev parameters
- Shared regime sequence for multi-asset returns (realistic market behavior)
- Hamilton (1989) regime-switching: bull/bear/crash with configurable transition matrix
- Cumulative probability selection for Markov transitions

**From 03-04:**
- BATCH_SIZE = 1000 iterations for progress reporting granularity
- seedrandom library for reproducible seeded PRNG
- setTimeout(0) between batches to yield event loop in worker
- Comlink.transfer() for zero-copy Float64Array transfer
- Lazy worker initialization (created on first use)
- Comlink.proxy() wraps progress callback for cross-thread calls

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-17
Stopped at: Completed 03-04-PLAN.md (Monte Carlo Simulation) - Phase 3 complete
Resume file: None
