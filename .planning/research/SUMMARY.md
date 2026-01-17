# Research Summary: eVelo Portfolio Strategy Simulator

**Synthesized:** 2026-01-17
**Domain:** Monte Carlo financial simulation for Buy-Borrow-Die strategy
**Project Type:** Greenfield (v1.0)
**Overall Confidence:** HIGH

---

## Executive Summary

eVelo is building a Monte Carlo portfolio simulator focused on the Buy-Borrow-Die tax optimization strategy. Research across stack, features, architecture, and pitfalls reveals:

1. **Stack validated**: TypeScript + Web Components + Chart.js + IndexedDB is correct. Add **Vite + vite-plugin-singlefile** for build, **Comlink** for Web Worker ergonomics, **Dexie.js** for IndexedDB wrapper, and **simple-statistics** for statistical functions.

2. **SBLOC modeling is the primary differentiator**: No existing tool (Portfolio Visualizer, FireCalc, cFIREsim, FI Calc) models securities-backed lending with margin calls. This is eVelo's competitive moat.

3. **Statistical accuracy is non-negotiable**: Users make real financial decisions based on outputs. Critical pitfalls (lognormal distributions, stress correlations, floating point precision, margin call cascades) must be addressed in Phase 1.

4. **Web Workers mandatory for 100k iterations**: Main thread blocking would make the app unusable. Worker pool architecture with transferable ArrayBuffers enables responsive UI during computation.

---

## Key Findings by Dimension

### Stack (Confidence: HIGH)

| Component | Recommendation | Version |
|-----------|----------------|---------|
| Build | Vite + vite-plugin-singlefile | 6.x / 2.x |
| Runtime | TypeScript + Vanilla Web Components | 5.7+ |
| Workers | Comlink (clean async API for workers) | 4.x |
| Charts | Chart.js (handles all visualization needs) | 4.5.x |
| Storage | Dexie.js (IndexedDB wrapper) | 4.x |
| Statistics | simple-statistics | 7.8.x |
| Testing | Vitest | 3.x |

**What NOT to use:**
- Frameworks (React/Vue/Svelte) — bundle size, lock-in, unnecessary for scope
- WASM for Monte Carlo — JS with Web Workers is fast enough for 100k iterations
- TradingView charts — no donut/histogram support needed for this use case

### Features (Confidence: MEDIUM-HIGH)

**Table Stakes** (must have or users abandon):
- Historical returns simulation (30+ years data)
- Configurable time horizon (10-50 years)
- Success rate percentage (primary metric)
- Probability cone visualization
- Percentile outcomes (P10, P25, P50, P75, P90)
- Export capability

