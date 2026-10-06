---
last_mapped_commit: 481cebe91be1bd85692db4830b6fb645f1e0b5d0
last_mapped_at: 2026-10-05
---
# Codebase Structure

**Analysis Date:** 2026-10-05

## Directory Layout

```text
/home/jonah/repos/eVelo/
├── src/                              # Application source
│   ├── calculations/                  # Metrics, tax analysis, return probabilities
│   ├── charts/                       # Chart.js visual components and chart data models
│   ├── components/                  # Custom element applications and UI controls
│   │   ├── ui/                      # Reusable UI widgets and page sections
│   │   ├── app-root.ts             # Full application orchestration
│   │   └── base-component.ts       # Shared custom-element base class
│   ├── config/                      # Calculation defaults and config definitions
│   ├── data/                        # Data persistence, schemas, API clients, presets
│   │   ├── api/                     # External market-data clients
│   │   ├── services/                # Portfolio, settings, cache, import/export services
│   │   ├── schemas/                 # Dexie table record contracts
│   │   ├── presets/                 # Bundled historical-return asset presets
│   │   └── validation/             # Data validation helpers
│   ├── math/                        # Statistical and distribution primitives
│   ├── sbloc/                       # Borrowing, margin call, liquidation logic
│   ├── services/                    # Non-simulation services (theme, comparison state)
│   ├── simulation/                  # Monte Carlo engine, worker wrapper, configs
│   ├── styles/                      # CSS tokens and print styles
│   ├── types/                       # Shared type exports
│   ├── utils/                       # UI/tooling helpers, print export, insight generation
│   ├── main.ts                      # Browser entry point
│   └── vite-env.d.ts                # Vite TS env declarations
├── test/                            # E2E and browser test harness
├── public/                          # Static assets and PWA/public files
├── images/                          # Project image assets
├── mockups/                         # UI mockups/design references
├── references/                      # External research, docs, and design references
├── research/                        # Historical research and architecture notes
├── dist/                            # Build output for default app bundle
├── dist-portable/                   # Build output for portable mode
├── package.json                     # Tooling and build scripts
├── vite.config.ts                   # Vite config and build mode settings
├── vitest.config.ts                 # Unit-test config
├── tsconfig.json                    # TypeScript compiler settings
├── README.md                        # Project overview and build instructions
└── index.html                       # Browser HTML entry file
```

## Directory Purposes

**`src/components/`:**
- Purpose: All browser-rendered behavior, from root app orchestration to small form controls.
- Contains: custom elements, layout wrappers, chart hosts, and UI sections.
- Key files: `src/components/app-root.ts`, `src/components/ui/index.ts`, `src/components/ui/results-dashboard.ts`, `src/components/ui/main-layout.ts`

**`src/simulation/`:**
- Purpose: Monte Carlo simulation engine, worker lifecycle, and config types.
- Contains: bootstrap generators, regime-switching models, worker wrappers, and output contracts.
- Key files: `src/simulation/index.ts`, `src/simulation/monte-carlo.ts`, `src/simulation/simulation.worker.ts`, `src/simulation/types.ts`, `src/simulation/worker-loader.ts`

**`src/data/`:**
- Purpose: Persistence, API integration, market-data caching, schema definitions, and preset data.
- Contains: Dexie DB, API clients, schemas, validations, and import/export services.
- Key files: `src/data/db.ts`, `src/data/index.ts`, `src/data/services/portfolio-service.ts`, `src/data/services/market-data-service.ts`, `src/data/services/preset-service.ts`

**`src/calculations/`:**
- Purpose: Statistical and financial calculations derived from simulation outputs.
- Contains: CAGR, TWRR, return probabilities, sell strategy, and estate analytics.
- Key files: `src/calculations/index.ts`, `src/calculations/metrics.ts`, `src/calculations/estate.ts`, `src/calculations/sell-strategy.ts`, `src/calculations/return-probabilities.ts`

**`src/math/`:**
- Purpose: numerical utilities and probability distribution primitives.
- Contains: return-distribution generators, correlation helpers, precision logic, and simple statistics.
- Key files: `src/math/index.ts`, `src/math/distributions.ts`, `src/math/correlation.ts`, `src/math/statistics.ts`

