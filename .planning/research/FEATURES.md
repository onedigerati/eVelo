# Features Research: eVelo Portfolio Monte Carlo Simulator

**Researched:** 2026-01-17
**Domain:** Portfolio simulation, Monte Carlo analysis, Buy-Borrow-Die strategy
**Confidence:** MEDIUM-HIGH (verified against competitor tools, financial literature, and official sources)

## Executive Summary

Portfolio Monte Carlo simulators in 2025-2026 have matured into a well-defined category with clear user expectations. Table stakes include historical backtesting (1871-present data), configurable withdrawal strategies, success rate visualization, and exportable results. Professional-grade tools differentiate through regime-aware simulation, block bootstrap resampling, multiple withdrawal strategy options, and sophisticated risk metrics (CVaR, drawdown analysis).

For eVelo's Buy-Borrow-Die focus, the critical differentiator is SBLOC modeling with margin call detection - a feature virtually absent from existing retirement calculators. The "Die" component (stepped-up basis simulation) is also unexplored territory in current tools.

**Primary recommendation:** Build table stakes first (Monte Carlo core, probability cone visualization, percentile outcomes), then differentiate with BBD-specific features (SBLOC modeling, margin call probability, stepped-up basis calculation).

## Feature Categories

### Table Stakes (Must Have)

These features are expected by any user of portfolio simulators. Missing any of these will cause immediate abandonment.

| Feature | Why Table Stakes | Complexity | Source |
|---------|------------------|------------|--------|
| **Historical returns simulation** | All major tools use 100+ years of data (1871-present) | LOW | FireCalc, cFIREsim, Portfolio Visualizer |
| **Configurable time horizon** | Users need to set their specific planning period (10-50 years) | LOW | Universal |
| **Asset allocation inputs** | Stock/bond/other percentages with weights | LOW | Universal |
| **Success rate percentage** | The single most-cited metric ("X% of simulations succeeded") | LOW | All competitors |
| **Probability cone / fan chart** | Visual representation of outcome distribution over time | MEDIUM | Portfolio Visualizer |
| **Percentile outcomes (P10, P25, P50, P75, P90)** | Users need to understand best/worst/median cases | LOW | Industry standard |
| **Portfolio value timeline** | Show balance over time across scenarios | LOW | Universal |
| **Withdrawal rate configuration** | Fixed %, inflation-adjusted, or dynamic withdrawals | MEDIUM | 4% rule research |
| **Inflation adjustment** | Real vs nominal values - critical for long-term planning | LOW | All tools |
| **Export capability (CSV/print)** | Users share results with advisors, need records | LOW | FI Calc, cFIREsim |
| **Mobile-responsive design** | Significant portion of users access on mobile | MEDIUM | Modern expectation |

### Differentiators (Competitive Advantages)

Features that would distinguish eVelo from Portfolio Visualizer, FireCalc, and cFIREsim.

#### BBD-Specific Differentiators (HIGH VALUE)

| Feature | Why Differentiating | Complexity | Notes |
|---------|---------------------|------------|-------|
| **SBLOC modeling with margin calls** | No existing tool models leveraged borrowing against portfolio | HIGH | Core BBD value prop |
| **Margin call probability by year** | Unique visualization for BBD risk assessment | MEDIUM | Depends on SBLOC engine |
| **Loan-to-value ratio tracking** | LTV varies by asset type (50-70% equities, 90-95% treasuries) | MEDIUM | Critical for realistic SBLOC |
| **Forced liquidation simulation** | What happens when margin calls hit during bear markets | HIGH | BBD worst-case analysis |
| **Stepped-up basis calculation** | Tax savings at death - the "Die" component | MEDIUM | Estate planning value |
| **Tax savings comparison (BBD vs sell)** | Side-by-side: what you save by NOT selling | MEDIUM | Core value demonstration |
| **Interest accrual modeling** | SBLOC interest compounds; affects long-term outcomes | LOW | Part of SBLOC engine |
| **Salary-equivalent display** | "Borrowing $X/year tax-free = earning $Y pre-tax salary" | LOW | Powerful UX insight |

#### Simulation Quality Differentiators (MEDIUM VALUE)

