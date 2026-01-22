# Phase 12: Monthly Withdrawal Simulation - Research

**Researched:** 2026-01-22
**Domain:** SBLOC simulation engine, monthly time step granularity
**Confidence:** HIGH

## Summary

The current SBLOC engine processes at annual granularity (1 step per year), while the UI has a `monthlyWithdrawal` toggle that is not yet wired to the simulation. This phase requires refactoring the SBLOC engine and Monte Carlo integration to support monthly time steps (12 steps per year) when enabled.

The codebase is well-architected for this change:
- `stepSBLOC()` already supports monthly compounding via `compoundingFrequency: 'monthly'`
- `SBLOCSimConfig` already has `monthlyWithdrawal: boolean` field
- The step function is pure and time-step agnostic
- Margin call detection recalculates LTV (no stale state issues)

**Primary recommendation:** Create a new `stepSBLOCMonthly()` function that wraps `stepSBLOC()` for 12 monthly substeps per year, maintaining backward compatibility with annual mode through a unified interface.

## Standard Stack

The existing stack is sufficient for this phase - no new libraries needed.

### Core (Already in Codebase)
| Module | Location | Purpose | Why Standard |
|--------|----------|---------|--------------|
| stepSBLOC | src/sbloc/engine.ts | Annual step function | Already supports monthly compounding math |
| runMonteCarlo | src/simulation/monte-carlo.ts | Main simulation loop | Needs monthly step integration |
| SBLOCSimConfig | src/simulation/types.ts | Config with monthlyWithdrawal | Already has the flag |
| seedrandom | package.json | Reproducible RNG | Already used for seeded simulations |

### Supporting (Already in Codebase)
| Module | Location | Purpose | When to Use |
|--------|----------|---------|-------------|
| accrueInterest | src/sbloc/interest.ts | Interest calculation | Has monthly compounding support |
| detectMarginCall | src/sbloc/margin-call.ts | Margin call detection | Recalculates LTV for accuracy |
| executeForcedLiquidation | src/sbloc/liquidation.ts | Handle margin calls | Works at any time step |

### No Additional Libraries Needed
The mathematical formulas for monthly compounding are simple:
- Monthly interest rate: `annualRate / 12`
- Monthly withdrawal: `annualWithdrawal / 12`
- Compound factor: `(1 + monthlyRate)^12` for effective annual rate

## Architecture Patterns

### Recommended Approach: Monthly Step Wrapper

Create a new function that performs 12 monthly substeps per "year" of simulation:

```typescript
// Pattern: Monthly step wrapper
export interface MonthlyStepConfig extends SBLOCConfig {
  monthlyWithdrawal: boolean;
}

export function stepSBLOCYear(
  state: SBLOCState,
  config: MonthlyStepConfig,
  monthlyReturns: number[], // 12 returns OR single annual return expanded
  currentYear: number
): SBLOCYearResult {
  if (!config.monthlyWithdrawal) {
    // Backward compatible: annual step
    return stepSBLOC(state, config, monthlyReturns[0], currentYear);
  }

  // Monthly granularity: 12 substeps
  let currentState = state;
  let totalInterest = 0;
  let totalWithdrawal = 0;
  let marginCallTriggered = false;
  let liquidationEvent: LiquidationEvent | null = null;
  let portfolioFailed = false;

  for (let month = 0; month < 12; month++) {
    const monthConfig = {
      ...config,
      annualWithdrawal: config.annualWithdrawal / 12,
      compoundingFrequency: 'monthly' as const,
    };

    const result = stepSBLOCMonth(currentState, monthConfig, monthlyReturns[month], currentYear, month);
    currentState = result.newState;
    totalInterest += result.interestCharged;
    totalWithdrawal += result.withdrawalMade;

    if (result.marginCallTriggered) {
      marginCallTriggered = true;
      liquidationEvent = result.liquidationEvent;
    }
    if (result.portfolioFailed) {
      portfolioFailed = true;
      break;
    }
  }

  return {
    newState: currentState,
    marginCallTriggered,
    liquidationEvent,
    portfolioFailed,
    interestCharged: totalInterest,
    withdrawalMade: totalWithdrawal,
  };
}
```

### Monthly Return Generation

When `monthlyWithdrawal` is enabled, annual returns need to be distributed to monthly:

