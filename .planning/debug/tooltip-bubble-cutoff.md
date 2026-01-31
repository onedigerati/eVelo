---
status: fixing
trigger: "Continue debugging tooltip-bubble-cutoff. Previous fix FAILED - need deeper investigation."
created: 2026-01-30T00:00:00Z
updated: 2026-01-30T18:20:00Z
---

## Current Focus

hypothesis: CONFIRMED - Root cause found and fix implemented
test: Changed tooltip from position:absolute to position:fixed to escape overflow:hidden clipping
expecting: Tooltips now render relative to viewport and won't be clipped by parent overflow:hidden
next_action: Manual verification needed - test by hovering over help icons in Parameters section

## Symptoms

expected: Tooltip bubbles should display their full content without any text being cut off
actual: Tooltip content is STILL being clipped/cut off on the right edge - text ends with "ra...", "exce..."
errors: No JavaScript errors - this is a CSS/layout issue
reproduction: Hover over the help icon (?) next to "Max LTV / Hard Margin (%)" in the eVelo Parameters section
started: Previous fix (triggerRect.left → triggerRect.right) was applied but did NOT resolve the issue

## Eliminated

- hypothesis: spaceRight calculation used wrong edge (triggerRect.left instead of triggerRect.right)
  evidence: Fix was applied to line 180, but tooltip still gets cut off
  timestamp: 2026-01-30T18:05:00Z

## Evidence

- timestamp: 2026-01-30T18:10:00Z
  checked: help-tooltip.ts complete implementation (lines 1-263)
  found: Tooltip uses position:absolute with z-index:10000, positioned dynamically via JavaScript. The positioning logic (lines 164-210) correctly calculates viewport boundaries and shifts tooltip left when needed.
  implication: The positioning logic is correct, but position:absolute doesn't escape parent containers with overflow:hidden

- timestamp: 2026-01-30T18:11:00Z
  checked: DOM hierarchy from app-root.ts (line 191)
  found: help-tooltip is used inside param-section elements (e.g., line 191: `<help-tooltip content="Maximum loan-to-value ratio..." position="bottom"></help-tooltip>`)
  implication: The tooltip is a child of param-section, so any overflow:hidden on param-section or its children will clip the tooltip

- timestamp: 2026-01-30T18:13:00Z
  checked: param-section.ts styles (line 53-59)
  found: `details { overflow: hidden; }` on line 58
  implication: THIS IS THE ROOT CAUSE! The details element has overflow:hidden, which clips all absolutely positioned children including tooltips. The tooltip's position:absolute with left positioning extends beyond the details element's bounds and gets clipped.

- timestamp: 2026-01-30T18:14:00Z
  checked: Common CSS knowledge about overflow:hidden and position:absolute
  found: position:absolute is positioned relative to nearest positioned ancestor (position:relative/absolute/fixed), but overflow:hidden clips content regardless. To escape overflow:hidden, need to use position:fixed (relative to viewport) OR move tooltip outside the clipping container.
  implication: Current tooltip implementation cannot work inside overflow:hidden containers. Need to change strategy.

- timestamp: 2026-01-30T18:15:00Z
  checked: Possible solutions
  found: Three approaches:
    1. Remove overflow:hidden from param-section details element (might break intended design)
    2. Change tooltip to position:fixed (relative to viewport, escapes all overflow)
    3. Portal the tooltip to document.body outside shadow DOM (complex, breaks encapsulation)
  implication: Position:fixed is the cleanest solution - tooltip already calculates viewport-relative positions using getBoundingClientRect(), so changing to position:fixed should work with minimal changes

- timestamp: 2026-01-30T18:18:00Z
  checked: Implementation of position:fixed fix
  found: Changed line 82 from `position: absolute` to `position: fixed`. Updated positioning logic (lines 164-210) to use viewport coordinates: `tooltip.style.left = ${triggerRect.left}px` instead of relative positioning, and `tooltip.style.top = ${triggerRect.bottom + GAP}px` for absolute viewport positioning.
  implication: Tooltip now positions relative to viewport and escapes all overflow:hidden containers

- timestamp: 2026-01-30T18:20:00Z
  checked: Build verification
  found: npm run build succeeded - TypeScript compilation and Vite build completed without errors
  implication: Code changes are syntactically correct and ready for testing

## Resolution

root_cause: Tooltip is clipped by `overflow: hidden` on parent `details` element in param-section.ts (line 58). The tooltip uses position:absolute which is clipped by overflow:hidden. Even though the positioning logic correctly calculates space and shifts left when needed, the tooltip extends beyond the details element's boundaries and gets visually clipped.

fix: Changed tooltip from position:absolute to position:fixed (line 82 in help-tooltip.ts). Updated positioning logic to use absolute viewport coordinates instead of relative positioning:
  - For vertical: `top: ${triggerRect.bottom + GAP}px` or `bottom: ${viewportHeight - triggerRect.top + GAP}px`
  - For horizontal: `left: ${triggerRect.left}px` or `left: ${triggerRect.left - rightOffset}px` when shifted

This allows the tooltip to escape overflow:hidden clipping while maintaining the same visual positioning behavior.

verification: Build successful. MANUAL TEST REQUIRED: Open dev server, hover over help icon next to "Max LTV / Hard Margin (%)" parameter - tooltip should display full content without clipping.

files_changed: ['src/components/ui/help-tooltip.ts']
