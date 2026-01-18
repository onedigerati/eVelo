# Roadmap: eVelo Portfolio Strategy Simulator

## Overview

Building a Monte Carlo simulator for the Buy-Borrow-Die tax optimization strategy. Starting with foundational types and build system, progressing through simulation engine and SBLOC modeling (the core differentiator), then adding visualizations, UI, and data management. Final phases add theming, PWA capability, and single-file export for offline use.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Build System** - Project scaffolding, TypeScript, Web Components, Vite
- [x] **Phase 2: Core Math & Statistics** - Statistical functions, Cholesky decomposition, precision handling
- [x] **Phase 3: Simulation Engine** - Monte Carlo core, bootstrap resampling, Web Workers
- [x] **Phase 4: SBLOC Engine** - Securities-backed lending, margin calls, forced liquidation
- [ ] **Phase 5: Financial Calculations** - CAGR, TWRR, percentiles, tax calculations
- [ ] **Phase 6: Visualizations** - Chart.js components, probability cone, histograms, heatmaps
- [ ] **Phase 7: UI Components** - Input forms, sidebar, progress indicators, responsive layout
- [ ] **Phase 8: Data Layer** - IndexedDB, API integrations, caching, bundled presets
- [ ] **Phase 9: Theming & Polish** - Light/dark themes, help sections, print layout
- [ ] **Phase 10: PWA & Export** - Service worker, single-file export, offline capability

## Phase Details

### Phase 1: Foundation & Build System
**Goal**: Project scaffolding with TypeScript, Web Components, and Vite build pipeline
**Depends on**: Nothing (first phase)
**Requirements**: BUILD-03, BUILD-04
**Success Criteria** (what must be TRUE):
  1. Project builds without TypeScript errors
  2. Development server runs with hot reload
  3. Web Component base class renders in browser
  4. Core type definitions compile
**Research**: Unlikely (standard Vite + TypeScript setup)
**Plans**: TBD

Plans:
- [x] 01-01: Project initialization and Vite configuration
- [x] 01-02: Core types and Web Component base class

### Phase 2: Core Math & Statistics
**Goal**: Statistical primitives for Monte Carlo simulation
**Depends on**: Phase 1
**Requirements**: SIM-07, CALC-06
**Success Criteria** (what must be TRUE):
  1. Cholesky decomposition produces valid correlation matrix
  2. Pearson correlation calculation matches reference implementations
  3. Floating point precision errors don't accumulate over 30+ years
  4. Normal/lognormal distributions generate valid samples
**Research**: Unlikely (research already done, patterns documented)
**Plans**: TBD

Plans:
- [x] 02-01: Statistical functions and precision utilities
- [x] 02-02: Correlation engine and distributions

### Phase 3: Simulation Engine
**Goal**: Monte Carlo simulation with configurable iterations and Web Workers
**Depends on**: Phase 2
**Requirements**: SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, SIM-06, SIM-08
**Success Criteria** (what must be TRUE):
  1. User can run 1,000 to 100,000 iterations without browser freeze
  2. User can create portfolio with 2-5 assets and custom weights
  3. User can configure time horizon (10-50 years)
  4. Bootstrap resampling preserves historical return characteristics
  5. Regime-switching generates realistic bull/bear/crash sequences
  6. Inflation adjustment toggles between real and nominal values
**Research**: Likely (Web Worker + Comlink integration)
**Research topics**: Comlink API patterns, transferable Float64Arrays, block bootstrap block size
**Plans**: TBD

Plans:
- [ ] 03-01: Web Worker pool and Comlink setup
- [ ] 03-02: Bootstrap resampling (simple and block)
- [ ] 03-03: Regime-switching model
- [ ] 03-04: Simulation coordinator and portfolio iteration

### Phase 4: SBLOC Engine
**Goal**: Securities-backed line of credit modeling with margin call logic
**Depends on**: Phase 3
**Requirements**: SBLOC-01, SBLOC-02, SBLOC-03, SBLOC-04, SBLOC-05, SBLOC-06
**Success Criteria** (what must be TRUE):
  1. User can configure SBLOC terms (LTV, rate, draw)
  2. Interest accrues correctly over time (compound)
  3. LTV ratio tracks correctly by asset type
  4. Margin call triggers when LTV exceeds threshold
  5. Forced liquidation simulates correctly when margin call unmet
  6. Loan balance trajectory computes over time
**Research**: Likely (SBLOC interest accrual rules, margin call cascade logic)
**Research topics**: Securities-backed lending terms, margin maintenance calculations, cascade logic
**Plans**: TBD

Plans:
- [x] 04-01: SBLOC terms and interest accrual
- [x] 04-02: LTV tracking and margin call detection
- [x] 04-03: Forced liquidation and SBLOC engine

### Phase 5: Financial Calculations
**Goal**: Industry-standard financial metrics (CFA formulas)
**Depends on**: Phase 4
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-07, ESTATE-01, ESTATE-02, ESTATE-03, ESTATE-04
**Success Criteria** (what must be TRUE):
  1. Success rate percentage displays correctly
  2. Percentile outcomes (P10, P25, P50, P75, P90) calculate correctly
  3. CAGR and annualized volatility match CFA formulas
  4. Margin call probability by year calculates correctly
  5. Salary-equivalent for tax-free withdrawals displays
  6. TWRR calculates correctly
  7. Stepped-up basis tax savings display
  8. BBD vs Sell comparison calculates correctly
