# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-17)

**Core value:** Accurate, trustworthy Monte Carlo simulation of the BBD strategy with clear visualization of risk and outcomes — enabling users to make informed decisions about leveraged wealth preservation.
**Current focus:** Phase 16 - Dashboard Comparison Mode

## Current Position

Phase: 16 of 16 (Dashboard Comparison Mode)
Plan: 1 of 3 complete (16-01)
Status: In progress
Last activity: 2026-01-23 — Completed 16-01-PLAN.md

Progress: ████████████████████████████████████████ 98% (64/66 plans total)

## Performance Metrics

**Velocity:**
- Total plans completed: 59
- Average duration: 3.5 min
- Total execution time: 204 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2/2 | 5 min | 2.5 min |
| 02-core-math | 2/2 | 5 min | 2.5 min |
| 03-simulation-engine | 4/4 | 12 min | 3 min |
| 04-sbloc-engine | 3/3 | 13 min | 4.3 min |
| 05-financial-calculations | 3/3 | 7 min | 2.3 min |
| 06-visualizations | 4/4 | 12 min | 3.0 min |
| 07-ui-components | 4/4 | 17 min | 4.3 min |
| 08-data-layer | 5/5 | 13 min | 2.6 min |
| 07.1-application-integration | 5/5 | 23 min | 4.6 min |
| 11-complete-results-dashboard | 13/13 | 49 min | 3.8 min |
| 12-monthly-withdrawal-simulation | 2/2 | 7 min | 3.5 min |
| 13-e2e-testing-agent-browser | 6/6 | 21 min | 3.5 min |
| 14-dashboard-calculations-review | 2/2 | 9 min | 4.5 min |
| 15-dashboard-gap-fixes | 4/4 | 19 min | 4.75 min |
| 16-dashboard-comparison-mode | 1/3 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 15-02 (2 min), 15-03 (6 min), 15-04 (9 min), 16-01 (2 min)
- Trend: Phase 16 started - comparison mode foundation

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

**From 13-RESEARCH (E2E Testing):**
- agent-browser CLI + cross-spawn for Windows compatibility
- Vite createServer() API for programmatic server control (not npm run dev)
- pixelmatch with 0.1 threshold for Chart.js visual regression
- JavaScript test files (not bash scripts) for cross-platform
- Three helper modules: agent-browser.js, server.js, screenshot.js
- Port 5174 for test server (avoids conflict with dev on 5173)
- postinstall script for agent-browser Chromium installation

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

**From 04-01:**
- Pure function pattern for state updates (accrueInterest returns new state, never mutates)
- Configurable compounding frequency (annual/monthly) for realistic modeling
- Warning zone tracking via inWarningZone boolean in SBLOCState
- Optional capitalGainsTax field in LiquidationEvent for future tax-aware simulation
- effectiveAnnualRate helper for comparing compounding scenarios
- SBLOC module structure: types.ts for interfaces, interest.ts for calculations, index.ts barrel

**From 04-02:**
- Recalculate LTV in margin call functions rather than trusting cached currentLTV
- Return Infinity for LTV when collateral is zero but loan exists
- Clamp available credit to 0 (never negative available credit)
- MarginBuffer type with both dollar and percent metrics for UI flexibility
- calculateDropToMarginCall returns negative when already past margin call threshold
- Threshold calculation pattern: threshold_portfolio = loan / target_ltv

**From 04-03:**
- Target LTV after liquidation = maintenanceMargin * 0.8 (safety buffer)
- Haircut formula: assetsToSell = excessLoan / (1 - haircutRate)
- Interest applied inline in stepSBLOC (not via accrueInterest) for step order control
- Portfolio failure = net worth <= 0 (portfolio - loan)
- Step function increments yearsSinceStart automatically
- SBLOCYearResult type: newState, marginCallTriggered, liquidationEvent, portfolioFailed, interestCharged, withdrawalMade

**From 05-01:**
- CAGR uses median (p50) terminal value as representative outcome
- Volatility calculated from annualized returns derived from terminal values
- Return -1 for CAGR when end value is zero or negative (total loss)
- PercentileDistribution type: p10, p25, p50, p75, p90 structure
- Calculation functions accept Float64Array and convert internally
- Pre-calculated success rate preference from statistics when available

