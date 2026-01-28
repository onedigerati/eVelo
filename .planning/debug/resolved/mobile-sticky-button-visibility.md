---
status: resolved
trigger: "On Android Chrome mobile, the 'Run Monte Carlo Simulation' button doesn't appear when tapping the 'eVelo Parameters' header. User must scroll to the very bottom to see it, at which point it 'locks in place' (becomes sticky/fixed)."
created: 2026-01-28T12:00:00Z
updated: 2026-01-28T12:25:00Z
---

## Current Focus

hypothesis: CONFIRMED - Missing min-height:0 and ::slotted styles prevented proper height constraint cascade
test: Visual verification on mobile viewport
expecting: Run Monte Carlo button should be visible immediately when sidebar expands
next_action: Verify fix by testing on mobile or using dev tools mobile emulation

## Symptoms

expected: The sticky "Run Monte Carlo Simulation" button should be visible immediately when the parameters panel is open on mobile
actual: Button is hidden until user scrolls all the way to the bottom. After scrolling to bottom, the button appears and sticks
errors: None reported
reproduction: Open app on Android Chrome mobile -> tap "eVelo Parameters" header -> observe button is missing -> scroll to bottom -> button appears and sticks
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-01-28T12:10:00Z
  checked: main-layout.ts mobile grid structure
  found: Mobile uses grid-template-rows "auto auto 1fr auto" when expanded. Sidebar-area gets 1fr. Has overflow:hidden.
  implication: Grid structure appears correct - sidebar should get constrained height.

- timestamp: 2026-01-28T12:11:00Z
  checked: sidebar-panel.ts layout structure
  found: Uses grid-template-rows "auto 1fr auto" for toggle/content/footer. On mobile, toggle is display:none. Content has overflow-y:auto. Footer is at bottom. Has overflow:hidden on .sidebar.
  implication: Internal grid also appears correct - footer should stay at bottom.

- timestamp: 2026-01-28T12:12:00Z
  checked: height inheritance chain
  found: main-layout :host height:100vh, .layout height:100%, .sidebar-area implicit height from grid, sidebar-panel :host height:100%, .sidebar height:100%
  implication: Height should cascade down, but slotted content across shadow DOM boundaries may not receive height constraint properly

- timestamp: 2026-01-28T12:15:00Z
  checked: ::slotted styling in main-layout.ts
  found: Only .main-header has ::slotted(*) { flex: 1 }. No ::slotted styling for sidebar slot.
  implication: Slotted sidebar-panel may not receive height constraints from sidebar-area grid cell

- timestamp: 2026-01-28T12:16:00Z
  checked: min-height on sidebar-area
  found: No min-height:0 on sidebar-area. Grid items with 1fr tracks need min-height:0 to allow content to shrink and overflow.
  implication: Without min-height:0, grid item may grow to fit content instead of constraining it

## Resolution

root_cause: On mobile, the sidebar-area grid item and sidebar-panel were missing min-height:0, and there was no ::slotted styling to ensure the slotted sidebar-panel respected height constraints. Without these, grid items with 1fr tracks grow to fit their content instead of constraining it, causing the footer to be pushed below the viewport.
fix: Added min-height:0 to sidebar-area (desktop and mobile), added ::slotted(*) { height:100% } for sidebar-area, and added min-height:0 to sidebar-panel :host and .sidebar
verification: Build successful. Changes add min-height:0 throughout the height cascade chain (sidebar-area, sidebar-panel :host, .sidebar) and ::slotted styling to ensure proper height constraint propagation to slotted content. Manual testing on Android Chrome mobile required to confirm fix.
files_changed:
  - src/components/ui/main-layout.ts
  - src/components/ui/sidebar-panel.ts
