# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-17)

**Core value:** Accurate, trustworthy Monte Carlo simulation of the BBD strategy with clear visualization of risk and outcomes — enabling users to make informed decisions about leveraged wealth preservation.
**Current focus:** Phase 11 — Complete Results Dashboard (gap closure)

## Current Position

Phase: 11 (Complete Results Dashboard)
Plan: 10 of 13 complete
Status: In progress - executing gap closure plans
Last activity: 2026-01-20 — Completed 11-10-PLAN.md (Year-by-Year Analysis Table)

Progress: █████████████████████░░░░ 87% (42/47 plans total)

## Performance Metrics

**Velocity:**
- Total plans completed: 42
- Average duration: 3.3 min
- Total execution time: 140 min

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
| 11-complete-results-dashboard | 10/13 | 33 min | 3.3 min |

**Recent Trend:**
- Last 5 plans: 11-05 (7 min), 11-06 (7 min), 11-07 (N/A), 11-08 (3 min), 11-10 (4 min)
- Trend: Steady execution pace

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
  - Results dashboard only shows 2 of 7 charts (probability cone, histogram)
  - Missing: donut, correlation heatmap, margin call risk, SBLOC balance, BBD comparison
  - Missing statistics: CAGR, TWRR, margin call probability, salary equivalent
  - Chart components exist (Phase 6) but not integrated into dashboard
  - **Plan 01 complete:** Added donut chart and correlation heatmap
  - **Plan 02 complete:** Added 8 financial statistics (CAGR, TWRR, volatility, salary equivalent)
  - **Plan 03 complete:** Integrated SBLOC engine into Monte Carlo with margin call stats and estate analysis
  - **Plan 04 complete:** Integrated SBLOC charts (margin call risk, balance trajectory, BBD comparison) with conditional visibility
  - **Plan 05 complete:** Added executive summary banner (3 hero cards + parameter summary grid)
  - **Plan 06 complete:** Added percentile spectrum visualizations (terminal net worth, total debt)
  - **Plan 07 complete:** Added strategy analysis section (BBD vs Sell comparison with verdict)
  - **Plan 08 complete:** Added salary equivalent section (teal banner showing tax advantage)
  - **Plan 10 complete:** Added year-by-year analysis table (withdrawals and net worth percentiles)

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

**From 11-10:**
- YearlyAnalysisTable component with sticky headers and scrollable body
- calculateWithdrawals helper for annual/cumulative withdrawal projections
- Color-coded values (green positive, red negative, teal median)
- Compact currency notation for values >= $1M
- 3% default annual withdrawal growth

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 11-10-PLAN.md (Year-by-Year Analysis Table)
Resume file: None - ready to continue with 11-11