**From 05-02:**
- TWRR uses median (p50) for time-weighted return calculation
- Geometric return linking: (1+R1)(1+R2)...(1+Rn) - 1
- Return NaN for invalid inputs (zero/negative start values, periods <= 0)
- Monotonic cumulative probability via Math.max enforcement
- Iteration-based counting for margin calls (not event-based)
- First-call-year tracking for accurate cumulative probability

**From 05-03:**
- Stepped-up basis savings = embedded gains * capital gains rate (23.8% default)
- BBD advantage = BBD net estate - Sell net estate (positive means BBD is better)
- Return 0 for embedded gains in loss scenarios (no negative gains)
- Salary equivalent = withdrawal / (1 - taxRate)
- Handle 100% tax rate edge case by returning Infinity
- Barrel export pattern for calculations module (index.ts re-exports all)

**From 06-01:**
- Chart.js 4.x with tree-shaking via chart.js/auto import
- Matrix plugin registration at module level for heatmaps
- Canvas created in template, chart instantiated in afterRender
- Percentile color scheme: green(optimistic)->blue(median)->red(pessimistic)
- BaseChart pattern: extend for specific chart types
- updateData method for efficient data-only updates
- disconnectedCallback destroys chart to prevent memory leaks

**From 06-02:**
- Use fill: '-1' to fill between adjacent percentile datasets
- Hex + alpha suffix for transparency (e.g., #22c55e4d for 30% opacity)
- LINE_STYLES typed as Record<string, number[]> to avoid readonly conflicts
- Intl.NumberFormat with compact notation for currency axis labels

**From 06-03:**
- createHistogramBins helper for binning terminal values
- Risk-based color thresholds: 0-5% green, 5-15% yellow, 15-30% orange, 30%+ red
- Custom afterDraw plugin for advantage annotation without adding plugin dependency
- Gradient bar colors for histogram: red (low) to green (high) based on position

**From 06-04:**
- Golden angle (137.5 degrees) color generation for portfolios with >5 assets
- Diverging color scale for correlation: red (negative) -> white (zero) -> blue (positive)
- Contrast-aware text color based on background brightness calculation
- interpolateColor helper exported for reuse

**From 07-01:**
- CSS custom properties with fallback values in var() calls for component isolation
- Style native inputs rather than custom implementations for accessibility
- Custom events with composed:true to cross Shadow DOM boundary
- Teal primary color (#0d9488) as brand color
- Dark theme placeholder in tokens for Phase 9

**From 07-02:**
- Native details/summary for param-section (zero JS toggle, accessible by default)
- CSS attribute selector `:host([collapsed])` for sidebar collapse styling
- JSON string attributes for asset arrays (simple serialization)
- Map for weight storage in weight-editor (efficient key-value access)

**From 07-03:**
- Singleton toast-container manages all toast lifecycle
- Auto-dismiss with configurable duration (default 5s, 0 disables)
- Max 3 visible toasts (removes oldest when exceeded)
- ARIA live region for screen reader accessibility

**From 07-04:**
- CSS Grid for main-layout: `grid-template-columns: var(--sidebar-width) 1fr`
- Mobile breakpoint at 768px: sidebar becomes fixed overlay with backdrop
- CSS class toggle instead of inline display:none for components needing shadow DOM
- attributeChangedCallback required for components that update dynamically
- Object format support in weight-editor for richer asset metadata `{id, name, weight}`
- All custom elements MUST have `customElements.define()` registration

**From 08-01:**
- Dexie.js 4.x EntityTable pattern for typed IndexedDB tables
- Store dates as ISO strings for JSON serialization (not Date objects)
- Safari IndexedDB lazy-load workaround at module level
- Compound index [symbol+source] for multi-field market data lookups
- Version field in records for future schema migrations
- getDefaultSettings() helper for settings initialization

**From 08-02:**
- Static JSON imports for Vite build-time inlining (no network requests)
- PresetData interface for typed access to bundled market data
- Symbol-keyed BUNDLED_PRESETS record for O(1) lookup
- Case-insensitive symbol lookup via toUpperCase()
- Sample data includes crisis periods (dot-com, 2008, COVID) for testing extremes

**From 08-03:**
- Pass optional reservoir/minTime as undefined to Bottleneck (ignores undefined values)
- Calculate returns from adjusted close for EODHD/Alpha Vantage/Tiingo
- Yahoo API throws explicit error rather than fallback (unreliable API)
- 7-day cache expiration for historical market data
- Abstract base class pattern for rate-limited API clients

**From 08-04:**
- Type assertion (as number) for Dexie put() return on auto-increment tables
- Weight sum validation with 0.01 tolerance for floating point
- Strip IDs on export for portability between databases
- Preserve original created timestamp on import, update modified
- EXPORT_VERSION constant for future format compatibility

**From 08-05:**
- CORS proxy abstraction with 4 modes (none, allorigins, corsproxy, custom)
- Yahoo API as last-resort fallback with conservative rate limiting (1 req/2s)
- Settings as singleton in IndexedDB with fixed 'settings' key
- API keys stored in IndexedDB (not localStorage) for security
- Type-safe ApiSource -> ApiKeys field mapping

**From 07.1-01:**
- Identity correlation matrix (diagonal=1, off-diagonal=0) as placeholder for Phase 9
- Fallback returns with console warning when preset data unavailable
- simulation-complete event pattern for component communication
- collectSimulationParams() method for gathering UI state
- isRunning state to prevent double-execution

**From 07.1-03:**
- Portfolio weights stored as decimal (0-1) in storage, percent (0-100) in UI
- request-portfolio-state event for collecting current weight-editor state
- portfolio-loaded event for updating weight-editor from stored data
- Default assetClass to 'equity' when saving portfolios
- XSS prevention via escapeHtml helper in portfolio-list

**From 07.1-04:**
- SVG gear icon instead of emoji for better cross-platform rendering
- Bullet masking for existing API keys with clear-on-focus behavior
- Radio button cards for CORS proxy selection (better UX than dropdown)
- Modal overlay pattern: settings-overlay with flexbox centering
- Settings panel API: show()/hide()/toggle() methods for external control

**From 07.1-05:**
- Static asset list from bundled presets (SPY, QQQ, IWM, AGG)
- Default selection SPY + AGG with 70/30 split
- Preserve existing weights when assets remain selected on reselection
- Distribute remaining weight equally among newly added assets

**From 11-01:**
- Dashboard property pattern: portfolioWeights and correlationMatrix setters trigger updateCharts()
- CSS aspect-ratio for square chart containers
- Weights passed as percent (0-100) to donut chart for display
- Identity correlation matrix from simulation config passed to heatmap

**From 11-02:**
- Extended SimulationStatistics fields are optional (computed in UI, not worker)
- Statistics grid uses repeat(4, 1fr) on desktop with 2-column mobile override
- computeExtendedStats() derives metrics from simulation data and configuration
- Configuration setters pattern: initialValue, timeHorizon, annualWithdrawal, effectiveTaxRate

**From 11-03:**
- Optional sbloc field in SimulationConfig for backward compatibility
- Track first margin call year per iteration for cumulative probability
- SBLOCTrajectory with loan balance percentiles (p10-p90) by year
- MarginCallStats with per-year probability and cumulative probability
- EstateAnalysis with simplified 23.8% tax calculation for BBD comparison
- computeMarginCallStats helper function in monte-carlo.ts

**From 11-04:**
- SBLOC sections hidden by default with CSS class toggle for visibility
- Query SBLOC sliders via parent param-section element for reliable DOM traversal
- Fixed 50K annual withdrawal with 70% maintenance margin as defaults
- Chart type assertion pattern for setData/data property access

**From 11-05:**
- KeyMetricsData interface with computed metrics from simulation output
- ParamSummaryData uses simulation config with sensible defaults
- Hero cards layout: 3-column grid stacking to 1-column on mobile (1024px breakpoint)
- Param summary layout: 2-column grid with teal left border accent
- updateKeyMetricsBanner() computes utilization from SBLOC trajectory
- updateParamSummary() uses simulation config fields (initialValue, timeHorizon)

**From 11-06:**
- PercentileSpectrum reusable component for P10/P50/P90 visualization
- Property setters trigger updateDisplay() for efficient partial updates
- Gradient bar using CSS linear-gradient (no JavaScript)
- Mobile breakpoint at 640px for spectrum component (stacks vertically)
- Compact currency notation for values >$1M for readability
- Empty title prop for debt spectrum (parent provides header)

### Roadmap Evolution

- Phase 7.1 inserted after Phase 7: Application Integration (URGENT)
  - Discovered during Phase 8 execution review
  - UI components exist but aren't wired to simulation engine
  - Charts exist but don't display results
  - Portfolio/settings services exist but have no UI
  - Must complete before Phase 9 (Theming)

- Phase 11 added: Complete Results Dashboard
  - Discovered during Phase 7.1 verification review

- Phase 12 added: Monthly Withdrawal Simulation
  - Discovered during quick-003: monthlyWithdrawal requires SBLOC engine refactor
  - Currently processes in annual steps; monthly granularity needed for accurate compounding

- Phase 13 added: E2E Testing with Agent-Browser
  - Based on quick-004 research findings
  - Hybrid approach: semantic locators for Shadow DOM, screenshot comparison for Chart.js
  - Prioritized use cases: smoke tests, simulation workflow, responsive layouts, form interactions

- Phase 14 added: Dashboard Calculations Review
  - Thorough review of dashboard components and calculations
  - Verify all calculations display correctly
  - Create gap findings for any issues identified

- Phase 15 added: Dashboard Gap Fixes
  - Resolves all 4 gaps from 14-GAP-FINDINGS.md
  - GAP-01 (HIGH): Percentile scale mismatch in monte-carlo.ts
  - GAP-VIZ-07 (MEDIUM): Array indexing in updateComparisonLineChart
  - GAP-02 (MEDIUM): Success rate operator inconsistency
  - VIZ-04 (LOW): Fallback value labeling in correlation heatmap

**From 11-07:**
- SellStrategyResult interface with terminal wealth, success rate, taxes
- calculateSellStrategy uses BBD percentiles for growth rates
- Multi-path simulation (P10-P90 + interpolated) for success rate
- StrategyAnalysis component with verdict banner and success dial
- Side-by-side comparison cards for BBD vs Sell metrics
- Wealth differential section (BBD vs Sell, Tax Savings, Estate Value)
- Verdict determined by terminal wealth comparison

**From 11-08:**
- Teal gradient banner pattern for highlighting key metrics
- Data property setter for bulk updates
- Conditional section visibility based on config values (withdrawal > 0)
- clamp() for responsive font sizing without media queries

**From 11-09:**
- PerformanceTable component showing 6 metrics (TWRR nom/real, balance nom/real, mean return, volatility)
- ReturnProbabilityTable with Expected Annual Return and Return Probabilities tables
- calculateReturnProbabilities for threshold/horizon probability matrix
- calculateExpectedReturns for percentile CAGR across time horizons
- calculatePerformanceSummary for all performance table data
- Percentile-based volatility approximation from terminal value dispersion
- Time horizon extrapolation using implied CAGR

**From 11-10:**
- YearlyAnalysisTable component with sticky headers and scrollable body
- calculateWithdrawals helper for annual/cumulative withdrawal projections
- Color-coded values (green positive, red negative, teal median)
- Compact currency notation for values >= $1M
- 3% default annual withdrawal growth

**From 11-11:**
- ComparisonLineChart for BBD vs Sell net worth trajectories
- CumulativeCostsChart for taxes vs interest area comparison
- TerminalComparisonChart grouped bars at P10/P25/P50/P75/P90
- SBLOCUtilizationChart with percentile bands and max borrowing line
- Utilization percentile mapping: P10 = best case, P90 = worst case
- Progressive tax accumulation estimation using power curve
- Visual Comparison section with 2-column responsive grid

**From 11-12:**
- Insight severity types: warning/note/action/info with colored icons
- generateInsights() for dynamic insights based on simulation data
- 6 standard considerations always displayed (margin call, sequence, interest rate, behavioral, regulatory, liquidity)
- Thresholds: 15% margin call prob, 10% CAGR, 80% success rate
- RecommendationsSection component with collapsible considerations
- updateRecommendationsSection() integrates insights into dashboard

**From 11-13:**
- HTML table-based correlation heatmap for flexible column layout
- Annualized return from daily mean: (1 + dailyMean)^252 - 1
- Annualized volatility from daily stddev * sqrt(252)
- calculateAssetStatistics helper for computing metrics from preset data
- Fallback to market average estimates (8% return, 16% vol)

**From 12-01:**
- Monthly compounding calculated by dividing rate by 12 and applying 12 times
- Backward compatibility via direct delegation when monthlyWithdrawal is false
- yearsSinceStart only increments at year boundary (month 11)
- Margin call and liquidation tracking uses first occurrence per year

**From 12-02:**
- stepSBLOCYear replaces stepSBLOC in Monte Carlo simulation
- monthlyWithdrawal flag passed from SBLOCSimConfig controls granularity
- compoundingFrequency 'annual' in base config, adjusted internally by stepSBLOCYear
- Default monthlyWithdrawal to false for backward compatibility

**From 13-01:**
- cross-spawn with npx for Windows-compatible agent-browser CLI execution
- Vite createServer() on port 5174 (avoids conflict with dev server 5173)
- pixelmatch 0.1 threshold for anti-aliasing tolerance in screenshot comparison
- Helper modules: agent-browser.js (CLI wrapper), server.js (Vite lifecycle), screenshot.js (comparison)
- Test directory structure: baseline/ (committed), current/ and diff/ (gitignored)

**From 13-02:**
- Warn (not fail) for form labels not found in accessibility tree (may be in collapsed sections)
- Keyboard-based interaction testing (ArrowRight, Backspace, fill) more reliable than mouse for Shadow DOM
- Support both combobox and listbox ARIA patterns for select dropdown testing
- Six test sections: layout, param-sections, ARIA roles, form labels, screenshot, form interactions

**From 13-03:**
- Accessibility tree snapshot for form value verification (confirms semantic locators work)
- Phase-based test structure for clear user journey progression
- evalJs for Chart.js data verification (canvas not in accessibility tree)
- 60s timeout for simulation completion to allow first-run compilation

**From 13-04:**
- Viewport testing pattern: VIEWPORTS array with name/width/height, EXPECTATIONS object with per-viewport assertions
- Responsive test structure: screenshot capture, component visibility checks, overflow detection, mobile-specific tests
- Test 3 viewports: desktop (1920x1080), tablet (768x1024), mobile (375x667)
- Warn (don't fail) when results-dashboard requires scroll on mobile

**From 13-05:**
- chartHasData() helper for Chart.js canvas data verification via evalJs
- Dual-mode test: --capture flag for baseline creation, default for verification
- Full dashboard screenshots (top/bottom) instead of per-chart (agent-browser captures full page)
- 0.1 pixelmatch threshold for anti-aliasing tolerance

**From 13-06:**
- Test orchestrator runs smoke, workflow, responsive sequentially (not parallel) to avoid port conflicts
- Critical vs non-critical test classification: critical failures block CI, non-critical log warnings only
- Charts excluded from CI (requires baseline capture first)
- GitHub Actions workflow with npm ci (triggers postinstall for agent-browser install)
- Upload screenshots/diff as artifacts on failure for debugging

**From 14-01:**
- Percentile scale mismatch identified in monte-carlo.ts (HIGH severity bug)
- Success rate inconsistency documented (MEDIUM severity - minimal impact)
- Verified 5 calculation modules match CFA standards (metrics, twrr, salary-equivalent, margin-call-probability, return-probabilities)
- Gap documentation template: Requirement, Severity, Component, Description, Evidence, Expected Behavior, Impact, Proposed Resolution

**From 14-02:**
- GAP-VIZ-07 identified: updateComparisonLineChart uses year value as array index instead of idx
- VIZ-04 fallback values (8%/16%) not clearly labeled as estimates in correlation heatmap
- VIZ-01 and VIZ-06 affected by GAP-01 but visualization code itself is correct
- Total 4 gaps found: 1 HIGH (GAP-01), 2 MEDIUM (GAP-02, GAP-VIZ-07), 1 LOW (VIZ-04)
- Comprehensive gap findings document with 11 sections (resolution priority, test recommendations, metadata)

### Pending Todos

None

### Blockers/Concerns

**4 Gaps Identified in Phase 14 - Requires Resolution:**

**GAP-01 (HIGH - CRITICAL) - FIXED in 1172a58:**
- Percentile scale mismatch in monte-carlo.ts (0-1 vs 0-100)
- Fixed: All 13 percentile calls corrected from 0.X to X0 scale
- Verified in 15-01 execution (fix was bundled with 15-02 commit)
- Affects: VIZ-01 (Probability Cone), VIZ-06 (SBLOC Balance), all P10/P50/P90 calculations

**GAP-VIZ-07 (MEDIUM - HIGH PRIORITY) - FIXED in 15-03:**
- Array indexing issue fixed in updateComparisonLineChart and updateSBLOCUtilizationChart
- Changed: `yearlyPercentiles[year]` to `yearlyPercentiles[idx]` in both functions
- Commit: 962dbdd

**GAP-02 (MEDIUM) - FIXED in 15-02:**
- Success rate now uses `>` consistently in both monte-carlo.ts and metrics.ts
- Fixed: Changed `>=` to `>` in calculateStatistics function
- Commit: 1172a58

**VIZ-04 (LOW) - FIXED in 15-04:**
- Correlation heatmap now displays "(est)" suffix for fallback values
- Added CSS styling (italic, reduced opacity) for estimated values
- Explanation note appears when any estimates are present
- Commit: edc03e1

**All gaps from Phase 14 are now RESOLVED.**

**See:** .planning/phases/14-dashboard-calculations-review/14-GAP-FINDINGS.md

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Make all sections in the left panel fully expanded by default | 2026-01-21 | 00eaad8 | [001-expand-left-panel-sections-default](./quick/001-expand-left-panel-sections-default/) |
| 002 | Move Run Simulation button to sidebar footer for persistent visibility | 2026-01-21 | 02b38ef | [002-move-run-simulation-button-to-left-pa](./quick/002-move-run-simulation-button-to-left-pa/) |
| 003 | Wire missing SBLOC config parameters in monte-carlo.ts | 2026-01-22 | 4c93afd | [003-resolve-key-missing-simulation-logic](./quick/003-resolve-key-missing-simulation-logic/) |
| 004 | Research agent-browser integration for UI testing | 2026-01-22 | 6ae2cdf | [004-research-agent-browser-integration](./quick/004-research-agent-browser-integration/) |
| 005 | Fix SBLOC chart Y-axis scaling for better readability | 2026-01-22 | 30f44fc | [005-fix-sbloc-chart-y-axis-scaling](./quick/005-fix-sbloc-chart-y-axis-scaling/) |
| 006 | Match reference dashboard style | 2026-01-22 | b01a589 | [006-match-reference-dashboard-style](./quick/006-match-reference-dashboard-style/) |
| 007 | Replace Portfolio Composition layout with donut+bars card | 2026-01-22 | 09cb38f | [007-replace-portfolio-composition-layout](./quick/007-replace-portfolio-composition-layout/) |
| 008 | Portfolio preset management with auto-save and persistence | 2026-01-22 | f4dbbbf | [008-portfolio-preset-management-auto-save-pe](./quick/008-portfolio-preset-management-auto-save-pe/) |
| 009 | Implement modal framework with blur effect | 2026-01-23 | ff49a7c | [009-implement-modal-framework-with-blur-effe](./quick/009-implement-modal-framework-with-blur-effe/) |
| 010 | Prevent duplicate portfolio preset names | 2026-01-23 | e2caede | [010-prevent-duplicate-portfolio-preset-names](./quick/010-prevent-duplicate-portfolio-preset-names/) |
| 011 | Reorganize parameter sections UX | 2026-01-23 | 26abaac | [011-reorganize-parameter-sections-ux](./quick/011-reorganize-parameter-sections-ux/) |
| 012 | Save all params to portfolio presets | 2026-01-23 | 7626f22 | [012-save-all-params-to-portfolio-presets](./quick/012-save-all-params-to-portfolio-presets/) |

**From quick-005:**
- Dynamic Y-axis scaling for SBLOC utilization chart based on actual data range
- 15% padding above highest value with rounding to nearest 5 for clean ticks
- Y-axis adapts to data: low utilization shows appropriate scale (e.g., 0-75% instead of 0-130%)
- Always includes maxBorrowing reference line in visible range

**From quick-006:**
- Portfolio composition shows donut chart (70% cutout) with horizontal asset bars
- Donut center displays asset count (e.g., "5 ASSETS")
- Horizontal bars sorted by weight descending with color swatches and percentages
- Light teal card background (#f0fdfa) with teal border for portfolio visualization
- Correlation table headers use teal background (#0d9488) with white text
- Alternating row backgrounds in correlation table (#f8fafc / #ffffff) for readability
- Both visualization and editing cards maintained for better UX

**From quick-007:**
- Created portfolio-viz-card component for results dashboard
- Donut chart (120x120px, 70% cutout) with center asset count label
- Horizontal bars sorted by weight descending with color swatches
- Portfolio Composition and Asset Correlations now full width on dashboard
- PORTFOLIO_COLORS constant for consistent asset coloring

**From quick-008:**
- Temp portfolio functions: saveTempPortfolio, loadTempPortfolio, loadLastPortfolio, deleteTempPortfolio
- TEMP_PORTFOLIO_KEY constant ('__temp_portfolio__') for identifying temp portfolios
- Selected assets hidden (not disabled) from available list
- Auto-save to temp portfolio on any change when no named preset selected
- Last portfolio (temp or named) loads on page refresh
- All 6 preset buttons functional: Save, Load, Import, Export, Delete
- Weight conversion: 0-1 in storage, 0-100 in UI

**From quick-009:**
- modal-dialog.ts component with show()/hide() Promise-based API
- Prompt mode returns input string or null
- Confirm mode returns true/false
- CSS backdrop-filter blur (4px) on overlay
- Keyboard support: Enter confirms, Escape cancels
- CSS tokens: --modal-backdrop, --modal-backdrop-blur, --modal-shadow, --modal-max-width
- portfolio-composition uses modal-dialog for Save and Delete actions

**From quick-010:**
- findPortfolioByName helper for case-insensitive name lookup
- Duplicate detection when saving portfolio presets
- Overwrite/change-name modal when duplicate name entered
- Preserves original created timestamp when overwriting
- Skip duplicate check if saving over currently loaded portfolio

**From quick-012:**
- Extended PortfolioRecord with 20+ optional simulation param fields
- getSimulationParams/setSimulationParams methods in app-root
- Event-based param capture (get-simulation-params) and restore (set-simulation-params)
- All params saved: SBLOC terms, iterations, inflation, return model, chapters, tax modeling
- Backward compatible: old portfolios without params load using UI defaults
- Auto-save to temp portfolio now includes simulation params

**From 15-02:**
- Standardized success rate to use `>` (strictly greater) operator
- Success = terminal value strictly above initial value (not at-or-above)
- Aligns with metrics.ts and JSDoc documentation

**From 15-03:**
- Fixed array indexing in updateComparisonLineChart and updateSBLOCUtilizationChart
- yearlyPercentiles[year] changed to yearlyPercentiles[idx]
- year is actual year number (1, 2, 3...), idx is array index (0, 1, 2...)

**From 15-04:**
- Added isEstimate field to HeatmapData interface
- Correlation heatmap displays "(est)" suffix for fallback values
- CSS styling for estimates: italic, 85% opacity
- Dynamic explanation note when estimates present
- Users can now distinguish calculated vs estimated values

**From 16-01:**
- SessionStorage for comparison state (clears on page refresh by design)
- Float64Array serialization: Array.from() before stringify, new Float64Array() on load
- 0.001 threshold for neutral direction in delta calculations (avoids floating-point noise)
- Singleton ComparisonStateManager with enter/exit/replace API
- CustomEvent dispatch for state change notifications

## Session Continuity

Last session: 2026-01-23
Stopped at: Completed 16-01-PLAN.md (Comparison State Foundation)
Resume file: None

**Phase 16 in progress (1/3 plans complete).**
**Comparison state foundation complete: state management and delta calculations ready for UI components.**
