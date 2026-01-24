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
- [x] **Phase 5: Financial Calculations** - CAGR, TWRR, percentiles, tax calculations
- [x] **Phase 6: Visualizations** - Chart.js components, probability cone, histograms, heatmaps
- [x] **Phase 7: UI Components** - Input forms, sidebar, progress indicators, responsive layout
- [x] **Phase 7.1: Application Integration** - Wire UI to simulation, results dashboard, portfolio management (INSERTED)
- [x] **Phase 8: Data Layer** - IndexedDB, API integrations, caching, bundled presets
- [ ] **Phase 9: Theming & Polish** - Light/dark themes, help sections, print layout
- [ ] **Phase 10: PWA & Export** - Service worker, single-file export, offline capability
- [x] **Phase 11: Complete Results Dashboard** - Add missing charts and statistics to results dashboard
- [x] **Phase 12: Monthly Withdrawal Simulation** - Refactor SBLOC engine for monthly time steps and withdrawal compounding
- [x] **Phase 13: E2E Testing with Agent-Browser** - Implement automated UI testing using semantic locators for Shadow DOM and screenshot comparison for Chart.js
- [x] **Phase 14: Dashboard Calculations Review** - Thoroughly review dashboard components and verify calculations display correctly, create gap findings
- [x] **Phase 15: Dashboard Gap Fixes** - Resolve all 4 gaps from 14-GAP-FINDINGS.md (percentile scale, success rate, array indexing, fallback labels)
- [x] **Phase 16: Dashboard Comparison Mode** - Side-by-side comparison view when switching portfolio presets, responsive mobile layout

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
- [x] 05-01: Core metrics (success rate, percentiles, CAGR, volatility)
- [x] 05-02: TWRR and margin call probability
- [x] 05-03: Estate calculations (stepped-up basis, BBD vs Sell)

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
- [x] 06-01: Chart.js setup and base chart component
- [x] 06-02: Probability cone and SBLOC balance charts
- [x] 06-03: Histogram and bar charts
- [x] 06-04: Donut chart and correlation heatmap

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
- [x] 07-01: Input components (sliders, selectors, forms)
- [x] 07-02: Sidebar and collapsible sections
- [x] 07-03: Progress indicator and toast notifications
- [x] 07-04: Responsive layout and mobile adjustments

### Phase 7.1: Application Integration (INSERTED)
**Goal**: Wire UI components to simulation engine, display results in charts, add portfolio management UI and settings panel
**Depends on**: Phase 7, Phase 8
**Requirements**: UI-01, UI-02, UI-03, UI-04, VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, DATA-02
**Success Criteria** (what must be TRUE):
  1. "Run Simulation" button triggers actual simulation with parameters from UI
  2. Simulation results display in probability cone, histogram, and other charts
  3. Portfolio save/load UI allows users to persist configurations
  4. Portfolio export/import UI allows JSON file download/upload
  5. Settings panel allows API key configuration
  6. Asset selector is integrated into the workflow
**Research**: Unlikely (wiring existing components)
**Plans**: TBD

Plans:
- [x] 07.1-01: Simulation orchestration and app-root wiring
- [x] 07.1-02: Results dashboard integration
- [x] 07.1-03: Portfolio management UI
- [x] 07.1-04: Settings panel UI
- [x] 07.1-05: Asset selector integration (gap closure)

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
**Research**: Complete (see 09-RESEARCH.md)
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md -- Theme infrastructure (service, Chart.js configs, FOUC prevention)
- [ ] 09-02-PLAN.md -- Theme toggle component and settings integration
- [ ] 09-03-PLAN.md -- Print layout and help tooltips

**Details:**
Based on research findings:
- CSS custom properties pierce Shadow DOM automatically
- Theme service loads preference before app renders (prevents FOUC)
- Chart.js `.update()` method for dynamic color updates
- `@media print` with `break-inside: avoid` for clean reports
- WCAG 1.4.13 compliant tooltips for help content

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

### Phase 11: Complete Results Dashboard
**Goal**: Full-featured results dashboard matching reference application
**Depends on**: Phase 7.1
**Requirements**: VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, CALC-03, CALC-04, CALC-05, CALC-07
**Success Criteria** (what must be TRUE):
  1. Portfolio composition donut chart displays asset weights
  2. Correlation matrix heatmap displays asset correlations
  3. Margin call risk bar chart shows probability by year
  4. SBLOC balance line chart shows loan trajectory
  5. BBD vs Sell comparison chart displays both strategies
  6. CAGR and annualized volatility displayed in statistics
  7. TWRR displayed in statistics
  8. Margin call probability displayed
  9. Salary-equivalent for tax-free withdrawals displayed
  10. Key metrics banner with hero cards at top
  11. Percentile spectrum visualizations (P10/P50/P90)
  12. Strategy analysis section with BBD vs Sell comparison
  13. Performance tables with percentile breakdown
  14. Year-by-year analysis table
  15. Recommendations and actionable insights
