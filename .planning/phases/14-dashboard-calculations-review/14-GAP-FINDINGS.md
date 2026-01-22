# Phase 14: Gap Findings

**Created:** 2026-01-22
**Phase:** 14 - Dashboard Calculations Review
**Status:** In Progress

## Summary

This document catalogs all calculation discrepancies and issues discovered during the Phase 14 dashboard calculations review. Each gap is documented with evidence from code inspection, expected behavior, and proposed resolution.

**Total Gaps Found:** 2 (as of Task 1 completion)

---

## Calculation Gaps

### GAP-01: Percentile Scale Mismatch in monte-carlo.ts

**Requirement**: CALC-02 (Percentile Outcomes)
**Severity**: HIGH
**Component**: src/simulation/monte-carlo.ts

**Description**:
The monte-carlo.ts file calls the `percentile()` function with values on the 0-1 scale (0.1, 0.25, 0.5, 0.75, 0.9), but the `percentile()` function in statistics.ts expects values on the 0-100 scale (as documented in its JSDoc comment at line 71: "Percentile value (0-100, not 0-1)"). This causes incorrect percentile calculations throughout the simulation output.

**Evidence**:
Code inspection shows the scale mismatch:

**statistics.ts (line 87):**
```typescript
const index = (clampedP / 100) * (n - 1);
```
This divides by 100, confirming the function expects 0-100 scale input.

**monte-carlo.ts lines using 0-1 scale:**
- Line 223: `p10: loanBalancesByYear.map(yv => percentile(yv, 0.1))`
- Line 224: `p25: loanBalancesByYear.map(yv => percentile(yv, 0.25))`
- Line 225: `p50: loanBalancesByYear.map(yv => percentile(yv, 0.5))`
- Line 226: `p75: loanBalancesByYear.map(yv => percentile(yv, 0.75))`
- Line 227: `p90: loanBalancesByYear.map(yv => percentile(yv, 0.9))`
- Line 243: `const medianLoan = percentile(yv, 0.5);`
- Line 254: `const medianLoan = percentile(finalStates.map(s => s?.loanBalance ?? 0), 0.5);`
- Line 335: `median: percentile(values, 0.5),` (in calculateStatistics)
- Line 349: `p10: percentile(values, 0.1),` (in calculateYearlyPercentiles)
- Line 350: `p25: percentile(values, 0.25),`
- Line 351: `p50: percentile(values, 0.5),`
- Line 352: `p75: percentile(values, 0.75),`
- Line 353: `p90: percentile(values, 0.9),`

**Comparison with correct usage in metrics.ts (lines 151-155):**
```typescript
p10: percentile(valuesArray, 10),
p25: percentile(valuesArray, 25),
p50: percentile(valuesArray, 50),
p75: percentile(valuesArray, 75),
p90: percentile(valuesArray, 90),
```

**Expected Behavior**:
All percentile() calls should use 0-100 scale:
- `percentile(values, 10)` for 10th percentile
- `percentile(values, 25)` for 25th percentile
- `percentile(values, 50)` for 50th percentile (median)
- `percentile(values, 75)` for 75th percentile
- `percentile(values, 90)` for 90th percentile

**Impact**:
This bug causes all percentile calculations in monte-carlo.ts to return extremely low values (close to the minimum), since:
- Requesting 0.1 percentile actually requests the 0.1% percentile (nearly the minimum)
- Requesting 0.5 percentile actually requests the 0.5% percentile (still very low)
- Requesting 0.9 percentile actually requests the 0.9% percentile (still in the bottom 1%)

This affects:
1. `sblocTrajectory.loanBalance` percentiles (P10-P90)
2. `sblocTrajectory.cumulativeInterest` median calculation
3. `estateAnalysis` median loan calculation
4. `statistics.median` field
5. `yearlyPercentiles` for all years (P10-P90)

**Proposed Resolution**:
Change all percentile() calls in monte-carlo.ts to use 0-100 scale values by multiplying by 100:
- `percentile(yv, 0.1)` → `percentile(yv, 10)`
- `percentile(yv, 0.25)` → `percentile(yv, 25)`
- `percentile(yv, 0.5)` → `percentile(yv, 50)`
- `percentile(yv, 0.75)` → `percentile(yv, 75)`
- `percentile(yv, 0.9)` → `percentile(yv, 90)`

---

### GAP-02: Success Rate Definition Inconsistency

**Requirement**: CALC-01 (Success Rate)
**Severity**: MEDIUM
**Component**: src/simulation/monte-carlo.ts (line 331) vs src/calculations/metrics.ts (line 188)

**Description**:
The success rate calculation uses different comparison operators in different parts of the codebase. The monte-carlo.ts uses `>=` (greater than or equal), while metrics.ts uses `>` (strictly greater than). This creates an inconsistency in how "success" is defined.

**Evidence**:

**monte-carlo.ts calculateStatistics() function (line 331):**
```typescript
const successCount = values.filter(v => v >= initialValue).length;
```
Uses `>=` - counts terminal values that are **greater than or equal to** initial value.

**metrics.ts calculateSuccessRate() function (line 188):**
```typescript
if (terminalValues[i] > initialValue) {
  successCount++;
}
```
Uses `>` - counts terminal values that are **strictly greater than** initial value.

**Expected Behavior**:
Success rate should have a consistent definition across the codebase. Based on the JSDoc comment in metrics.ts (line 162):
> "Success is defined as ending above the initial portfolio value."

And the example (line 174):
> "// 4 out of 5 iterations ended above initial"

The "above" language suggests `>` (strictly greater) is the intended behavior, as breaking even (exactly equal to initial) would not typically be considered "success" in an investment context.

**Impact**:
This discrepancy has minimal practical impact because:
1. The probability of terminal value being **exactly** equal to initial value is nearly zero in Monte Carlo simulation with continuous values
2. The difference would only matter in edge cases

However, it creates code inconsistency and could cause confusion during code review or debugging.

**Proposed Resolution**:
Standardize on `>` (strictly greater than) throughout the codebase:
- Change monte-carlo.ts line 331 from `v >= initialValue` to `v > initialValue`
- This aligns with the "above initial value" language in documentation
- This matches the more explicit implementation in metrics.ts

**Alternative Resolution**:
If the team prefers to count break-even as success:
- Change metrics.ts line 188 from `>` to `>=`
- Update JSDoc to say "at or above" instead of "above"
- This would be more conservative (higher success rate)

---

## Next Steps

1. Continue Task 2 to verify remaining CALC requirements (CALC-03 through CALC-07)
2. Document any additional gaps found
3. Prioritize gaps by severity and impact
4. Create follow-up phase/plans for gap resolution
