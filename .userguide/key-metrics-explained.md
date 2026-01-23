# Key Metrics Explained

This document explains how the main dashboard metrics are calculated and what they mean.

## Overview

The results dashboard displays three primary metric cards:
1. **Strategy Success** - Probability the BBD strategy preserves/grows principal
2. **Portfolio Growth** - Compound annual growth rate (CAGR)
3. **Leverage Safety** - Probability of experiencing a margin call

## Strategy Success (BBD Success Rate)

**What it measures:** The percentage of simulation iterations where the terminal portfolio value exceeds the initial portfolio value.

**Calculation:**
```
Success Rate = (iterations where terminal > initial) / total iterations × 100
```

**Source:** `src/calculations/metrics.ts` → `calculateSuccessRate()`

**Key points:**
- Evaluated only at the END of the simulation (final year)
- Binary outcome per iteration: success (ended higher) or failure (ended lower)
- Does NOT account for what happened during the simulation, only the final result
- A portfolio that crashed and recovered still counts as success if it ends above initial

**Example:** With 10,000 iterations and initial value of $3.5M:
- 8,270 iterations end above $3.5M → 82.7% success rate
- 1,730 iterations end at or below $3.5M → 17.3% failure rate

---

## Margin Call Probability

**What it measures:** The percentage of simulation iterations that experienced at least one margin call at ANY point during the simulation period.

**Calculation:**
```
Margin Call Probability = (iterations with any margin call) / total iterations × 100
```

**Source:** `src/calculations/margin-call-probability.ts` → `calculateMarginCallRisk()`

**When margin calls occur:** A margin call is triggered when:
```
LTV (Loan-to-Value) = Loan Balance / Portfolio Value ≥ Max LTV (typically 65%)
```

**Key points:**
- Evaluated throughout the ENTIRE simulation (all years)
- Cumulative metric: once a margin call occurs, that iteration is counted
- The displayed percentage is the cumulative probability at the final year
- A margin call doesn't mean failure - the portfolio may recover

**Risk zones:**
- **Safe:** LTV < 50% (maintenance margin)
- **Warning:** 50% ≤ LTV < 65%
- **Margin Call:** LTV ≥ 65% (forced liquidation triggered)

---

## Why These Metrics Don't Sum to 100%

These are **independent metrics** measuring different dimensions of risk:

| Scenario | Margin Call? | Strategy Success? |
|----------|--------------|-------------------|
| Portfolio dips year 3, recovers by year 15 | Yes | Yes |
| Steady growth, never over-leveraged | No | Yes |
| Crashes year 2, never recovers | Yes | No |
| Slow decline, never hits LTV threshold | No | No |

**Example from dashboard:**
- Strategy Success: 82.7%
- Margin Call Probability: 32.7%
- Sum: 115.4% (this is expected and correct)

Many iterations can both succeed AND have experienced a margin call (portfolio recovered after the margin event).

**What WOULD sum to 100%:**
- Success Rate + Failure Rate = 100%
- Margin Call Probability + No Margin Call Probability = 100%

---

## Supporting Metrics

### Strategy Success Card
- **vs Sell Assets:** Difference between BBD success rate and sell strategy success rate
- **Sell Success Rate:** Success rate if user sold assets instead of borrowing
- **Median Utilization:** Median SBLOC utilization across all iterations
- **Years Above 70%:** Count of years where utilization exceeded 70%

### Leverage Safety Card
- **Peak Utilization (P90):** 90th percentile of maximum LTV reached
- **Safety Buffer (P10):** 10th percentile buffer below margin call threshold
- **Median Utilization:** Median LTV across iterations
- **Most Dangerous Year:** Year with highest margin call probability

---

## Data Flow

```
Monte Carlo Simulation (10,000 iterations)
    ↓
Each iteration produces:
  - Terminal portfolio value
  - Array of margin call events (if any)
    ↓
Aggregation:
  - Terminal values → Success Rate calculation
  - Margin events → Margin Call Probability calculation
    ↓
Dashboard Display
```

## Related Files

| File | Purpose |
|------|---------|
| `src/calculations/metrics.ts` | Success rate, CAGR, percentiles |
| `src/calculations/margin-call-probability.ts` | Margin call probability |
| `src/sbloc/margin-call.ts` | Margin call detection logic |
| `src/sbloc/ltv.ts` | LTV calculations and thresholds |
| `src/simulation/monte-carlo.ts` | Simulation runner |
| `src/components/ui/results-dashboard.ts` | Display logic |
