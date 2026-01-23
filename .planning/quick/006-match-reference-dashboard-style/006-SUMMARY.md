---
phase: quick
plan: 006
subsystem: ui-components
tags: [ui, visualization, charts, styling, design]
requires: [07-ui-components, 06-visualizations]
provides: [portfolio-donut-visualization, teal-correlation-table]
affects: []
tech-stack:
  added: []
  patterns: [donut-chart-with-bars, teal-theme-styling]
key-files:
  created: []
  modified:
    - src/components/ui/portfolio-composition.ts
    - src/charts/correlation-heatmap.ts
decisions:
  - slug: donut-plus-bars-layout
    what: Portfolio composition shows both donut chart and horizontal bars
    why: Provides visual summary while maintaining detailed view
    when: 2026-01-22
  - slug: teal-table-headers
    what: Correlation table uses teal headers with white text
    why: Matches reference design and brand color consistency
    when: 2026-01-22
  - slug: alternating-row-backgrounds
    what: Table rows alternate between #f8fafc and #ffffff
    why: Improves readability and visual hierarchy
    when: 2026-01-22
metrics:
  duration: 5.5 min
  completed: 2026-01-22
---

# Quick Task 006: Match Reference Dashboard Style Summary

**One-liner:** Portfolio composition now displays donut chart with horizontal asset bars, and correlation table features teal header styling.

## Objective

Update dashboard components to match reference application visual style for professional, cohesive appearance.

## What Was Built

### 1. Portfolio Composition Redesign (Task 1)

**Changes:**
- Added Chart.js donut chart showing asset allocation with 70% cutout
- Implemented horizontal bars displaying assets sorted by weight descending
- Created light teal card background (#f0fdfa) with teal border (#99f6e4)
- Added card header with icon, title "Portfolio Composition", and asset count subtitle
- Center text in donut shows asset count (e.g., "5 ASSETS")
- Each horizontal bar shows color swatch, asset name, and percentage
- Bars use semi-transparent background (15% opacity) of segment color

**Technical Implementation:**
- Imported Chart.js `DoughnutController` and `ArcElement`
- Created `donutChart` instance variable for lifecycle management
- `initializeDonutChart()` creates chart with legend disabled
- `updateDonutChart()` updates chart data when weights change
- `renderVisualizationOnly()` updates bars and chart without re-rendering cards
- Proper cleanup via `disconnectedCallback()` to destroy chart
- Maintained existing weight input cards for editing functionality

**Files Modified:**
- `src/components/ui/portfolio-composition.ts`

**Commit:** `19f038d`

### 2. Correlation Table Teal Styling (Task 2)

**Changes:**
- Updated table headers to teal background (#0d9488) with white text
- Applied same teal styling to stats header columns
- Added alternating row backgrounds: odd rows #f8fafc, even rows #ffffff
- Alternating backgrounds applied to row labels, return cells, and volatility cells
- Return column values remain teal (#0d9488) with font-weight 600
- Maintained existing color-coded correlation cells (red-to-blue gradient)

**Technical Implementation:**
- Changed header `th` background from gray to teal (#0d9488)
- Changed header text color to white
- Added CSS rules for `tbody tr:nth-child(odd)` and `tbody tr:nth-child(even)`
- Applied alternating backgrounds to `.row-label`, `.return-cell`, `.volatility-cell`

**Files Modified:**
- `src/charts/correlation-heatmap.ts`

**Commit:** `b01a589`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria met:

**Portfolio Composition:**
- ✅ Donut chart renders with colored segments
- ✅ Center text shows asset count
- ✅ Horizontal bars sorted by weight descending
- ✅ Each bar shows color swatch, name, percentage
- ✅ Light teal card background (#f0fdfa)

**Correlation Table:**
- ✅ Teal header row with white text (#0d9488)
- ✅ Expected Annual Return in teal
- ✅ Alternating row backgrounds (#f8fafc / #ffffff)
- ✅ Correlation cells properly colored (red-to-blue gradient maintained)

**Functionality Preserved:**
- ✅ Weight inputs still work in selected asset cards
- ✅ Balance/Clear buttons functional
- ✅ Portfolio change events fire correctly
- ✅ Add/Remove assets works
- ✅ Donut chart updates when weights change

## Technical Decisions

**Portfolio Visualization Architecture:**
- Keep both visualization card AND weight editing cards
- Visualization is view-only, cards provide editing interface
- Update visualization when weight inputs change via `renderVisualizationOnly()`
- Chart lifecycle managed with `disconnectedCallback()` cleanup

**Color Consistency:**
- Teal (#0d9488) used as primary accent color across both components
- Light teal background (#f0fdfa) for portfolio card
- Teal headers for correlation table
- Maintains existing ASSET_COLORS palette for donut segments

**CSS Custom Properties:**
- Horizontal bars use CSS custom properties `--bar-width` and `--bar-color`
- Enables dynamic styling via inline styles
- Cleaner than generating full style attributes

## Known Limitations

None identified.

## Next Steps

None - quick task complete. Visual styling now matches reference design.

## Performance Notes

- Duration: 5.5 minutes
- 2 commits (1 per task)
- 2 files modified
- No new dependencies (Chart.js already in use)
- Chart properly destroyed on disconnect to prevent memory leaks

## Testing Recommendations

1. **Visual regression:**
   - Verify donut chart renders correctly with 1-10 assets
   - Check horizontal bars display proper widths and colors
   - Confirm correlation table headers are teal

2. **Interaction:**
   - Test weight input changes update visualization
   - Verify Balance/Clear buttons work
   - Test add/remove assets updates donut chart

3. **Responsive:**
   - Check layout on mobile (donut + bars should wrap appropriately)
   - Verify correlation table scrolls horizontally if needed

## Lessons Learned

- Keeping both visualization and editing interfaces provides better UX
- CSS custom properties with inline styles are effective for dynamic bar widths
- Chart.js lifecycle management is critical to prevent memory leaks
- Teal accent color provides strong visual consistency across components
