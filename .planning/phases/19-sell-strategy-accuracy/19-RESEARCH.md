# Phase 19: Sell Strategy Accuracy - Research

**Researched:** 2026-01-24
**Domain:** Financial modeling order of operations, BBD vs Sell strategy comparison
**Confidence:** HIGH

## Summary

This phase addresses accuracy issues in the Sell Assets strategy calculation compared to a reference implementation (PortfolioStrategySimulator.html). The core problems are:

1. **Order of operations**: eVelo applies returns BEFORE withdrawal; reference applies withdrawal BEFORE returns
2. **Missing dividend tax modeling**: Reference models dividend taxes differently for BBD (borrowed to pay) vs Sell (liquidated)
3. **Indirect return derivation**: eVelo derives growth rates from BBD percentiles rather than using identical raw returns

**Primary recommendation:** Fix order of operations to withdrawal→returns, add dividend tax modeling to Sell strategy, ensure both strategies use the same market return path for true apples-to-apples comparison.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | existing | Type safety | Already in project |
| simple-statistics | existing | percentile calculations | Already imported |

### Supporting
No new libraries required. All changes are to existing calculation logic.

## Architecture Patterns

### Recommended File Structure
```
src/calculations/
├── sell-strategy.ts    # MODIFY: Fix order of operations, add dividend taxes
├── estate.ts           # NO CHANGE: BBD comparison logic correct
└── types.ts            # POSSIBLY EXTEND: Add dividend tax config fields
```

### Pattern 1: Sell Strategy Simulation Step Order
**What:** Each simulation year processes steps in specific order
**When to use:** Any financial projection comparing strategies
**Reference Order (correct):**
```typescript
// Per-year simulation loop
for (year in horizon) {
  // 1. Dividend tax reduces portfolio (Sell pays from portfolio, BBD borrows)
  portfolioValue -= dividendTax;

  // 2. Withdrawal + capital gains tax reduces portfolio
  portfolioValue -= grossSaleAmount;  // withdrawal + taxes

  // 3. Market returns applied to reduced portfolio
  portfolioValue *= (1 + returnRate);
}
```

**eVelo Current Order (too favorable to Sell):**
```typescript
for (year in horizon) {
  // 1. Market returns applied to full portfolio (WRONG ORDER)
  portfolioValue *= (1 + growthRate);

  // 2. Withdrawal + capital gains tax reduces portfolio
  portfolioValue -= grossSaleAmount;

  // 3. No dividend tax modeling
}
```

### Pattern 2: Dividend Tax Differentiation
**What:** BBD and Sell handle dividend taxes differently
**When to use:** Comparing SBLOC-based vs liquidation-based strategies

| Strategy | Dividend Tax Source | Portfolio Impact |
|----------|---------------------|-----------------|
| BBD | Borrowed via SBLOC | Portfolio stays whole, loan increases |
| Sell | Liquidated from portfolio | Portfolio reduced annually |

### Anti-Patterns to Avoid
- **Deriving Sell returns from BBD percentiles:** Creates correlation artifacts. Use identical raw return sequence.
- **Applying returns before withdrawals:** Overstates Sell strategy performance.
- **Ignoring dividend taxes:** Understates tax drag on Sell strategy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Percentile calculation | Custom sorting/indexing | `simple-statistics.percentile` | Edge cases handled |
| Return sequence | Generate separately for Sell | Pass same returns array | Ensures fair comparison |

## Common Pitfalls

### Pitfall 1: Order of Operations
**What goes wrong:** Applying returns before withdrawals makes Sell strategy look better than reality
**Why it happens:** Natural intuition is "portfolio grows, then you withdraw"
**How to avoid:** Model it as: "You need money NOW, so you sell, THEN remaining portfolio grows"
**Warning signs:** Sell strategy terminal values too high relative to BBD

### Pitfall 2: Dividend Tax Omission
**What goes wrong:** Sell strategy doesn't account for dividend tax drag
**Why it happens:** Dividend taxes seem like a detail, but compound significantly
**How to avoid:** Add configurable dividend yield and tax rate to Sell calculation
**Warning signs:** Sell strategy appears more competitive than financial planning benchmarks

### Pitfall 3: Inconsistent Return Sequences
**What goes wrong:** BBD and Sell use different market return paths
**Why it happens:** eVelo derives Sell returns from BBD percentiles (already aggregated)
**How to avoid:** Pass raw iteration returns to both strategies
**Warning signs:** Can't trace why BBD and Sell diverge in specific scenarios

## Code Examples

### Current runSingleSellScenario (Wrong Order)
```typescript
// src/calculations/sell-strategy.ts lines 238-304
for (let year = 1; year <= timeHorizon; year++) {
  // WRONG: Returns applied FIRST
  portfolioValue *= (1 + growthRate);

  // THEN withdrawal (should be first)
  const grossSale = saleAmount + tax;
  portfolioValue -= grossSale;
}
```

### Corrected Order
```typescript
for (let year = 1; year <= timeHorizon; year++) {
  // 1. Optional: Dividend tax (if implemented)
  if (dividendTaxConfig) {
    const dividendTax = portfolioValue * dividendYield * dividendTaxRate;
    portfolioValue -= dividendTax;
    totalDividendTaxes += dividendTax;
  }

  // 2. Withdrawal FIRST (correct order)
  const grossSale = saleAmount + tax;
  portfolioValue -= grossSale;

  // 3. Returns applied to REDUCED portfolio
  portfolioValue *= (1 + growthRate);
}
```

### Identical Returns for Fair Comparison
```typescript
// Pass same return array to both strategies
function runComparison(
  config: ComparisonConfig,
  returns: number[], // Same for both
): { bbd: BBDResult; sell: SellResult } {
  const bbd = runBBDStrategy(config, returns);
  const sell = runSellStrategy(config, returns);
  return { bbd, sell };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Derive Sell from BBD percentiles | Pass identical returns | Now | Fair comparison |
| Returns before withdrawal | Withdrawal before returns | Now | Accurate Sell modeling |
| Ignore dividend taxes | Model dividend tax drag | Now | Realistic tax impact |

## Open Questions

1. **Dividend yield default**
   - What we know: S&P 500 dividend yield ~1.5-2%
   - What's unclear: Should this be configurable per asset?
   - Recommendation: Use 2% default, make configurable

2. **Qualified vs ordinary dividend taxes**
   - What we know: Qualified dividends taxed at capital gains rate; ordinary at income rate
   - What's unclear: User's marginal income tax rate
   - Recommendation: Use capital gains rate (23.8%) as simplification, add note in UI

3. **Integration with Monte Carlo**
   - What we know: Sell strategy currently post-processes BBD percentiles
   - What's unclear: Whether to run Sell inside Monte Carlo loop or as separate pass
   - Recommendation: Run Sell with same iteration returns for true comparison

## Sources

### Primary (HIGH confidence)
- Reference implementation (PortfolioStrategySimulator.html) - analyzed in conversation
- src/calculations/sell-strategy.ts - current implementation

### Secondary (MEDIUM confidence)
- CFA curriculum on portfolio simulation methodology
- IRC Section 1(h) on qualified dividend taxation

### Tertiary (LOW confidence)
- General financial planning literature on BBD strategy

## Metadata

**Confidence breakdown:**
- Order of operations: HIGH - verified against reference
- Dividend tax modeling: MEDIUM - based on reference, implementation details TBD
- Return path consistency: HIGH - clear improvement

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain)
