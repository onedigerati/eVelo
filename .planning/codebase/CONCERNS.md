---
last_mapped_commit: 481cebe91be1bd85692db4830b6fb645f1e0b5d0
last_mapped_at: 2026-10-05
---
# Codebase Concerns

**Analysis Date:** 2026-10-05

## Tech Debt

### Monolithic UI state and presentation logic

- Issue: `src/components/ui/results-dashboard.ts` is 3,046 lines long, and `src/components/app-root.ts` is 2,101 lines. Large sections of simulation configuration, debug rendering, and business logic are interleaved in the same component tree.
- Files: `src/components/ui/results-dashboard.ts`, `src/components/app-root.ts`, `src/components/ui/portfolio-composition.ts`, `src/components/ui/historical-data-viewer.ts`
- Impact: this increases change risk, makes regression testing harder, and makes it more likely that unrelated display logic and simulation semantics drift apart.
- Fix approach: split dashboard rendering from simulation calculations, move shared formatting into reusable helpers, and keep per-panel state isolated.

### Percentile API contract is fragile even after the fix

- Issue: the project explicitly recorded a regression in `.planning/phases/14-dashboard-calculations-review/14-01-PLAN.md`: the simulation code used 0-1 percentile inputs while `src/math/statistics.ts` expects 0-100 inputs. The contract is now documented, but the API still accepts a raw `number` and relies on callers to remember the scale.
- Files: `.planning/phases/14-dashboard-calculations-review/14-01-PLAN.md`, `src/math/statistics.ts`, `src/simulation/monte-carlo.ts`, `src/components/ui/results-dashboard.ts`
- Impact: a single wrong scale in a future call can silently distort P10/P50/P90 charts, success-risk summaries, and any decision support built from them.
- Fix approach: wrap percentile generation in a typed helper or central utility with an explicit naming contract, and add unit tests that assert the expected scale.

### Storage backend fallback is a permanent state mutation

- Issue: `src/data/services/portfolio-service.ts` caches `fallbackChecked` and `usingLocalStorageFallback` as module-level booleans. Once `IndexedDB` fails once, the code stops retrying the native backend even if the browser later recovers.
- Files: `src/data/services/portfolio-service.ts`
- Impact: a transient browser/storage issue can permanently degrade performance and persistence reliability for all later portfolio saves.
- Fix approach: move backend health checks to a retryable connection strategy, and re-check IndexedDB on a schedule or when the storage layer is next used.

## Known Bugs

### Historical percentile mismatch was a correctness bug

- Symptoms: inaccurate percentile-based reporting for the simulation outputs, especially around risk tails and yearly distributions.
- Files: `.planning/phases/14-dashboard-calculations-review/14-01-PLAN.md`, `src/math/statistics.ts`, `src/simulation/monte-carlo.ts`
- Trigger: percentile calls such as the yearly distribution blocks in `src/simulation/monte-carlo.ts` were using 0-1 values while the helper in `src/math/statistics.ts` interpolates over a 0-100 range.
- Workaround: the project corrected the API usage, but the presence of the bug shows the failure mode is easy to reintroduce when new percentile calculations are added.

### LocalStorage fallback silently swallows storage errors

- Symptoms: data loss or hidden degradation because parse or write failures are swallowed and the service returns empty arrays.
- Files: `src/data/services/portfolio-service.ts`
- Trigger: `getLocalStoragePortfolios()` catches all errors and returns `[]`, and `ensureStorageBackend()` marks the fallback without surfacing much actionable detail.
- Workaround: the app does continue to function, but users may lose portfolio history or see empty imports without clear recovery guidance.

### Debug output is still sprinkled through runtime code paths

- Symptoms: noisy console output, larger debug strings, and slower development diagnostics in the browser and worker.
- Files: `src/simulation/monte-carlo.ts`, `src/components/ui/results-dashboard.ts`, `src/data/services/portfolio-service.ts`, `src/utils/debug-layout.ts`
- Trigger: `DEBUG` checks, `console.log`, and generated debug-text arrays remain in code executed by simulation and dashboard rendering.
- Workaround: these are mostly gated to dev builds, but they are still large enough to affect development performance and can mask real errors in a busy simulation run.

## Security Considerations

### Imported portfolio data is only shape-validated, not hardened against malformed payloads

