# Requirements: eVelo Portfolio Strategy Simulator

**Defined:** 2026-01-17
**Core Value:** Accurate, trustworthy Monte Carlo simulation of the BBD strategy with clear visualization of risk and outcomes — enabling users to make informed decisions about leveraged wealth preservation.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Simulation Engine

- [ ] **SIM-01**: User can run Monte Carlo simulation with configurable iteration count (1,000 - 100,000)
- [ ] **SIM-02**: User can create multi-asset portfolio with 2-5 assets and custom weights
- [ ] **SIM-03**: User can configure time horizon (10-50 years)
- [ ] **SIM-04**: System uses simple bootstrap resampling from historical returns
- [ ] **SIM-05**: System uses block bootstrap resampling preserving autocorrelation
- [ ] **SIM-06**: System models regime-switching returns (bull/bear/crash periods)
- [ ] **SIM-07**: System generates correlation-aware multi-asset returns
- [ ] **SIM-08**: User can toggle inflation adjustment (real vs nominal values)

### SBLOC (Borrow)

- [ ] **SBLOC-01**: User can configure SBLOC terms (LTV ratio, interest rate, annual draw)
- [ ] **SBLOC-02**: System models interest accrual on SBLOC balance
- [ ] **SBLOC-03**: System tracks LTV ratio by asset type (50-70% equities, 90%+ bonds)
- [ ] **SBLOC-04**: System detects margin call conditions when LTV exceeds maintenance threshold
- [ ] **SBLOC-05**: System simulates forced liquidation when margin calls cannot be met
- [ ] **SBLOC-06**: User can view loan balance trajectory over time

### Estate (Die)

- [ ] **ESTATE-01**: System calculates stepped-up basis tax savings at death
- [ ] **ESTATE-02**: System displays BBD vs Sell strategy comparison
- [ ] **ESTATE-03**: System calculates embedded capital gains (what would have been taxed)
- [ ] **ESTATE-04**: System notes estate tax exemption threshold ($13.99M for 2025)

### Financial Calculations

- [ ] **CALC-01**: System displays success rate percentage
- [ ] **CALC-02**: System calculates percentile outcomes (P10, P25, P50, P75, P90)
- [ ] **CALC-03**: System calculates CAGR and annualized volatility
- [ ] **CALC-04**: System calculates margin call probability by year
- [ ] **CALC-05**: System displays salary-equivalent for tax-free SBLOC withdrawals
- [ ] **CALC-06**: System calculates Pearson correlation coefficients for asset pairs
- [ ] **CALC-07**: System calculates TWRR (Time-Weighted Rate of Return)

### Visualizations

- [ ] **VIZ-01**: User can view probability cone (net worth over time with percentile bands)
- [ ] **VIZ-02**: User can view terminal net worth distribution histogram
- [ ] **VIZ-03**: User can view portfolio composition donut chart
- [ ] **VIZ-04**: User can view asset correlation matrix heatmap
- [ ] **VIZ-05**: User can view margin call risk by year bar chart
- [ ] **VIZ-06**: User can view SBLOC balance over time line chart
- [ ] **VIZ-07**: User can view BBD vs Sell strategy comparison chart

### Data Management

- [ ] **DATA-01**: App includes bundled historical data presets (S&P 500, major indices, 30+ years)
- [ ] **DATA-02**: User can save, load, export, and import portfolio configurations
- [ ] **DATA-03**: User can fetch data from multiple APIs (FMP, EODHD, Alpha Vantage, Tiingo, Yahoo Finance)
- [ ] **DATA-04**: System caches market data in IndexedDB with permanent storage
- [ ] **DATA-05**: User can enter manual return data
- [ ] **DATA-06**: User can configure CORS proxy for API access

### User Interface

- [ ] **UI-01**: User can collapse/expand Strategy Parameters sidebar
- [ ] **UI-02**: User can search and filter asset selection
- [ ] **UI-03**: User can view simulation progress indicator during computation
- [ ] **UI-04**: App displays correctly on mobile devices (responsive layout)
- [ ] **UI-05**: User can access expandable help/guide sections
- [ ] **UI-06**: User receives toast notifications for feedback
- [ ] **UI-07**: User can view print-friendly report
- [ ] **UI-08**: User can visualize weight distribution with balance/clear controls

### Theming & Build

