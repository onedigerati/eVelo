---
status: resolved
trigger: "dashboard-chart-overlap - Dashboard components are overlapping - the Strategy Analysis section and BBD Recommended card are overlapping with the bar chart above them"
created: 2026-01-22T00:00:00Z
updated: 2026-01-22T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - bbd-comparison-chart is missing from the absolute positioning CSS selector
test: Compare CSS rules for chart components - found the issue
expecting: Adding bbd-comparison-chart to the selector will fix the overlap
next_action: Apply fix and verify

## Symptoms

expected: Chart sections should be stacked vertically without overlapping. Each component (BBD Strategy vs Sell Assets Comparison chart, Strategy Analysis section, BBD Recommended card) should be in its own distinct area with proper spacing.

actual: The "Strategy Analysis" header with scales icon and "Based on 10,000 Monte C..." text is overlapping with the bottom portion of the bar chart. The $50M and $0 y-axis labels are behind the Strategy Analysis section. The green "BBD Recommended" card overlaps the bottom of the chart area. The "100%" success rate circle is partially cut off at the right edge.

errors: No console errors - this is a visual/CSS layout issue.

reproduction: Load the dashboard view with simulation results. The chart comparison and analysis sections overlap visually.

started: Unknown - appears to be a CSS/layout issue in the results dashboard view.

## Eliminated

## Evidence

- timestamp: 2026-01-22T00:10:00Z
  checked: results-dashboard.ts CSS rules for chart positioning
  found: |
    Lines 448-456 define absolute positioning for chart children:
    `.chart-container probability-cone-chart,
     .chart-container histogram-chart,
     .chart-container donut-chart,
     .chart-container correlation-heatmap { position: absolute; inset: 0; ... }`

    But `bbd-comparison-chart` is NOT in this selector list.

    The `.bbd-container` class (line 553-555) only sets `height: 300px`,
    relying on the child having absolute positioning to be constrained.

    Without absolute positioning, the chart uses `display: block` from BaseChart
    and its natural height, which causes it to overflow its container.
  implication: Adding bbd-comparison-chart to the selector will properly contain it

- timestamp: 2026-01-22T00:12:00Z
  checked: Similar pattern for comparison-chart-container
  found: |
    Lines 689-697 show the CORRECT pattern:
    `.comparison-chart-container comparison-line-chart,
     .comparison-chart-container cumulative-costs-chart,
     .comparison-chart-container terminal-comparison-chart,
     .comparison-chart-container sbloc-utilization-chart { position: absolute; inset: 0; ... }`

    These charts ARE included, confirming the pattern is intentional.
  implication: The bbd-comparison-chart was simply omitted from the selector

## Resolution

root_cause: bbd-comparison-chart is missing from the CSS selector that applies absolute positioning to chart elements within .chart-container. This causes the chart to use its natural height instead of being constrained to the 300px parent container, resulting in overlap with the Strategy Analysis section below.

fix: Added bbd-comparison-chart to the CSS selector on line 452 of results-dashboard.ts. This applies `position: absolute; inset: 0; width: 100%; height: 100%;` to the chart element, constraining it to the 300px parent container.
verification: Build succeeds. The fix adds absolute positioning to bbd-comparison-chart which constrains it to the 300px parent container, matching the pattern used for all other chart components.
files_changed:
  - components/ui/results-dashboard.ts
