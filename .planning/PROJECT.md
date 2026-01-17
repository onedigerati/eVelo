# eVelo

## What This Is

A portfolio strategy simulator for modeling the "Buy, Borrow, Die" (BBD) tax optimization strategy. Users build multi-asset portfolios and run Monte Carlo simulations to understand probability of success, margin call risk, and long-term wealth outcomes. Designed as a fully offline-capable single-page application with a modern, themeable UI.

## Core Value

Accurate, trustworthy Monte Carlo simulation of the BBD strategy with clear visualization of risk and outcomes — enabling users to make informed decisions about leveraged wealth preservation.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Simulation Engine**
- [ ] Monte Carlo simulation with configurable iteration count (1,000 - 100,000)
- [ ] Multi-asset portfolio support (2-5 assets with custom weights)
- [ ] Bootstrap resampling from historical returns
- [ ] Regime-switching return models (bull/bear/crash periods)
- [ ] Correlation-aware asset simulation
- [ ] SBLOC (Securities-Based Line of Credit) modeling with interest accrual
- [ ] Margin call detection and forced liquidation logic
- [ ] Inflation adjustment (real vs nominal values)

**Financial Calculations (Industry-Standard)**
- [ ] Time-Weighted Rate of Return (TWRR)
- [ ] Compound Annual Growth Rate (CAGR)
- [ ] Annualized volatility (standard deviation of returns)
- [ ] Pearson correlation coefficients for asset pairs
- [ ] Tax savings calculation (BBD vs traditional withdrawal)
- [ ] Salary-equivalent calculation for tax-free withdrawals
- [ ] Margin call probability and timing analysis
- [ ] Percentile outcomes (P10, P25, P50, P75, P90)

**Data Management**
- [ ] Bundled historical data presets (S&P 500, major indices, 30+ years)
- [ ] Multiple API integrations (FMP, EODHD, Alpha Vantage, Tiingo, Yahoo Finance)
- [ ] Manual data entry option
- [ ] IndexedDB caching with permanent storage
- [ ] Portfolio preset save/load/export/import
- [ ] CORS proxy configuration for API access

**Visualizations (Chart.js)**
- [ ] Probability cone (net worth over time with percentile bands)
- [ ] Portfolio composition donut chart
- [ ] Terminal net worth distribution histogram
- [ ] Margin call risk by year bar chart
- [ ] SBLOC usage over time line chart
- [ ] Asset correlation matrix heatmap
- [ ] BBD vs Sell Assets strategy comparison

**Results & Reporting**
- [ ] Executive summary with success rate, CAGR, margin call probability
- [ ] Performance summary table (percentiles across metrics)
- [ ] Expected annual returns by time horizon
- [ ] Annual return probabilities table
- [ ] Actionable recommendations based on simulation results
- [ ] Print-friendly report view

**User Interface**
- [ ] Collapsible Strategy Parameters sidebar
- [ ] Asset selection with search/filter
- [ ] Weight distribution visualization with balance/clear controls
- [ ] Simulation progress indicator
- [ ] Floating action buttons (print, settings, scroll-to-top)
- [ ] Expandable help/guide sections
- [ ] Toast notifications for user feedback
- [ ] Mobile-responsive layout

**Theming & Customization**
- [ ] Light/Dark theme toggle
- [ ] CSS custom properties for all colors/spacing
- [ ] Theme-aware chart colors
- [ ] Persistent theme preference

**Build & Distribution**
- [ ] TypeScript + Web Components architecture
- [ ] Modular source code organization
- [ ] PWA with service worker for offline use
- [ ] Single-file HTML export (fully self-contained)
- [ ] Development server with hot reload

### Out of Scope

- Single Asset deterministic analysis — removed to focus on Monte Carlo as the core value proposition
- Backend server — must work entirely client-side for offline capability
- User accounts / cloud sync — local-only storage, export/import for portability
- Real-time market data — historical data only, not live feeds
- Trading execution — analysis and planning only, no brokerage integration
- Tax filing integration — educational estimates only, not tax advice

## Context

**Reference Application**: `references/PortfolioStrategySimulator.html` — a 1.3MB single-file HTML application with embedded CSS, JavaScript, and historical data. Functional but monolithic and difficult to maintain.

**UI Inspiration**: `references/screenshots-ui/` — 25 screenshots showing the current design language, including landing page, Monte Carlo results panels, settings popup, mobile views, and print layout. The design uses a teal/green accent color, card-based layouts, and a clean "ZenDeep Finance" aesthetic.

**Buy, Borrow, Die Strategy**: A wealth preservation approach where investors:
1. **Buy** — Invest in appreciating assets
2. **Borrow** — Use SBLOC to access liquidity without selling (avoiding capital gains)
3. **Die** — Heirs receive stepped-up cost basis, eliminating embedded gains

**Historical Data Sources**:
- FMP (Financial Modeling Prep) — 250 req/day free
- EODHD — 20 req/day free
- Alpha Vantage — 25 req/day free
- Tiingo — 50 symbols/hr, 30+ years data
- Yahoo Finance — unofficial, may break

## Constraints

- **Tech Stack**: TypeScript + Web Components — no frameworks, maximum portability
- **Charts**: Chart.js — handles all visualization needs (time-series, donut, histogram, heatmap)
- **Storage**: IndexedDB — robust local storage for portfolios, settings, cached market data
- **Offline**: Must function completely offline once data is cached
- **Single-file export**: Build process must produce a self-contained HTML file
- **Calculations**: All financial formulas must cite authoritative sources (CFA curriculum, academic papers)
- **Browser support**: Modern browsers (Chrome, Firefox, Safari, Edge — last 2 versions)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript + Web Components over React/Vue | Framework-free for maximum portability and easy single-file bundling | — Pending |
| Chart.js over TradingView Lightweight | Need donut charts for portfolio composition; Chart.js handles all chart types | — Pending |
| IndexedDB over LocalStorage | Larger storage capacity needed for cached historical data | — Pending |
| Hybrid offline data approach | Balance between bundle size and offline capability | — Pending |
| Remove Single Asset analysis | Focus on Monte Carlo as core value; simplifies UI and reduces scope | — Pending |

---
*Last updated: 2025-01-17 after initialization*
