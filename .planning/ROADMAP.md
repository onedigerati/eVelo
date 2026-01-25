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
- [x] **Phase 9: Theming & Polish** - Light/dark themes, help sections, print layout
- [ ] **Phase 10: PWA & Export** - Service worker, single-file export, offline capability
- [x] **Phase 11: Complete Results Dashboard** - Add missing charts and statistics to results dashboard
- [x] **Phase 12: Monthly Withdrawal Simulation** - Refactor SBLOC engine for monthly time steps and withdrawal compounding
- [x] **Phase 13: E2E Testing with Agent-Browser** - Implement automated UI testing using semantic locators for Shadow DOM and screenshot comparison for Chart.js
- [x] **Phase 14: Dashboard Calculations Review** - Thoroughly review dashboard components and verify calculations display correctly, create gap findings
- [x] **Phase 15: Dashboard Gap Fixes** - Resolve all 4 gaps from 14-GAP-FINDINGS.md (percentile scale, success rate, array indexing, fallback labels)
- [x] **Phase 16: Dashboard Comparison Mode** - Side-by-side comparison view when switching portfolio presets, responsive mobile layout
- [x] **Phase 17: Welcome Page & User Guide** - Welcome dashboard with BBD strategy introduction, comprehensive user guide with parameter documentation
- [x] **Phase 18: Fix Regime-Switching Model** - Connect asset historical returns to regime parameters, implement calibration modes, fix preset data year labels
- [x] **Phase 19: Sell Strategy Accuracy** - Match reference application order of operations, add dividend tax modeling, ensure apples-to-apples comparison
- [ ] **Phase 20: Financial Calculation Audit** - Comprehensive verification of all calculation accuracy, fix 13 identified risk areas
- [ ] **Phase 21: Header Redesign** - Elegant, branded header with improved aesthetics, eVelo identity, and responsive mobile experience
- [ ] **Phase 22: Mobile Sidebar UX Redesign** - Vertical collapse/expand on mobile, auto-collapse on simulation, "eVelo Parameters" label replacing hamburger icon
- [ ] **Phase 23: Reference Methodology Alignment** - Align Monte Carlo simulation with reference application methodology (bootstrap correlation, 4-regime system, fat-tail model, dividend tax modeling)

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
- [x] 09-01-PLAN.md -- Theme infrastructure (service, Chart.js configs, FOUC prevention)
- [x] 09-02-PLAN.md -- Theme toggle component and settings integration
- [x] 09-03-PLAN.md -- Print layout and help tooltips

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

### Phase 17: Welcome Page & User Guide
**Goal**: Transform empty dashboard into a welcoming introduction page with BBD strategy overview and comprehensive user guide
**Depends on**: Phase 16
**Requirements**: UI-07, USER-01 (new)
**Success Criteria** (what must be TRUE):
  1. Welcome page displays on app load (before first simulation)
  2. BBD strategy introduction explains Buy-Borrow-Die concept clearly
  3. Quick-start section guides users to run their first simulation
  4. User guide accessible via dedicated button/link
  5. User guide documents all simulation parameters with explanations
  6. User guide explains chart interpretations and metrics
  7. Navigation between welcome/guide/dashboard is intuitive
  8. Design is elegant and matches application aesthetic
**Research**: Complete (see 17-RESEARCH.md)
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md -- Welcome screen component with BBD introduction
- [x] 17-02-PLAN.md -- User guide modal with parameter documentation
- [x] 17-03-PLAN.md -- Integration into app-root and event wiring

**Details:**
Based on research findings:
- Empty state pattern for welcome screen (displays when no simulation run)
- Existing UI primitives: help-section, modal-dialog, help-tooltip (no new dependencies)
- Three-step BBD explanation (Buy, Borrow, Die) with benefits/risks balance
- Progressive disclosure using accordions for parameter documentation
- Quick-start CTA triggers first simulation
- User guide button in header for persistent access
- Disclaimer required for educational content

