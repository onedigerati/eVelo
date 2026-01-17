# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-17)

**Core value:** Accurate, trustworthy Monte Carlo simulation of the BBD strategy with clear visualization of risk and outcomes — enabling users to make informed decisions about leveraged wealth preservation.
**Current focus:** Phase 3 — Simulation Engine

## Current Position

Phase: 3 of 10 (Simulation Engine)
Plan: 2 of 4 complete
Status: In progress
Last activity: 2026-01-17 — Completed 03-02-PLAN.md (Bootstrap Resampling)

Progress: ██████▓░░░ 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 2.7 min
- Total execution time: 16 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 5 min | 2.5 min |
| 02-core-math | 2/2 | 5 min | 2.5 min |
| 03-simulation-engine | 2/4 | 6 min | 3 min |

**Recent Trend:**
- Last 5 plans: 02-01 (3 min), 02-02 (2 min), 03-01 (4 min), 03-02 (2 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-17
Stopped at: Completed 03-02-PLAN.md (Bootstrap Resampling)
Resume file: None
