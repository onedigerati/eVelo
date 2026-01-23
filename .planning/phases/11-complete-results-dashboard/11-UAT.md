---
status: testing
phase: 11-complete-results-dashboard
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md, 11-04-SUMMARY.md, 11-05-SUMMARY.md, 11-06-SUMMARY.md, 11-07-SUMMARY.md, 11-08-SUMMARY.md, 11-09-SUMMARY.md, 11-10-SUMMARY.md, 11-11-SUMMARY.md, 11-12-SUMMARY.md, 11-13-SUMMARY.md]
started: 2026-01-20T18:30:00Z
updated: 2026-01-20T18:30:00Z
---

## Current Test

number: 1
name: Portfolio Donut Chart Display
expected: |
  After running a simulation, the results dashboard shows a donut chart with your portfolio allocation. Each asset should have a colored segment proportional to its weight (e.g., 70% stocks shows as 70% of the donut).
awaiting: user response

## Tests

### 1. Portfolio Donut Chart Display
expected: After running a simulation, the results dashboard shows a donut chart with your portfolio allocation. Each asset should have a colored segment proportional to its weight.
result: [pending]

### 2. Correlation Heatmap Display
expected: After running a simulation, results dashboard shows a correlation heatmap table. Each cell shows correlation between two assets with color coding (red = negative, white = neutral, blue = positive). Right columns show "Expected Annual Return" (teal) and "Annualized Volatility" (gray) for each asset.
result: [pending]

### 3. Key Metrics Banner (3 Hero Cards)
expected: Top of results dashboard shows 3 hero cards: "Strategy Success" (BBD success rate %), "Portfolio Growth" (CAGR %), and "Leverage Safety" (margin call probability %). Each card has main metric plus supporting details.
result: [pending]

### 4. Parameter Summary Grid
expected: Below hero cards, a grid shows simulation inputs: Starting Portfolio, Time Horizon, Annual Withdrawal, Withdrawal Growth, SBLOC Interest Rate, Max Borrowing, Maintenance Margin, Simulations Run.
result: [pending]

### 5. Statistics Grid (8 Metrics)
expected: Results dashboard shows 8 statistics: Median Portfolio, Success Rate, CAGR, TWRR, Mean Portfolio, Volatility, Standard Deviation, Salary Equivalent. Grid is 4 columns on desktop, 2 on mobile.
result: [pending]

### 6. Terminal Net Worth Spectrum (P10/P50/P90)
expected: A horizontal bar visualization shows terminal net worth distribution with three boxes: P10 (worst case, red), P50 (median, teal), P90 (best case, green) on a gradient background.
result: [pending]

### 7. Total Debt Spectrum
expected: When SBLOC is enabled, shows LOC balance percentiles as P10/P50/P90 boxes with explanation text about why values differ (margin calls, failed simulations, etc.).
result: [pending]

### 8. Salary Equivalent Banner
expected: Prominent teal gradient banner showing: "Your Annual Withdrawal Tax-Free" amount, "Is equivalent to earning a taxable salary of" larger amount, and annual tax savings.
result: [pending]

### 9. Strategy Analysis Verdict
expected: Shows either "BBD Recommended" (green) or "Consider Sell Assets" (amber) verdict banner based on which strategy produces higher terminal wealth.
result: [pending]

### 10. BBD vs Sell Side-by-Side Comparison
expected: Two cards comparing strategies. BBD card shows: Terminal Net Worth, Success Rate, Lifetime Interest, Dividend Taxes. Sell card shows: Terminal Net Worth, Success Rate, Lifetime Taxes.
result: [pending]

### 11. Margin Call Risk Chart
expected: Bar chart showing margin call probability by year (e.g., Year 1: 2%, Year 2: 5%...). May include cumulative probability line.
result: [pending]

### 12. SBLOC Balance Trajectory Chart
expected: Line chart showing loan balance over time with percentile bands (P10-P90). Shows cumulative withdrawals and interest as well.
result: [pending]

### 13. BBD vs Sell Comparison Chart
expected: Bar chart comparing BBD Net Estate vs Sell Net Estate values, showing which strategy leaves more to heirs.
result: [pending]

### 14. Performance Table (Metrics Across Percentiles)
expected: Table showing TWRR, Portfolio End Balance, Mean Return, and Volatility across P10/P25/P50/P75/P90 columns. Values color-coded (green positive, red negative).
result: [pending]

### 15. Return Probability Table
expected: Table showing probability of achieving return thresholds (0%, 2.5%, 5%, 7.5%, 10%, 12.5%) at different horizons (1, 3, 5, 10, 15 years). Probabilities color-coded by magnitude.
result: [pending]

### 16. Year-by-Year Analysis Table
expected: Table with years as rows showing: Annual Withdrawal, Cumulative Withdrawal, and Net Worth at P10/P25/P50/P75/P90. Sticky header, scrollable body, color-coded values.
result: [pending]

### 17. Net Worth Comparison Chart (BBD vs Sell Over Time)
expected: Two-line chart comparing BBD vs Sell median net worth trajectories over time. Teal line for BBD, blue for Sell. Fill between lines shows advantage area.
result: [pending]

### 18. Cumulative Costs Chart (Taxes vs Interest)
expected: Area chart showing cost accumulation over time. Red area for taxes (Sell strategy), teal/green area for interest (BBD strategy).
result: [pending]

### 19. Terminal Distribution Chart (Percentile Bars)
expected: Grouped bar chart showing BBD vs Sell terminal values at P10/P25/P50/P75/P90. Side-by-side bars for direct comparison.
result: [pending]

### 20. SBLOC Utilization Chart
expected: Chart showing SBLOC utilization percentage over time with percentile bands (green P10 to red P90). Dashed line shows max borrowing limit.
result: [pending]

### 21. Recommendations Section
expected: Section showing actionable insights (e.g., "Warning: High margin call probability - consider cash buffer") and 6 standard risk considerations (margin call, sequence, interest rate, behavioral, regulatory, liquidity risks).
result: [pending]

## Summary

total: 21
passed: 0
issues: 0
pending: 21
skipped: 0

## Gaps

[none yet]