**Research**: Unlikely (CFA-standard formulas documented in research)
**Plans**: TBD

Plans:
- [ ] 05-01: Core metrics (success rate, percentiles, CAGR, volatility)
- [ ] 05-02: TWRR and margin call probability
- [ ] 05-03: Estate calculations (stepped-up basis, BBD vs Sell)

### Phase 6: Visualizations
**Goal**: Chart.js visualizations for simulation results
**Depends on**: Phase 5
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07
**Success Criteria** (what must be TRUE):
  1. Probability cone shows net worth over time with percentile bands
  2. Terminal net worth histogram displays distribution
  3. Portfolio composition donut chart shows asset weights
  4. Correlation matrix heatmap displays asset correlations
  5. Margin call risk bar chart shows probability by year
  6. SBLOC balance line chart shows loan trajectory
  7. BBD vs Sell comparison chart displays both strategies
**Research**: Likely (Chart.js heatmap for correlation matrix)
**Research topics**: chartjs-chart-matrix plugin, decimation for large datasets
**Plans**: TBD

Plans:
- [ ] 06-01: Chart.js setup and base chart component
- [ ] 06-02: Probability cone and SBLOC balance charts
- [ ] 06-03: Histogram and bar charts
- [ ] 06-04: Donut chart and correlation heatmap

### Phase 7: UI Components
**Goal**: Interactive user interface for parameter input and results
**Depends on**: Phase 6
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-08
**Success Criteria** (what must be TRUE):
  1. Strategy Parameters sidebar collapses/expands
  2. Asset selection supports search and filter
  3. Simulation progress indicator shows during computation
  4. Layout works correctly on mobile devices
  5. Help/guide sections expand/collapse
  6. Toast notifications provide user feedback
  7. Weight distribution shows with balance/clear controls
**Research**: Unlikely (standard Web Components patterns)
**Plans**: TBD

Plans:
- [ ] 07-01: Input components (sliders, selectors, forms)
- [ ] 07-02: Sidebar and collapsible sections
- [ ] 07-03: Progress indicator and toast notifications
- [ ] 07-04: Responsive layout and mobile adjustments

### Phase 8: Data Layer
**Goal**: Data persistence, API integrations, and bundled presets
**Depends on**: Phase 7
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. Bundled S&P 500 data loads without network
  2. Portfolios save/load/export/import correctly
  3. API fetches work (FMP, EODHD, Alpha Vantage, Tiingo, Yahoo)
  4. Market data caches in IndexedDB
  5. Manual return data entry works
  6. CORS proxy configuration works
**Research**: Likely (API rate limits, Yahoo Finance stability)
**Research topics**: API endpoint structures, Dexie.js patterns
**Plans**: TBD

Plans:
- [ ] 08-01: Dexie.js database and schema
- [ ] 08-02: Bundled data presets
- [ ] 08-03: API service layer (FMP, EODHD, Alpha Vantage, Tiingo)
- [ ] 08-04: Portfolio save/load/export/import
- [ ] 08-05: CORS proxy and Yahoo Finance fallback

### Phase 9: Theming & Polish
**Goal**: Light/dark themes, print layout, help content
**Depends on**: Phase 8
**Requirements**: THEME-01, THEME-02, THEME-03, UI-07
**Success Criteria** (what must be TRUE):
  1. User can toggle between light and dark themes
  2. Theme preference persists across sessions
  3. Charts use theme-aware colors
  4. Print-friendly report generates correctly
**Research**: Unlikely (CSS custom properties, standard patterns)
**Plans**: TBD

Plans:
- [ ] 09-01: Theme system (CSS custom properties)
- [ ] 09-02: Theme toggle and persistence
- [ ] 09-03: Print layout and help content

### Phase 10: PWA & Export
**Goal**: Offline capability and single-file HTML export
**Depends on**: Phase 9
**Requirements**: BUILD-01, BUILD-02
**Success Criteria** (what must be TRUE):
  1. App works completely offline after initial load
  2. Single-file HTML export produces self-contained file (~1.5MB)
  3. Service worker caches all required assets
**Research**: Likely (vite-plugin-singlefile, SharedArrayBuffer compatibility)
**Research topics**: Service worker caching strategies, single-file + Web Worker bundling
**Plans**: TBD

Plans:
- [ ] 10-01: Service worker and PWA manifest
- [ ] 10-02: Single-file HTML export with vite-plugin-singlefile

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Build System | 2/2 | Complete | 2026-01-17 |
| 2. Core Math & Statistics | 2/2 | Complete | 2026-01-17 |
| 3. Simulation Engine | 4/4 | Complete | 2026-01-17 |
| 4. SBLOC Engine | 3/3 | Complete | 2026-01-17 |
| 5. Financial Calculations | 0/3 | Not started | - |
| 6. Visualizations | 0/4 | Not started | - |
| 7. UI Components | 0/4 | Not started | - |
| 8. Data Layer | 0/5 | Not started | - |
| 9. Theming & Polish | 0/3 | Not started | - |
| 10. PWA & Export | 0/2 | Not started | - |

**Total Plans**: 32