**Core Differentiators** (eVelo's competitive advantage):
- SBLOC modeling with interest accrual
- Margin call detection and forced liquidation simulation
- LTV ratio tracking by asset class
- BBD vs Sell strategy comparison
- Tax savings calculation (stepped-up basis)
- Salary-equivalent display for tax-free withdrawals

**Anti-Features** (deliberately NOT building):
- Budgeting integration (kills UX)
- RMD/tax bracket micro-optimization (false precision)
- Account linking (security concerns, trust barrier)
- Real-time market data (unnecessary complexity)

### Architecture (Confidence: MEDIUM)

**Layered Architecture:**
```
UI Components → Event Bus/State → Services → Core/Math
```

**Key Patterns:**
- Worker pool sized to `navigator.hardwareConcurrency - 1`
- Transferable Float64Arrays for zero-copy data exchange
- Event bus for cross-component communication
- Three-tier caching: Memory → IndexedDB → Network

**Simulation Engine Structure:**
1. SimulationCoordinator (main thread): orchestrates workers, aggregates results
2. SimulationWorker (worker thread): executes iteration batches
3. CorrelationEngine: Cholesky decomposition for correlated draws
4. BootstrapSampler: block bootstrap preserving autocorrelation
5. SBLOCEngine: loan modeling with margin call cascade logic

### Pitfalls (Confidence: HIGH)

**CRITICAL (must address in Phase 1):**
1. **Lognormal distributions** — normal distributions produce impossible negative values
2. **Floating point errors** — `0.1 + 0.2 ≠ 0.3` compounds over 30 years
3. **Margin call cascades** — forced liquidation triggers tax, which can trigger more margin calls
4. **CAGR off-by-one** — periods = values - 1, not values

**HIGH (must address in Phase 2):**
1. **Main thread blocking** — 100k iterations freezes browser without Web Workers
2. **Static correlations** — correlations spike during crashes; model must account for this
3. **Memory leaks** — streaming statistics, don't store all 100k paths
4. **Chart.js performance** — use decimation plugin for >10k points

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Simulation Core
**Rationale:** Statistical accuracy and precision must be correct before anything else. Users make financial decisions based on results.

**Addresses:**
- P-STAT-01: Lognormal distributions
- P-STAT-02: Regime-aware correlations (basic)
- P-FIN-01: Floating point handling
- P-FIN-02: CAGR calculation
- P-SBLOC-01: Compound interest
- P-SBLOC-03: Margin call cascade logic

**Builds:**
- Core types and interfaces
- Mathematical utilities (Cholesky, statistics)
- Event bus and state store
- Web Worker simulation engine (batched execution)
- Bootstrap resampling engine
- SBLOC/margin call engine
- Financial calculation suite with tests

**Research flags:** Likely standard patterns; unlikely to need deeper research.

### Phase 2: UI Components & Visualization
**Rationale:** With accurate engine, build the interface. Performance pitfalls addressed here.

**Addresses:**
- P-PERF-01: Web Worker integration complete
- P-PERF-02: Streaming statistics
- P-PERF-03: Chart.js decimation
- P-UX-01: Progressive disclosure
- P-FIN-03: TWRR vs MWRR clarity

**Builds:**
- Web Component base class
- Input components (asset selector, parameter sliders)
- Chart components (probability cone, histogram, donut, bar)
- Results dashboard
- Progress indicator
- Theme system (CSS custom properties)

**Research flags:** Chart.js heatmap plugin may need evaluation; HTML table fallback for correlation matrix.

### Phase 3: Data Layer & API Integration
**Rationale:** Historical data loading, caching, and multi-source API support.

**Addresses:**
- P-PWA-02: Storage quota management

**Builds:**
- Dexie.js database schema
- API service layer (FMP, EODHD, Alpha Vantage, Tiingo, Yahoo)
- CORS proxy configuration
- Cache invalidation strategy
- Bundled data presets (S&P 500, major indices)

**Research flags:** Standard patterns; Yahoo Finance API stability uncertain.

### Phase 4: PWA, Export & Polish
**Rationale:** Offline capability and single-file export as final integration.

**Addresses:**
- P-PWA-01: Service worker caching strategy
- P-PWA-03: Cross-browser testing
- P-TECH-03: Bundle size optimization

**Builds:**
- Service worker with stale-while-revalidate
- Single-file HTML export via vite-plugin-singlefile
- Print-friendly CSS
- Help/guide content
- Mobile responsive polish

**Research flags:** SharedArrayBuffer compatibility with single-file export uncertain; may need transferables-only fallback.

### Phase Ordering Rationale

1. **Foundation before UI:** Simulation engine can be fully tested without UI. Financial accuracy is verified early.

2. **UI before Data:** Components can use mock data initially. Decouples UI development from API rate limits.

3. **Data before PWA:** PWA caching strategy depends on knowing what data needs caching.

4. **PWA last:** Service worker + single-file export is integration work that touches everything.

### Dependencies Between Phases

```
Phase 1 (Foundation)
    ↓
Phase 2 (UI) ←→ Phase 3 (Data)  [These can partially overlap]
    ↓              ↓
    └──────────────┘
           ↓
    Phase 4 (PWA/Export)
```

---

## Confidence Assessment

| Research Area | Confidence | Gaps |
|--------------|------------|------|
| Stack choices | HIGH | Lit 3 vs 4 version unclear; minimal impact |
| Feature priorities | HIGH | None significant |
| Architecture patterns | MEDIUM | Regime-switching JS implementation synthesized |
| Statistical accuracy | HIGH | Extensively documented in financial literature |
| Performance approach | HIGH | Well-documented JavaScript patterns |
| PWA/Offline | HIGH | Standard patterns |

### Open Questions (Defer to Implementation)

1. **Block bootstrap block size**: Literature suggests 12-24 months; needs empirical testing
2. **Regime detection method**: HMM vs threshold-based (simpler)
3. **Cholesky library choice**: ml-matrix vs math.js — benchmark during implementation
4. **SharedArrayBuffer + single-file**: May not work with `file://` protocol

---

## Research Files Reference

| File | Purpose | Key Insight |
|------|---------|-------------|
| [STACK.md](./STACK.md) | Technology choices | Vite + Comlink + Dexie.js validated |
| [FEATURES.md](./FEATURES.md) | Feature priorities | SBLOC modeling is the moat |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design | Worker pool + event bus pattern |
| [PITFALLS.md](./PITFALLS.md) | Risk mitigation | 24 pitfalls with prevention strategies |

---

## Next Steps

1. **Define requirements** — Convert features research into testable requirements
2. **Create roadmap** — Structure phases based on implications above
3. **Begin Phase 1** — Foundation and simulation core

---

*Research conducted: 2026-01-17*
*Valid for: ~30 days (stable domain)*
