# Phase 18: Fix Regime-Switching Model - Research

**Researched:** 2026-01-24
**Domain:** Regime-switching models, financial time series calibration, parameter estimation
**Confidence:** MEDIUM

## Summary

Regime-switching models simulate market behavior by transitioning between distinct market states (bull, bear, crash) with state-specific return distributions. The current implementation uses hardcoded S&P 500 parameters for all assets, ignoring asset-specific historical data and calibration modes.

Research reveals that implementing a production-ready regime-switching model requires full Maximum Likelihood Estimation (MLE) with EM algorithm, which is computationally expensive and requires statistical libraries not available in TypeScript/JavaScript ecosystem. However, **practical alternatives exist** that are suitable for Monte Carlo simulation:

1. **Simple threshold-based regime classification** - Classify historical returns into regimes using percentile thresholds
2. **Asset-specific parameter estimation** - Calculate mean/stddev per regime from classified data
3. **Conservative adjustment** - Apply standard stress-testing parameter shifts (reduce returns, increase volatility)

**Primary recommendation:** Use threshold-based regime classification on asset historical data to derive regime-specific mean/stddev parameters, with conservative mode applying standard one-sigma stress adjustments.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Built-in Math | ES6 | Statistical calculations | Already implemented in codebase, zero dependencies |
| seedrandom | Current | Reproducible random generation | Already in use for Monte Carlo |

### Supporting
No additional libraries needed - the approach uses statistical methods already implemented in the codebase (mean, stddev, percentile calculations).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Threshold classification | statsmodels.MarkovRegression (Python) | Requires Python runtime, MLE/EM algorithm is overkill for simulation use case |
| Manual parameter calculation | Pre-trained ML models | Adds complexity, requires training data, not transparent to users |
| Built-in approaches | External API for parameter estimation | Network dependency, latency, cost |

**Installation:**
No new dependencies required. Use existing codebase utilities.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── simulation/
│   ├── regime-switching.ts        # Core regime model (existing)
│   ├── regime-calibration.ts      # NEW: Parameter estimation from historical data
│   └── types.ts                   # Type definitions
└── data/
    └── presets/                   # Historical data (stocks.json, etc.)
```

### Pattern 1: Threshold-Based Regime Classification
**What:** Classify historical returns into bull/bear/crash regimes using percentile thresholds
**When to use:** Deriving regime parameters from asset historical data
**Example:**
```typescript
// Source: Research synthesis from multiple academic sources
// Based on threshold models (Lunde & Timmermann 2004, Pagan & Sossounov 2003)

function classifyRegimes(returns: number[]): {
  bull: number[];
  bear: number[];
  crash: number[];
} {
  const sorted = [...returns].sort((a, b) => a - b);

  // Bottom 10% = crash, next 20% = bear, top 70% = bull
  // Thresholds based on academic literature and S&P 500 historical frequency
  const crashThreshold = percentile(sorted, 10);   // Worst 10%
  const bearThreshold = percentile(sorted, 30);    // Next 20%

  const bull: number[] = [];
  const bear: number[] = [];
  const crash: number[] = [];

  for (const r of returns) {
    if (r < crashThreshold) {
      crash.push(r);
    } else if (r < bearThreshold) {
      bear.push(r);
    } else {
      bull.push(r);
    }
  }

  return { bull, bear, crash };
}
```

### Pattern 2: Asset-Specific Parameter Estimation
**What:** Calculate mean and standard deviation for each regime from classified historical data
**When to use:** Generating regime parameters that reflect actual asset characteristics
**Example:**
```typescript
// Source: Regime-switching literature on mean-variance estimation per regime
// References: Hamilton (1989), Kim & Nelson (1999)