| Feature | Why Differentiating | Complexity | Notes |
|---------|---------------------|------------|-------|
| **Block bootstrap resampling** | Superior to standard bootstrap; preserves autocorrelation and volatility clustering | HIGH | Academic gold standard |
| **Regime-switching models** | Bull/bear/crash periods with different return distributions | HIGH | More realistic than i.i.d. |
| **Correlation-aware multi-asset** | Assets don't move independently; correlations change in crashes | MEDIUM | Dynamic correlations critical |
| **Configurable iteration count (1K-100K)** | Power users want more iterations; casual users want speed | LOW | Standard range |
| **Fat-tailed distributions** | Real returns have more extreme events than normal distribution | MEDIUM | Lognormal or t-distributions |

#### UX Differentiators (MEDIUM VALUE)

| Feature | Why Differentiating | Complexity | Notes |
|---------|---------------------|------------|-------|
| **Instant feedback (no page reload)** | Single-page app feel; real-time parameter updates | MEDIUM | SPA architecture |
| **Fully offline capable** | Use without internet after initial data load | MEDIUM | PWA with service worker |
| **Savable/shareable scenarios** | Export configuration, share with advisor | LOW | JSON export/import |
| **Plain language recommendations** | "Consider reducing withdrawal rate" vs raw numbers | MEDIUM | AI-like guidance |
| **What-if scenario comparison** | Side-by-side A vs B analysis | MEDIUM | Popular in ProjectionLab |

### Anti-Features (Do NOT Build)

Features that would hurt the product through complexity, inaccuracy, or poor UX.

| Anti-Feature | Why Harmful | Alternative |
|--------------|-------------|-------------|
| **Budgeting integration** | Forces users to itemize expenses; kills UX, causes inaccurate guesses | Simple annual spending input |
| **RMD/tax bracket micro-optimization** | Tax code complexity; creates false precision; not core to BBD | Educational disclaimer + link to CPA |
| **Roth conversion ladder planning** | Complex tax strategy tangential to BBD; scope creep | Out of scope |
| **Monthly/weekly withdrawal simulation** | Unnecessary precision; adds computation; confuses users | Annual modeling is sufficient |
| **Real-time market data** | Expensive, complex, adds no value to simulation | Historical data only |
| **Account linking / Plaid integration** | Security concerns; users won't trust; complex to maintain | Manual portfolio entry |
| **"Precise" point predictions** | False confidence; users take them as gospel | Always show ranges/distributions |
| **Too many input fields** | Analysis paralysis; users abandon complex forms | Progressive disclosure, smart defaults |
| **Requiring registration** | Friction before value; users leave | Full functionality without login |
| **Single "magic number" outputs** | "You need exactly $2,433,000" is misleading | Distribution of outcomes |
| **Hourly/daily granularity** | Computational overhead with no planning benefit | Monthly or annual granularity |

## Competitor Analysis

| Feature | Portfolio Visualizer | FireCalc | cFIREsim | FI Calc | eVelo (Planned) |
|---------|---------------------|----------|----------|---------|-----------------|
| **Historical data depth** | 1972-present | 1871-present | 1871-present | 1871-present | 30+ years bundled |
| **Monte Carlo iterations** | Variable | ~100-120 scenarios | All historical periods | All historical periods | 1K-100K |
| **Bootstrap resampling** | Yes | No (sequential) | No (sequential) | No (sequential) | Yes (block) |
| **Regime switching** | No | No | No | No | Yes |
| **Multi-asset correlation** | Yes | Limited | Limited | Limited | Yes |
| **SBLOC/margin modeling** | No | No | No | No | Yes (core) |
| **Margin call simulation** | No | No | No | No | Yes (core) |
| **Withdrawal strategies** | Multiple | Multiple | Multiple | Multiple (8+) | Fixed + inflation-adj |
| **Social Security modeling** | Yes | Yes | Yes | Yes | Out of scope |
| **Pension integration** | Yes | Yes | Yes | Yes | Out of scope |
| **Glide path allocation** | Yes | No | Yes | Yes | Future consideration |
| **Success rate** | Yes | Yes | Yes | Yes | Yes |
| **Probability cone** | Yes | No | No | No | Yes |
| **Drawdown analysis** | Yes | No | Limited | Limited | Yes |
| **Terminal wealth histogram** | Yes | No | Yes | Yes | Yes |
| **Export to CSV** | Yes (paid) | No | Yes | Yes | Yes |
| **Offline capable** | No | No | No | No | Yes |
| **Free tier** | Limited | Yes | Yes | Yes | Full |
| **Open source** | No | No | Yes | No | TBD |

