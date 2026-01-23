---
phase: quick
plan: 006
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/portfolio-composition.ts
  - src/charts/correlation-heatmap.ts
autonomous: true

must_haves:
  truths:
    - "Portfolio composition shows donut chart with center asset count"
    - "Portfolio composition shows horizontal color bars with percentages"
    - "Correlation table has teal header row styling"
    - "Return values display in teal color"
  artifacts:
    - path: "src/components/ui/portfolio-composition.ts"
      provides: "Donut + horizontal bars layout for portfolio"
    - path: "src/charts/correlation-heatmap.ts"
      provides: "Teal-styled correlation table"
---

<objective>
Update dashboard components to match reference application visual style.

Purpose: Align UI with reference design for professional, cohesive appearance
Output: Portfolio composition with donut+bars layout, correlation table with teal styling
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/ui/portfolio-composition.ts
@src/charts/correlation-heatmap.ts
@src/charts/donut-chart.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redesign Portfolio Composition with Donut Chart and Horizontal Bars</name>
  <files>src/components/ui/portfolio-composition.ts</files>
  <action>
Redesign the selected assets visualization in portfolio-composition.ts to match reference:

1. **Add donut chart import and canvas:**
   - Import Chart.js doughnut controller: `import { Chart, DoughnutController, ArcElement } from 'chart.js/auto';`
   - Add canvas element in template for the donut chart
   - Register Chart.js components if not auto-registered

2. **Update template structure for selected assets section:**
   Replace the current `selected-assets-list` div with a new layout:
   ```html
   <div class="portfolio-visualization" style="display: none;">
     <div class="card-header">
       <svg class="header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="10"></circle>
         <path d="M12 2a10 10 0 0 1 10 10"></path>
       </svg>
       <div class="header-text">
         <span class="header-title">Portfolio Composition</span>
         <span class="header-subtitle">{N} Assets</span>
       </div>
     </div>
     <div class="portfolio-content">
       <div class="donut-container">
         <canvas id="portfolio-donut"></canvas>
         <div class="donut-center">{N} ASSETS</div>
       </div>
       <div class="asset-bars-list">
         <!-- Horizontal bars for each asset -->
       </div>
     </div>
   </div>
   ```

3. **Add horizontal bar rendering for each asset:**
   Each asset shows:
   - Color swatch (matching donut segment)
   - Asset name
   - Percentage value on right
   - Background bar with tinted color (10% opacity of segment color)

   Sort assets by weight descending.

4. **Add donut chart initialization in afterRender:**
   - Create Chart.js doughnut with cutout: '70%'
   - Disable legend (we use our custom bars)
   - Center text shows asset count (e.g., "5 ASSETS")

5. **Update styles for new layout:**
   - Light teal/mint background for card: `background: #f0fdfa;` (teal-50)
   - Card border: `border: 1px solid #99f6e4;` (teal-200)
   - Donut container: fixed size (120px), centered
   - Asset bars: flex layout, justify-content: space-between
   - Bar background: use segment color with 15% opacity
   - Bar height: ~28px with rounded corners

6. **Remove the old weight-bar and selected-asset-card styles** - replaced by new visualization

7. **Keep existing functionality:**
   - Weight inputs still work
   - Balance/Clear buttons still work
   - Portfolio change events still fire
  </action>
  <verify>
    Run `npm run dev` and add 3+ assets to portfolio. Verify:
    - Donut chart displays with colored segments
    - Center shows "N ASSETS" text
    - Horizontal bars appear sorted by weight descending
    - Each bar has color swatch, name, percentage
    - Card has light teal background
  </verify>
  <done>
    Portfolio composition displays as donut chart + horizontal bars matching reference style
  </done>
</task>

<task type="auto">
  <name>Task 2: Apply Teal Styling to Correlation Table</name>
  <files>src/charts/correlation-heatmap.ts</files>
  <action>
Update correlation-heatmap.ts styling to match reference application:

1. **Update header styling to teal:**
   - Table header cells: `background: #0d9488;` (teal-600), `color: white;`
   - Stats header cells: Same teal background

2. **Add header icon in card title (if visible above table):**
   - Link/chain icon before "Simulated Assets - Correlations and Returns"
   - Teal color for title text

3. **Keep correlation cell colors as-is** (green diagonal, pink negative, gradient positive)
   - The existing red-to-blue diverging scale is appropriate

4. **Update return cell styling:**
   - Already uses teal (#0d9488) - confirm it's visible
   - Ensure font-weight: 600 for emphasis

5. **Update alternating row backgrounds:**
   - Odd rows: `background: #f8fafc;` (slate-50)
   - Even rows: `background: #ffffff;`

6. **Update row-label (Name column) styling:**
   - Left-align with padding
   - Keep gray background for distinction

7. **Update styles() method with these CSS changes:**
   ```css
   .correlation-table th {
     background: #0d9488;
     color: white;
     font-weight: 600;
   }

   .correlation-table th.stats-header {
     background: #0d9488;
     color: white;
   }

   .correlation-table tbody tr:nth-child(odd) td.row-label,
   .correlation-table tbody tr:nth-child(odd) td.return-cell,
   .correlation-table tbody tr:nth-child(odd) td.volatility-cell {
     background: #f8fafc;
   }
   ```
  </action>
  <verify>
    Run `npm run dev` and run a simulation. Verify:
    - Table header row is teal with white text
    - Expected Annual Return column values are teal colored
    - Alternating row backgrounds are visible
    - Correlation cells still show color-coded values
  </verify>
  <done>
    Correlation table displays with teal header and proper styling matching reference
  </done>
</task>

</tasks>

<verification>
1. Portfolio composition card:
   - [ ] Donut chart renders with colored segments
   - [ ] Center text shows asset count
   - [ ] Horizontal bars sorted by weight descending
   - [ ] Each bar shows color swatch, name, percentage
   - [ ] Light teal card background

2. Correlation table:
   - [ ] Teal header row with white text
   - [ ] Expected Annual Return in teal
   - [ ] Alternating row backgrounds
   - [ ] Correlation cells properly colored
</verification>

<success_criteria>
- Portfolio composition matches reference: donut chart with center text + horizontal asset bars
- Correlation table matches reference: teal header styling, proper column colors
- All existing functionality preserved (weights, events, buttons)
- Visual consistency with teal (#0d9488) as accent color
</success_criteria>

<output>
After completion, create `.planning/quick/006-match-reference-dashboard-style/006-SUMMARY.md`
</output>
