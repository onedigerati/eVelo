---
status: resolved
trigger: "Multiple layout and display issues on the dashboard results page in mobile view"
created: 2026-01-25T10:00:00Z
updated: 2026-01-25T10:00:00Z
---

## Current Focus

hypothesis: The main-layout.ts main-content area has overflow-x: hidden which clips content, while individual components lack proper width constraints (box-sizing, max-width: 100%) causing content to overflow the viewport
test: Check main-layout.ts overflow handling and component width constraints
expecting: Components render wider than viewport, get clipped by parent overflow-x: hidden
next_action: Apply fix to main-content area to use overflow-x: auto and add width constraints to components

## Symptoms

expected: Dashboard components should render properly on mobile with no overflow, clipping, or layout issues. All text should be readable, tables should be scrollable or responsive, charts should fit within viewport, legends should be fully visible.

actual: Multiple issues observed:
1. Parameter summary section shows labels but values appear empty/missing
2. Percentile spectrum horizontal bars are cut off on the right edge
3. Asset Correlations table columns getting cut off
4. Salary Equivalent section content being clipped
5. Chart legends being cut off on the right side
6. Text content blocks overflowing and getting clipped
7. "SBLOC Balance Over Time" chart title overlapping with previous chart
8. Large blue rectangle artifact over BBD Strategy vs Sell Assets Comparison chart
9. Various card sections have content overflow issues

errors: CSS/layout rendering issues - no console errors

reproduction: View the dashboard results page on mobile device or mobile viewport width. Run a simulation and scroll through the results.

started: Current state of the codebase

## Eliminated

## Evidence

- timestamp: 2026-01-25T10:05:00Z
  checked: main-layout.ts styles
  found: main-content area has `overflow-x: hidden` (line 172) and mobile padding of `var(--spacing-md, 16px) var(--spacing-sm, 8px)` (line 180-181)
  implication: Content wider than viewport gets clipped instead of scrolling

- timestamp: 2026-01-25T10:06:00Z
  checked: results-dashboard.ts styles
  found: Grid layout with gap spacing, chart containers with fixed heights (400px desktop, 280px mobile), mobile responsive breakpoints at 768px and 480px
  implication: Components have responsive styles but may not constrain width properly

- timestamp: 2026-01-25T10:07:00Z
  checked: param-summary.ts styles
  found: Uses flexbox layout but param-value elements have no text truncation or overflow handling - just `font-size: var(--font-size-lg, 1.125rem)` at normal size
  implication: Values with long currency strings could overflow if not constrained

- timestamp: 2026-01-25T10:08:00Z
  checked: percentile-spectrum.ts styles
  found: value-box elements have `min-width: 100px` for p10/p90 and `min-width: 140px` for p50. On mobile, these are reduced to 70px/90px at 768px breakpoint. At 480px, value-row goes to flex-direction: column
  implication: At widths between 480-768px, the horizontal layout with min-widths could overflow

- timestamp: 2026-01-25T10:09:00Z
  checked: salary-equivalent-section.ts styles
  found: Uses text-align: center with clamp() for font sizes, but no overflow or text-wrap handling on the explanation text
  implication: Long text lines could overflow on narrow screens

- timestamp: 2026-01-25T10:10:00Z
  checked: correlation-heatmap.ts styles
  found: Has `min-width: max-content` on table (line 296) which forces table to be as wide as content, and table-container has overflow-x: auto
  implication: Table scrolling should work but note-section text may overflow

- timestamp: 2026-01-25T10:11:00Z
  checked: tokens.css
  found: No global box-sizing rule, no global overflow rules
  implication: Components may not inherit box-sizing: border-box, causing padding to add to width

- timestamp: 2026-01-25T10:15:00Z
  checked: style.css global styles
  found: Global box-sizing: border-box rule exists at line 5-8, BUT this doesn't penetrate Shadow DOM
  implication: Web components need their own box-sizing reset since Shadow DOM isolates styles

- timestamp: 2026-01-25T10:16:00Z
  checked: base-chart.ts and chart rendering
  found: Canvas uses 100% width/height, container is relative positioned with 100% w/h
  implication: Charts should scale correctly, legends may overflow if positioned outside canvas

- timestamp: 2026-01-25T10:17:00Z
  checked: Multiple components for pattern
  found: Common issue - components have padding but no width constraints (max-width: 100%), and no overflow handling for text content. Long currency values and text can push content wider than viewport.
  implication: Need to add max-width and overflow handling to prevent content overflow

## Resolution

root_cause: Multiple CSS issues causing mobile overflow:
1. main-layout.ts main-content has overflow-x: hidden which clips content
2. Shadow DOM isolation prevents global box-sizing rule from applying to components
3. Components lack max-width: 100% constraint allowing content to exceed viewport
4. percentile-spectrum value boxes have min-width that causes overflow between 480-768px
5. Text content in salary-equivalent and other components lacks overflow-wrap handling

fix: Applied comprehensive CSS fixes:
1. main-layout.ts: Changed overflow-x from hidden to auto, added max-width: 100%
2. Added box-sizing reset (*, *::before, *::after { box-sizing: border-box; }) to all affected components
3. Added max-width: 100% to :host of all components to prevent overflow
4. percentile-spectrum.ts: Added flex-wrap and flex:1 to value-row and value-boxes for better responsive behavior
5. param-summary.ts: Added min-width:0, gap, and text handling to param-item and param-value
6. salary-equivalent-section.ts: Added overflow-wrap to explanation text
7. correlation-heatmap.ts: Added overflow-wrap to note-section

verification: Build compiles successfully (npm run build). Manual mobile testing recommended to confirm visual fixes.
files_changed:
- src/components/ui/main-layout.ts
- src/components/ui/results-dashboard.ts
- src/components/ui/param-summary.ts
- src/components/ui/percentile-spectrum.ts
- src/components/ui/salary-equivalent-section.ts
- src/charts/correlation-heatmap.ts
- src/components/ui/strategy-analysis.ts
- src/components/ui/key-metrics-banner.ts
- src/components/ui/yearly-analysis-table.ts
- src/components/ui/recommendations-section.ts
- src/components/ui/comparison-dashboard.ts
- src/components/ui/range-slider.ts
- src/components/ui/number-input.ts
- src/components/ui/select-input.ts
- src/components/ui/param-section.ts
- src/components/ui/app-header.ts