### Competitor Gaps eVelo Exploits

1. **No SBLOC modeling anywhere** - This is eVelo's primary moat
2. **No margin call risk visualization** - Critical for BBD strategy
3. **No stepped-up basis calculation** - The "Die" benefit is unquantified elsewhere
4. **Bootstrap resampling rare** - Most use sequential historical or parametric only
5. **Regime switching absent** - Bull/bear market awareness improves realism
6. **Offline capability missing** - All competitors require internet

## BBD Strategy Features

### Phase 1: Buy (Portfolio Construction)

| Feature | Purpose | Complexity |
|---------|---------|------------|
| Multi-asset selection (2-5 assets) | Diversification modeling | LOW |
| Historical returns loading | Foundation for simulation | MEDIUM |
| Custom weight allocation | User portfolio specification | LOW |
| Correlation matrix display | Show diversification benefit | MEDIUM |
| Bundled presets (S&P 500, 60/40, etc.) | Quick start for users | LOW |

### Phase 2: Borrow (SBLOC Modeling)

| Feature | Purpose | Complexity |
|---------|---------|------------|
| SBLOC setup (LTV ratio, interest rate) | Define borrowing terms | LOW |
| LTV by asset type (50-70% equities, 90%+ bonds) | Realistic advance rates | MEDIUM |
| Annual borrowing amount | Cash flow needs | LOW |
| Interest accrual (SOFR + spread, floating) | Cost of borrowing | LOW |
| Maintenance threshold | When margin calls trigger | MEDIUM |
| Margin call detection | Flag danger scenarios | HIGH |
| Forced liquidation logic | Simulate selling in drawdown | HIGH |
| Loan balance tracking over time | Visual of debt growth | LOW |
| Interest vs principal breakdown | Understand cost structure | LOW |

### Phase 3: Die (Estate Planning)

| Feature | Purpose | Complexity |
|---------|---------|------------|
| Stepped-up basis calculation | Tax savings to heirs | MEDIUM |
| Final portfolio value distribution | What heirs inherit | LOW |
| Embedded gain calculation | What would have been taxed | LOW |
| Tax savings summary | BBD vs sell comparison | MEDIUM |
| Estate tax threshold awareness | Note $13.99M exemption (2025) | LOW |

### BBD Strategy Comparison Feature

| Metric | BBD Strategy | Traditional (Sell) |
|--------|--------------|-------------------|
| Annual cash available | SBLOC draw | Post-tax from sales |
| Tax paid annually | Interest only (not tax) | Capital gains |
| Portfolio value at death | Reduced by debt | Reduced by sales |
| Heirs receive | Stepped-up basis | Partially depleted |
| Total tax paid | Interest cost | Capital gains + taxes |

This comparison table should be a core output of every simulation.

## Feature Dependencies

```
[Historical Data Engine]
         |
         v
[Bootstrap Resampling] --> [Regime Switching Model]
         |                          |
         v                          v
[Correlation Matrix] --------> [Monte Carlo Engine]
                                    |
                    +---------------+---------------+
                    |               |               |
                    v               v               v
            [Portfolio Sim]  [SBLOC Engine]  [Percentile Calc]
                    |               |               |
                    v               v               v
            [Probability    [Margin Call    [Terminal Value
               Cone]        Detection]       Histogram]
                    |               |               |
                    +-------+-------+               |
                            |                       |
                            v                       v
                    [BBD vs Sell          [Stepped-Up Basis
                     Comparison]           Calculation]
                            |                       |
                            +----------+------------+
                                       |
                                       v
                              [Results Dashboard]
```

### Critical Path

1. Historical Data Engine (foundation)
2. Monte Carlo Engine (core)
3. Basic Visualizations (probability cone, histogram)
4. SBLOC Engine (BBD differentiator)
5. Margin Call Detection (risk assessment)
6. Stepped-Up Basis (estate value)
7. Comparison Dashboard (synthesis)

### Parallelizable

- Visualization components (once engine complete)
- Export functionality (independent)
- Theme/UI polish (independent)
- Help/documentation (independent)

## Complexity Assessment