- Risk: untrusted JSON can be used to create surprising values, huge arrays, or mismatched objects that reach browser storage and UI rendering.
- Files: `src/data/services/portfolio-service.ts`, `src/data/validation/data-validator.ts`
- Current mitigation: `validatePortfolio()` checks required keys and numeric ranges, and `importPortfolios()` rejects invalid JSON and unsupported schema versions.
- Recommendations: cap payload size, strip unknown keys before persistence, reject duplicate or maliciously nested records, and surface more descriptive import errors instead of failing silently.

### Browser persistence is the most sensitive surface area, and it is not protected by a security boundary

- Risk: the app stores portfolio state in `localStorage` and IndexedDB in the browser. This is convenient, but it leaves data exposed to browser-level tampering, storage corruption, and accidental cross-user leakage on shared devices.
- Files: `src/data/services/portfolio-service.ts`, `src/data/db.ts`, `src/data/schemas/portfolio.ts`
- Current mitigation: storage is local to the browser context and not sent to a backend; there are no remote secrets or credential files in the repo.
- Recommendations: keep secret handling generic and outside the app, encrypt any sensitive data at rest if business requirements broaden, and add recovery/backup paths for user portfolio exports.

### PWA caching can ship stale app assets without a clear upgrade path

- Risk: the service worker and inline asset strategy in `vite.config.ts` can cache old bundles, creating a mismatch between UI logic and simulation logic after an update.
- Files: `vite.config.ts`
- Current mitigation: `VitePWA` is configured with `registerType: 'autoUpdate'` and `workbox` asset globbing.
- Recommendations: version the application shell aggressively and ensure UI/simulation compatibility checks happen on startup.

## Performance Bottlenecks

### Simulation and reporting repeatedly sort or recompute percentile-heavy arrays

- Problem: `src/simulation/monte-carlo.ts` computes yearly and SBLOC percentiles across many iterations and across multiple distributions, which requires repeated sorting and interpolation for large arrays.
- Files: `src/simulation/monte-carlo.ts`
- Cause: the code does this for terminal values, yearly percentiles, loan balances, haircuts, taxes, and failure metrics across the full Monte Carlo run.
- Improvement path: cache common percentile arrays, reduce repeated `Array.from` and `Math.max`/`Math.min` scans, and isolate the heavy debugging block from production reporting.

### Large UI render paths do unnecessary work during debug and comparison views

- Problem: the dashboard component reprocesses large data sets and rebuilds long textual debug panels while also rendering charts and tables.
- Files: `src/components/ui/results-dashboard.ts`, `src/components/ui/comparison-dashboard.ts`
- Cause: debug generation, `Intl.NumberFormat` calls, and repeated sample computations run through a very large component while the user interactively manipulates the dashboard.
- Improvement path: move expensive formatting and aggregation behind memoized helpers and defer noncritical debug content until a debug mode is explicitly enabled.

### Storage reads and writes are not bounded or normalized

- Problem: `src/data/services/portfolio-service.ts` stores full portfolio collections in `localStorage` and uses unbounded JSON output without explicit pruning or quotas.
- Files: `src/data/services/portfolio-service.ts`
- Cause: browser storage limits vary by platform, and the fallback path does not enforce compacting or cleanup on large datasets.
- Improvement path: enforce record-size limits and prune stale temp portfolios before writing.

## Fragile Areas

### `runMonteCarlo()` is a high-complexity orchestration function

- Files: `src/simulation/monte-carlo.ts`
- Why fragile: it owns generation, year-by-year state mutation, SBLOC logic, sell strategy logic, debug logging, statistics, and result packaging in one large function.
- Safe modification: keep any new logic in small helpers and add focused tests for the public `SimulationOutput` contract.
- Test coverage: targeted tests for percentile output, failure-year logic, and terminal net-worth conversion are still structurally necessary even though the project includes broad E2E coverage.

### `results-dashboard.ts` couples display and analytic reconstruction

- Files: `src/components/ui/results-dashboard.ts`
- Why fragile: the component reconstructs gross portfolio values from net-worth and loan balances in the debug panel, then uses those values to explain the state to the user. This is an analytic derivation embedded in a UI detail string.
- Safe modification: move those derivations into a data transformation layer and keep the render output as presentation-only.
- Test coverage: this area is not isolated by a small unit test surface and should be covered by explicit dashboard analytics tests.

### Storage and import behavior depend heavily on browser availability and timing

- Files: `src/data/services/portfolio-service.ts`, `vite.config.ts`
- Why fragile: `ensureStorageBackend()` depends on a one-time capability check, while the app also supports portable and PWA builds with different worker settings. Storage and runtime assumptions can diverge across environments.
- Safe modification: define a single storage capability contract and test the fallback path under both browser and portable build conditions.
- Test coverage: there are browser-centric tests, but the fallback logic is still vulnerable to environment-specific regressions.