**Research**: Unlikely (wiring existing components)
**Plans**: 13 total

Plans:
- [x] 11-01: Portfolio donut chart and correlation heatmap
- [x] 11-02: Extended statistics (CAGR, TWRR, volatility, salary-equivalent)
- [x] 11-03: SBLOC integration into simulation engine
- [x] 11-04: SBLOC charts (margin call, balance, BBD comparison)
- [x] 11-05: Executive summary banner (key metrics + param summary)
- [x] 11-06: Percentile spectrum visualizations
- [x] 11-07: Strategy analysis section (BBD vs Sell verdict)
- [x] 11-08: Salary equivalent section (prominent banner)
- [x] 11-09: Performance tables (metrics across percentiles)
- [x] 11-10: Year-by-year analysis table
- [x] 11-11: Enhanced strategy comparison charts
- [x] 11-12: Recommendations and actionable insights
- [x] 11-13: Asset-level statistics in correlation heatmap

### Phase 12: Monthly Withdrawal Simulation
**Goal**: Refactor SBLOC engine to support monthly time steps and monthly withdrawal compounding
**Depends on**: Phase 11
**Requirements**: SBLOC-02 (interest accrual), SIM-03 (time horizon granularity)
**Success Criteria** (what must be TRUE):
  1. SBLOC engine processes at monthly granularity (12 steps per year)
  2. Monthly withdrawals compound correctly (1/12 of annual, applied each month)
  3. Interest accrues monthly when monthlyWithdrawal is enabled
  4. Margin call detection works at monthly intervals
  5. Monte Carlo simulation integrates with monthly SBLOC steps
  6. Results remain consistent with annual mode when monthlyWithdrawal is disabled
**Research**: Complete (see 12-RESEARCH.md)
**Plans**: 2 plans

Plans:
- [x] 12-01: Monthly step functions and return distribution
- [x] 12-02: Monte Carlo integration

### Phase 13: E2E Testing with Agent-Browser
**Goal**: Implement automated UI testing using agent-browser with semantic locators for Shadow DOM and screenshot comparison for Chart.js
**Depends on**: Phase 12
**Requirements**: Testing infrastructure, CI/CD integration
**Success Criteria** (what must be TRUE):
  1. Smoke test verifies all components render without errors
  2. Simulation workflow test confirms params -> run -> results flow
  3. Form interactions (range-slider, number-input, select) respond correctly
  4. Responsive layout works at desktop/tablet/mobile viewports
  5. Screenshot baselines established for all 11 chart types
  6. Tests integrate with CI pipeline (GitHub Actions)
**Research**: Complete (see .planning/quick/004-research-agent-browser-integration/004-RESEARCH.md)
**Plans**: 6 plans

Plans:
- [x] 13-01: Test infrastructure and helper setup
- [x] 13-02: Smoke tests for component rendering
- [x] 13-03: Simulation workflow E2E test
- [x] 13-04: Responsive layout tests
- [x] 13-05: Chart baseline screenshots
- [x] 13-06: CI/CD integration (GitHub Actions)

**Details:**
Based on research findings:
- Shadow DOM: Use semantic locators (find role, find label) - CSS selectors won't work
- Chart.js: Screenshot comparison + JavaScript eval for Chart.js data access
- Prioritized use cases: smoke tests, simulation workflow, responsive layouts, form interactions
- Test directory: test/e2e/ with JavaScript test files (cross-platform)

### Phase 14: Dashboard Calculations Review
**Goal**: Thoroughly review dashboard components and verify calculations are working properly to display results, create gap findings for any issues
**Depends on**: Phase 13
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-07
**Success Criteria** (what must be TRUE):
  1. All dashboard components render correctly with simulation data
  2. All calculations produce accurate and expected results
  3. Gap findings documented for any identified issues
  4. Each gap has a clear description and proposed resolution
**Research**: Complete (see 14-RESEARCH.md)
**Plans**: 2 plans

Plans:
- [x] 14-01: Calculation verification and gap identification
- [x] 14-02: Visualization verification and final gap documentation

**Details:**
Based on research findings:
- Percentile scale mismatch in monte-carlo.ts (uses 0-1 scale, should use 0-100)
- Success rate definition inconsistency (> vs >=)
- Asset statistics fallback values may be misleading
- Output: 14-GAP-FINDINGS.md with complete issue documentation

### Phase 15: Dashboard Gap Fixes
**Goal**: Resolve all 4 gaps identified in 14-GAP-FINDINGS.md to ensure dashboard displays correct data
**Depends on**: Phase 14
**Requirements**: CALC-01, CALC-02, VIZ-01, VIZ-04, VIZ-06, VIZ-07
**Success Criteria** (what must be TRUE):
  1. GAP-01 FIXED: Percentile scale corrected (0-100) in monte-carlo.ts - all P10/P25/P50/P75/P90 values realistic
  2. GAP-02 FIXED: Success rate uses consistent operator (> or >=) across codebase
  3. GAP-VIZ-07 FIXED: Array indexing uses idx instead of year value in updateComparisonLineChart
  4. VIZ-04 FIXED: Correlation heatmap fallback values clearly labeled as estimates
  5. VIZ-01 and VIZ-06 display correct percentile data after GAP-01 fix
  6. All regression tests pass for affected calculations