| Feature | Complexity | Dependencies | Effort | Notes |
|---------|------------|--------------|--------|-------|
| Historical data loading | MEDIUM | None | 2-3 days | API integration, caching |
| Basic Monte Carlo (i.i.d.) | LOW | Data | 1-2 days | Standard implementation |
| Bootstrap resampling (simple) | LOW | MC engine | 1 day | Random sampling |
| Block bootstrap | HIGH | MC engine | 3-4 days | Overlapping blocks, parameter tuning |
| Regime switching | HIGH | MC engine | 4-5 days | HMM or threshold-based |
| Correlation-aware simulation | MEDIUM | MC engine | 2 days | Cholesky decomposition |
| SBLOC interest accrual | LOW | MC engine | 0.5 days | Simple compounding |
| LTV tracking | MEDIUM | MC + SBLOC | 1 day | Per-asset LTV rules |
| Margin call detection | HIGH | MC + SBLOC | 2-3 days | Threshold logic, forced liquidation |
| Probability cone chart | MEDIUM | MC results | 1-2 days | Chart.js fan chart |
| Terminal histogram | LOW | MC results | 0.5 days | Standard histogram |
| Percentile calculations | LOW | MC results | 0.5 days | Standard statistics |
| Success rate | LOW | MC results | 0.5 days | Count successes |
| BBD vs sell comparison | MEDIUM | Full engine | 2 days | Parallel simulation paths |
| Stepped-up basis calc | MEDIUM | MC results | 1 day | Tax math |
| Salary-equivalent display | LOW | Tax calc | 0.5 days | Simple formula |
| Export to CSV/JSON | LOW | Results | 0.5 days | Standard serialization |
| Print-friendly view | MEDIUM | UI | 1-2 days | CSS print styles |
| Offline PWA | MEDIUM | All | 2-3 days | Service worker, caching |
| Theme toggle | LOW | UI | 0.5 days | CSS variables |

**Total estimated core effort:** 4-6 weeks for MVP with BBD differentiators

## Visualization Requirements

### Essential (Table Stakes)

| Visualization | Purpose | Chart Type | Priority |
|---------------|---------|------------|----------|
| **Probability cone** | Show outcome distribution over time | Fan chart (area) | P0 |
| **Terminal value histogram** | Distribution of ending balances | Histogram (bar) | P0 |
| **Success rate indicator** | Single most important metric | Text/gauge | P0 |
| **Portfolio allocation** | Show asset weights | Donut chart | P1 |
| **Percentile table** | P10/P25/P50/P75/P90 values | Data table | P0 |

### Differentiating

| Visualization | Purpose | Chart Type | Priority |
|---------------|---------|------------|----------|
| **Margin call probability by year** | BBD risk visualization | Bar chart | P1 |
| **SBLOC balance over time** | Debt trajectory | Line chart | P1 |
| **LTV ratio timeline** | Proximity to margin call | Line with danger zone | P1 |
| **BBD vs sell comparison** | Strategy comparison | Side-by-side bars | P1 |
| **Correlation heatmap** | Asset relationships | Heatmap | P2 |
| **Drawdown analysis** | Worst-case depth | Line chart | P2 |

### Nice-to-Have

| Visualization | Purpose | Chart Type | Priority |
|---------------|---------|------------|----------|
| Rolling returns | Performance consistency | Line chart | P3 |
| Efficient frontier | Optimal allocation | Scatter plot | P3 |
| Individual simulation paths | Monte Carlo "spaghetti" | Multi-line | P3 |

## SBLOC/Margin Call Modeling Standards

Based on financial industry research:

### Typical LTV Ratios by Asset Type

| Asset Class | Advance Rate | Maintenance Level | Source |
|-------------|--------------|-------------------|--------|
| U.S. Treasury Securities | 90-95% | 85% | Arc, Schwab |
| Investment-Grade Bonds | 70-80% | 65% | Arc, Schwab |
| Blue-Chip Stocks | 60-70% | 50% | Corient, FINRA |
| Small-Cap/Volatile Stocks | 40-50% | 35% | Industry practice |
| Mutual Funds (diversified) | 50-65% | 45% | Schwab, Fidelity |

### Margin Call Trigger Logic

```
IF portfolio_value < (loan_balance / maintenance_LTV):
    TRIGGER margin_call
    OPTIONS:
        1. Deposit additional assets
        2. Pay down loan principal
        3. Forced liquidation (worst case)
```

### Modeling Recommendations