```typescript
// Option 1: Simple distribution (equal monthly returns)
function annualToMonthlyReturns(annualReturn: number): number[] {
  const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
  return Array(12).fill(monthlyReturn);
}

// Option 2: Preserve volatility within year (recommended for realism)
function distributeAnnualReturn(annualReturn: number, rng: () => number): number[] {
  // Generate 12 monthly returns that compound to approximately the annual return
  // with realistic monthly volatility (annual stddev / sqrt(12))
  const monthlyMean = Math.pow(1 + annualReturn, 1/12) - 1;
  const monthlyVol = 0.15 / Math.sqrt(12); // ~15% annual vol -> ~4.3% monthly

  const rawReturns: number[] = [];
  for (let i = 0; i < 12; i++) {
    // Use normal distribution around monthly mean
    rawReturns.push(monthlyMean + normalRandom(0, monthlyVol, rng));
  }

  // Adjust to hit exact annual return (optional: preserves determinism)
  const achieved = rawReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;
  const adjustment = Math.pow((1 + annualReturn) / (1 + achieved), 1/12);
  return rawReturns.map(r => (1 + r) * adjustment - 1);
}
```

### Anti-Patterns to Avoid

- **Duplicating SBLOC logic:** Don't create a separate monthly engine - wrap the existing step function
- **Modifying return generation:** Keep annual return generation, distribute to monthly in SBLOC integration
- **Storing monthly state:** Only track year-end states in trajectories (monthly is internal detail)
- **Breaking annual mode:** Ensure `monthlyWithdrawal: false` produces identical results to current behavior

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monthly interest calculation | Custom formula | Existing `accrueInterest` with monthly frequency | Already handles compounding correctly |
| Margin call at monthly intervals | New detection logic | Existing `detectMarginCall` | Recalculates LTV, works at any granularity |
| Liquidation handling | Monthly-specific liquidation | Existing `executeForcedLiquidation` | Time-step agnostic |
| RNG for monthly distribution | New random generator | Existing `seedrandom` | Reproducibility already solved |

**Key insight:** The existing SBLOC engine components are designed to be time-step agnostic. The `stepSBLOC` function already supports monthly compounding. The refactor is about orchestration (12 calls per year), not reimplementing financial math.

## Common Pitfalls

### Pitfall 1: Performance Regression with 12x Time Steps
**What goes wrong:** 30-year simulation becomes 360 steps instead of 30, causing 12x slowdown
**Why it happens:** Naive implementation calls stepSBLOC 12 times per year
**How to avoid:**
- Use simple return distribution (equal monthly = negligible overhead)
- Batch monthly steps without yielding to event loop
- Only aggregate year-end results for trajectory tracking
- Consider: most overhead is in return generation, not SBLOC stepping
**Warning signs:** Simulation time increases proportionally to 12x; progress callback becomes choppy

### Pitfall 2: Inconsistent Results Between Modes
**What goes wrong:** Annual mode produces different results than monthly mode with same inputs
**Why it happens:** Compounding frequency affects final values; interest accrued differs
**How to avoid:**
- Accept that monthly compounding will have ~0.3% higher effective rate
- Document expected differences in results
- Validate with known test cases (e.g., $100k at 7.4% for 10 years)
**Warning signs:** Unit tests fail when comparing annual vs monthly; users report discrepancies

### Pitfall 3: Off-by-One in Year Counting
**What goes wrong:** Withdrawals start in wrong month, yearsSinceStart increments incorrectly
**Why it happens:** Mixing 0-indexed and 1-indexed year/month counting
**How to avoid:**
- Increment yearsSinceStart only at year boundary (not monthly)
- Keep startYear semantics unchanged (annual basis)
- Monthly counter is internal detail, reset each year
**Warning signs:** First withdrawal happens in wrong period; loan balance trajectory looks wrong

### Pitfall 4: Margin Call Detection Timing
**What goes wrong:** Margin call probability changes dramatically between annual and monthly
**Why it happens:** Monthly detection catches margin calls earlier in the year
**How to avoid:**
- This is expected behavior, not a bug
- Document that monthly mode provides more realistic margin call timing
- Cumulative probability should be similar; per-period probability will differ
**Warning signs:** Users confused by different margin call statistics

