# Phase 11: Results Dashboard Gap Closure Plan

**Created:** 2026-01-20
**Purpose:** Close gaps between current implementation and reference application

## Current State

Plans 11-01 through 11-03 are complete. Plan 11-04 (SBLOC charts) has chart components in template but needs verification.

**Current dashboard has:**
- Probability Cone Chart
- Terminal Value Histogram
- 8 Summary Statistics
- Portfolio Donut Chart
- Correlation Heatmap
- Margin Call Risk Chart (conditional)
- SBLOC Balance Chart (conditional)
- BBD Comparison Chart (conditional)

## Gap Analysis Summary

The reference application has a significantly richer reporting experience with:
1. Executive summary / key metrics hero section
2. Percentile spectrum visualizations
3. Detailed strategy comparison analysis
4. Multiple performance tables
5. Actionable recommendations
6. Year-by-year breakdown

## Proposed Plans

### Plan 11-05: Executive Summary Banner
**Priority:** HIGH
**Effort:** Medium

Add the "at-a-glance" hero section at top of results.

**Components:**
1. **Key Metrics Banner** - 3 hero cards:
   - Strategy Success: BBD success rate, vs Sell comparison, Years Above 70%
   - Portfolio Growth: Implied CAGR, Starting→Terminal value, vs Sell Assets
   - Leverage Safety: Margin call probability, Peak Utilization, Safety Buffer

2. **Parameter Summary** - Recap of simulation inputs:
   - Starting Portfolio, Time Horizon
   - Annual Withdrawal, Withdrawal Growth
   - SBLOC Interest Rate, Max Borrowing, Maintenance Margin
   - Simulations Run

**Files:**
- `src/components/ui/key-metrics-banner.ts` (new)
- `src/components/ui/param-summary.ts` (new)
- `src/components/ui/results-dashboard.ts` (modify)

---

### Plan 11-06: Percentile Spectrum Visualizations
**Priority:** HIGH
**Effort:** Medium

Add the visual P10/P50/P90 spectrum displays.

**Components:**
1. **Terminal Net Worth Spectrum** - Horizontal bar with:
   - P10 (worst case) on left in red
   - P50 (median) in center in teal
   - P90 (best case) on right in green
   - Gradient background showing range

2. **Total Debt Spectrum** - Similar visualization for LOC balance:
   - Actual LOC Balance percentiles
   - Explanation text about what affects variance

**Files:**
- `src/components/ui/percentile-spectrum.ts` (new, reusable)
- `src/components/ui/results-dashboard.ts` (modify)

---

### Plan 11-07: Strategy Analysis Section
**Priority:** HIGH
**Effort:** Large

Add comprehensive BBD vs Sell strategy comparison.

**Components:**
1. **Strategy Verdict Banner**:
   - "BBD Recommended" or "Sell Assets Recommended" verdict
   - Success rate dial visualization
   - Rationale summary

2. **Side-by-Side Comparison Cards**:
   - BBD column: Terminal Net Worth, Success Rate, Lifetime Cost (interest), Dividend Taxes, Primary Risk
   - Sell Assets column: Terminal Net Worth, Success Rate, Lifetime Cost (taxes), Primary Risk

3. **Wealth Differential Row**:
   - BBD vs Sell difference
   - Tax Savings amount
   - Estate Value (BBD)

4. **Why Strategy Performs Well**:
   - Insight quote
   - Tax Deferral Benefit card
   - Compounding Advantage card

**Files:**
- `src/components/ui/strategy-analysis.ts` (new)
- `src/components/ui/strategy-card.ts` (new)
- `src/components/ui/results-dashboard.ts` (modify)

**Data Requirements:**
- Sell Assets simulation parallel run OR
- Simplified sell calculation from BBD data

---

### Plan 11-08: Salary Equivalent Section
**Priority:** MEDIUM
**Effort:** Small

Enhance salary equivalent from simple stat to prominent section.

**Components:**
1. **Salary Equivalent Banner**:
   - "Your Annual Withdrawal Tax-Free" header
   - Large withdrawal amount display
   - "Is equivalent to earning a taxable salary of:" with amount
   - Tax savings explanation text

**Files:**
- `src/components/ui/salary-equivalent-section.ts` (new)
- `src/components/ui/results-dashboard.ts` (modify)

---

### Plan 11-09: Performance Tables
**Priority:** MEDIUM
**Effort:** Large

Add detailed tabular data displays.

**Components:**
1. **Performance Summary Table**:
   - Rows: TWRR (nominal/real), Portfolio End Balance (nominal/real), Annual Mean Return, Annualized Volatility
   - Columns: P10, P25, P50, P75, P90
   - Color-coded values (green for good, red for concerning)

2. **Expected Annual Return Table**:
   - Rows: P10, P25, P50, P75, P90
   - Columns: 1 Year, 3 Years, 5 Years, 10 Years, 15 Years
   - Shows CAGR at different time horizons

3. **Annual Return Probabilities Table**:
   - Rows: Return thresholds (>=0%, >=2.5%, >=5%, >=7.5%, >=10%, >=12.5%)
   - Columns: Time horizons
   - Shows probability of achieving each threshold

**Files:**
- `src/components/ui/performance-table.ts` (new)
- `src/components/ui/return-probability-table.ts` (new)
- `src/components/ui/results-dashboard.ts` (modify)

**Calculation Requirements:**
- Extend simulation output OR
- Post-process from existing percentile data

---

