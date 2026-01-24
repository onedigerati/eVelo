---
phase: quick-013
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/calculations/sell-strategy.ts
  - src/components/ui/sell-yearly-analysis-table.ts
  - src/components/ui/index.ts
  - src/components/ui/results-dashboard.ts
autonomous: true

must_haves:
  truths:
    - "User can see year-by-year performance of Sell strategy after BBD table"
    - "Table shows portfolio value percentiles (P10-P90) for each year"
    - "Table shows annual/cumulative withdrawals and cumulative taxes"
    - "Data helps user understand why Sell often outperforms BBD"
  artifacts:
    - path: "src/components/ui/sell-yearly-analysis-table.ts"
      provides: "Sell Strategy yearly analysis table component"
    - path: "src/calculations/sell-strategy.ts"
      provides: "Extended SellStrategyResult with percentile data"
  key_links:
    - from: "src/components/ui/results-dashboard.ts"
      to: "sell-yearly-analysis-table"
      via: "DOM query and data setter"
---

<objective>
Create a Sell Strategy Year-by-Year Analysis table that mirrors the existing BBD yearly analysis table but shows Sell strategy data including portfolio values at each percentile, withdrawals, and cumulative tax costs.

Purpose: Help user understand the data behind why Sell Assets approach sometimes outperforms BBD by showing year-by-year metrics.

Output: New `sell-yearly-analysis-table` component displaying Sell strategy year-over-year performance.
</objective>

<execution_context>
@C:\Users\ungac\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\ungac\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ui/yearly-analysis-table.ts (reference for table structure)
@src/calculations/sell-strategy.ts (Sell strategy calculations - needs percentile tracking)
@src/components/ui/results-dashboard.ts (integration point)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend Sell Strategy to Track Percentile Values</name>
  <files>src/calculations/sell-strategy.ts</files>
  <action>
Extend `SellStrategyResult` interface to include yearly percentile data:
- Add `yearlyPercentiles` field: Array of `{p10, p25, p50, p75, p90}` for each year
- Add `cumulativeTaxes` field: Array of cumulative taxes paid by year

Modify `runSellScenarios` and `extractMedianPath` to also extract percentile values across all scenarios at each year:
- After running all scenarios, for each year index, collect portfolio values from all scenarios
- Calculate P10, P25, P50, P75, P90 of those values using `calcPercentile`
- Calculate cumulative taxes array from median scenario

This follows the existing pattern in `extractMedianPath` but expands to full percentile distribution.
  </action>
  <verify>TypeScript compiles without errors: `npx tsc --noEmit`</verify>
  <done>
- SellStrategyResult has `yearlyPercentiles` and `cumulativeTaxes` fields
- calculateSellStrategy returns populated percentile data for each year
  </done>
</task>

<task type="auto">
  <name>Task 2: Create Sell Yearly Analysis Table Component</name>
  <files>src/components/ui/sell-yearly-analysis-table.ts, src/components/ui/index.ts</files>
  <action>
Create new `SellYearlyAnalysisTable` component based on `yearly-analysis-table.ts`:

1. Copy structure from `yearly-analysis-table.ts` as base
2. Modify interface `SellYearlyAnalysisTableProps`:
   - `startYear: number`
   - `withdrawals: { annual: number[], cumulative: number[] }`
   - `cumulativeTaxes: number[]` (new - shows tax drag)
   - `percentiles: Array<{year, p10, p25, p50, p75, p90}>`

3. Update table columns:
   - Year (sticky)
   - Annual Withdrawal
   - Cumulative Withdrawn
   - Cumulative Taxes (new column, orange header color for "cost")
   - P10, P25, P50, P75, P90 (portfolio value percentiles)

4. Use same styling patterns (sticky headers, color coding, compact currency)
5. Header: "Sell Strategy Year-by-Year Analysis" with different icon (scales or money icon)
6. Add tax column styling: orange color scheme (#f59e0b) to highlight cost
7. Register as custom element: `sell-yearly-analysis-table`

Export from index.ts.
  </action>
  <verify>TypeScript compiles: `npx tsc --noEmit`</verify>
  <done>
- sell-yearly-analysis-table.ts exists with SellYearlyAnalysisTable class
- Component registered as custom element
- Exported from index.ts
  </done>
</task>

<task type="auto">
  <name>Task 3: Integrate Table into Results Dashboard</name>
  <files>src/components/ui/results-dashboard.ts</files>
  <action>
1. Add import for sell-yearly-analysis-table component

2. Add HTML section in template() after `#yearly-analysis-section`:
```html
<section class="table-section full-width sbloc-section" id="sell-yearly-analysis-section">
  <sell-yearly-analysis-table id="sell-yearly-analysis-table"></sell-yearly-analysis-table>
</section>
```
Note: Uses `sbloc-section` class so it only shows when SBLOC/comparison is relevant.

3. Create new method `updateSellYearlyAnalysisTable()`:
   - Get table element by ID
   - Check for _data and SBLOC data presence
   - Calculate sell strategy result (can reuse from updateStrategyAnalysis or calculate fresh)
   - Calculate withdrawal data using calculateWithdrawals
   - Transform sellResult.yearlyPercentiles to include calendar year
   - Set table.data with startYear, withdrawals, cumulativeTaxes, percentiles

4. Call `updateSellYearlyAnalysisTable()` from `updateCharts()` after `updateYearlyAnalysisTable()`

5. Show/hide logic: Section gets `visible` class when SBLOC data present (same as other SBLOC sections)
  </action>
  <verify>
- Dev server shows new table after BBD yearly analysis table
- Table populates with Sell strategy data when simulation runs with SBLOC
- Cumulative taxes column shows increasing values year over year
  </verify>
  <done>
- Sell Strategy Year-by-Year Analysis table appears below BBD table
- Table shows withdrawals, cumulative taxes, and portfolio percentiles
- Data correctly reflects Sell strategy calculations
  </done>
</task>

</tasks>

<verification>
1. Run `npx tsc --noEmit` - should compile without errors
2. Run simulation with SBLOC enabled in dev server
3. Scroll to yearly analysis section - should see two tables:
   - "Year-by-Year Percentile Analysis" (BBD)
   - "Sell Strategy Year-by-Year Analysis" (new)
4. Verify Sell table shows:
   - Annual withdrawals (same as BBD table)
   - Cumulative withdrawals (sum of annual, not loan balance)
   - Cumulative taxes (increasing each year, orange-styled)
   - P10-P90 portfolio values (different from BBD due to tax drag)
5. Compare P50 values between tables - Sell should show lower values due to:
   - Capital gains taxes on each withdrawal
   - Dividend taxes reducing portfolio
   - Withdrawal applied before returns (less favorable)
</verification>

<success_criteria>
- New "Sell Strategy Year-by-Year Analysis" table visible after BBD table
- Table shows cumulative tax burden column (helps explain Sell underperformance)
- Percentile values reflect actual Sell strategy trajectories
- User can compare BBD vs Sell year-by-year to understand performance difference
</success_criteria>

<output>
After completion, create `.planning/quick/013-sell-strategy-yearly-analysis-table/013-SUMMARY.md`
</output>
