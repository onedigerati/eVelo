# Debug Session: Simulation Charts Anomalies

**Status:** RESOLVED
**Started:** 2026-01-25
**Resolved:** 2026-01-25

## Issue Summary

Monte Carlo simulation for BBD (Buy-Borrow-Die) strategy producing suspicious results:
- **62% of iterations end with negative net worth**
- **Median final gross portfolio: $0** (completely depleted)
- **-100% CAGR** (mathematically invalid due to negative terminal value)
- **83% cumulative margin call probability**

## Root Causes Identified & Fixed

### 1. Dashboard Double-Subtraction (FIXED)
**Location:** `src/components/ui/results-dashboard.ts`

The simulation engine was correctly outputting NET WORTH (portfolio - loan) in both `terminalValues` and `yearlyPercentiles`. But the dashboard was subtracting loan balance AGAIN in multiple methods.

**Fix:** Updated all methods to recognize that values are already net worth and not double-subtract.

### 2. Margin Call Threshold Bug (FIXED)
**Location:** `src/simulation/monte-carlo.ts:189`

Margin calls were triggering at 50% LTV instead of 65%, causing excessive liquidations.

**Fix:** Changed `maxLTV: config.sbloc.maintenanceMargin` to `maxLTV: config.sbloc.targetLTV`

### 3. Liquidation Target Too Aggressive (FIXED)
**Location:** `src/sbloc/liquidation.ts:104`

When margin calls triggered, liquidation was bringing LTV down to 40% instead of 52%.

**Fix:** Changed `config.maintenanceMargin * multiplier` to `config.maxLTV * multiplier`

### 4. Degenerate Regime Parameters (FIXED - ROOT CAUSE)
**Location:** `src/simulation/regime-calibration.ts`

**The primary issue:** Assets with poor/volatile historical data (QCOM, NVDA) were producing degenerate regime parameters during calibration:

```
QCOM (before fix):
  Bull:  mean=-34.0%, stddev=92.6%  ← NEGATIVE mean in bull market!
  Bear:  mean=-13.4%, stddev=13.3%
  Crash: mean=-41.2%, stddev=1.0%
```

The percentile-based regime classification (top 70% = bull) doesn't work for assets with consistently poor returns. QCOM's "best" years were still negative on average.

**Fix:** Added validation that detects degenerate parameters and falls back to sensible defaults:
- Negative bull mean → error, triggers fallback
- Extreme volatility (>80% stddev) → error, triggers fallback
- Inverted regime hierarchy (bull ≤ bear) → error
- Insufficient spread between regimes → warning

## Results After Fix

| Metric | Before (Broken QCOM) | After (Fallback) |
|--------|---------------------|------------------|
| Median Net Worth | -$57,967 | $2,846,245 |
| Success Rate | 20.2% | 49.2% |
| Failed Iterations | 61.9% | 31.2% |
| Median Portfolio Return | 73% | 221% |
| Margin Calls (0) | 17.4% | 45.4% |

## Debug Infrastructure Added

### Debug Panel
**Location:** Bottom of results dashboard, collapsible

Features:
- Copy to clipboard button
- Configuration display
- Raw statistics and terminal values analysis
- Yearly percentiles
- SBLOC trajectory with loan balance percentiles
- Margin call statistics by year
- Estate analysis
- Portfolio returns (P10/median/mean/P90)
- Failure analysis (counts, timing, returns by outcome)
- **Regime parameters with validation status**

### Regime Parameter Validation
**Location:** `src/simulation/regime-calibration.ts`

New exports:
- `validateRegimeParams()` - Checks for degenerate parameters
- `calibrateRegimeModelWithValidation()` - Calibrates with validation and fallback
- `RegimeValidationResult` - Validation result interface
- `CalibratedRegimeResult` - Extended result with validation info

Validation checks:
1. Bull mean must be positive
2. Regime hierarchy: bull > bear > crash
3. Volatility must be < 80%
4. Sufficient spread between regimes (> 5%)

## Files Modified

```
src/components/ui/results-dashboard.ts  - Debug panel + double-subtraction fixes + regime display
src/simulation/monte-carlo.ts           - Margin call threshold + diagnostics + validation integration
src/simulation/types.ts                 - SBLOCDebugStats interface with regime params
src/simulation/regime-calibration.ts    - Validation functions and fallback logic
src/sbloc/liquidation.ts               - Liquidation target fix
```

## Key Learnings

1. **Percentile-based regime classification fails for consistently poor assets** - An asset that loses money 80% of the time will still have 70% of returns classified as "bull" even if those returns are negative.

2. **Validation is essential for calibrated parameters** - Always validate derived parameters before using them in simulation.

3. **Debug infrastructure pays off** - The debug panel made it easy to identify the exact issue (QCOM's -34% bull mean).

4. **Configuration matters** - Even with correct simulation logic, aggressive configurations (high withdrawal rate + high interest) will produce high failure rates. This is expected behavior, not a bug.