### Phase 18: Fix Regime-Switching Model
**Goal**: Make regime-switching model use asset-specific historical data and implement calibration modes
**Depends on**: Phase 17
**Requirements**: SIM-06 (regime-switching returns)
**Success Criteria** (what must be TRUE):
  1. Regime-switching model derives parameters from actual asset historical returns (not generic S&P 500 defaults)
  2. "Historical" calibration mode uses actual historical regime parameters
  3. "Conservative" calibration mode uses more pessimistic parameters (lower returns, higher volatility)
  4. Preset data year labels corrected (2025→1995, representing 1995-2025 historical data)
  5. CAGR values reflect actual portfolio asset characteristics, not generic market parameters
  6. regimeCalibration config parameter is actually used in simulation
**Research**: Complete (see 18-RESEARCH.md)
**Plans**: 4 plans

Plans:
- [x] 18-01-PLAN.md -- Fix preset year labels (shift 2025→1995 in all preset JSON files)
- [x] 18-02-PLAN.md -- Create regime calibration module (threshold classification, parameter estimation)
- [x] 18-03-PLAN.md -- Implement Conservative calibration mode (stress-test adjustments)
- [x] 18-04-PLAN.md -- Wire regimeCalibration to simulation engine (connect calibration to monte-carlo.ts)

**Details:**
Issues identified during CAGR review:
1. **Regime-Switching ignores asset data**: `generateCorrelatedRegimeReturns` uses `DEFAULT_REGIME_PARAMS` (S&P 500 calibrated: 12% bull, -8% bear, -30% crash) for ALL assets regardless of actual historical returns
2. **regimeCalibration has no effect**: The setting is stored but never passed to regime-switching functions - both "Historical" and "Conservative" produce identical results
3. **Preset year labels incorrect**: stocks.json shows 2025-2055 (future years) but should be 1995-2025 (actual historical data shifted by 30 years)
4. **CAGR doesn't reflect portfolio**: 10.8% CAGR for tech portfolio (AAPL, GOOGL, MSFT, AMD) is generic S&P 500 behavior, not tech-stock-specific

Based on research findings:
- Threshold-based regime classification (10/30 percentile split for crash/bear/bull)
- Asset-specific parameter estimation from classified historical data
- Conservative mode applies Federal Reserve stress test-style adjustments
- No new dependencies - uses existing math module (mean, stddev, percentile)

### Phase 19: Sell Strategy Accuracy
**Goal**: Match reference application mechanics for accurate BBD vs Sell Assets comparison
**Depends on**: Phase 18
**Requirements**: CALC-05 (BBD vs Sell comparison), ESTATE-02 (BBD advantage)
**Success Criteria** (what must be TRUE):
  1. Sell strategy applies withdrawal BEFORE returns (matching reference order of operations)
  2. Dividend taxes modeled for Sell strategy (liquidated from portfolio, not borrowed)
  3. Both strategies use identical market returns for apples-to-apples comparison
  4. Gross-up formula correctly calculates amount to sell for net withdrawal after taxes
  5. BBD advantage reflects accurate tax savings and compounding difference
  6. Results match reference application within reasonable tolerance
**Research**: Complete (see conversation analysis of PortfolioStrategySimulator.html)
**Plans**: 4 plans

Plans:
- [x] 19-01-PLAN.md -- Fix order of operations (withdrawal before returns in Sell strategy)
- [x] 19-02-PLAN.md -- Add dividend tax modeling to Sell strategy
- [x] 19-03-PLAN.md -- Ensure identical returns path for both strategies
- [x] 19-04-PLAN.md -- Verify gross-up formula and add integration tests

**Details:**
Issues identified during reference application analysis:
1. **Order of operations differs**: eVelo applies returns FIRST then withdrawal. Reference applies withdrawal FIRST then returns. This makes eVelo's Sell strategy more favorable than reality.
2. **Missing dividend tax in Sell**: Reference BBD borrows to pay dividend taxes (portfolio whole), Sell liquidates (portfolio reduced). eVelo doesn't model this for Sell.
3. **Return derivation indirect**: eVelo derives growth rates from BBD percentile data rather than using identical raw returns array. Should pass same returns to both strategies.
4. **Gross-up formula verified correct**: Both implementations use `withdrawal / (1 - gainPct * taxRate)` formula.

Reference application order (correct):
1. Dividend tax reduces portfolio
2. Withdrawal + capital gains tax reduces portfolio
3. Returns applied to reduced portfolio

eVelo current order (too favorable to Sell):
1. Returns applied to full portfolio
2. Withdrawal + capital gains tax reduces portfolio

