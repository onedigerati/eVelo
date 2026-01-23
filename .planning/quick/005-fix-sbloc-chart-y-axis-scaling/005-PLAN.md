---
id: quick-005
type: quick
title: Fix SBLOC Chart Y-Axis Scaling
created: 2026-01-22
status: planned
files_modified:
  - src/charts/sbloc-utilization-chart.ts
autonomous: true
estimated_duration: 10 min
---

<objective>
Fix the Y-axis scaling in the SBLOC Utilization Over Time chart to dynamically adapt to the actual data range, improving readability when utilization values are much lower than the maximum borrowing limit.

Purpose: Currently the chart sets suggestedMax to max(100, maxBorrowing*2) which creates poor readability when actual data (e.g., 15% utilization) is much smaller than the scale (140%). Users cannot easily see the percentile bands.

Output: Y-axis that dynamically scales based on actual data with appropriate padding, always showing the maxBorrowing reference line.
</objective>

<context>
@src/charts/sbloc-utilization-chart.ts

The issue is on line 313:
```typescript
suggestedMax: Math.max(100, (this._data?.maxBorrowing || 65) * 2),
```

This always sets the Y-axis to at least 100% or 2x maxBorrowing, regardless of actual data values.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement dynamic Y-axis scaling based on data range</name>
  <files>src/charts/sbloc-utilization-chart.ts</files>
  <action>
Modify the Y-axis suggestedMax calculation to dynamically adapt to the actual data:

1. Calculate the maximum value across all percentile arrays (p10, p25, p50, p75, p90)
2. Include maxBorrowing in the calculation since the reference line must always be visible
3. Add 10-15% padding above the highest value for visual breathing room
4. Round up to a "nice" number (nearest 5 or 10) for clean tick marks

Implementation approach:
```typescript
// In getChartConfig(), before the return statement:
const dataMax = this._data
  ? Math.max(
      ...this._data.p10,
      ...this._data.p25,
      ...this._data.p50,
      ...this._data.p75,
      ...this._data.p90,
      this._data.maxBorrowing
    )
  : 65;

// Add 15% padding and round up to nearest 5
const paddedMax = dataMax * 1.15;
const suggestedMax = Math.ceil(paddedMax / 5) * 5;
```

Then update line 313 to use the computed suggestedMax instead of the hardcoded formula.

Also update the annotation plugin's reference to maxBorrowing to use the same data-driven approach.
  </action>
  <verify>
1. Run `npm run build` - should compile without errors
2. Run the app and trigger a simulation with SBLOC enabled
3. Verify the Y-axis now scales to fit the actual data with appropriate padding
4. Verify the Max Borrowing reference line is still visible
5. Test edge cases: very low utilization (< 10%), utilization near maxBorrowing
  </verify>
  <done>
- Y-axis dynamically scales based on actual percentile data values
- Max Borrowing reference line always visible within the chart area
- Reasonable padding (10-15%) above highest data point
- Clean tick mark values (rounded to nearest 5)
- Chart remains readable regardless of data range
  </done>
</task>

</tasks>

<verification>
- `npm run build` completes without TypeScript errors
- Chart Y-axis adapts to data: low utilization data shows low Y-axis range
- Max Borrowing reference line always visible (Y-axis max >= maxBorrowing + padding)
- Visual inspection confirms improved readability for low-utilization scenarios
</verification>

<success_criteria>
1. SBLOC Utilization chart Y-axis dynamically adjusts to actual data range
2. When data is 0-15% utilization with 65% maxBorrowing, Y-axis shows approximately 0-75% (not 0-140%)
3. Reference line for Max Borrowing always visible within chart bounds
4. No regression in chart functionality or appearance for high-utilization scenarios
</success_criteria>

<output>
After completion, create `.planning/quick/005-fix-sbloc-chart-y-axis-scaling/005-SUMMARY.md`
</output>