**Research**: Not needed (fixes documented in 14-GAP-FINDINGS.md)
**Plans**: 4 plans

Plans:
- [x] 15-01-PLAN.md -- Fix GAP-01: Percentile scale mismatch (0-1 to 0-100)
- [x] 15-02-PLAN.md -- Fix GAP-02: Success rate operator consistency
- [x] 15-03-PLAN.md -- Fix GAP-VIZ-07: Array indexing in updateComparisonLineChart
- [x] 15-04-PLAN.md -- Fix VIZ-04: Fallback value labeling in correlation heatmap

**Details:**
Gap resolution priority from 14-GAP-FINDINGS.md:
- GAP-01 (HIGH/CRITICAL): Percentile scale mismatch - 13+ call sites in monte-carlo.ts
- GAP-VIZ-07 (MEDIUM/HIGH): Array indexing issue - 1 line fix in results-dashboard.ts
- GAP-02 (MEDIUM): Success rate inconsistency - 1 operator change
- VIZ-04 (LOW): Fallback value labeling - UI enhancement

### Phase 16: Dashboard Comparison Mode
**Goal**: Implement side-by-side comparison view when switching portfolio presets, allowing users to compare simulation results between different strategies
**Depends on**: Phase 15
**Requirements**: UI-01, UI-04, VIZ-01, VIZ-02
**Success Criteria** (what must be TRUE):
  1. When switching presets after a simulation, user is prompted to compare or replace results
  2. Comparison mode displays previous and current simulation results side-by-side (desktop)
  3. Comparison mode displays tabbed/table view on mobile with delta indicators
  4. Delta indicators show +/- changes for key metrics (final value, success rate, drawdown, returns)
  5. Key differences summary provides plain-language trade-off assessment
  6. User can exit comparison mode to return to single-result view
  7. User can run new simulation from comparison mode
  8. Comparison state persists during session but clears on page refresh
**Research**: Complete (see 16-RESEARCH.md)
**Plans**: 4 plans

Plans:
- [x] 16-01-PLAN.md -- State manager and delta calculations (Wave 1)
- [x] 16-02-PLAN.md -- Desktop comparison dashboard and delta indicators (Wave 2)
- [x] 16-03-PLAN.md -- Mobile tabs and trade-off summary (Wave 2)
- [x] 16-04-PLAN.md -- Integration and user flow wiring (Wave 3)

**Details:**
User flow:
1. User runs simulation with Preset A -> results displayed normally
2. User switches to Preset B -> prompt: "Compare with previous results?"
3. If yes -> comparison mode activates, showing both results
4. If no -> previous results cleared, ready for new simulation
5. User can exit comparison anytime via "Exit Comparison" button

Key components:
- ComparisonStateManager service (sessionStorage persistence)
- ComparisonDashboard wrapper component
- DeltaIndicator component (+/- with colors)
- TradeOffSummary component (plain-language assessment)
- Delta calculation utilities
- Desktop: Two-panel CSS Grid layout
- Mobile: ARIA-compliant tabbed interface

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> ... -> 7 -> 7.1 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Build System | 2/2 | Complete | 2026-01-17 |
| 2. Core Math & Statistics | 2/2 | Complete | 2026-01-17 |
| 3. Simulation Engine | 4/4 | Complete | 2026-01-17 |
| 4. SBLOC Engine | 3/3 | Complete | 2026-01-17 |
| 5. Financial Calculations | 3/3 | Complete | 2026-01-17 |
| 6. Visualizations | 4/4 | Complete | 2026-01-17 |
| 7. UI Components | 4/4 | Complete | 2026-01-18 |
| 7.1. Application Integration | 5/5 | Complete | 2026-01-18 |
| 8. Data Layer | 5/5 | Complete | 2026-01-18 |
| 9. Theming & Polish | 0/3 | Not started | - |
| 10. PWA & Export | 0/2 | Not started | - |
| 11. Complete Results Dashboard | 13/13 | Complete | 2026-01-20 |
| 12. Monthly Withdrawal Simulation | 2/2 | Complete | 2026-01-22 |
| 13. E2E Testing with Agent-Browser | 6/6 | Complete | 2026-01-22 |
| 14. Dashboard Calculations Review | 2/2 | Complete | 2026-01-22 |
| 15. Dashboard Gap Fixes | 4/4 | Complete | 2026-01-22 |
| 16. Dashboard Comparison Mode | 4/4 | Complete | 2026-01-23 |

**Total Plans**: 69
**Completed Plans**: 66
