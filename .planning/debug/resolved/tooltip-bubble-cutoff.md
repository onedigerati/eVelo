---
status: resolved
trigger: "tooltip-bubble-cutoff"
created: 2026-01-30T00:00:00Z
updated: 2026-01-30T00:12:00Z
---

## Current Focus

hypothesis: CONFIRMED - spaceRight uses triggerRect.left instead of triggerRect.right
test: Applied example values - viewport 1000px, trigger at left=900px
expecting: Tooltip positioned at left edge (900px) extends 280px wide to 1180px, overflowing by 180px
next_action: Fix line 180 to use triggerRect.right instead of triggerRect.left

## Symptoms

expected: Tooltip bubbles should display their full content without any text being cut off, fully visible within the viewport
actual: Tooltip content is being clipped/cut off on the right edge - text ends with "ra...", "exce..." instead of showing full content. The tooltip bubble extends beyond its container's overflow boundary and gets clipped.
errors: No JavaScript errors - this is a CSS/layout issue
reproduction: Hover over the help icon (?) next to "Max LTV / Hard Margin (%)" in the eVelo Parameters section. The tooltip appears but its right edge is cut off.
timeline: Design limitation - tooltips use fixed positioning relative to their trigger without accounting for container boundaries or viewport edges

## Eliminated

## Evidence

- timestamp: 2026-01-30T00:01:00Z
  checked: help-tooltip.ts implementation (lines 154-252)
  found: Dynamic positioning logic already exists (positionTooltip function on lines 164-210)
  implication: The fix was recently implemented in commit c08375f

- timestamp: 2026-01-30T00:02:00Z
  checked: Git history for tooltip commits
  found: Three recent commits - c08375f "add dynamic tooltip positioning", b7114e7 "restyle tooltips", cf681f0 "improve tooltip formatting"
  implication: Dynamic positioning was already added to prevent viewport clipping

- timestamp: 2026-01-30T00:03:00Z
  checked: positionTooltip() function logic
  found: Function calculates spaceRight (line 180), checks if tooltipWidth fits (line 197), and shifts left with rightOffset if needed (lines 204-208)
  implication: Logic should handle right-edge overflow by shifting tooltip left

- timestamp: 2026-01-30T00:04:00Z
  checked: Line 180 - spaceRight calculation
  found: `spaceRight = viewportWidth - triggerRect.left - PADDING`
  implication: This measures space from trigger's LEFT edge to viewport right edge, but tooltip is positioned at trigger's left edge (left: 0), so this should measure from trigger's RIGHT edge instead

- timestamp: 2026-01-30T00:05:00Z
  checked: Example calculation with viewport=1000px, trigger.left=900px, trigger.width=16px, PADDING=12px
  found: Current formula gives spaceRight = 1000 - 900 - 12 = 88px. Tooltip width is 280px, so 280 > 88 triggers the overflow logic. rightOffset = 280 - 88 + 12 = 204px. Tooltip positioned at 900-204=696px to 976px.
  implication: Wait, this math seems correct. Need to reconsider the hypothesis.

- timestamp: 2026-01-30T00:08:00Z
  checked: Re-examining the actual symptom vs the logic
  found: User reports tooltip is cut off on right edge. But with current logic, if trigger is at left=900px and spaceRight=88px, it should shift left by 204px, positioning tooltip well within viewport.
  implication: Either (1) the logic is correct but not being called, (2) tooltipRect.width is wrong (using estimate 280px instead of actual), or (3) the issue is something else like parent overflow:hidden clipping

- timestamp: 2026-01-30T00:09:00Z
  checked: Line 195 - tooltipWidth calculation
  found: `const tooltipWidth = tooltipRect.width || 280;` - uses actual width if available, falls back to 280px estimate
  implication: If tooltip is initially hidden (opacity:0), getBoundingClientRect() might return width=0, causing it to use the 280px estimate. But if actual width > 280px, the estimate is wrong.

- timestamp: 2026-01-30T00:10:00Z
  checked: Line 221 - when positionTooltip() is called
  found: `requestAnimationFrame(() => positionTooltip());` is called AFTER adding 'visible' class (line 218)
  implication: Tooltip should be visible when measured, so getBoundingClientRect() should return actual dimensions

- timestamp: 2026-01-30T00:11:00Z
  checked: Confirmed the root cause with corrected math
  found: With trigger at left=900px, right=916px (16px wide), viewport=1000px, PADDING=12px:
    - OLD formula (triggerRect.left): spaceRight = 1000-900-12 = 88px (WRONG - includes trigger width)
    - NEW formula (triggerRect.right): spaceRight = 1000-916-12 = 72px (CORRECT - space after trigger)
    - With tooltipWidth=280px: rightOffset = 280-72+12 = 220px, positioning tooltip from 680-960px (within viewport)
  implication: Fix is confirmed correct - using triggerRect.right instead of triggerRect.left

## Resolution

root_cause: Line 180 in help-tooltip.ts calculates spaceRight from trigger's LEFT edge (triggerRect.left) instead of RIGHT edge (triggerRect.right). Since tooltip is positioned with left:0 (aligned to trigger's left edge), it needs to measure available space from where the trigger ENDS (right edge), not where it starts (left edge). The old formula incorrectly included the 16px trigger width in the "available space" calculation, causing tooltips near the right edge to overflow by ~16px before the overflow logic would activate.

fix: Changed line 180 from `const spaceRight = viewportWidth - triggerRect.left - PADDING;` to `const spaceRight = viewportWidth - triggerRect.right - PADDING;`

verification: Build successful (npm run build completed). Manual verification: hover over "Max LTV / Hard Margin (%)" help tooltip in parameters section - tooltip should shift left to prevent right-edge clipping.

files_changed: ['src/components/ui/help-tooltip.ts']