### Phase 20: Financial Calculation Audit
**Goal**: Comprehensive verification of all financial calculations with high confidence in accuracy
**Depends on**: Phase 19
**Requirements**: All calculation requirements (CALC-01 through CALC-07, ESTATE-01 through ESTATE-04)
**Success Criteria** (what must be TRUE):
  1. All 13 identified risk areas audited and resolved
  2. Cost basis ratio user-configurable (not hardcoded at 40%)
  3. Dividend yield user-configurable (not hardcoded at 2%)
  4. Sell strategy uses expanded Monte Carlo scenarios (not just 10)
  5. Success rate definitions consistent across BBD and Sell strategies
  6. SBLOC withdrawals support inflation adjustment
  7. Interest compounding configuration actually applied
  8. CAGR/TWRR reporting clarified (median vs mean)
  9. Edge cases handled (LTV=Infinity, portfolio=0)
  10. State validation added to SBLOC engine
  11. Tax rate naming consistent across modules
  12. All dashboard outputs verified against calculation sources
**Research**: Complete (see 20-RESEARCH.md)
**Plans**: 11 plans

Plans:
- [ ] 20-01-PLAN.md -- Create centralized config module for calculation constants
- [ ] 20-02-PLAN.md -- Add state validation guards to SBLOC engine
- [ ] 20-03-PLAN.md -- Unify success rate definitions (BBD and Sell)
- [ ] 20-04-PLAN.md -- Wire configurable cost basis and dividend yield to Sell strategy
- [ ] 20-05-PLAN.md -- Add inflation-adjusted withdrawal support to SBLOC engine
- [ ] 20-06-PLAN.md -- Verify and document interest compounding configuration
- [ ] 20-07-PLAN.md -- Make liquidation target LTV configurable
- [ ] 20-08-PLAN.md -- Clarify CAGR and TWRR reporting methodology
- [ ] 20-09-PLAN.md -- Set up Vitest and add unit tests for key calculations
- [ ] 20-10-PLAN.md -- Add UI controls for cost basis and dividend yield
- [ ] 20-11-PLAN.md -- Final verification and integration testing

**Details:**
13 Risk Areas Identified:
1. **Cost Basis Hardcoded (HIGH)** - 40% assumption in sell-strategy.ts never user-configurable
2. **Dividend Yield Hardcoded (HIGH)** - 2% default may underestimate high-yield portfolios
3. **Sell Strategy 10 Scenarios (HIGH)** - vs 10,000 BBD iterations creates statistical noise
4. **Interest Compounding Ignored (MEDIUM)** - Monthly setting may not be applied
5. **CAGR Uses Median (LOW)** - Mathematically different from mean CAGR
6. **Success Rate Definitions Differ (MEDIUM)** - BBD: >initial vs Sell: not depleted
7. **Estate Analysis Loan Interest (MEDIUM)** - May not adjust cost basis correctly
8. **SBLOC No Withdrawal Growth (HIGH)** - Doesn't model inflation-adjusted withdrawals
9. **Liquidation Target LTV Hardcoded (LOW)** - 0.8x multiplier not configurable
10. **TWRR Shows P50 Only (LOW)** - No range of return outcomes
11. **LTV Floating Point Edge Cases (MEDIUM)** - Infinity/NaN when portfolio=0
12. **No State Validation in SBLOC (MEDIUM)** - Silent failures possible
13. **Multiple Tax Rate Definitions (LOW)** - Naming inconsistency

Resolution Priority:
- Critical (fix immediately): #1, #2, #3, #6, #8
- Important (fix in phase): #4, #7, #11, #12
- Enhancement (improve UX): #5, #9, #10, #13

Wave Structure:
- Wave 1 (parallel): 20-01, 20-02, 20-03, 20-05, 20-06, 20-08 (foundation work)
- Wave 2 (depends on Wave 1): 20-04, 20-07 (uses config module)
- Wave 3 (depends on Wave 2): 20-09, 20-10 (testing and UI)
- Wave 4 (final): 20-11 (verification)

