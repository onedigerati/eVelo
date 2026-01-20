---
phase: 11-complete-results-dashboard
plan: 13
subsystem: visualizations
tags: [charts, correlation, statistics, heatmap]
depends_on: ["11-03"]
provides: ["Enhanced correlation heatmap with per-asset statistics"]
affects: []

tech_stack:
  added: []
  patterns:
    - "HTML table-based heatmap for flexible column layout"
    - "Annualized return from daily mean (252 trading days)"
    - "Annualized volatility from daily stddev * sqrt(252)"

key_files:
  created: []
  modified:
    - src/charts/types.ts
    - src/charts/correlation-heatmap.ts
    - src/components/ui/results-dashboard.ts

decisions:
  - id: table-over-canvas
    description: "Refactored from Chart.js canvas to HTML table for column flexibility"
    rationale: "Chart.js matrix plugin doesn't support adding extra columns for statistics"
  - id: annualization-formula
    description: "Annualize daily returns using 252 trading days"
    rationale: "Standard convention for market data annualization"

metrics:
  duration: 5 min
  completed: 2026-01-20
---

# Phase 11 Plan 13: Enhanced Correlation Heatmap Summary

HTML table-based correlation heatmap with Expected Annual Return and Annualized Volatility columns, calculated from bundled preset data.

## What Was Built

### HeatmapData Type Extension (src/charts/types.ts)
Added optional fields to the HeatmapData interface:
- `expectedReturns?: number[]` - Per-asset expected annual return as decimal
- `volatilities?: number[]` - Per-asset annualized volatility as decimal

### Correlation Heatmap Component (src/charts/correlation-heatmap.ts)
Complete refactor from Chart.js canvas-based matrix to HTML table layout:

**Table Structure:**
- Header row with asset names + "Expected Annual Return" + "Annualized Volatility"
- Body rows with correlation cells (color-coded) + return/volatility values
- Note section below explaining all metrics

**Styling:**
- Correlation cells: Color-coded background (red negative to blue positive)
- Contrast-aware text (white on dark, dark on light)
- Expected Return: Teal color (#0d9488), bold
- Volatility: Gray color (text-secondary), medium weight
- Stats columns separated by left border

**Note Section Content:**
1. Correlation Matrix explanation (Pearson coefficient, -1 to +1 range)
2. Expected Annual Return formula (arithmetic mean of returns)
3. Annualized Volatility formula (standard deviation, sqrt(n))
4. Diversification Insight (correlation interpretation guide)

### Statistics Calculation (src/components/ui/results-dashboard.ts)
New `calculateAssetStatistics` method:

```typescript
private calculateAssetStatistics(symbols: string[]): {
  expectedReturns: number[];
  volatilities: number[];
}
```

**Calculation approach:**
- Fetches preset data for each symbol via `getPresetData()`
- Calculates daily mean return
- Annualizes return: `(1 + dailyMean)^252 - 1`
- Calculates daily volatility via `stddev()`
- Annualizes volatility: `dailyVol * sqrt(252)`
- Fallback: 8% return, 16% volatility when preset unavailable

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 38fe378 | Extend HeatmapData type with return/volatility fields |
| 2 | 7b95a67 | Update correlation heatmap with return/volatility columns |
| 3 | fe0d324 | Calculate and display per-asset statistics (included in 11-12 integration commit) |

## Verification Results

- [x] `npm run build` succeeds
- [x] Heatmap shows correlation matrix as HTML table
- [x] Expected Return column displayed with teal styling
- [x] Volatility column displayed with gray styling
- [x] Values formatted as percentages (XX.XX%)
- [x] Note text present below table with 4 explanatory paragraphs
- [x] Mobile responsive with horizontal scroll (overflow-x: auto)

## Deviations from Plan

### Approach Change: Chart.js Canvas to HTML Table

**Found during:** Task 2
**Issue:** Chart.js matrix plugin renders a canvas-based heatmap that doesn't support adding extra columns for statistics. The reference design requires a table layout with correlation cells plus two additional columns.

**Fix:** Refactored the correlation-heatmap component from extending `BaseChart` (Chart.js-based) to extending `BaseComponent` with a pure HTML table implementation. This allows full control over column layout and styling.

**Files modified:** src/charts/correlation-heatmap.ts (complete rewrite)

## Technical Notes

### Annualization Formulas
- **Return:** Compound daily returns over 252 trading days
  - Formula: `(1 + mean(dailyReturns))^252 - 1`
- **Volatility:** Scale daily standard deviation by square root of time
  - Formula: `stddev(dailyReturns) * sqrt(252)`

### Color Interpolation
Correlation colors use a diverging scale:
- Strong negative (-1): `#dc2626` (red-600)
- Neutral (0): `#ffffff` (white)
- Strong positive (+1): `#2563eb` (blue-600)

### Mobile Responsiveness
- Table container has `overflow-x: auto` for horizontal scrolling
- Smaller padding and font sizes at 640px breakpoint
- Minimum column widths prevent content overlap

## Next Phase Readiness

Phase 11 Complete - All 13 plans executed successfully. The results dashboard now includes:
- All 7 chart types
- 8 financial statistics
- Strategy analysis with BBD vs Sell comparison
- Performance tables with percentile breakdown
- Year-by-year analysis
- Enhanced correlation heatmap with per-asset statistics
