# Phase 14: Dashboard Calculations Review - Research

**Researched:** 2026-01-22
**Domain:** Dashboard verification, calculation validation, gap analysis
**Confidence:** HIGH

## Summary

This phase involves a thorough review of the dashboard components and calculations to verify they work correctly and produce accurate results. The research analyzed the complete data flow from Monte Carlo simulation through to dashboard visualization, identified all calculation modules and their usage, and catalogued the verification approach needed.

**Key findings:**
1. The dashboard (results-dashboard.ts) is the central orchestrator with 1720 lines of code managing 20+ child components
2. Eight calculation modules exist in `src/calculations/` with well-documented formulas
3. Twelve chart components display results with data transformations happening in results-dashboard.ts
4. The data flow is: monte-carlo.ts -> SimulationOutput -> results-dashboard.ts -> child components

**Primary recommendation:** Create a systematic verification checklist organized by requirement (VIZ-01 through VIZ-07, CALC-01 through CALC-07), spot-check calculations against known inputs, and document any gaps found.

## Component Inventory

### Dashboard Architecture

The `results-dashboard.ts` component (1720 lines) serves as the main orchestrator:

| Component | Purpose | Data Source | Calculation Site |
|-----------|---------|-------------|------------------|
| key-metrics-banner | Hero cards with success rate, CAGR, safety | KeyMetricsData | updateKeyMetricsBanner() |
| param-summary | Simulation parameters display | ParamSummaryData | updateParamSummary() |
| probability-cone-chart | Net worth projection with bands | ProbabilityConeData | transformToConeData() |
| histogram-chart | Terminal value distribution | HistogramData | transformToHistogramData() |
| percentile-spectrum | P10/P50/P90 visualization | Direct percentile values | updateNetWorthSpectrum() |
| donut-chart | Portfolio composition | DonutChartData | Direct mapping |
| correlation-heatmap | Asset correlations + stats | HeatmapData | calculateAssetStatistics() |
| salary-equivalent-section | Tax advantage display | SalaryEquivalentProps | updateSalaryEquivalentSection() |
| margin-call-chart | Risk by year | BarChartData | From marginCallStats |
| sbloc-balance-chart | Loan trajectory | LineChartData | From sblocTrajectory |
| bbd-comparison-chart | BBD vs Sell | BBDComparisonChartData | From estateAnalysis |
| strategy-analysis | BBD vs Sell verdict | StrategyAnalysisProps | updateStrategyAnalysis() |
| comparison-line-chart | Net worth over time | ComparisonLineChartData | updateComparisonLineChart() |
| cumulative-costs-chart | Taxes vs Interest | CumulativeCostsChartData | updateCumulativeCostsChart() |
| terminal-comparison-chart | Terminal percentiles | TerminalComparisonChartData | updateTerminalComparisonChart() |
| sbloc-utilization-chart | Utilization over time | SBLOCUtilizationChartData | updateSBLOCUtilizationChart() |
| recommendations-section | Insights | RecommendationsSectionProps | updateRecommendationsSection() |
| performance-table | Metrics across percentiles | PerformanceSummaryData | updatePerformanceTable() |
| return-probability-table | Return probabilities | ReturnProbabilities | updateReturnProbabilityTable() |
| yearly-analysis-table | Year-by-year breakdown | YearlyAnalysisTableProps | updateYearlyAnalysisTable() |

### Calculation Modules

Located in `src/calculations/`:

| Module | Exports | Requirements Mapped |
|--------|---------|---------------------|
| metrics.ts | calculateCAGR, calculateAnnualizedVolatility, extractPercentiles, calculateSuccessRate | CALC-02, CALC-03 |
| twrr.ts | calculateTWRR, calculatePeriodReturn, chainReturns | CALC-07 |
| salary-equivalent.ts | calculateSalaryEquivalent | CALC-05 |
| margin-call-probability.ts | calculateMarginCallRisk, aggregateMarginCallEvents | CALC-04 |
| sell-strategy.ts | calculateSellStrategy | VIZ-07 (comparison data) |
| estate.ts | calculateEstateAnalysis, calculateBBDComparison | VIZ-07 (estate analysis) |
| return-probabilities.ts | calculateReturnProbabilities, calculateExpectedReturns, calculatePerformanceSummary | CALC-01, CALC-02 |

### Chart Components

Located in `src/charts/`:

| Chart | Type | Requirements |
|-------|------|--------------|
| probability-cone-chart.ts | Line with fills | VIZ-01 |
| histogram-chart.ts | Bar | VIZ-02 |
| donut-chart.ts | Doughnut | VIZ-03 |
| correlation-heatmap.ts | Matrix | VIZ-04 |
| margin-call-chart.ts | Bar | VIZ-05 |
| sbloc-balance-chart.ts | Line | VIZ-06 |
| bbd-comparison-chart.ts | Bar | VIZ-07 |
| comparison-line-chart.ts | Line | VIZ-07 (extended) |
| cumulative-costs-chart.ts | Line | VIZ-07 (extended) |
| terminal-comparison-chart.ts | Bar | VIZ-07 (extended) |
| sbloc-utilization-chart.ts | Line with fills | VIZ-06 (extended) |

## Data Flow Analysis

### Simulation to Dashboard

```
runMonteCarlo(config, portfolio)
    |
    v
SimulationOutput {
  terminalValues: Float64Array,
  yearlyPercentiles: YearlyPercentiles[],
  statistics: SimulationStatistics,
  sblocTrajectory?: SBLOCTrajectory,
  marginCallStats?: MarginCallStats[],
  estateAnalysis?: EstateAnalysis
}
    |
    v
ResultsDashboard.data = output
    |
    v
updateCharts() -> 20+ update methods
```

### Key Data Transformations

**transformToConeData()** - Correctly extracts percentile bands from YearlyPercentiles array:
```typescript
// Source: results-dashboard.ts:886-897
return {
  years: percentiles.map(p => p.year),
  bands: {
    p10: percentiles.map(p => p.p10),
    p25: percentiles.map(p => p.p25),
    p50: percentiles.map(p => p.p50),
    p75: percentiles.map(p => p.p75),
    p90: percentiles.map(p => p.p90)
  }
};
```

**computeExtendedStats()** - Calculates CAGR, TWRR, volatility, salary equivalent:
```typescript
// Source: results-dashboard.ts:950-990
const cagr = calculateCAGR(this._initialValue, median, this._timeHorizon);
const volatility = calculateAnnualizedVolatility(annualizedReturns);
const twrrResult = calculateTWRR(this._data.yearlyPercentiles);
const salaryResult = calculateSalaryEquivalent(withdrawal, taxRate);
```

## Verification Approach

### By Requirement

**VIZ-01: Probability Cone**
- Verify: yearlyPercentiles properly transformed
- Check: All 5 percentile bands render (P10, P25, P50, P75, P90)
- Verify: X-axis shows years 0 to timeHorizon
- Verify: Y-axis shows currency values

**VIZ-02: Terminal Distribution Histogram**
- Verify: terminalValues properly binned (20 bins)
- Check: Histogram color gradient (red -> yellow -> green)
- Verify: Bin counts are correct

**VIZ-03: Portfolio Composition Donut**
- Verify: portfolioWeights passed correctly
- Check: Segment labels and percentages

**VIZ-04: Correlation Heatmap**
- Verify: correlationMatrix passed correctly
- Check: Asset statistics (expected returns, volatilities) calculated from preset data

**VIZ-05: Margin Call Risk**
- Verify: marginCallStats from simulation used
- Check: Cumulative probability line shows

**VIZ-06: SBLOC Balance**
- Verify: sblocTrajectory.loanBalance.p50 used
- Check: Cumulative withdrawals and interest also shown

**VIZ-07: BBD vs Sell Comparison**
- Verify: estateAnalysis data used
- Verify: calculateSellStrategy called with correct params
- Check: All comparison charts populate

**CALC-01: Success Rate**
- Formula: (count where terminal > initial) / total * 100
- Verify: statistics.successRate from simulation matches display

**CALC-02: Percentile Outcomes**
- Verify: P10, P25, P50, P75, P90 calculated correctly
- Check: percentile() function uses correct 0-100 scale

**CALC-03: CAGR and Volatility**
- CAGR Formula: (endValue/startValue)^(1/years) - 1
- Volatility: stddev of annualized returns
- Verify: Using median terminal value for CAGR

**CALC-04: Margin Call Probability**
- Verify: Cumulative probability increases monotonically
- Check: Per-year probability reasonable (early years higher risk)

**CALC-05: Salary Equivalent**
- Formula: withdrawal / (1 - taxRate)
- Tax Savings: salaryEquivalent - withdrawal
- Verify: Only shows when annualWithdrawal > 0

**CALC-07: TWRR**
- Formula: Geometric mean of period returns
- Verify: Uses median (P50) path from yearlyPercentiles

## Potential Issues to Verify

### HIGH Priority