### Pitfall 5: State Mutation in Monthly Loop
**What goes wrong:** State gets corrupted during 12-step loop
**Why it happens:** Forgetting that stepSBLOC returns new state, not mutating input
**How to avoid:**
- Always assign: `currentState = result.newState`
- Don't modify state properties directly
- Use spread operator if creating intermediate states
**Warning signs:** Tests show state bleeding between iterations

## Code Examples

### Example 1: Monthly Step Integration in Monte Carlo

```typescript
// Source: Pattern based on existing monte-carlo.ts structure
// Location: src/simulation/monte-carlo.ts

// In the year loop, replace direct stepSBLOC call:
for (let year = 0; year < timeHorizon; year++) {
  // ... existing return calculation ...

  // SBLOC simulation step (if enabled)
  if (config.sbloc && sblocStates && marginCallYears) {
    const sblocConfig: SBLOCEngineConfig = {
      // ... existing config building ...
      compoundingFrequency: config.sbloc.monthlyWithdrawal ? 'monthly' : 'annual',
    };

    if (config.sbloc.monthlyWithdrawal) {
      // Monthly granularity: 12 substeps
      const monthlyReturns = annualToMonthlyReturns(portfolioReturn);
      const yearResult = stepSBLOCYear(prevState, sblocConfig, monthlyReturns, year);
      // ... rest of processing ...
    } else {
      // Annual granularity: existing behavior
      const yearResult = stepSBLOC(prevState, sblocConfig, portfolioReturn, year);
      // ... rest of processing ...
    }
  }
}
```

### Example 2: Annual-to-Monthly Return Distribution

```typescript
// Source: Financial math standard practice
// Location: src/simulation/monte-carlo.ts or new src/sbloc/monthly.ts

/**
 * Convert annual return to 12 equal monthly returns that compound to same total
 *
 * Formula: monthlyReturn = (1 + annualReturn)^(1/12) - 1
 * Verification: (1 + monthlyReturn)^12 = 1 + annualReturn
 */
export function annualToMonthlyReturns(annualReturn: number): number[] {
  const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
  return Array(12).fill(monthlyReturn);
}

// Example:
// 10% annual return -> 0.797% monthly
// Verification: (1.00797)^12 = 1.0999... ~= 1.10
```

### Example 3: Monthly Step Function