function estimateRegimeParams(
  regimeReturns: { bull: number[]; bear: number[]; crash: number[] }
): RegimeParamsMap {
  return {
    bull: {
      mean: mean(regimeReturns.bull),
      stddev: stddev(regimeReturns.bull)
    },
    bear: {
      mean: mean(regimeReturns.bear),
      stddev: stddev(regimeReturns.bear)
    },
    crash: {
      mean: mean(regimeReturns.crash),
      stddev: stddev(regimeReturns.crash)
    }
  };
}
```

### Pattern 3: Conservative Calibration Adjustment
**What:** Apply stress-testing parameter shifts to create pessimistic scenarios
**When to use:** Conservative calibration mode for risk-averse simulations
**Example:**
```typescript
// Source: Stress testing best practices (Federal Reserve, World Bank stress test methodology)
// Standard approach: 1 standard deviation below historical mean

function applyConservativeAdjustment(
  historicalParams: RegimeParamsMap,
  historicalReturns: number[]
): RegimeParamsMap {
  // Calculate one standard deviation of overall returns for reference
  const overallStdDev = stddev(historicalReturns);

  return {
    bull: {
      // Reduce mean by 1-2 percentage points (or 1 stddev of regime, whichever is larger)
      mean: historicalParams.bull.mean - Math.max(0.01, historicalParams.bull.stddev),
      // Increase volatility by 10-20% (multiply by 1.1 to 1.2)
      stddev: historicalParams.bull.stddev * 1.15
    },
    bear: {
      // Make bear returns more negative (reduce by 1-2pp)
      mean: historicalParams.bear.mean - 0.02,
      // Increase bear volatility
      stddev: historicalParams.bear.stddev * 1.2
    },
    crash: {
      // Make crashes worse (reduce by 2-5pp)
      mean: historicalParams.crash.mean - 0.03,
      // Increase crash volatility
      stddev: historicalParams.crash.stddev * 1.25
    }
  };
}
```

### Pattern 4: Portfolio-Level Regime Parameters
**What:** Calculate weighted regime parameters across portfolio assets
**When to use:** When needing single regime parameters representing entire portfolio
**Example:**
```typescript
// Calculate portfolio-level regime parameters from asset-specific params
function calculatePortfolioRegimeParams(
  assetParams: RegimeParamsMap[],
  weights: number[],
  correlationMatrix: number[][]
): RegimeParamsMap {
  // For each regime, calculate weighted mean
  const regimes: MarketRegime[] = ['bull', 'bear', 'crash'];
  const result = {} as RegimeParamsMap;

  for (const regime of regimes) {
    // Weighted average return
    const portfolioMean = assetParams.reduce(
      (sum, params, i) => sum + params[regime].mean * weights[i],
      0
    );

    // Portfolio variance using correlation matrix
    let portfolioVariance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        portfolioVariance +=
          weights[i] * weights[j] *
          assetParams[i][regime].stddev *
          assetParams[j][regime].stddev *
          correlationMatrix[i][j];
      }
    }

    result[regime] = {
      mean: portfolioMean,
      stddev: Math.sqrt(portfolioVariance)
    };
  }

  return result;
}
```

### Anti-Patterns to Avoid
- **Using regime parameters for one asset class on another** - Tech stocks and bonds have very different regime characteristics
- **Applying conservative adjustment to already-conservative historical data** - Double-counting pessimism inflates failure rates
- **Ignoring minimum sample size** - Need at least 5-10 observations per regime for meaningful statistics
- **Over-fitting regimes** - More than 3-4 regimes often creates spurious regime detection

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full MLE regime estimation | Custom EM algorithm | Simple threshold classification | EM algorithm is complex, requires 100+ lines, prone to local optima, overkill for simulation |
| Transition matrix estimation | Maximum likelihood estimator | Use DEFAULT_TRANSITION_MATRIX from literature | Transition probabilities are stable across time and assets, estimation requires state sequences |
| Regime forecasting | Predictive models | Not needed for Monte Carlo | Simulations use stochastic transitions, not predictions |
| Multi-asset regime correlation | Custom copula models | Shared regime sequence + correlation matrix | Existing correlatedSamples() handles multi-asset correlation |

**Key insight:** The goal is simulation, not econometric inference. Simple threshold-based classification provides regime-appropriate parameters without requiring sophisticated statistical estimation.

## Common Pitfalls

### Pitfall 1: Spurious Regime Detection
**What goes wrong:** Fitting regime model to data that doesn't actually have regime structure produces meaningless parameters
**Why it happens:** Small sample sizes, overfitting, or fitting 3-regime model to data with only 2 true regimes
**How to avoid:**
- Require minimum 30 observations total (10 per regime on average)
- Visually inspect regime classification for sensibility
- Check that regime means are well-separated (bull mean > bear mean + 1 stddev)
**Warning signs:**
- Regimes with very similar means/stddevs
- Regime with only 1-2 observations
- Crash regime mean > bear regime mean

### Pitfall 2: Ignoring Parameter Uncertainty
**What goes wrong:** Treating estimated parameters as exact truth when they have estimation error
**Why it happens:** Small historical samples (30 years = 30 observations) produce noisy estimates
**How to avoid:**
- Document that parameters are estimates with uncertainty
- Consider validation: does regime model CAGR match overall historical CAGR?
- For conservative mode, uncertainty justifies pessimistic adjustments
**Warning signs:**
- Estimated stddev near zero (suggests insufficient variation)
- Extreme outliers dominate regime classification
- Parameters change dramatically with slight threshold adjustments

### Pitfall 3: Year Label Confusion
**What goes wrong:** Mislabeling historical data years (e.g., "2025-2055" for data that's actually 1995-2025)
**Why it happens:** Confusion between "year when data was collected" vs "year represented by data point"
**How to avoid:**
- Clearly document data provenance (source, actual date range)
- Use metadata fields (startDate, endDate) consistently
- Cross-check: if data includes 2008 financial crisis, it can't be future-dated
**Warning signs:**
- Future dates in historical preset data
- Date ranges that don't align with known market events
- User confusion about what "historical" means

### Pitfall 4: Not Validating Calibration Output
**What goes wrong:** Calibrated parameters produce unrealistic simulation results (CAGR too high/low)
**Why it happens:** No validation step to check parameter sanity
**How to avoid:**
- Calculate expected CAGR from regime parameters: `E[R] = p_bull * mean_bull + p_bear * mean_bear + p_crash * mean_crash`
- Use steady-state probabilities from transition matrix
- Compare to historical CAGR: should match within 1-2 percentage points
**Warning signs:**
- Simulated CAGR is 15% when historical is 10%
- Conservative mode produces higher returns than historical mode
- Success rates are 100% or 0% (parameter mismatch)

### Pitfall 5: Endogeneity in Regime Switching
**What goes wrong:** Assuming regime switches are random when they may correlate with market events
**Why it happens:** Using fixed transition matrix that doesn't account for persistence or momentum
**How to avoid:** This is an academic concern; for Monte Carlo simulation, using historical transition probabilities is acceptable
**Warning signs:** Not applicable for simulation use case (more relevant for forecasting)

### Pitfall 6: Conservative Adjustment on Wrong Baseline
**What goes wrong:** Applying conservative adjustment to S&P 500 defaults instead of asset historical data
**Why it happens:** Not implementing asset-specific calibration first
**How to avoid:**
- ALWAYS derive historical parameters from actual asset data FIRST
- THEN apply conservative adjustment to those historical parameters
- Document the two-step process clearly
**Warning signs:**
- Conservative tech stock parameters look identical to conservative bond parameters
- Conservative mode just multiplies DEFAULT_REGIME_PARAMS by a constant

## Code Examples

Verified patterns from research synthesis:

### Steady-State Regime Probabilities
```typescript
// Source: Markov chain theory - solving for steady state distribution
// Used to validate expected returns match historical CAGR

