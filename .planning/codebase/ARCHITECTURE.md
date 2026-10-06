---
last_mapped_commit: 481cebe91be1bd85692db4830b6fb645f1e0b5d0
last_mapped_at: 2026-10-05
---
<!-- refreshed: 2026-10-05 -->

# Architecture

**Analysis Date:** 2026-10-05

## System Overview

```text
┌───────────────────────────────────────────────────────────────────┐
│ Browser entry / bootstrapping                                       │
│ `src/main.ts`                                                      │
└───────────────┬──────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│ UI shell and custom-element registration                           │
│ `src/components/app-root.ts`                                        │
│ `src/components/ui/index.ts`                                        │
└───────────────┬──────────────────────────────────────────────────────┘
                │
      ┌─────────┼─────────┬───────────────┐
      │         │         │               │
      ▼         ▼         ▼               ▼
┌────────────┐ ┌────────────┐ ┌───────────────┐ ┌────────────────────┐
│ Layout     │ │ Parameter │ │ Results       │ │ Data access        │
│ `.../ui/*` │ │ forms     │ │ dashboard     │ │ `src/data/*`       │
│ custom     │ │ inc.      │ │ `.../results- │ │ IndexedDB + API   │
│ elements   │ │ `AppRoot` │ │ dashboard.ts` │ │ services           │
└─────┬──────┘ └──────┬─────┘ └───────┬───────┘ └─────────┬──────────┘
      │                │                     │                     │
      │                │                     │                     │
      └────────────────┴─────────────────────┼─────────────────────┘
                                            │
                                            ▼
                                ┌────────────────────────────┐
                                │ Simulation orchestration    │
                                │ `src/simulation/index.ts`   │
                                │ `src/simulation/worker-     │
                                │ loader.ts`                 │
                                └──────────────┬─────────────┘
                                               │
                                               ▼
                                ┌────────────────────────────┐
                                │ Worker execution boundary   │
                                │ `src/simulation/worker.ts`  │
                                │ `src/simulation/monte-carlo`│
                                └──────────────┬─────────────┘
                                               │
                                               ▼
                                ┌────────────────────────────┐
                                │ Calculation / probability   │
                                │ `src/calculations/*.ts`     │
                                │ `src/math/*.ts`             │
                                │ `src/sbloc/*.ts`            │
                                └────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Bootstrapping | Initializes theme and registers the app shell | `src/main.ts` |
| App shell | Builds the parameter form, triggers simulations, owns result state | `src/components/app-root.ts` |
| UI registry | Imports and re-exports all custom elements used by the app | `src/components/ui/index.ts` |
| Layout container | Renders sidebar/main layout without destroying slotted content | `src/components/ui/main-layout.ts` |
| Results dashboard | Renders charts, metric cards, percentile analysis, recommendation summaries | `src/components/ui/results-dashboard.ts` |
| Simulation API | Exposes public simulation entry points and worker lifecycle helpers | `src/simulation/index.ts` |
| Worker loader | Chooses between the PWA/portable worker strategies | `src/simulation/worker-loader.ts` |
| Worker runtime | Runs long Monte Carlo jobs in a background worker and handles cancel/health checks | `src/simulation/simulation.worker.ts` |
| Core engine | Performs Monte Carlo iterations, SBLOC logic, sell-strategy analysis, and aggregation | `src/simulation/monte-carlo.ts` |
| Data access layer | Persists portfolios, settings, and cached market data via IndexedDB | `src/data/db.ts` |
| Portfolio persistence | CRUD, import/export, and localStorage fallback for user portfolios | `src/data/services/portfolio-service.ts` |
| Market cache | Caches API results by symbol and source with expiry logic | `src/data/services/market-data-service.ts` |
| Calculation layer | Converts terminal values into metrics, probabilities, taxes, and comparison summaries | `src/calculations/index.ts` |
| Domain primitives | Stats, distributions, and correlation utilities used across simulation code | `src/math/index.ts` |
| SBLOC engine | Models borrowing, margin calls, liquidation, and withdrawal logic | `src/sbloc/index.ts` |

## Pattern Overview

**Overall:** component-driven browser app with a worker boundary for CPU-heavy simulation.

**Key Characteristics:**
- Custom elements extend `HTMLElement` via `src/components/base-component.ts` and use Shadow DOM for encapsulation.
- Simulation-heavy work is moved out of the UI thread via Comlink in `src/simulation/*`.
- Data persistence is centralized behind Dexie (`src/data/db.ts`) and service modules under `src/data/services/`.
- Re-export barrels are used to keep imports consistent (`src/data/index.ts`, `src/calculations/index.ts`, `src/simulation/index.ts`).
- Domain logic is split into functional modules rather than component-local logic: `src/math/`, `src/calculations/`, `src/sbloc/`.

## Layers

**Presentation layer:**
- Purpose: Build the UI, form controls, and results visualization.
- Location: `src/components/`
- Contains: custom elements, layout wrappers, charts, and form controls.
- Depends on: `src/simulation`, `src/data/services`, `src/calculations`, and shared types.
- Used by: browser rendering and user interaction.

**Application orchestration layer:**
- Purpose: Connect UI inputs to simulation jobs and coordinate result updates.
- Location: `src/components/app-root.ts`
- Contains: input assembly, configuration assembly, and event wiring.
- Depends on: `src/simulation/index.ts`, `src/data/services/preset-service.ts`, and `src/utils/*.ts`.
- Used by: UI forms and dashboards.

**Simulation layer:**
- Purpose: Execute Monte Carlo runs, manage worker communication, and compute all portfolio outcomes.
- Location: `src/simulation/`
- Contains: `SimulationConfig`, return generators, regime logic, bootstrap logic, and the worker runtime.
- Depends on: `src/math`, `src/sbloc`, `src/calculations`, and type declarations.
- Used by: `src/components/app-root.ts` and `src/components/ui/results-dashboard.ts`.

**Calculation and math layer:**
- Purpose: Turn raw simulation iterations into statistics, risk metrics, and tax comparisons.
- Location: `src/calculations/`, `src/math/`, `src/sbloc/`
- Contains: CAGR, volatility, percentiles, margin call probability, salary-equivalent metrics, and asset return math.
- Depends on: the simulation output contract and configuration types.
- Used by: charts, summary cards, and comparative analysis.

**Persistence layer:**
- Purpose: Store user portfolios, settings, and downloaded market data.
- Location: `src/data/`
- Contains: Dexie schema definitions, API clients, services, validation, and preset assets.
- Depends on: browser IndexedDB and remote APIs.
- Used by: portfolio management screens and historical data workflows.

## Data Flow

### Primary request path

1. `src/main.ts` loads the theme and imports `src/components/app-root.ts` to register the page shell and UI components.
2. `src/components/app-root.ts` constructs the form controls and top-level state, then calls `runSimulation(...)` when the user requests an analysis.
3. `src/simulation/index.ts` forwards the request to `src/simulation/worker-loader.ts`, which creates or reuses a Comlink worker.
4. `src/simulation/simulation.worker.ts` invokes `runMonteCarlo(...)` in a worker thread, keeping the UI responsive while large simulations run.
5. `src/simulation/monte-carlo.ts` combines portfolio weights, historical return sampling, SBLOC logic, and post-processing to populate `SimulationOutput`.
6. The result is returned through Comlink to the caller in `src/components/app-root.ts`, which updates the `results-dashboard` component.
7. `src/components/ui/results-dashboard.ts` maps the output into chart payloads and summary metrics for the dashboard UI.

### Historical data load path

1. User actions in the data/history UI call `getCachedOrFetch(...)` from `src/data/services/market-data-service.ts`.
2. The service uses IndexedDB via `src/data/db.ts` and falls back to the appropriate API client under `src/data/api/`.
3. Fresh data is cached by symbol/source and returned in date-sorted arrays for simulation input.

### Portfolio persistence path

1. `src/components/ui/portfolio-manager.ts` triggers `savePortfolio(...)` or `loadAllPortfolios()` via the export barrel in `src/data/index.ts`.
2. `src/data/services/portfolio-service.ts` writes to Dexie, or to `localStorage` if browser storage fails.
3. `src/data/schemas/portfolio.ts` defines the persisted record shape, and `src/data/db.ts` owns the table mapping.

**State management:**
- UI state is mostly held in custom elements and their instance properties, not in a global store.
- Simulation data is passed as strongly typed objects (`SimulationConfig`, `PortfolioConfig`, `SimulationOutput`).
- Persistence state is owned by Dexie tables and utility service modules; no Redux or application-wide store is used.

## Key Abstractions

**BaseComponent:**
- Purpose: Common `HTMLElement` wrapper for all custom elements.
- Examples: `src/components/base-component.ts`, `src/components/ui/main-layout.ts`, `src/components/ui/results-dashboard.ts`
- Pattern: Shadow DOM rendering with `template()` + `styles()` and `afterRender()` hooks.

**SimulationConfig / PortfolioConfig / SimulationOutput:**
- Purpose: Define the end-to-end simulation contract between UI code and the worker execution layer.
- Examples: `src/simulation/types.ts`
- Pattern: config-driven functional execution with strongly typed result objects.

**SBLOCSimConfig / SBLOCState:**
- Purpose: Model borrowing, margin calls, liquidation, and withdrawal logic inside the simulation engine.
- Examples: `src/simulation/types.ts`, `src/sbloc/*.ts`
- Pattern: explicit state machine behavior with yearly step simulation.

**db:**
- Purpose: Database singleton for Dexie-backed persistence.
- Examples: `src/data/db.ts`
- Pattern: schema versioning, singleton instance, typed tables.

**Comlink worker boundary:**
- Purpose: Bridge between main thread and heavy simulation computation.
- Examples: `src/simulation/index.ts`, `src/simulation/worker-loader.ts`, `src/simulation/simulation.worker.ts`
- Pattern: zero-copy transfer of `Float64Array` buffers and async progress hooks via proxy callbacks.

## Entry Points

**Browser startup:**
- Location: `src/main.ts`
- Triggers: browser module evaluation during app startup.
- Responsibilities: initialize theme, import `app-root`, and register the app UI.

**Simulation API:**
- Location: `src/simulation/index.ts`
- Triggers: calls from `src/components/app-root.ts` and other modules.
- Responsibilities: worker acquisition, health check, cancellation, and public simulation invocation.

**Data API surface:**
- Location: `src/data/index.ts`
- Triggers: portfolio manager, settings UI, and import/export flows.
- Responsibilities: re-export database access, preset data, and service APIs for the rest of the app.

**UI registry:**
- Location: `src/components/ui/index.ts`
- Triggers: import side effects from `src/components/app-root.ts`.
- Responsibilities: register all custom elements before they are used in the template.

## Architectural Constraints

- **Threading:** CPU-bound Monte Carlo work is intentionally isolated to a Web Worker (`src/simulation/simulation.worker.ts`) to avoid blocking the UI thread.
- **Global state:** The app is mostly state-local to component instances; the main shared global is the Dexie database singleton in `src/data/db.ts`.
- **Circular imports:** The codebase is organized around barrel exports and narrow module boundaries; the main cross-cutting dependency direction is from UI -> simulation -> calculations/math -> data access.
- **Component rendering:** `src/components/ui/main-layout.ts` deliberately skips full rerender on attribute changes to preserve slotted content and layouts.
- **Storage fallback:** `src/data/services/portfolio-service.ts` intentionally switches from IndexedDB to `localStorage` when browser storage fails, which keeps persistence working on constrained environments.

## Anti-Patterns

### Worker-only execution for heavy logic

**What happens:** Long-running simulation logic sits behind the worker boundary instead of directly in UI components.
**Why it's wrong:** It prevents the app from freezing under large iterations and enforces a more disciplined data boundary.
**Do this instead:** Keep worker contracts small and typed at `src/simulation/types.ts`, and keep UI components focused on orchestration rather than computation.

### Re-export barrels as a dependency boundary

**What happens:** Modules import from `src/data/index.ts`, `src/calculations/index.ts`, and `src/simulation/index.ts` for convenience.
**Why it's wrong:** Barrel files can hide dependency paths and make it harder to see actual module coupling.
**Do this instead:** Use them as stable public entry points, but keep implementation files in their domain folders (`src/math/`, `src/calculations/`, `src/data/services/`).

## Error Handling

**Strategy:** Errors are handled at the boundary that can meaningfully recover or report them; worker failures reject with `AbortError` for cancellation, and service methods throw typed errors when storage or API operations fail.

**Patterns:**
- `runSimulation()` in `src/simulation/index.ts` lets worker failures bubble back to the caller.
- `src/data/services/portfolio-service.ts` catches storage errors and transitions to a `localStorage` fallback.
- `src/data/services/market-data-service.ts` uses cache validation and API client exceptions without swallowing them at a global layer.

## Cross-Cutting Concerns

**Logging:** Mostly console-based debug logging plus targeted `debugLog()` functions in `src/data/services/portfolio-service.ts`.
**Validation:** `src/data/validation/data-validator.ts` and the schema/service layer guard persisted data before it is accepted into the app.
**Authentication:** Not implemented as a separate app identity system; historical data access is through API keys stored in settings and handled in `src/data/services/settings-service.ts`.

---

*Architecture analysis: 2026-10-05*
