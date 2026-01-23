---
phase: quick
plan: 007
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/results-dashboard.ts
autonomous: true

must_haves:
  truths:
    - "Portfolio Composition section displays donut chart with center asset count label"
    - "Portfolio Composition section displays horizontal asset bars with percentages"
    - "Portfolio Composition section takes full width of dashboard grid"
    - "Asset Correlations section appears below Portfolio Composition"
    - "Asset Correlations section takes full width of dashboard grid"
  artifacts:
    - path: "src/components/ui/results-dashboard.ts"
      provides: "Updated dashboard layout with single-column portfolio/correlations sections"
---

<objective>
Replace Portfolio Composition section on results dashboard with left sidebar version (donut + horizontal bars layout) and reorganize Asset Correlations below it, both full width.

Purpose: Consolidate dashboard to use consistent Portfolio Composition visualization with more detail (asset bars with percentages) instead of plain donut chart
Output: Single-column layout for Portfolio Composition and Asset Correlations sections
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@src/components/ui/results-dashboard.ts
@src/components/ui/portfolio-composition.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create portfolio-viz-card component for donut + bars display</name>
  <files>src/components/ui/portfolio-viz-card.ts</files>
  <action>
Create a new lightweight component `portfolio-viz-card` that displays:
1. A card with teal-tinted background (like the sidebar version)
2. Header with pie chart icon, "Portfolio Composition" title, and "{N} Assets" subtitle
3. Content area with:
   - Left: Donut chart (120x120px) with center text showing "N ASSETS"
   - Right: Horizontal asset bars sorted by weight descending

The component receives data via a `data` property:
```typescript
interface PortfolioVizCardData {
  assets: Array<{
    symbol: string;
    name: string;
    weight: number;
    color: string;
  }>;
}
```

Styling to match the `.portfolio-visualization` section from portfolio-composition.ts:
- Card background: `#f0fdfa` (teal-50)
- Card border: `1px solid #99f6e4` (teal-200)
- Header with teal icon, divider below
- Donut: 120x120px, cutout 70%, center text for asset count
- Asset bars: white background, color-tinted bar (15% opacity), swatch + name + percentage

Use Chart.js for the donut (import from 'chart.js/auto'). Destroy chart on disconnectedCallback.

Export and register as `portfolio-viz-card` custom element.
  </action>
  <verify>
    Run `npm run build` - should compile without errors
  </verify>
  <done>
    New portfolio-viz-card component exists and exports correctly
  </done>
</task>

<task type="auto">
  <name>Task 2: Update results-dashboard to use portfolio-viz-card and single-column layout</name>
  <files>src/components/ui/results-dashboard.ts</files>
  <action>
1. **Add import for portfolio-viz-card:**
   At top with other imports, add:
   ```typescript
   import './portfolio-viz-card';
   ```

2. **Replace Portfolio Composition section (around lines 270-276):**
   Change from:
   ```html
   <section class="chart-section">
     <h3>Portfolio Composition</h3>
     <div class="chart-container square">
       <donut-chart id="donut-chart"></donut-chart>
     </div>
   </section>
   ```
   To:
   ```html
   <section class="portfolio-viz-section full-width">
     <portfolio-viz-card id="portfolio-viz-card"></portfolio-viz-card>
   </section>
   ```

3. **Update Asset Correlations section (around lines 277-282) to be full width:**
   Change from:
   ```html
   <section class="chart-section">
   ```
   To:
   ```html
   <section class="chart-section full-width">
   ```

4. **Add CSS for portfolio-viz-section in styles():**
   ```css
   .portfolio-viz-section {
     /* Component provides its own card styling */
   }
   ```

5. **Update updateCharts() method:**
   Find the donut chart update code (around lines 767-776) and replace with:
   ```typescript
   // Update portfolio visualization card
   const vizCard = this.$('#portfolio-viz-card') as HTMLElement & {
     data: { assets: Array<{ symbol: string; name: string; weight: number; color: string }> } | null
   };
   if (vizCard && this._portfolioWeights) {
     // Get asset names from preset data
     const assets = this._portfolioWeights.map((p, idx) => {
       const preset = getPresetData(p.symbol);
       return {
         symbol: p.symbol,
         name: preset?.name || p.symbol,
         weight: p.weight,
         color: PORTFOLIO_COLORS[idx % PORTFOLIO_COLORS.length],
       };
     });
     vizCard.data = { assets };
   }
   ```

6. **Add PORTFOLIO_COLORS constant at module level (before class):**
   ```typescript
   const PORTFOLIO_COLORS = [
     '#0d9488', // teal
     '#8b5cf6', // purple
     '#f59e0b', // amber
     '#ef4444', // red
     '#3b82f6', // blue
     '#10b981', // emerald
     '#ec4899', // pink
     '#6366f1', // indigo
     '#14b8a6', // cyan
     '#f97316', // orange
   ];
   ```

7. **Remove the old donut-chart absolute positioning CSS:**
   In the `.chart-container` rules, the donut-chart selector can remain but is no longer needed for portfolio section.
  </action>
  <verify>
    Run `npm run dev` and navigate to results dashboard after running a simulation:
    - Portfolio Composition card displays with donut chart and horizontal bars
    - Portfolio Composition takes full width
    - Asset Correlations appears below it
    - Asset Correlations takes full width
  </verify>
  <done>
    Dashboard displays Portfolio Composition (donut + bars) full width, Asset Correlations below full width
  </done>
</task>

</tasks>

<verification>
1. Visual layout:
   - [ ] Portfolio Composition card has teal background
   - [ ] Donut chart shows with center "N ASSETS" label
   - [ ] Horizontal bars show sorted by weight with color swatches
   - [ ] Portfolio Composition spans full width of dashboard
   - [ ] Asset Correlations appears below Portfolio Composition
   - [ ] Asset Correlations spans full width

2. Functionality:
   - [ ] Portfolio data updates when simulation runs
   - [ ] Asset colors are consistent between donut and bars
   - [ ] Weights display correctly in bars
</verification>

<success_criteria>
- Portfolio Composition section uses donut + horizontal bars layout matching left sidebar style
- Both Portfolio Composition and Asset Correlations are full width in single-column layout
- Existing functionality preserved (data binding, updates on simulation)
</success_criteria>

<output>
After completion, create `.planning/quick/007-replace-portfolio-composition-layout/007-SUMMARY.md`
</output>