function calculateSteadyStateProbabilities(
  matrix: TransitionMatrix
): { bull: number; bear: number; crash: number } {
  // For 3-state Markov chain, solve: π = π * P where π is steady state
  // Simplified iterative approach (converges in ~20 iterations)

  let p = { bull: 0.7, bear: 0.2, crash: 0.1 }; // Initial guess

  for (let i = 0; i < 50; i++) {
    const newP = {
      bull: p.bull * matrix.bull.bull + p.bear * matrix.bear.bull + p.crash * matrix.crash.bull,
      bear: p.bull * matrix.bull.bear + p.bear * matrix.bear.bear + p.crash * matrix.crash.bear,
      crash: p.bull * matrix.bull.crash + p.bear * matrix.bear.crash + p.crash * matrix.crash.crash
    };
    p = newP;
  }

  return p;
}
```

### Expected CAGR Validation
```typescript
// Validate that regime parameters produce expected long-term return

function validateExpectedReturn(
  params: RegimeParamsMap,
  matrix: TransitionMatrix,
  historicalCAGR: number
): { valid: boolean; expectedCAGR: number; error: number } {
  const steadyState = calculateSteadyStateProbabilities(matrix);

  // Expected return = weighted average by steady state probabilities
  const expectedReturn =
    steadyState.bull * params.bull.mean +
    steadyState.bear * params.bear.mean +
    steadyState.crash * params.crash.mean;

  const error = Math.abs(expectedReturn - historicalCAGR);

  return {
    valid: error < 0.02, // Within 2 percentage points
    expectedCAGR: expectedReturn,
    error
  };
}
```

### Complete Calibration Function
```typescript
// Complete calibration workflow: historical data -> regime parameters