### Phase 21: Header Redesign
**Goal**: Transform the header into an elegant, branded experience that proudly represents eVelo's identity while maintaining intuitive functionality and responsive mobile design
**Depends on**: Phase 20
**Requirements**: UI-01, THEME-01
**Success Criteria** (what must be TRUE):
  1. Header design is visually refined with professional typography and spacing
  2. eVelo branding is prominent with distinctive logo/wordmark treatment
  3. Tagline or value proposition communicates app purpose clearly
  4. Action buttons (settings, help, theme) are elegantly integrated
  5. Mobile view collapses gracefully with hamburger menu or icon-only mode
  6. Dark theme support with appropriate color adjustments
  7. Consistent with reference application's visual quality
  8. Accessible with proper contrast ratios and keyboard navigation
**Research**: Complete (see 21-RESEARCH.md)
**Plans**: 2 plans

Plans:
- [ ] 21-01-PLAN.md -- Create app-header component with branding and tagline (Wave 1)
- [ ] 21-02-PLAN.md -- Integration into app-root and visual verification (Wave 2)

**Details:**
Inspiration from reference application:
- Clean centered title with subtle icon
- Descriptive tagline below main title
- Icon buttons in top-right corner (settings, help, theme toggle)
- Unified dark header bar creates visual anchor
- Professional, polished aesthetic

Key improvements over current eVelo header:
- Add visual brand identity (logo or distinctive typography)
- Add tagline to communicate value proposition
- Consider gradient or subtle background treatment
- Improve icon button grouping and spacing
- Ensure mobile-first responsive behavior

### Phase 22: Mobile Sidebar UX Redesign
**Goal**: Redesign mobile sidebar interaction with vertical collapse behavior, auto-collapse on simulation, and branded "eVelo Parameters" label
**Depends on**: Phase 21
**Requirements**: UI-04 (mobile layout), UI-01 (sidebar)
**Success Criteria** (what must be TRUE):
  1. Mobile: Sidebar collapses/expands vertically (slides up/down) instead of horizontal overlay
  2. Mobile: Clicking "Run Monte Carlo Simulation" auto-collapses sidebar and shows dashboard
  3. Mobile: "eVelo Parameters" text label replaces hamburger icon (☰)
  4. Desktop: "eVelo Parameters" label rotates 90 degrees when sidebar is collapsed
  5. Transition animations are smooth (CSS transitions)
  6. Touch interactions work reliably on mobile devices
  7. Accessible with keyboard navigation and ARIA attributes
  8. Dark theme styling maintained for collapsed/expanded states
**Research**: Complete (see 22-RESEARCH.md)
**Plans**: 2 plans

Plans:
- [x] 22-01-PLAN.md -- Mobile vertical collapse behavior and auto-collapse on simulation
- [x] 22-02-PLAN.md -- Desktop rotated label and integration testing

**Details:**
User-requested UX improvements:
1. **Vertical collapse (mobile)**: Panel slides up/down instead of horizontal overlay - more natural for mobile interaction
2. **Auto-collapse on simulation**: When user clicks "Run Monte Carlo Simulation", panel auto-collapses to reveal results
3. **Branded label**: Replace hamburger icon with "eVelo Parameters" text for clearer navigation
4. **Rotated label (desktop)**: When collapsed in desktop view, label rotates 90° for compact display

Implementation approach:
- CSS transform: translateY() for mobile vertical slide
- CSS transform: rotate(-90deg) for desktop collapsed label
- Event listener on simulation button to trigger collapse
- Update main-layout.ts and sidebar-panel.ts components

### Phase 23: Reference Methodology Alignment
**Goal**: Align eVelo's Monte Carlo simulation with the reference PortfolioStrategySimulator.html methodology for accurate, matching results
**Depends on**: Phase 22
**Requirements**: SIM-01, SIM-02, SIM-03, SIM-04, SIM-05, SIM-06, CALC-05, SBLOC-01
**Success Criteria** (what must be TRUE):
  1. Bootstrap model uses shared year index to preserve natural asset correlations
  2. Regime model implements 4 states (bull/bear/crash/recovery) with proper transition matrices
  3. Fat-tail model implements Student's t-distribution with asset-class specific parameters
  4. Survivorship bias adjustment applied based on regime mode (1.5% historical, 2.0% conservative)
  5. Sell strategy runs 1-per-iteration using same return path as BBD (not synthetic scenarios)
  6. Dividend tax modeled for both strategies (BBD borrows via SBLOC, Sell liquidates)
  7. Chapter system implemented for withdrawal reductions
  8. Path-coherent percentiles extract complete simulation paths (not year-by-year percentiles)
  9. Asset class differentiation (equity_stock, equity_index, commodity, bond) with specific parameters
  10. Results match reference application within reasonable tolerance
