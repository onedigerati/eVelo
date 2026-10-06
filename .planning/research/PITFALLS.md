# Pitfalls Research: eVelo Portfolio Strategy Simulator

**Researched:** 2026-01-17
**Domain:** Financial Monte Carlo Simulation, Buy-Borrow-Die Strategy
**Overall Confidence:** HIGH (critical pitfalls well-documented in literature)

---

## Executive Summary

Building a financial Monte Carlo simulation tool carries significant risks because users may make real financial decisions based on outputs. Three critical pitfalls must be addressed before any other work:

1. **Distribution Assumptions (CRITICAL)**: Using normal instead of lognormal distributions for returns, or static correlations that ignore crisis behavior, will produce systematically wrong tail risk estimates. Users underestimate downside scenarios.

2. **Floating Point Arithmetic (CRITICAL)**: JavaScript's IEEE 754 floating point causes `0.1 + 0.2 = 0.30000000000000004`. In financial calculations, these errors cascade. A $1M portfolio compounded over 30 years with accumulated rounding errors can show materially wrong results.

3. **Main Thread Blocking (HIGH)**: 100k Monte Carlo iterations on the main thread will freeze the browser for 10-30 seconds, making the app appear broken. Users will abandon before seeing results.

**Primary recommendation:** Address statistical accuracy and precision in Phase 1 foundation, performance in Phase 2 simulation engine, and UX clarity throughout all phases.

---

## Critical Pitfalls (Must Prevent)

### Statistical Accuracy

#### P-STAT-01: Normal vs Lognormal Distribution Assumption
**Severity:** CRITICAL
**Confidence:** HIGH (extensively documented in financial literature)

**What goes wrong:** Using normal distribution for stock returns instead of lognormal. Normal distributions allow negative final values (impossible for stock prices) and underestimate extreme moves.

**Why it happens:** Normal distributions are simpler to implement (`mean + stdDev * z`). Lognormal requires additional transformation: `exp(mean + stdDev * z)`.

**Impact:** Tail risk estimates (probability of ruin scenarios) will be systematically wrong. Users may believe they have 95% success probability when actual is 85%.

**Warning signs:**
- Simulation produces negative portfolio values
- Very low failure rates even with aggressive withdrawal strategies
- Results that don't match published studies using same parameters

**Prevention strategy:**
```javascript
// WRONG: Normal distribution for returns
const return = mean + stdDev * normalRandom();

// CORRECT: Lognormal distribution
// Returns are lognormally distributed, so log-returns are normal
const logReturn = logMean + logStdDev * normalRandom();
const return = Math.exp(logReturn) - 1;
```

**Phase to address:** Phase 1 (Simulation Engine Foundation)