### Plan 11-10: Year-by-Year Analysis Table
**Priority:** MEDIUM
**Effort:** Medium

Add detailed year-by-year breakdown.

**Components:**
1. **Year-by-Year Percentile Table**:
   - Columns: Year, Annual Withdrawal, Cumulative Withdrawal, P10/P25/P50/P75/P90 Net Worth
   - Color-coded values
   - Scrollable for long time horizons

**Files:**
- `src/components/ui/yearly-analysis-table.ts` (new)
- `src/components/ui/results-dashboard.ts` (modify)

**Data Source:**
- Already available in `yearlyPercentiles` from simulation output

---

### Plan 11-11: Enhanced Strategy Charts
**Priority:** MEDIUM
**Effort:** Large

Add BBD vs Sell comparison charts.

**Components:**
1. **Net Worth Over Time (BBD vs Sell)** - Line chart:
   - Two lines showing median net worth trajectory
   - Shows when BBD pulls ahead or falls behind

2. **Cumulative Costs Chart** - Area chart:
   - Sell Assets: Cumulative capital gains taxes
   - BBD: Cumulative interest paid
   - Shows the cost trade-off over time

3. **Terminal Distribution Comparison** - Grouped bar chart:
   - Side-by-side bars at P10, P25, P50, P75, P90
   - BBD vs Sell for each percentile

4. **SBLOC Usage % Chart** - Line chart with percentile bands:
   - Shows utilization percentage over time
   - P10/P25/P50/P75/P90 bands
   - Max borrowing limit reference line

**Files:**
- `src/charts/comparison-line-chart.ts` (new)
- `src/charts/cumulative-costs-chart.ts` (new)
- `src/charts/grouped-bar-chart.ts` (new)
- `src/charts/sbloc-utilization-chart.ts` (new)
- `src/components/ui/results-dashboard.ts` (modify)

**Data Requirements:**
- Sell Assets trajectory data (calculated or simulated)
- SBLOC utilization percentiles (may need simulation extension)

---

### Plan 11-12: Recommendations & Insights
**Priority:** LOWER
**Effort:** Medium

Add actionable recommendations section.

**Components:**
1. **Actionable Insights Section**:
   - Dynamic recommendations based on simulation results
   - Risk warnings with severity indicators
   - Suggested actions

2. **Important Considerations List**:
   - Margin Call Risk warning
   - Sequence of Returns Risk
   - Interest Rate Sensitivity
   - Behavioral Factors
   - Regulatory Risk
   - Liquidity Constraints

**Logic:**
- Generate insights based on thresholds:
  - Margin call prob > 15% → warning
  - CAGR > 10% → "optimistic" note
  - Success rate < 80% → caution

**Files:**
- `src/components/ui/recommendations-section.ts` (new)
- `src/utils/insight-generator.ts` (new)
- `src/components/ui/results-dashboard.ts` (modify)

---

### Plan 11-13: Asset-Level Statistics
**Priority:** LOWER
**Effort:** Small

Enhance correlation heatmap with per-asset stats.

**Components:**
1. **Extended Correlation Table**:
   - Add "Expected Annual Return" column
   - Add "Annualized Volatility" column
   - Show per-asset statistics alongside correlations

**Files:**
- `src/charts/correlation-heatmap.ts` (modify)
- `src/components/ui/results-dashboard.ts` (modify)

---

## Execution Order

**Wave 1 (Core Visual Impact):**
- 11-05: Executive Summary Banner
- 11-06: Percentile Spectrum Visualizations

**Wave 2 (Strategy Analysis):**
- 11-07: Strategy Analysis Section
- 11-08: Salary Equivalent Section

**Wave 3 (Tables):**
- 11-09: Performance Tables
- 11-10: Year-by-Year Analysis Table

**Wave 4 (Enhanced Charts):**
- 11-11: Enhanced Strategy Charts

**Wave 5 (Polish):**
- 11-12: Recommendations & Insights
- 11-13: Asset-Level Statistics

---

## Data Dependencies

Several features require data not currently in simulation output:

1. **Sell Assets Strategy Data** (Plans 11-07, 11-11):
   - Option A: Run parallel "sell" simulation
   - Option B: Calculate simplified sell trajectory from BBD data
   - Recommendation: Option B for MVP, Option A later

2. **SBLOC Utilization Percentiles** (Plan 11-11):
   - Need to track (loanBalance / portfolioValue) per year
   - May require simulation extension

3. **Return Probability Matrix** (Plan 11-09):
   - Post-calculation from terminal values
   - No simulation change needed

---

## Estimated Effort

| Plan | Effort | Est. Time |
|------|--------|-----------|
| 11-05 | Medium | 15-20 min |
| 11-06 | Medium | 15-20 min |
| 11-07 | Large | 25-35 min |
| 11-08 | Small | 10-15 min |
| 11-09 | Large | 25-35 min |
| 11-10 | Medium | 15-20 min |
| 11-11 | Large | 30-40 min |
| 11-12 | Medium | 15-20 min |
| 11-13 | Small | 10-15 min |

**Total: ~160-220 min (2.5-3.5 hours)**

---

## Success Criteria

After all plans complete:
- [ ] Results dashboard visually matches reference screenshots
- [ ] Key metrics visible at-a-glance without scrolling
- [ ] BBD vs Sell comparison clearly presented
- [ ] All percentile data accessible in tables
- [ ] Year-by-year breakdown available
- [ ] Actionable insights generated from results
- [ ] Mobile responsive maintained