**Research**: Complete (see 23-REFERENCE-METHODOLOGY.md)
**Plans**: 9 plans

Plans:
- [ ] 23-01-PLAN.md -- Bootstrap correlation preservation (shared year index sampling)
- [ ] 23-02-PLAN.md -- 4-regime system with recovery state and transition matrices
- [ ] 23-03-PLAN.md -- Fat-tail model with Student's t-distribution and asset-class params
- [ ] 23-04-PLAN.md -- Survivorship bias adjustment for regime model
- [ ] 23-05-PLAN.md -- Sell strategy alignment (1-per-iteration with same returns)
- [ ] 23-06-PLAN.md -- Dividend tax modeling for BBD and Sell strategies
- [ ] 23-07-PLAN.md -- Wire fat-tail model into Monte Carlo simulation
- [ ] 23-08-PLAN.md -- Chapter system for withdrawal reductions
- [ ] 23-09-PLAN.md -- Path-coherent percentile extraction verification

**Details:**
Critical methodology gaps identified from reference analysis:

1. **Bootstrap Correlation (CRITICAL)**: Reference uses `sharedYearIndex` to sample same historical year for all assets, preserving natural correlations. eVelo samples independently, breaking correlations.

2. **4-Regime System**: Reference has bull/bear/crash/recovery states. eVelo has bull/bear/crash only. Recovery state has specific transition probabilities and parameters.

3. **Fat-Tail Distribution**: Reference uses Student's t-distribution with asset-class specific degrees of freedom and skew multipliers. eVelo doesn't implement this model.

4. **Sell Strategy Mismatch (CRITICAL)**: Reference runs sell strategy with SAME return path as BBD iteration (apples-to-apples comparison). eVelo runs 10 synthetic scenarios with derived growth rates.

5. **Dividend Tax**: Reference models dividend tax differently:
   - BBD: Borrows via SBLOC to pay dividend tax (portfolio stays whole)
   - Sell: Liquidates from portfolio to pay dividend tax (portfolio reduced)

6. **Chapter System**: Reference supports 3-chapter withdrawal reductions (e.g., reduce spending after kids leave, after mortgage paid off).

Key constants from reference:
- Historical survivorship bias: 1.5%
- Conservative survivorship bias: 2.0%
- Bull→Bull transition: 0.89
- Crash return clamp: -99% to +500%
- Fat-tail degrees of freedom: 4-7 depending on asset class

See: .planning/phases/23-reference-methodology-alignment/23-REFERENCE-METHODOLOGY.md

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> ... -> 7 -> 7.1 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17 -> 18 -> 19 -> 20 -> 21 -> 22 -> 23

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
| 9. Theming & Polish | 3/3 | Complete | 2026-01-23 |
| 10. PWA & Export | 0/2 | Not started | - |
| 11. Complete Results Dashboard | 13/13 | Complete | 2026-01-20 |
| 12. Monthly Withdrawal Simulation | 2/2 | Complete | 2026-01-22 |
| 13. E2E Testing with Agent-Browser | 6/6 | Complete | 2026-01-22 |
| 14. Dashboard Calculations Review | 2/2 | Complete | 2026-01-22 |
| 15. Dashboard Gap Fixes | 4/4 | Complete | 2026-01-22 |
| 16. Dashboard Comparison Mode | 4/4 | Complete | 2026-01-23 |
| 17. Welcome Page & User Guide | 3/3 | Complete | 2026-01-24 |
| 18. Fix Regime-Switching Model | 4/4 | Complete | 2026-01-24 |
| 19. Sell Strategy Accuracy | 4/4 | Complete | 2026-01-24 |
| 20. Financial Calculation Audit | 0/11 | Planned | - |
| 21. Header Redesign | 0/2 | Planned | - |
| 22. Mobile Sidebar UX Redesign | 2/2 | Complete | 2026-01-25 |
| 23. Reference Methodology Alignment | 0/9 | Planned | - |

**Total Plans**: 105
**Completed Plans**: 91