1. **Default to conservative LTV (50%)** - Match wealth manager guidance
2. **Model forced liquidation** - Sell highest-gain assets first (worst tax outcome)
3. **Stress test with 2008/2020 drawdowns** - Real historical stress
4. **Show "danger zone" on LTV chart** - Visual risk indicator
5. **Calculate recovery time** - How long until safe LTV restored

## Monte Carlo Iteration Standards

Based on industry practice and academic research:

| Use Case | Recommended Iterations | Rationale |
|----------|----------------------|-----------|
| Quick preview | 1,000 | Speed; rough distribution |
| Standard analysis | 10,000 | Good convergence; industry standard |
| High confidence | 50,000-100,000 | Tail risk analysis; publication quality |

### Convergence Guidance

- Success rate typically stable by 5,000-10,000 iterations
- Tail percentiles (P5, P95) need 25,000+ for stability
- Diminishing returns beyond 100,000

### Resampling Method Comparison

| Method | Preserves | Complexity | Recommendation |
|--------|-----------|------------|----------------|
| Simple bootstrap | Fat tails, skewness | LOW | Baseline |
| Block bootstrap | Autocorrelation, volatility clustering | HIGH | Preferred for accuracy |
| Parametric (normal) | Nothing (assumes normal) | LOW | Avoid - unrealistic |
| Regime-switching | Market state persistence | HIGH | Best for realism |

**eVelo should implement:** Block bootstrap as primary, with regime-switching as enhancement.

## Open Questions

1. **Block size for bootstrap** - Literature suggests 12-24 months; needs empirical testing
2. **Regime detection method** - HMM vs threshold-based (simpler)
3. **SBLOC interest rate modeling** - Fixed vs floating SOFR+spread
4. **Multiple SBLOC accounts** - One per asset class or one aggregate?
5. **Forced liquidation order** - Highest gain first? User configurable?

## Sources

### Primary (HIGH confidence)

- [Portfolio Visualizer Monte Carlo](https://www.portfoliovisualizer.com/monte-carlo-simulation) - Feature reference
- [Portfolio Visualizer Analysis Tools](https://www.portfoliovisualizer.com/analysis) - Comprehensive tool list
- [cFIREsim](https://cfiresim.com/) - Open source feature reference
- [FI Calc](https://ficalc.app/) - Modern UI/UX reference
- [FireCalc](https://www.firecalc.com/) - Historical simulation methodology
- [FINRA SBLOC Guide](https://www.finra.org/investors/insights/securities-backed-lines-credit) - Authoritative margin call information
- [Schwab Pledged Asset Line](https://www.schwab.com/pledged-asset-line/rates) - LTV and rate reference

### Secondary (MEDIUM confidence)

- [Capital Spectator - Block Bootstrap](https://www.capitalspectator.com/a-better-way-to-run-bootstrap-return-tests-block-resampling/) - Bootstrap methodology
- [Yale Budget Lab - Buy Borrow Die](https://budgetlab.yale.edu/research/buy-borrow-die-options-reforming-tax-treatment-borrowing-against-appreciated-assets) - BBD policy analysis
- [White Coat Investor - Retirement Calculators](https://www.whitecoatinvestor.com/best-retirement-calculators-2025/) - Tool comparisons
- [Rob Berger - cFIREsim Review](https://robberger.com/tools/cfiresim/) - Feature analysis
- [MDPI - Regime Switching Factor Investing](https://www.mdpi.com/1911-8074/13/12/311) - Regime model reference

### Tertiary (LOW confidence - needs validation)

- Blog posts about BBD implementation specifics
- Community forum discussions on margin call experiences
- Individual tool reviews (subjective)

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Table stakes features | HIGH | Consistent across all competitor tools; well-documented |
| Monte Carlo methodology | HIGH | Academic literature, Portfolio Visualizer docs |
| SBLOC LTV ratios | MEDIUM | Multiple sources agree; may vary by institution |
| Margin call mechanics | MEDIUM | FINRA guidance + broker documentation; implementation varies |
| BBD-specific features | MEDIUM | Strategy well-documented; simulation tooling is novel |
| Complexity estimates | LOW | Depends heavily on implementation choices; rough estimates |
| Competitor feature accuracy | MEDIUM | Based on public documentation; may have hidden features |

---

**Research date:** 2026-01-17
**Valid until:** 2026-04-17 (3 months - stable domain, slow-moving feature landscape)