- [ ] **THEME-01**: User can toggle between Light and Dark themes
- [ ] **THEME-02**: Theme preference persists across sessions
- [ ] **THEME-03**: Charts use theme-aware colors
- [ ] **BUILD-01**: App works offline after initial load (PWA with service worker)
- [ ] **BUILD-02**: App can be exported as single-file HTML (fully self-contained)
- [ ] **BUILD-03**: App uses TypeScript + Web Components architecture
- [ ] **BUILD-04**: Build system supports development server with hot reload

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Simulation Enhancements

- **SIM-V2-01**: Fat-tailed distributions (lognormal or t-distributions)
- **SIM-V2-02**: Glide path allocation (changing allocation over time)
- **SIM-V2-03**: What-if scenario comparison (side-by-side A vs B)

### Visualizations

- **VIZ-V2-01**: Rolling returns chart
- **VIZ-V2-02**: Efficient frontier scatter plot
- **VIZ-V2-03**: Individual simulation paths ("spaghetti" chart)

### Data

- **DATA-V2-01**: Additional international indices data

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Single Asset deterministic analysis | Removed to focus on Monte Carlo as core value |
| Backend server | Must work entirely client-side for offline capability |
| User accounts / cloud sync | Local-only storage; export/import for portability |
| Real-time market data | Historical data only, not live feeds |
| Trading execution | Analysis and planning only, no brokerage integration |
| Tax filing integration | Educational estimates only, not tax advice |
| Budgeting integration | Kills UX, causes inaccurate guesses |
| RMD/tax bracket micro-optimization | Complex tax strategy, creates false precision |
| Account linking / Plaid | Security concerns; users won't trust |
| Social Security modeling | Out of core BBD scope |
| Pension integration | Out of core BBD scope |
| Roth conversion ladder | Complex tax strategy tangential to BBD |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SIM-01 | Phase 3 | Pending |
| SIM-02 | Phase 3 | Pending |
| SIM-03 | Phase 3 | Pending |
| SIM-04 | Phase 3 | Pending |
| SIM-05 | Phase 3 | Pending |
| SIM-06 | Phase 3 | Pending |
| SIM-07 | Phase 2 | Complete |
| SIM-08 | Phase 3 | Pending |
| SBLOC-01 | Phase 4 | Complete |
| SBLOC-02 | Phase 4 | Complete |
| SBLOC-03 | Phase 4 | Complete |
| SBLOC-04 | Phase 4 | Complete |
| SBLOC-05 | Phase 4 | Complete |
| SBLOC-06 | Phase 4 | Complete |
| ESTATE-01 | Phase 5 | Pending |
| ESTATE-02 | Phase 5 | Pending |
| ESTATE-03 | Phase 5 | Pending |
| ESTATE-04 | Phase 5 | Pending |
| CALC-01 | Phase 5 | Pending |
| CALC-02 | Phase 5 | Pending |
| CALC-03 | Phase 5 | Pending |
| CALC-04 | Phase 5 | Pending |
| CALC-05 | Phase 5 | Pending |
| CALC-06 | Phase 2 | Complete |
| CALC-07 | Phase 5 | Pending |
| VIZ-01 | Phase 6 | Pending |
| VIZ-02 | Phase 6 | Pending |
| VIZ-03 | Phase 6 | Pending |
| VIZ-04 | Phase 6 | Pending |
| VIZ-05 | Phase 6 | Pending |
| VIZ-06 | Phase 6 | Pending |
| VIZ-07 | Phase 6 | Pending |
| DATA-01 | Phase 8 | Pending |
| DATA-02 | Phase 8 | Pending |
| DATA-03 | Phase 8 | Pending |
| DATA-04 | Phase 8 | Pending |
| DATA-05 | Phase 8 | Pending |
| DATA-06 | Phase 8 | Pending |
| UI-01 | Phase 7 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-05 | Phase 7 | Pending |
| UI-06 | Phase 7 | Pending |
| UI-07 | Phase 9 | Pending |
| UI-08 | Phase 7 | Pending |
| THEME-01 | Phase 9 | Pending |
| THEME-02 | Phase 9 | Pending |
| THEME-03 | Phase 9 | Pending |
| BUILD-01 | Phase 10 | Pending |
| BUILD-02 | Phase 10 | Pending |
| BUILD-03 | Phase 1 | Complete |
| BUILD-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 53 total
- Mapped to phases: 53
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-17*
*Last updated: 2026-01-17 after roadmap creation*