**`src/sbloc/`:**
- Purpose: borrowing-specific simulation engine for the SBLOC strategy.
- Contains: state transition, LTV logic, margin calls, and liquidation calculation functions.
- Key files: `src/sbloc/index.ts`, `src/sbloc/engine.ts`, `src/sbloc/margin-call.ts`, `src/sbloc/liquidation.ts`, `src/sbloc/ltv.ts`

**`src/charts/`:**
- Purpose: chart implementations and chart data types used by the dashboard.
- Contains: probability cone, histogram, donut, matrix heatmap, and comparison charts.
- Key files: `src/charts/index.ts`, `src/charts/base-chart.ts`, `src/charts/histogram-chart.ts`, `src/charts/correlation-heatmap.ts`, `src/charts/probability-cone-chart.ts`

## Key File Locations

**Entry Points:**
- `src/main.ts`: main browser bootstrapping and theme initialization
- `src/components/app-root.ts`: top-level UI orchestration and simulation execution
- `src/simulation/index.ts`: public worker-backed simulation API

**Configuration:**
- `package.json`: scripts, dependencies, and build targets
- `vite.config.ts`: Vite, PWA, and single-file build configuration
- `tsconfig.json`: TypeScript compiler settings

**Core Logic:**
- `src/simulation/monte-carlo.ts`: central Monte Carlo execution
- `src/calculations/metrics.ts`: summary stats derived from terminal values
- `src/data/services/portfolio-service.ts`: portfolio persistence and import/export
- `src/data/services/market-data-service.ts`: market data caching and fetching

**Testing:**
- `test/e2e/`: end-to-end browser tests and smoke coverage
- `src/calculations/__tests__/`: calculation-level tests
- `src/simulation/__tests__/`: simulation-level tests
- `src/sbloc/__tests__/`: SBLOC-specific tests

## Naming Conventions

**Files:**
- Domain modules are usually named by capability, not by UI concern: `market-data-service.ts`, `portfolio-service.ts`, `monte-carlo.ts`, `base-chart.ts`.
- UI components are named by the rendered element or section: `results-dashboard.ts`, `portfolio-manager.ts`, `main-layout.ts`.
- Generic utilities use short nouns or actions: `debug-layout.ts`, `print-utils.ts`, `insight-generator.ts`.

**Directories:**
- Functional domains map to folders by business capability (`src/simulation`, `src/data`, `src/math`, `src/sbloc`).
- Cross-cutting UI concepts are grouped under `src/components/ui/` with re-export registration in `src/components/ui/index.ts`.

## Where to Add New Code

**New simulation feature:**
- Primary code: `src/simulation/`
- Types: `src/simulation/types.ts`
- Worker integration: `src/simulation/simulation.worker.ts`
- Public exposure: `src/simulation/index.ts`

**New chart or visualization:**
- Implementation: `src/charts/`
- Registration: `src/charts/index.ts`
- Dashboard wiring: `src/components/ui/results-dashboard.ts`

**New UI section or custom element:**
- Implementation: `src/components/ui/`
- Registry: `src/components/ui/index.ts`
- App integration: `src/components/app-root.ts`

**New persisted model or service:**
- Schema: `src/data/schemas/`
- Service: `src/data/services/`
- Public API: `src/data/index.ts`
- Database mapping: `src/data/db.ts`

**New financial or statistical utility:**
- Core calculations: `src/calculations/`
- Primitive distribution/math helpers: `src/math/`
- Re-export: `src/calculations/index.ts` or `src/math/index.ts`

## Special Directories

**`src/components/ui/`:**
- Purpose: UI building blocks and composite dashboard sections.
- Generated: No
- Committed: Yes

**`src/data/presets/`:**
- Purpose: Bundled asset return data used when the app is offline or when a preset is selected.
- Generated: No
- Committed: Yes

**`test/`:**
- Purpose: Browser automation and smoke coverage for end-to-end workflows.
- Generated: No
- Committed: Yes

**`dist/` and `dist-portable/`:**
- Purpose: build artifacts for deployment and portable builds.
- Generated: Yes
- Committed: Usually not, but present in working tree after build.

---

*Structure analysis: 2026-10-05*