1. **Percentile Scale Mismatch**
   - `percentile()` in math/statistics.ts uses 0-100 scale
   - Monte Carlo uses 0-1 scale in `calculateYearlyPercentiles()`
   - **Location**: monte-carlo.ts:344-355 uses `percentile(values, 0.1)` etc.
   - **Status**: NEEDS VERIFICATION - appears to be mixing scales

2. **Success Rate Definition**
   - metrics.ts:187 uses `>` (strictly greater)
   - monte-carlo.ts:331 uses `>=` (greater or equal)
   - **Impact**: Minor discrepancy in edge cases

3. **BBD Net Worth Calculation**
   - updateComparisonLineChart() subtracts loan from portfolio per year
   - But yearlyPercentiles[year] is 0-indexed, could be off-by-one
   - **Location**: results-dashboard.ts:1386-1389

### MEDIUM Priority

4. **Key Metrics Banner Utilization**
   - medianUtilization calculated as loan/portfolio ratio
   - peakUtilizationP90 and safetyBufferP10 are rough estimates
   - **Location**: results-dashboard.ts:1146-1169

5. **Sell Strategy Interpolation**
   - Uses only 9 scenarios (5 percentiles + 4 interpolations)
   - May not capture full distribution
   - **Location**: sell-strategy.ts:174-216

6. **Asset Statistics Fallback**
   - calculateAssetStatistics() uses 8%/16% defaults if no preset data
   - Could show incorrect values for unknown assets
   - **Location**: results-dashboard.ts:1680-1715

### LOW Priority

7. **Debt Spectrum Labels**
   - Shows "Actual LOC Balance" but P10/P90 interpretation may be counterintuitive
   - P10 loan = low debt (good), P90 loan = high debt (bad)

8. **Cumulative Costs Chart Estimation**
   - Taxes are linearly interpolated, not year-by-year actual
   - **Location**: results-dashboard.ts:1427-1437

## Verification Methodology

### Manual Spot Checks

1. **Known Input Test**
   - Run simulation with: $1M initial, 30 years, 10,000 iterations
   - Verify CAGR ~7% (historical average)
   - Verify success rate ~80-90%
   - Verify median terminal $5-10M range

2. **Edge Case Test**
   - Zero withdrawal: Salary equivalent section should hide
   - No SBLOC config: SBLOC sections should hide
   - Single asset: Correlation matrix should be 1x1

3. **Formula Validation**
   - CAGR: Calculate manually from median and compare
   - TWRR: Trace through period returns and verify geometric mean
   - Salary Equivalent: $50k at 37% tax rate should equal ~$79,365

### Automated Verification (from E2E Tests)

Existing tests cover:
- Component rendering (smoke.js)
- Simulation workflow (workflow.js)
- Chart data population (via evalJs)

Additional verification needed:
- Calculation accuracy tests
- Edge case handling

## Gap Finding Template

For each issue found:

```markdown
### GAP-XX: [Short Title]

**Requirement**: [VIZ-XX or CALC-XX]
**Severity**: HIGH | MEDIUM | LOW
**Component**: [File and function]

**Description**:
[What is wrong or potentially wrong]

**Evidence**:
[Code snippet or test result showing the issue]

**Expected Behavior**:
[What should happen]

**Proposed Resolution**:
[How to fix it]
```

## Testing Plan

### Phase 14 Plan Structure

1. **14-01: Calculation Verification**
   - Verify all CALC requirements with manual spot-checks
   - Document any formula discrepancies

2. **14-02: Visualization Verification**
   - Verify all VIZ requirements render correctly
   - Check data binding and transformations

3. **14-03: Gap Documentation**
   - Compile all issues found into gap findings
   - Prioritize by severity and impact

4. **14-04: Resolution Planning**
   - Create follow-up tasks for each gap
   - Estimate effort and dependencies

## Sources

### Primary (HIGH confidence)
- src/components/ui/results-dashboard.ts - Main dashboard orchestrator
- src/calculations/*.ts - All calculation modules
- src/simulation/monte-carlo.ts - Simulation output structure
- src/charts/*.ts - Chart components

### Secondary (MEDIUM confidence)
- src/math/statistics.ts - Core statistical functions
- test/e2e/*.js - Existing E2E tests

## Metadata

**Confidence breakdown:**
- Component inventory: HIGH - directly read all source files
- Data flow: HIGH - traced through code
- Verification approach: HIGH - based on requirements and code analysis
- Potential issues: MEDIUM - identified through code review, need runtime verification

**Research date:** 2026-01-22
**Valid until:** N/A (code review findings, not external documentation)