**Sources:**
- [Monte Carlo Simulation with Alternative Distributions](https://edbodmer.com/monte-carlo-simulation-with-alternative-distributions/)
- [Vose Software Lognormal Distribution](https://www.vosesoftware.com/riskwiki/Lognormaldistribution.php)

---

#### P-STAT-02: Static Correlation Matrix During Market Stress
**Severity:** CRITICAL
**Confidence:** HIGH (BIS and academic research)

**What goes wrong:** Using constant correlation coefficients between asset classes. During market crashes, correlations spike to nearly 1.0 - everything falls together when diversification is most needed.

**Why it happens:** Historical correlation matrices are computed from "normal" periods. Crisis correlations are dramatically different.

**Impact:** Model drastically overstates diversification benefits. User believes 60/40 portfolio is safer than it actually is during crashes.

**Warning signs:**
- Diversified portfolios showing very low worst-case scenarios
- Simulation never shows periods where "everything goes down together"
- Unrealistically smooth drawdown recoveries

**Prevention strategy:**
```javascript
// Simple regime-based correlation adjustment
function getCorrelation(asset1, asset2, isStressRegime) {
  const baseCorr = correlationMatrix[asset1][asset2];
  if (isStressRegime) {
    // Correlations converge toward 1.0 in crises
    return baseCorr + (1 - baseCorr) * STRESS_CORRELATION_FACTOR;
  }
  return baseCorr;
}
```

Consider implementing:
- Regime-switching models (normal vs. stress periods)
- Time-varying correlations using DCC-GARCH
- Or at minimum, disclosure that correlations may increase during crises

**Phase to address:** Phase 1 (Simulation Engine), with sophistication in Phase 3

**Sources:**
- [BIS: Evaluating correlation breakdowns during periods of market volatility](https://www.bis.org/publ/confer08k.pdf)
- [Correlation of financial markets in times of crisis](https://www.sciencedirect.com/science/article/abs/pii/S037843711100570X)

---

#### P-STAT-03: Insufficient Iteration Count for Tail Statistics
**Severity:** HIGH
**Confidence:** HIGH (statistical theory)

**What goes wrong:** Using 10,000 iterations and reporting 5th percentile outcomes. Monte Carlo error for tail statistics is much larger than for means.

**Why it happens:** More iterations = slower simulation. Developers assume 10k is "enough" based on convergence of central statistics.

**Impact:** 5th/95th percentile values have high variance between runs. User might see 92% success rate one run, 88% the next - eroding trust in tool.

**Math:** Monte Carlo error scales as 1/sqrt(n). For 10k iterations, error ~1%. For tail percentiles, you need ~100k iterations to get error below 1% on the 5th percentile.

**Warning signs:**
- Running simulation twice gives noticeably different tail statistics
- Confidence intervals on percentiles are wide
- Users report "inconsistent" results

**Prevention strategy:**
- Use 100,000 iterations minimum for tail statistics
- Show confidence intervals on reported percentiles
- Consider Latin Hypercube Sampling for better tail coverage with fewer iterations
- Display convergence indicator: "Results stabilized after X iterations"

**Phase to address:** Phase 1 (Engine), Phase 2 (UX)

**Sources:**
- [On the Assessment of Monte Carlo Error](https://pmc.ncbi.nlm.nih.gov/articles/PMC3337209/)
- [Optimal Number of Trials for Monte Carlo Simulation](https://www.valuationresearch.com/wp-content/uploads/kb/SpecialReport_MonteCarloSimulationTrials.pdf)

---

#### P-STAT-04: Poor Random Number Generation
**Severity:** MEDIUM
**Confidence:** HIGH (well-documented)

**What goes wrong:** Using `Math.random()` which is a PRNG that can have patterns, especially in tail behavior.

**Why it happens:** `Math.random()` is convenient and fast. V8 improved it significantly, but it's still not cryptographically secure.

**Impact:** For Monte Carlo simulation (not cryptography), modern `Math.random()` is probably adequate. But for extra rigor, especially in tail scenarios, `crypto.getRandomValues()` provides better randomness.

**Warning signs:**
- Repeated patterns in simulation outputs
- Tail events appearing in clusters

**Prevention strategy:**
```javascript
// For non-critical paths (performance-sensitive bulk generation)
Math.random() // Acceptable with modern V8

// For critical paths or when in doubt
function secureRandom() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}
```

**Trade-off:** `crypto.getRandomValues()` is ~10x slower. Use stratified sampling or focus crypto RNG on tail regions only.

**Phase to address:** Phase 1 (consideration), Phase 3 (if needed)

**Sources:**
- [V8 Blog: Math.random()](https://v8.dev/blog/math-random)
- [MDN: crypto.getRandomValues()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)

---

### Financial Calculations

#### P-FIN-01: JavaScript Floating Point Errors in Currency
**Severity:** CRITICAL
**Confidence:** HIGH (fundamental JavaScript limitation)

**What goes wrong:** `0.1 + 0.2 = 0.30000000000000004`. These tiny errors compound over 30+ years of simulation.

**Why it happens:** IEEE 754 binary floating point cannot exactly represent many decimal fractions.

**Impact:** A $1M portfolio with small rounding errors compounded annually for 30 years can accumulate cents to dollars of error. Worse, percentage calculations can produce visually wrong results.

**Warning signs:**
- Tax calculations showing odd cents
- Percentages not adding to 100%
- Small negative values appearing where impossible
- Inconsistent results when same calculation done different ways

**Prevention strategy:**
```javascript
// WRONG: Direct floating point
const total = amount1 + amount2;

// OPTION 1: Integer cents (recommended for money)
const totalCents = amountCents1 + amountCents2;
const totalDollars = totalCents / 100;

// OPTION 2: Use library like currency.js or Decimal.js
import currency from 'currency.js';
const total = currency(amount1).add(amount2).value;

// OPTION 3: Round at display boundaries
const displayValue = Math.round(calculated * 100) / 100;
```

**Recommended approach:**
- Use integer cents internally for all money values
- Use Decimal.js or similar for growth rate calculations
- Round at display time only
- Never compare floating point for equality

**Phase to address:** Phase 1 (Foundation - establish patterns early)

**Sources:**
- [JavaScript Rounding Errors](https://www.robinwieruch.de/javascript-rounding-errors/)
- [Currency Calculations in JavaScript](https://www.honeybadger.io/blog/currency-money-calculations-in-javascript/)

---

#### P-FIN-02: CAGR Period Calculation Error (Off-by-One)
**Severity:** HIGH
**Confidence:** HIGH (most common CAGR mistake)

**What goes wrong:** If data spans 5 years, the number of growth periods is 4, not 5. Using 5 produces incorrect (lower) CAGR.

**Why it happens:** Intuitive but wrong: "I have 5 years of data, so n=5."

**Impact:** CAGR systematically underestimated. A 10% actual CAGR might be reported as 8%.

**Warning signs:**
- CAGR results don't match well-known benchmarks
- CAGR lower than simple average return (not always wrong, but check)

**Prevention strategy:**
```javascript
// CORRECT CAGR calculation
function calculateCAGR(beginningValue, endingValue, years) {
  // years = number of years BETWEEN start and end
  // If start is Jan 2020 and end is Jan 2025, years = 5
  return Math.pow(endingValue / beginningValue, 1 / years) - 1;
}

// Common mistake: using array length instead of periods
const values = [100, 110, 121, 133, 146]; // 5 values = 4 periods
const cagr = calculateCAGR(values[0], values[values.length - 1], values.length - 1);
```

**Phase to address:** Phase 1 (Foundation)

**Sources:**
- [Common Mistakes To Avoid When Using CAGR Calculators](https://www.samco.in/knowledge-center/articles/common-mistakes-of-cagr-calculator/)
- [CAGR Formula - Wall Street Prep](https://www.wallstreetprep.com/knowledge/cagr-compound-annual-growth-rate/)

---

#### P-FIN-03: TWRR vs MWRR Confusion
**Severity:** HIGH
**Confidence:** HIGH (standard financial knowledge)

**What goes wrong:** Showing Time-Weighted Return (TWRR) when user expects Money-Weighted Return (MWRR), or vice versa. A user can lose money but see a positive TWRR.

**Why it happens:** TWRR measures fund performance independent of cash flows. MWRR measures investor's actual experience. Both are valid but answer different questions.

**Example:** User invests $10k, portfolio rises 50% to $15k, user adds $50k, portfolio drops 20%. TWRR: +20% (1.5 * 0.8 = 1.2). MWRR: approximately -5% (lost money overall).

**Impact:** User sees +20% return but actually lost money. Loss of trust in tool.

**Warning signs:**
- Users report "returns don't match my experience"
- Positive returns shown when portfolio value decreased

**Prevention strategy:**
- Always show BOTH returns with clear explanation
- Default to MWRR for "my return" and TWRR for "strategy performance"
- Add tooltip: "TWRR shows how the strategy performed. MWRR shows your actual result including contribution timing."

**Phase to address:** Phase 2 (Results Display)

**Sources:**
- [Time-weighted vs. money-weighted rates of return](https://www.sharesight.com/blog/time-weighted-vs-money-weighted-rates-of-return/)
- [TWR vs. IRR vs. MWR](https://tfoco.com/en/insights/articles/twr-vs-irr-vs-mwr-return-metrics)

---

#### P-FIN-04: Annualization Errors
**Severity:** MEDIUM
**Confidence:** HIGH

**What goes wrong:** Converting monthly/daily returns to annual returns incorrectly.

**Why it happens:** Using simple multiplication instead of compounding.

**Example:**
- Monthly return: 1%
- WRONG annual: 1% * 12 = 12%
- CORRECT annual: (1.01)^12 - 1 = 12.68%

**Impact:** Returns appear lower than they should. More significant for volatility annualization.

**Prevention strategy:**
```javascript
// Return annualization
const annualReturn = Math.pow(1 + monthlyReturn, 12) - 1;

// Volatility annualization (multiply by sqrt of periods)
const annualVolatility = monthlyVolatility * Math.sqrt(12);
```

**Phase to address:** Phase 1 (Foundation)

---

### SBLOC/Margin Modeling

#### P-SBLOC-01: Linear Interest Accrual Instead of Compounding
**Severity:** HIGH
**Confidence:** HIGH

**What goes wrong:** Calculating loan interest as simple interest instead of compound interest.

**Why it happens:** Simple interest is easier to calculate: `principal * rate * time`.

**Impact:** For a $1M SBLOC at 6% over 20 years:
- Simple interest: $1.2M total interest
- Monthly compound: $2.3M total interest
- Underestimating by ~50% of actual interest cost

**Warning signs:**
- Loan balances don't grow exponentially
- BBD strategy looks "too good" compared to published analyses

**Prevention strategy:**
```javascript
// WRONG: Simple interest
const interest = principal * rate * years;

// CORRECT: Compound interest (monthly compounding typical for SBLOCs)
const monthlyRate = annualRate / 12;
const months = years * 12;
const futureValue = principal * Math.pow(1 + monthlyRate, months);
const totalInterest = futureValue - principal;
```

**Phase to address:** Phase 1 (BBD Strategy Module)

---

#### P-SBLOC-02: Ignoring Variable Rate Risk
**Severity:** HIGH
**Confidence:** HIGH

**What goes wrong:** Modeling SBLOC as fixed-rate loan when rates are typically SOFR + spread.

**Why it happens:** Variable rates are complex to model. Fixed rate simplifies simulation.

**Impact:** Users who took SBLOCs in 2021 at 2% saw rates spike to 8%+ in 2023. Model must show rate sensitivity.

**Warning signs:**
- BBD strategy always outperforms selling
- No scenarios where rising rates cause strategy failure

**Prevention strategy:**
- Model rates as stochastic process correlated with market conditions
- At minimum: provide rate sensitivity analysis
- Show scenarios at current rate, +200bps, +400bps
- Consider: rates often rise during economic stress when portfolio values fall

**Phase to address:** Phase 2 (Scenario Analysis)

**Sources:**
- [Advisor Perspectives: Buy, Borrow, Die Strategy Analysis](https://www.advisorperspectives.com/articles/2025/06/16/buy-borrow-die-why-popular-tax-strategy-rich-doesnt-work)

---

#### P-SBLOC-03: Incorrect Margin Call Threshold Logic
**Severity:** CRITICAL
**Confidence:** HIGH

**What goes wrong:** Not properly modeling the cascading effect of forced liquidation.

**Margin call cascade:**
1. Portfolio drops below maintenance threshold
2. Broker demands cash or more collateral (24-48 hours)
3. If not met, broker liquidates positions
4. Liquidation is taxable event (capital gains)
5. Tax payment reduces available assets
6. May trigger another margin call

**Why it happens:** Margin call logic is complex with time constraints and feedback loops.

**Impact:** Model shows margin call but not the devastating cascade effect. User doesn't understand that a margin call can spiral into forced liquidation of majority of portfolio.

**Warning signs:**
- Margin call scenarios show quick recovery
- No scenarios where single margin call leads to strategy failure
- Forced liquidation doesn't trigger tax liability

**Prevention strategy:**
```javascript
function processMarginCall(portfolio, loan, marginRequirement) {
  const equity = portfolio.value - loan.balance;
  const equityRatio = equity / portfolio.value;

  if (equityRatio < marginRequirement) {
    // Calculate amount needed to restore margin
    const targetEquityRatio = marginRequirement + BUFFER; // e.g., 30% + 5%
    const amountToLiquidate = calculateLiquidationAmount(
      portfolio.value, loan.balance, targetEquityRatio
    );

    // Liquidation creates taxable event
    const taxLiability = calculateCapitalGainsTax(
      amountToLiquidate, portfolio.costBasis
    );

    // Reduce portfolio by liquidation + tax
    portfolio.value -= amountToLiquidate;
    loan.balance -= amountToLiquidate;
    portfolio.value -= taxLiability; // Tax must be paid!

    // Check if still in violation (cascade)
    return processMarginCall(portfolio, loan, marginRequirement);
  }
  return portfolio;
}
```

**Phase to address:** Phase 1 (BBD Strategy Core Logic)

**Sources:**
- [Bernstein: Margin Loans Risks](https://www.bernstein.com/our-insights/insights/2022/articles/margin-loans-can-help-keep-concentrated-stock-positions-but-know-the-risks.html)
- [Fidelity: Borrowing on Margin](https://www.fidelity.com/learning-center/trading-investing/trading/margin-borrowing)

---

#### P-SBLOC-04: Ignoring Loan-to-Value Ratio Variations by Asset Class
**Severity:** MEDIUM
**Confidence:** HIGH

**What goes wrong:** Using same LTV for all collateral types. Volatile assets have lower LTV limits.

**Reality:**
- S&P 500 ETFs: 70-80% LTV
- Individual stocks: 50-70% LTV
- Volatile tech stocks: 30-50% LTV
- Crypto (where allowed): 20-30% LTV

**Impact:** User thinks they can borrow 70% against concentrated stock position when actual limit is 50%.

**Prevention strategy:**
- Asset class-specific LTV tables
- Calculate available borrowing based on portfolio composition
- Warn when portfolio is concentrated in low-LTV assets

**Phase to address:** Phase 2 (Asset Allocation)

---

## High Severity Pitfalls

### Performance

#### P-PERF-01: Main Thread Blocking During Simulation
**Severity:** HIGH
**Confidence:** HIGH (JavaScript single-threaded limitation)

**What goes wrong:** Running 100k Monte Carlo iterations on main thread freezes UI for 10-30+ seconds. Browser may show "Page Unresponsive" warning.

**Why it happens:** JavaScript is single-threaded. Any computation blocks UI updates, scrolling, and interaction.

**Threshold:** >50ms blocks feel "janky". >100ms feels "slow". >1000ms users think app is broken.

**Impact:** Users abandon before seeing results. App feels "broken" or "low quality."

**Warning signs:**
- Browser shows unresponsive page warning
- UI freezes during calculation
- User can't cancel long-running simulation

**Prevention strategy:**
```javascript
// Use Web Workers for simulation
// main.js
const worker = new Worker('simulation-worker.js');
worker.postMessage({ iterations: 100000, params: simulationParams });
worker.onmessage = (e) => updateResults(e.data);

// simulation-worker.js
self.onmessage = (e) => {
  const results = runMonteCarlo(e.data);
  // Can also post progress updates
  self.postMessage(results);
};
```

**Performance targets:**
- UI remains responsive during simulation
- Progress indicator updates smoothly
- User can cancel simulation at any time
- Results appear within 2-3 seconds for 100k iterations

**Phase to address:** Phase 2 (Simulation Engine)

**Sources:**
- [Using Web Workers - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Web Workers Best Practices 2025](https://medium.com/@QuarkAndCode/web-workers-in-javascript-limits-usage-best-practices-2025-a365b36beaa2)

---

#### P-PERF-02: Memory Leaks with Large Simulation Arrays
**Severity:** HIGH
**Confidence:** MEDIUM (depends on implementation)

**What goes wrong:** Storing all 100k simulation paths in memory. Each path might be 30 years * 12 months = 360 values. Total: 36M numbers = ~288MB just for one scenario.

**Why it happens:** Keeping full paths for visualization/analysis without streaming or sampling.

**Impact:** Browser tab crashes, especially on mobile devices with limited memory.

**Warning signs:**
- Memory usage grows with each simulation
- Browser tab crashes after multiple simulations
- Performance degrades over session

**Prevention strategy:**
```javascript
// DON'T: Store all paths
const allPaths = [];
for (let i = 0; i < 100000; i++) {
  allPaths.push(simulatePath()); // 360 values each!
}

// DO: Calculate statistics incrementally
let runningStats = createRunningStatistics();
for (let i = 0; i < 100000; i++) {
  const path = simulatePath();
  runningStats.update(path);
  // Only keep sample paths for visualization
  if (i % 1000 === 0) samplePaths.push(path);
}
```

- Use streaming statistics (Welford's algorithm for variance)
- Keep only representative sample paths (e.g., 5th, 25th, 50th, 75th, 95th percentile examples)
- Clear results between simulations
- Monitor memory with `performance.memory` (Chrome only)

**Phase to address:** Phase 2 (Simulation Engine)

---

#### P-PERF-03: Chart.js Performance with Large Datasets
**Severity:** MEDIUM
**Confidence:** HIGH (documented Chart.js limitation)

**What goes wrong:** Plotting 100k data points on Chart.js causes browser freezing and slow interaction.

**Why it happens:** Chart.js renders every point to canvas. With zoom/pan plugins, each interaction re-renders everything.

**Threshold:** Chart.js starts struggling >10k points. Unusable >50k points.

**Warning signs:**
- Chart interactions (hover, zoom) feel laggy
- Initial chart render takes several seconds
- Browser shows high CPU usage when chart visible

**Prevention strategy:**
```javascript
// Enable decimation plugin (Chart.js 3+)
const config = {
  type: 'line',
  data: data,
  options: {
    parsing: false, // Pre-format data
    normalized: true, // Data is sorted
    plugins: {
      decimation: {
        enabled: true,
        algorithm: 'min-max', // or 'lttb'
        samples: 500 // Max points to display
      }
    },
    elements: {
      point: {
        radius: 0 // Don't render individual points
      }
    }
  }
};
```

**Alternative approaches:**
- Aggregate data before plotting (show daily->monthly for long periods)
- Use canvas-based charting libraries with WebGL (e.g., uPlot for time series)
- Show summary statistics instead of all paths

**Phase to address:** Phase 2 (Visualization)

**Sources:**
- [Chart.js Performance Documentation](https://www.chartjs.org/docs/latest/general/performance.html)
- [Chart.js Large Dataset Issue #3410](https://github.com/chartjs/Chart.js/issues/3410)

---

### Offline/PWA

#### P-PWA-01: Service Worker Caching Too Aggressively
**Severity:** HIGH
**Confidence:** HIGH (common PWA issue)

**What goes wrong:** App updates not reaching users because service worker serves cached version indefinitely.

**Why it happens:** Cache-first strategy optimized for offline use prevents update checks.

**Impact:** Bug fixes and feature updates never reach users. Users stuck on old version until they manually clear cache.

**Warning signs:**
- Users report bugs you've already fixed
- Changes not appearing after deployment
- "It works on my machine" after push

**Prevention strategy:**
```javascript
// Use stale-while-revalidate for app shell
workbox.routing.registerRoute(
  ({request}) => request.destination === 'document',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'app-shell',
  })
);

// Version your cache and provide update mechanism
const CACHE_VERSION = 'v1.2.0';
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
    ))
  );
});

// Notify user of updates
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
```

**Phase to address:** Phase 4 (PWA/Offline)

**Sources:**
- [Taming PWA Cache Behavior](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [Service Worker Bugs: Making Offline Mode Work](https://blog.pixelfreestudio.com/service-worker-bugs-making-offline-mode-work/)

---

#### P-PWA-02: IndexedDB Storage Quota Exceeded
**Severity:** MEDIUM
**Confidence:** HIGH

**What goes wrong:** Safari limits IndexedDB to ~50MB. Storing many simulation results or large datasets can exhaust quota.

**Why it happens:** Each simulation result, saved scenario, and user preference consumes storage. No automatic cleanup.

**Impact:** App fails silently or crashes when trying to save data. Users lose work.

**Warning signs:**
- Save operations fail silently
- App works on Chrome but fails on Safari
- Long-time users report data loss

**Prevention strategy:**
```javascript
// Check available storage
async function checkStorage() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const percentUsed = (estimate.usage / estimate.quota) * 100;
    if (percentUsed > 80) {
      warnUser('Storage almost full');
    }
  }
}

// Implement LRU eviction for old simulations
async function cleanupOldData(db) {
  const oldItems = await db.getAll('simulations', {
    index: 'timestamp',
    count: 100,
    direction: 'prev' // oldest first
  });
  // Keep last 50, delete rest
  for (const item of oldItems.slice(50)) {
    await db.delete('simulations', item.id);
  }
}

// Request persistent storage
async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    const persistent = await navigator.storage.persist();
    // persistent === true means data won't be evicted under pressure
  }
}
```

**Phase to address:** Phase 4 (Offline Storage)

**Sources:**
- [Offline-first frontend apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [web.dev: Offline Data](https://web.dev/learn/pwa/offline-data)

---

#### P-PWA-03: Browser-Specific Service Worker Behavior
**Severity:** MEDIUM
**Confidence:** HIGH

**What goes wrong:** Safari honors cache directives more strictly than Chrome. App updates correctly in Chrome but stays stale in Safari.

**Impact:** Safari users stuck on old versions. Support nightmare with users on different versions.

**Prevention strategy:**
- Test on ALL target browsers, especially Safari
- Add cache-busting query params to API requests
- Implement manual "check for updates" button
- Use `workbox` library which handles browser differences

**Phase to address:** Phase 4 (Testing)

---

## Medium Severity Pitfalls

### UX

#### P-UX-01: Information Overload in Results Display
**Severity:** MEDIUM
**Confidence:** HIGH (UX research consensus)

**What goes wrong:** Showing all possible statistics, all paths, all percentiles at once. User can't find the answer to their actual question.

**Why it happens:** Developer knows what all the numbers mean. Showing more feels more "complete."

**Impact:** Users feel overwhelmed. They either ignore results or misinterpret them.

**Warning signs:**
- Users ask "what does this number mean?"
- Users report being "confused" by results
- Low engagement with detailed statistics

**Prevention strategy:**
- Progressive disclosure: start with ONE key number (success probability)
- Expand to show supporting details on demand
- Use visual hierarchy: large primary stat, smaller secondary stats
- Limit visible metrics to 5-7 maximum per view
- Add "Learn more" links for complex concepts

**Layout principle:**
```
+------------------------------------------+
|                                          |
|            89% Success Rate              |  <- Primary
|                                          |
|  Median ending value: $2.4M              |  <- Secondary
|  5th percentile: $450k                   |
|                                          |
|  [Show Detailed Statistics] [Explain]    |  <- Progressive disclosure
+------------------------------------------+
```

**Phase to address:** Phase 2 (Results UI)

**Sources:**
- [Four Cognitive Design Guidelines for Dashboards](https://uxmag.com/articles/four-cognitive-design-guidelines-for-effective-information-dashboards)
- [Nielsen Norman Group: Minimize Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/)

---

#### P-UX-02: Misleading Chart Defaults
**Severity:** MEDIUM
**Confidence:** MEDIUM

**What goes wrong:** Y-axis not starting at zero, making small changes look dramatic. Or: axis starting at zero when showing growth makes chart unreadable.

**Impact:** Users draw wrong conclusions from visual representation.

**Prevention strategy:**
- For portfolio values: start at initial investment, not zero
- For percentages/rates: usually start at zero
- Always label axes clearly
- Provide axis scale toggle when appropriate

**Phase to address:** Phase 2 (Visualization)

---

#### P-UX-03: Probability Misinterpretation
**Severity:** MEDIUM
**Confidence:** MEDIUM

**What goes wrong:** Showing "90% success rate" without explaining what "success" means or what happens in the 10% failure cases.

**Impact:** User focuses on 90% success, ignores possibility that 10% failure means "running out of money at age 72."

**Prevention strategy:**
- Define "success" explicitly: "Portfolio lasts through age 95"
- Show both success AND failure scenarios
- Emphasize what failure looks like: "In 10% of scenarios, portfolio depleted by age 78"
- Consider framing: "1 in 10 chance of running out of money" is clearer than "90% success"

**Phase to address:** Phase 2 (Results Interpretation)

---

### Technical

#### P-TECH-01: Shadow DOM Styling Complexity in Web Components
**Severity:** MEDIUM
**Confidence:** HIGH

**What goes wrong:** CSS variables don't pierce shadow DOM as expected. Component looks wrong when embedded in different contexts.

**Why it happens:** Shadow DOM encapsulation is intentional but requires different styling approach.

**Impact:** Components look broken or unstyled in certain contexts. Difficult to theme consistently.

**Prevention strategy:**
```javascript
// Use CSS Custom Properties (they DO inherit through shadow DOM)
:host {
  --primary-color: var(--app-primary-color, #007bff);
  --text-color: var(--app-text-color, #333);
}

// Use adoptedStyleSheets for shared styles (memory efficient)
const sheet = new CSSStyleSheet();
sheet.replaceSync(sharedStyles);
shadowRoot.adoptedStyleSheets = [sheet];

// Use ::part() for exposed styling hooks
<button part="action-button">Click</button>

// Consumer can style:
my-component::part(action-button) {
  background: red;
}
```

**Phase to address:** Phase 3 (Component Architecture)

**Sources:**
- [Shadow DOM Styling Pitfalls](https://www.matuzo.at/blog/2023/pros-and-cons-of-shadow-dom/)
- [The Shadow DOM Problem](https://itnext.io/the-shadow-dom-problem-why-web-components-still-struggle-1d0ffe67e824)

---

#### P-TECH-02: Event Retargeting in Shadow DOM
**Severity:** LOW
**Confidence:** HIGH

**What goes wrong:** Click events inside shadow DOM report `event.target` as the host element, not the actual clicked element.

**Impact:** Event handlers can't easily determine what was actually clicked inside the component.

**Prevention strategy:**
```javascript
// Use composedPath() to get full event path
element.addEventListener('click', (e) => {
  const path = e.composedPath();
  const actualTarget = path[0]; // The real target

  // Or find specific element
  const button = path.find(el => el.tagName === 'BUTTON');
});
```

**Phase to address:** Phase 3 (Component Events)

---

#### P-TECH-03: Single-File Bundle Size Explosion
**Severity:** MEDIUM
**Confidence:** HIGH

**What goes wrong:** Base64 inlining assets increases size by ~33%. A 5MB total becomes 6.5MB+ single file.

**Why it happens:** Base64 encoding overhead plus no compression benefits for inlined assets.

**Impact:** Slow initial load. Possible memory issues on mobile devices parsing large single file.

**Prevention strategy:**
- Minimize embedded assets
- Compress images before inlining (use WebP/AVIF)
- Consider: is single-file actually required? Could use service worker for offline instead
- Set size budget: aim for <2MB uncompressed, <500KB gzipped for the HTML+JS+CSS
- Don't inline large assets (>50KB) unless absolutely necessary

**Build configuration:**
```javascript
// vite.config.js with vite-plugin-singlefile
export default {
  build: {
    assetsInlineLimit: 50 * 1024, // Only inline assets <50KB
  }
}
```

**Phase to address:** Phase 4 (Build/Export)

**Sources:**
- [vite-plugin-singlefile](https://www.npmjs.com/package/vite-plugin-singlefile)
- [Rsbuild: Inline Static Assets](https://rsbuild.rs/guide/optimization/inline-assets)

---

## Pitfall Matrix

| ID | Pitfall | Severity | Warning Signs | Prevention | Phase |
|----|---------|----------|---------------|------------|-------|
| P-STAT-01 | Normal vs Lognormal Distribution | CRITICAL | Negative portfolio values, low failure rates | Use lognormal for returns | 1 |
| P-STAT-02 | Static Correlation Matrix | CRITICAL | Overstated diversification benefits | Regime-based correlations | 1 |
| P-STAT-03 | Insufficient Iterations | HIGH | Varying tail statistics between runs | 100k+ iterations, show confidence | 1-2 |
| P-STAT-04 | Poor RNG Quality | MEDIUM | Patterns in outputs | Use crypto.getRandomValues for critical paths | 1 |
| P-FIN-01 | Floating Point Errors | CRITICAL | Odd cents, percentages != 100% | Integer cents, currency.js | 1 |
| P-FIN-02 | CAGR Off-by-One | HIGH | Low CAGR vs benchmarks | periods = values - 1 | 1 |
| P-FIN-03 | TWRR vs MWRR Confusion | HIGH | Positive return but lost money | Show both, explain difference | 2 |
| P-FIN-04 | Annualization Errors | MEDIUM | Returns too low | Compound, not multiply | 1 |
| P-SBLOC-01 | Simple vs Compound Interest | HIGH | Loan costs too low | Monthly compounding | 1 |
| P-SBLOC-02 | Ignoring Variable Rates | HIGH | BBD always wins | Rate sensitivity analysis | 2 |
| P-SBLOC-03 | Margin Call Cascade | CRITICAL | Quick recovery from margin calls | Model cascade + tax impact | 1 |
| P-SBLOC-04 | Uniform LTV Ratios | MEDIUM | Overestimated borrowing capacity | Asset-class specific LTV | 2 |
| P-PERF-01 | Main Thread Blocking | HIGH | Frozen UI, unresponsive warnings | Web Workers | 2 |
| P-PERF-02 | Memory Leaks | HIGH | Crashes after multiple simulations | Streaming statistics | 2 |
| P-PERF-03 | Chart.js Large Datasets | MEDIUM | Laggy interactions | Decimation plugin | 2 |
| P-PWA-01 | Aggressive Caching | HIGH | Users stuck on old version | Stale-while-revalidate | 4 |
| P-PWA-02 | Storage Quota | MEDIUM | Silent save failures on Safari | Check quota, LRU eviction | 4 |
| P-PWA-03 | Browser Differences | MEDIUM | Works in Chrome, not Safari | Cross-browser testing | 4 |
| P-UX-01 | Information Overload | MEDIUM | Users confused by results | Progressive disclosure | 2 |
| P-UX-02 | Misleading Charts | MEDIUM | Wrong conclusions from visuals | Context-appropriate axis | 2 |
| P-UX-03 | Probability Misinterpretation | MEDIUM | Users ignore failure scenarios | Define success, show failures | 2 |
| P-TECH-01 | Shadow DOM Styling | MEDIUM | Broken/unstyled components | CSS variables, ::part() | 3 |
| P-TECH-02 | Event Retargeting | LOW | Can't identify clicked element | composedPath() | 3 |
| P-TECH-03 | Bundle Size | MEDIUM | Slow load, mobile crashes | Size budget, selective inlining | 4 |

---

## Testing Strategies for Pitfall Prevention

### Statistical Accuracy Testing

1. **Distribution Validation**
   - Generate 1M samples from return distribution
   - Plot histogram and compare to expected lognormal shape
   - Verify no negative terminal values

2. **Correlation Stress Testing**
   - Run simulations with historical 2008 data as input
   - Verify correlations increase during drawdown periods
   - Compare model drawdowns to actual historical drawdowns

3. **Convergence Testing**
   - Run same scenario with 10k, 50k, 100k, 500k iterations
   - Track standard error of key statistics
   - Verify tail percentiles stabilize

### Financial Calculation Testing

4. **Floating Point Regression Suite**
   ```javascript
   test('floating point precision', () => {
     expect(currency(0.1).add(0.2).value).toBe(0.3);
     expect(currency(2.51).add(0.01).value).toBe(2.52);
   });
   ```

5. **CAGR Validation**
   - Test against known benchmarks (S&P 500 historical CAGR)
   - Edge cases: 1 period, negative values, zero start

6. **SBLOC Cascade Testing**
   - Simulate 50% market crash
   - Verify margin call triggers
   - Verify tax liability calculated on forced liquidation
   - Verify cascade can deplete portfolio

### Performance Testing

7. **Main Thread Responsiveness**
   ```javascript
   // Performance budget test
   test('simulation does not block main thread', async () => {
     const start = performance.now();
     // Trigger simulation
     // During simulation, verify UI interactions possible
     const interactionLatency = measureInteractionLatency();
     expect(interactionLatency).toBeLessThan(100); // ms
   });
   ```

8. **Memory Leak Detection**
   - Run 10 simulations in succession
   - Monitor memory growth
   - Verify memory released between simulations

### Cross-Browser Testing

9. **Safari-Specific Tests**
   - Storage quota handling
   - Service worker update behavior
   - IndexedDB write success

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Statistical Accuracy | HIGH | Well-documented in financial literature, academic research |
| Financial Calculations | HIGH | Standard finance knowledge, JavaScript precision issues documented |
| SBLOC Modeling | HIGH | Margin mechanics documented by brokerages, tax consequences standard |
| Performance | HIGH | JavaScript single-thread limitation fundamental, Chart.js limits documented |
| PWA/Offline | HIGH | Well-documented browser behaviors and IndexedDB limitations |
| UX | MEDIUM | Best practices documented, but effectiveness varies by user base |
| Web Components | MEDIUM | Shadow DOM behaviors documented, but ecosystem still evolving |

### Research Gaps

1. **Regime-switching correlation models**: Need deeper research on practical implementation for JavaScript
2. **Latin Hypercube Sampling**: May improve tail statistics with fewer iterations - needs implementation research
3. **Step-up basis modeling**: Current tax law may change - strategy validity depends on legislation
4. **Safari IndexedDB reliability**: Reports of data loss in Safari - needs monitoring

---

## Sources Summary

### Statistical/Financial (HIGH confidence)
- [CFA Institute: Monte Carlo Simulations Forecasting Folly](https://blogs.cfainstitute.org/investor/2024/01/29/monte-carlo-simulations-forecasting-folly/)
- [Kitces: Assessing Performance Predictiveness Of Monte Carlo Models](https://www.kitces.com/blog/monte-carlo-models-simulation-forecast-error-brier-score-retirement-planning/)
- [BIS: Evaluating correlation breakdowns](https://www.bis.org/publ/confer08k.pdf)
- [Wall Street Prep: CAGR Formula](https://www.wallstreetprep.com/knowledge/cagr-compound-annual-growth-rate/)

### Technical Implementation (HIGH confidence)
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Chart.js Performance Documentation](https://www.chartjs.org/docs/latest/general/performance.html)
- [web.dev: Offline Data](https://web.dev/learn/pwa/offline-data)
- [Currency.js Documentation](https://currency.js.org/)

### SBLOC/Margin (HIGH confidence)
- [Fidelity: Borrowing on Margin](https://www.fidelity.com/learning-center/trading-investing/trading/margin-borrowing)
- [Bernstein: Margin Loan Risks](https://www.bernstein.com/our-insights/insights/2022/articles/margin-loans-can-help-keep-concentrated-stock-positions-but-know-the-risks.html)
- [Yale Budget Lab: Buy-Borrow-Die Analysis](https://budgetlab.yale.edu/research/buy-borrow-die-options-reforming-tax-treatment-borrowing-against-appreciated-assets)

### UX (MEDIUM confidence)
- [Nielsen Norman Group: Minimize Cognitive Load](https://www.nngroup.com/articles/minimize-cognitive-load/)
- [UX Magazine: Cognitive Design Guidelines for Dashboards](https://uxmag.com/articles/four-cognitive-design-guidelines-for-effective-information-dashboards)

---

## Focused Addendum: Annual Historical Returns from Reviewed Files

**Scope:** Converting human-reviewed CSV/JSON price data into eVelo's bundled annual-return presets. This addendum does not assume a particular provider, API, file schema, adjustment convention, or redistribution right.  
**Researched:** 2026-10-05  
**Confidence:** LOW for external-source conclusions: web search was unavailable, while repository code and IETF standards were inspected. Verify each source file's own methodology and license before using it.

### Critical Pitfall: Price Return Is Not Necessarily Total Return
**What goes wrong:** Unadjusted closing prices can count a dividend as a loss or omit the distribution from performance. A split can create a large apparent per-share price move even though the investor's share count changes correspondingly. Conversely, applying corporate-action adjustments again to an already-adjusted series double counts them.

**Why it happens:** “Adjusted close” is not a universal definition; sources may make different adjustments or describe their treatment differently. A column name without its methodology is insufficient.

**Prevention:**
- Require the source documentation to specify price-only versus total-return series, cash distribution and reinvestment treatment, split handling, currency, and any other material corporate actions. Do not infer this from column labels or assume one vendor's convention applies to another.
- Prefer a documented total-return series for a simulation intended to represent reinvested total returns. If deriving returns from unadjusted prices, require documented corporate-action inputs and a reviewed calculation; never combine a pre-adjusted series with a second adjustment.
- For a total-return index level `TRI`, calculate full calendar-year return as `TRI(last valid close in year) / TRI(last valid close in prior year) - 1`. Independently check sample years against a documented reference.
- Keep the source documentation and a review record alongside the generated preset. A plausible-looking annual series is not evidence of the right return basis.

**Detection:** A sharp loss aligned with a split; annual returns that omit the approximate effect of distributions; mismatches against a documented total-return reference; or provenance that says only “adjusted.”

**Repository relevance:** `src/data/services/preset-service.ts` documents bundled equity data as annual total returns with dividends reinvested, sourced from adjusted closes. `src/data/presets/*.json` stores annual `{ date, return }` values. Each source refresh should substantiate that claimed basis instead of transferring it to arbitrary imported data.

### Critical Pitfall: Calendarization, Missing Sessions, and Partial Years
**What goes wrong:** A return is assigned to the wrong year, calculated over a partial year but presented as full-year, or distorted by a missing/stale price. Timezone conversion may also shift a date-only trading session across the calendar boundary.

**Prevention:**
- Define date labels as exchange-local trading-session dates. If inputs are timestamps, apply the source's timezone/session convention before assigning a calendar year; do not treat a date-only label as a UTC instant.
- For a full year, anchor on the last valid close of the prior year and end on the last valid close in the target year. A weekend or market holiday at year end is expected; a missing expected observation is not.
- Exclude incomplete first/last years unless they are explicitly supported and labeled partial. Do not carry stale values forward across unexplained gaps, interpolate, or replace missing years with zero returns.
- Check gaps against the relevant session calendar, normalize all annual labels to a single format, require unique years, and confirm that row coverage agrees with declared start/end dates.

**Detection:** The first or final observation lies mid-year; gaps in expected sessions; duplicate/skipped annual periods; annual labels shift after parsing; or reported coverage does not match available endpoints.

**Repository relevance:** `src/data/validation/data-validator.ts` accepts both `YYYY` and `YYYY-MM-DD`, detects exact-string duplicates and derives gap warnings from the first four label characters. Its JSON path does not require a uniform date granularity or validate calendar-date syntax. These checks do not by themselves prove that a series contains full calendar-year total returns.

### Critical Pitfall: Survivorship and Look-Ahead Bias
**What goes wrong:** A historical universe contains only securities that survive today, or uses index constituents/selection information that was not knowable at the time. Delisted or failed securities may vanish; future membership may influence historical selection.

**Prevention:**
- State whether a preset is one instrument's own realized history, an index total-return history, or a reconstructed constituent portfolio. These are not interchangeable.
- If a historical strategy selects individual securities or reconstructs index membership, use point-in-time membership and preserve delisted/acquired/failed outcomes where the strategy requires them. Do not select the historical universe using today's survivors.
- Record an explicit “known as of” date and do not let future membership, future classifications, or observations beyond the period being modeled determine historical selection.
- Do not backfill an instrument's pre-inception history with an index or predecessor unless the splice is separately justified, documented, and labeled.

**Detection:** A purported historical constituent set contains only current survivors; constituents are applied retroactively; or a series silently changes instrument/proxy before inception. Survivorship bias in performance studies is discussed in Brown, Goetzmann, Ibbotson, and Ross (1992).

### Critical Pitfall: Source File or Derived Data Is Not Automatically Redistributable
**What goes wrong:** A reviewed file is checked in and embedded in the web or portable build despite terms that allow viewing/internal use but restrict public redistribution, derived datasets, attribution, or onward distribution.

**Prevention:**
- Check the exact source terms for repository hosting, public app and portable-build distribution, derived annual values, attribution, and retention. Obtain legal review for unclear terms.
- Do not infer permission from public availability, free download, or transformation to annual values. If permission is absent or ambiguous, do not bundle the source or its derived output.
- Keep a provenance/license record: source identity and documentation, review/retrieval date, license/version and URL, permitted-use determination, attribution, and source checksum. Keep restricted raw data out of Git and public build assets.
- Recheck terms when the source or distribution channel changes. Data rights are source- and use-specific; no provider-wide assumption is made here.

**Detection:** No license/provenance accompanies a preset change; terms do not clearly allow the intended redistribution; or the included data cannot be traced to a specific reviewed source.

### Moderate Pitfall: Permissive Parsing, Rounding, and Unit Confusion
**What goes wrong:** Percent values are mistaken for decimal returns; numeric parsing accepts malformed prefixes; non-finite values pass; or premature rounding compounds into materially different annual results.

**Prevention:** Declare the unit (`0.10` means 10%), parse the complete field strictly, reject non-finite values, and calculate from unrounded source observations. Round only for display or under a documented final serialization policy. Treat plausibility thresholds as warnings, not proof.

**Repository relevance:** CSV validation expects decimal returns but uses `parseFloat`, which accepts a valid numeric prefix followed by extraneous text. JSON validation checks `isNaN` but does not explicitly reject all non-finite values (for example, a very large numeric exponent may parse to `Infinity`). Validate numeric domain and units before generating a preset.

### Moderate Pitfall: False Diffs and Unreviewed Data Changes
**What goes wrong:** Formatting, key/row order, locale-dependent numbers, timestamps, or serializer changes produce noisy diffs; overly broad tolerances hide genuine corrections.

**Prevention:** Generate deterministically: sort by asset and year; use stable field order, encoding, newline, and locale-independent numeric serialization; omit changing generation timestamps from preset payloads. Preserve source hashes and transform version. Review both a text diff and a semantic diff listing asset/year, old/new value, and coverage changes. A tolerance may classify representation noise, but must not silently suppress changed returns.

**Repository relevance:** Presets are statically imported JSON via `src/data/services/preset-service.ts`; formatting changes therefore affect bundled output. `src/data/formats/bulk-format-templates.ts` adds `exportedAt` to a downloaded template; that variable timestamp should not be copied into generated preset data if it creates a diff on every run.

### Phase-Specific Warnings

| Topic | Likely pitfall | Mitigation |
|---|---|---|
| Reviewing input files | Adjustment semantics or licensing assumed | Require methodology, provenance, and redistribution sign-off |
| Annual conversion | Partial years, wrong year-end endpoint, timezone shifts, or missing sessions | Define exchange-local session dates and full-year boundary rules; manually check boundary years |
| Validation | Mixed date formats, malformed numbers, gaps, or metadata conflicts | Normalize to one annual format; strictly validate dates, finite values, units, and source metadata |
| Preset generation | Formatting-only diffs or hidden rounded changes | Deterministic output plus both textual and semantic value diffs |
| Historical universe | Survivorship or future constituent information | Use point-in-time membership and include delisted outcomes where relevant |
| Bundling | Source terms prohibit app/repository redistribution | Verify the specific license and intended distribution; omit data if unclear |

### Sources

- Repository evidence inspected: `src/data/validation/data-validator.ts`, `src/data/services/bulk-import-service.ts`, `src/data/services/preset-service.ts`, `src/data/presets/*.json`, and `src/data/formats/bulk-format-templates.ts`.
- IETF, [RFC 3339: Date and Time on the Internet](https://www.rfc-editor.org/rfc/rfc3339.txt) — timestamps and timezone offsets (reachable during research).
- IETF, [RFC 4180: Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180.txt) — common CSV structure (reachable during research).
- IETF, [RFC 8785: JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.txt) — deterministic serialization, not a financial validator or rounding policy (reachable during research).
- S&P Dow Jones Indices, [Equity Indices Policies & Practices Methodology](https://www.spglobal.com/spdji/en/documents/methodologies/methodology-equity-indices-policies-practices.pdf) and [Licensing](https://www.spglobal.com/spdji/en/landing/topic/licensing/) — consult the current relevant methodology and terms; automated retrieval was denied in this run.
- U.S. Securities and Exchange Commission, Investor.gov, [Stock Splits](https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks/stock-splits) — corporate-action background; automated retrieval was denied in this run.
- Brown, Goetzmann, Ibbotson, and Ross, “Survivorship Bias in Performance Studies,” *The Review of Financial Studies* 5(4), 553–580 (1992), [doi:10.1093/rfs/5.4.553](https://doi.org/10.1093/rfs/5.4.553) — academic survivorship-bias reference; publisher content was not readable in this run.