## Scaling Limits

### Simulation throughput is bounded by one browser-thread worker and large JSON objects

- Current capacity: `runMonteCarlo()` is designed to process a large number of iterations in batches, but the browser still has to keep arrays, distributions, and year-over-year states resident in memory.
- Files: `src/simulation/monte-carlo.ts`, `src/simulation/bootstrap.ts`, `src/simulation/regime-switching.ts`
- Limit: as iteration counts or time horizons increase, memory pressure and UI lag increase rapidly.
- Scaling path: move heavy calculations behind worker boundaries or chunk them more aggressively while streaming intermediate summaries.

### Data persistence scales poorly on local browser storage

- Current capacity: the app supports local portfolio collections through browser storage, but the fallback path is not optimized for large import/export payloads or many historical datasets.
- Files: `src/data/services/portfolio-service.ts`, `src/data/validation/data-validator.ts`
- Limit: large imported datasets or large numbers of portfolios can exceed quota or cause noticeable UI lag.
- Scaling path: enforce storage quotas, archive older data, and prefer compact persistence formats.

## Dependencies at Risk

### Large browser-side dependency surface is concentrated in a single front-end build

- Package: `vite`, `vite-plugin-pwa`, `vite-plugin-singlefile`, `vite-plugin-comlink`, `chart.js`, `dexie`, `papaparse`, `seedrandom`
- Risk: the app relies on several build-time and runtime integrations, and the project has explicit portable/PWA differentiations in `vite.config.ts`.
- Impact: changes in bundling or service worker behavior can break the simulation runtime or the offline app shell unexpectedly.
- Migration plan: keep a single compatibility matrix for Vite, worker plugins, and storage libraries, and verify the portable path separately from the PWA path.

### Library assumptions are easy to violate without a tight abstraction boundary

- Package: `chart.js`, `dexie`, `papaparse`
- Risk: wrappers and direct API calls are spread across components, making it easy to rely on undocumented behavior or version-specific patterns.
- Impact: maintenance cost rises when upgrading libraries or when browser support changes.
- Migration plan: centralize chart data extraction, Dexie access, and CSV parsing under a thin adapter layer.

## Missing Critical Features

### No explicit data integrity or recovery strategy for browser storage failures

- Problem: the app has a fallback path, validation, and export/import support, but it does not describe a clear recovery workflow when browser storage becomes corrupted or quota-limited.
- Blocks: users can lose historical portfolio data without contextual recovery steps.
- Files: `src/data/services/portfolio-service.ts`, `src/data/validation/data-validator.ts`

### No central policy for debug vs production instrumentation

- Problem: there are several debug toggles across the app, but no single contract defines when logs are allowed, how they are retained, or how they are cleared.
- Blocks: it is hard to reason about the runtime cost of debug logic and duplicate logging paths.
- Files: `src/simulation/monte-carlo.ts`, `src/data/services/portfolio-service.ts`, `src/components/ui/results-dashboard.ts`, `src/utils/debug-layout.ts`

## Test Coverage Gaps

### Percentile and scalar-statistics semantics are high-impact but rely on implicit contract knowledge

- What's not tested: the 0-100 vs 0-1 percentile contract is easy to miss when new code is added, and the project relies on conventions rather than an explicit function-level API boundary.
- Files: `src/math/statistics.ts`, `src/simulation/monte-carlo.ts`, `src/components/ui/results-dashboard.ts`
- Risk: calculation regressions can silently alter user-facing recommendations and risk charts without a failing test.
- Priority: High

### Storage fallback and recovery paths are under-specified

- What's not tested: the behavior when `IndexedDB` is unavailable, when localStorage is full, or when the app recovers from a transient storage failure.
- Files: `src/data/services/portfolio-service.ts`
- Risk: users may encounter silent data loss or stuck fallback state.
- Priority: High

### Large dashboard and simulation orchestration code lacks isolated regression tests around data-shape invariants

- What's not tested: the mapping between net-worth calculation, percentage display, and reconstructed gross portfolio values in the debug output.
- Files: `src/components/ui/results-dashboard.ts`, `src/simulation/monte-carlo.ts`
- Risk: analytics drift can create misleading results despite passing broad E2E checks.
- Priority: Medium

---

*Concerns audit: 2026-10-05*