```typescript
// Source: Pattern based on existing stepSBLOC
// Location: src/sbloc/engine.ts

/**
 * Execute one month of SBLOC simulation
 *
 * This is a thin wrapper that adjusts parameters for monthly granularity:
 * - Uses 1/12 of annual withdrawal
 * - Uses monthly interest rate
 * - Checks margin call at month end
 */
export function stepSBLOCMonth(
  state: SBLOCState,
  config: SBLOCConfig,
  monthlyReturn: number,
  currentYear: number,
  currentMonth: number
): SBLOCYearResult {
  // Adjust config for monthly granularity
  const monthlyConfig: SBLOCConfig = {
    ...config,
    annualWithdrawal: config.annualWithdrawal / 12,
    compoundingFrequency: 'monthly',
  };

  // Temporarily adjust state for monthly calculation
  // (don't increment yearsSinceStart until year boundary)
  const monthlyState: SBLOCState = {
    ...state,
    // Keep yearsSinceStart unchanged during months
  };

  // Use existing step function with monthly parameters
  // Note: Interest will be applied as monthly rate
  const result = stepSBLOCInternal(monthlyState, monthlyConfig, monthlyReturn, currentYear);

  // Only increment yearsSinceStart at month 11 (end of year)
  if (currentMonth === 11) {
    result.newState.yearsSinceStart = state.yearsSinceStart + 1;
  } else {
    result.newState.yearsSinceStart = state.yearsSinceStart;
  }

  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Annual-only SBLOC simulation | Monthly granularity supported | Phase 12 | More accurate interest accrual, earlier margin call detection |
| Single compounding mode | Configurable annual/monthly | Phase 04 (existing) | Already in codebase |

**Current in codebase:**
- `compoundingFrequency: 'monthly'` - already supported in types and interest calculation
- `monthlyWithdrawal: boolean` - already in SBLOCSimConfig
- Step function is already time-step agnostic

**Not yet implemented:**
- Monte Carlo loop that uses monthly steps when flag is set
- Year-aggregated results from monthly substeps
- Performance optimization for 12x time steps

## Performance Considerations

### Expected Impact

With 10,000 iterations and 30-year horizon:
- **Annual mode:** 30 SBLOC steps per iteration = 300,000 total steps
- **Monthly mode:** 360 SBLOC steps per iteration = 3,600,000 total steps

However, SBLOC stepping is lightweight (pure arithmetic, no allocation):
- Each `stepSBLOC` call: ~0.1-0.5 microseconds
- Total monthly overhead: ~0.3 seconds for 10K iterations
- This is negligible compared to return generation (~2-5 seconds)

### Optimization Strategies

1. **No yielding during monthly loop:** Keep all 12 months in same synchronous batch
2. **Reuse objects:** Don't create new config objects each month; modify in place
3. **Only track year-end state:** Don't store 12x more state data
4. **Progress granularity unchanged:** Report progress at iteration level, not month level

### Benchmark Targets

| Metric | Annual Mode | Monthly Mode | Acceptable Overhead |
|--------|-------------|--------------|---------------------|
| 10K iterations, 30 years | ~3 seconds | ~3.5 seconds | <20% increase |
| Memory usage | Baseline | Baseline | No increase (year-end only) |
| Progress responsiveness | Smooth | Smooth | No degradation |

## UI/Results Display Changes

### Charts Stay Annual

All existing charts display at annual granularity:
- Probability cone: yearly percentiles
- SBLOC balance chart: yearly loan balance
- Margin call risk: per-year probability

**No changes needed** - aggregate monthly results to year-end values.

### Statistics Changes

Monthly mode affects some statistics:
- **Effective interest rate:** Higher due to monthly compounding (~7.66% effective vs 7.4% nominal)
- **Margin call timing:** May trigger earlier in the year
- **Cumulative withdrawals:** Same annual total, distributed monthly

### Considerations for Future Phases

If monthly granularity becomes needed for charts (e.g., showing monthly balance):
- Would require storing 12x more trajectory data
- Out of scope for Phase 12
- Current approach aggregates to year-end only

## Backward Compatibility

### Validation Strategy

1. Run simulation with `monthlyWithdrawal: false`
2. Compare results to current implementation
3. Results should be **identical** (same random seed = same terminal values)

### Breaking Changes

None expected. The `monthlyWithdrawal` flag defaults to behavior that matches current output.

### Test Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| monthlyWithdrawal: false | Identical to current implementation |
| monthlyWithdrawal: true, no SBLOC | No change (SBLOC flag only affects SBLOC) |
| monthlyWithdrawal: true, with SBLOC | Higher effective interest, earlier potential margin calls |

## Open Questions

1. **Monthly volatility distribution**
   - What we know: Can use equal monthly returns or add within-year volatility
   - What's unclear: Does adding monthly volatility change margin call probability significantly?
   - Recommendation: Start with equal monthly returns (simpler, deterministic), add volatility later if needed

2. **Withdrawal timing within month**
   - What we know: Current annual model withdraws at year start then accrues interest
   - What's unclear: Should monthly withdrawal happen at month start or end?
   - Recommendation: Month start (matches current pattern, withdrawal added before interest)

3. **Fractional year handling**
   - What we know: timeHorizon is integer years
   - What's unclear: Should 15.5 years be supported?
   - Recommendation: Out of scope for Phase 12; keep integer years

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/sbloc/engine.ts` - stepSBLOC implementation
- Codebase analysis: `src/sbloc/types.ts` - CompoundingFrequency type
- Codebase analysis: `src/simulation/monte-carlo.ts` - Monte Carlo integration
- Codebase analysis: `src/simulation/types.ts` - SBLOCSimConfig with monthlyWithdrawal

### Secondary (MEDIUM confidence)
- [Fidelity SBLOC Documentation](https://www.fidelity.com/lending/securities-backed-line-of-credit) - Monthly interest-only payment structure
- [FINRA SBLOC Guidance](https://www.finra.org/investors/insights/securities-backed-lines-credit) - Margin call mechanics
- [Web Worker Performance](https://www.jameslmilner.com/posts/web-worker-performance/) - Batching strategies for workers

### Tertiary (LOW confidence)
- General compound interest calculators - Verified formula A = P(1 + r/n)^(nt)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, existing code supports the pattern
- Architecture: HIGH - clear wrapper pattern around existing stepSBLOC
- Pitfalls: HIGH - based on direct codebase analysis and state patterns
- Performance: MEDIUM - estimates based on operation complexity, needs validation

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (stable domain, 30 days)