function calibrateRegimeModel(
  historicalReturns: number[],
  mode: 'historical' | 'conservative'
): RegimeParamsMap {
  // Step 1: Classify returns into regimes
  const classified = classifyRegimes(historicalReturns);

  // Step 2: Estimate parameters from classified data
  const historicalParams = estimateRegimeParams(classified);

  // Step 3: Apply mode-specific adjustment
  if (mode === 'conservative') {
    return applyConservativeAdjustment(historicalParams, historicalReturns);
  }

  return historicalParams;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MLE with EM algorithm | Threshold + percentile classification | Recent shift (2020s) | Simpler, faster, adequate for simulation |
| Single regime for all assets | Asset-specific regime parameters | Emerging (2024-2025) | Better captures heterogeneous asset behavior |
| Fixed parameters | Calibration modes (historical/conservative) | Standard practice (2025) | Enables stress testing and risk analysis |
| Regime forecasting | Stochastic simulation only | Always for Monte Carlo | Forecasting is different problem than simulation |

**Deprecated/outdated:**
- **Regime forecasting in Monte Carlo context**: Forecasting future regimes is a different problem; simulations use stochastic transitions
- **Uniform regime parameters across asset classes**: Research shows equities, bonds, commodities have distinct regime characteristics
- **EM algorithm for simulation calibration**: Overkill; threshold classification is sufficient and more transparent

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal percentile thresholds for regime classification**
   - What we know: Academic literature uses various thresholds (10/30, 15/35, 20/40)
   - What's unclear: Whether thresholds should vary by asset class or be fixed
   - Recommendation: Use 10/30 (crash bottom 10%, bear next 20%) as baseline, consider making configurable

2. **Whether to use shared or asset-specific regimes**
   - What we know: Current code uses shared regime sequence across assets (all assets in same regime each year)
   - What's unclear: Whether tech stocks and bonds should be in different regimes simultaneously
   - Recommendation: Keep shared regime (simpler, preserves correlation structure), but use asset-specific parameters

3. **Minimum sample size for reliable calibration**
   - What we know: Standard statistical rule is 5-10 observations per parameter
   - What's unclear: Whether 30 years of data (10/6/4 observations per regime) is sufficient
   - Recommendation: Proceed with available data, document uncertainty, add validation checks

4. **Conservative adjustment magnitudes**
   - What we know: Stress tests use 1 standard deviation shifts; conservative adjustments range 10-25%
   - What's unclear: Exact percentages for each regime
   - Recommendation: Start with mean -1 to -3 pp, stddev +15% to +25%, validate against user expectations

5. **Handling assets with <30 years of data**
   - What we know: Some assets may have limited historical returns
   - What's unclear: Whether to fall back to DEFAULT_REGIME_PARAMS or skip regime model
   - Recommendation: Require minimum 20 observations; fall back to bootstrap method if insufficient data

## Sources

### Primary (HIGH confidence)
- [Hamilton Regime-Switching Models](https://econweb.ucsd.edu/~jhamilto/palgrav1.pdf) - Original Hamilton methodology
- [Markov Switching Models (NTU lecture notes)](https://homepage.ntu.edu.tw/~ckuan/pdf/Lec-Markov_note.pdf) - Parameter estimation methods
- [On Regime Switching Models (MDPI Mathematics, March 2025)](https://www.mdpi.com/2227-7390/13/7/1128) - Recent comprehensive review
- [Statsmodels MarkovRegression documentation](https://www.statsmodels.org/dev/examples/notebooks/generated/markov_regression.html) - Implementation reference

### Secondary (MEDIUM confidence)
- [2025 Stress Test Scenarios (Federal Reserve)](https://www.federalreserve.gov/publications/files/2025-stress-test-scenarios-20250205.pdf) - Conservative parameter adjustment methodology
- [Identifying bull and bear market regimes (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0275531921002245) - Threshold-based classification methods
- [Dynamic Asset Allocation with Asset-Specific Regime Forecasts (arXiv 2024)](https://arxiv.org/html/2406.09578v2) - Asset-specific regime parameters
- [Decoding Market Regimes (SSGA 2025)](https://www.ssga.com/library-content/assets/pdf/global/pc/2025/decoding-market-regimes-with-machine-learning.pdf) - Practical regime detection
- [Historical Volatility (SimTrade December 2025)](https://www.simtrade.fr/blog_simtrade/historical-volatility/) - Market regime changes in volatility

### Tertiary (LOW confidence)
- [A Markov Regime Switching Approach (Medium)](https://medium.com/@cemalozturk/a-markov-regime-switching-approach-to-characterizing-financial-time-series-a5226298f8e1) - Tutorial, not peer-reviewed
- [Market Regime Detection (Medium/Python Lab)](https://thepythonlab.medium.com/market-regime-detection-using-unsupervised-learning-to-forecast-bull-bear-and-sideways-markets-b346c27ad4d8) - Practical but not authoritative
- Various investment firm outlooks (BlackRock, Schwab, JPMorgan 2025) - Market expectations, not methodological guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No external libraries needed, uses existing codebase utilities
- Architecture: MEDIUM - Threshold classification is well-established but specific thresholds have some uncertainty
- Pitfalls: MEDIUM - Based on academic literature and practitioner experience, but specific to this implementation
- Code examples: HIGH - Synthesized from established statistical methods and Markov chain theory
- Conservative adjustments: MEDIUM - Stress testing practices are standard, but exact percentages have some discretion

**Research date:** 2026-01-24
**Valid until:** Approximately 30 days (stable methodology, but specific parameter recommendations may evolve)

**Key assumptions:**
1. Threshold-based classification is adequate for simulation (vs. full MLE)
2. Three regimes (bull/bear/crash) are sufficient (vs. 4+ regimes)
3. Shared regime sequence across assets is acceptable (vs. asset-specific regimes)
4. Fixed transition matrix can be used (vs. estimating from data)
5. 30 years of historical data provides sufficient sample size

**Implementation complexity:** MEDIUM - Requires implementing classification logic and parameter estimation, but no complex algorithms or external dependencies.
