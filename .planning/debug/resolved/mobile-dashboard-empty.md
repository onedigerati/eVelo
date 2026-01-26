---
status: verifying
trigger: "mobile-dashboard-empty: In mobile view, after collapsing the input parameter panel (hamburger menu), the main dashboard page becomes completely empty"
created: 2026-01-24T12:00:00Z
updated: 2026-01-24T15:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two separate "collapsed" states exist and get out of sync. sidebar-panel has `collapsed` attribute, main-layout has `sidebar-collapsed` attribute. When hamburger reopens sidebar, sidebar-panel's `collapsed` attribute is not cleared, so content stays hidden via `display: none`.
test: Traced attribute state through click sequence
expecting: After fix, hamburger click should also clear sidebar-panel's collapsed state
next_action: Fix main-layout hamburger click handler to also remove sidebar-panel's collapsed attribute

## Symptoms

expected: Dashboard should show the same content as desktop view - simulation results, charts, and analysis
actual: Main dashboard page is completely empty (white/blank) after collapsing the input panel
errors: No console errors reported
reproduction: 1) Open app in mobile view 2) Expand hamburger menu to view input parameters 3) Collapse the panel 4) Dashboard area is now empty
started: Always broken - mobile view has never worked correctly

## Eliminated

- hypothesis: CSS specificity conflict with grid-template-columns on mobile
  evidence: Fix was applied (lines 143-146 in main-layout.ts), grid columns are correct at 1fr, issue persists
  timestamp: 2026-01-24T13:30:00Z

- hypothesis: backdrop overlay covering main content when sidebar-open remains set
  evidence: Fixed by removing sidebar-open when toggle fires with collapsed:true (lines 183-185). But new issue emerged - parameter panel shows EMPTY on second hamburger click.
  timestamp: 2026-01-24T14:30:00Z

## Evidence

- timestamp: 2026-01-24T12:05:00Z
  checked: main-layout.ts CSS structure
  found: |
    1. Desktop collapsed rule at line 74-76: :host([sidebar-collapsed]) .layout { grid-template-columns: var(--sidebar-collapsed-width, 48px) 1fr; }
    2. Mobile media query at line 135-141: .layout { grid-template-areas: "header" "main"; grid-template-columns: 1fr; }
    3. :host([sidebar-collapsed]) selector has higher specificity than just .layout
    4. When sidebar-collapsed attribute is set on mobile, desktop collapsed columns (48px 1fr) override mobile columns (1fr)
    5. This creates mismatch: grid-template-areas defines 1 column, grid-template-columns defines 2
  implication: CSS specificity conflict is likely root cause - collapsed sidebar styling designed for desktop interferes with mobile layout

- timestamp: 2026-01-24T12:10:00Z
  checked: Grid area/column interaction when mismatched
  found: |
    When grid-template-areas defines 1 column per row ("header" / "main") but grid-template-columns defines 2 (48px 1fr):
    - Named areas only occupy column 1 (48px)
    - Column 2 (1fr) is unnamed and no elements are placed there
    - .main-area with grid-area: main gets squeezed to 48px width
    - .main-header with grid-area: header also gets squeezed to 48px width
  implication: Root cause CONFIRMED - main content is 48px wide (effectively invisible/clipped)

- timestamp: 2026-01-24T14:15:00Z
  checked: Event flow and z-index stacking on mobile
  found: |
    1. Hamburger button click sets sidebar-open attribute on main-layout
    2. sidebar-open triggers: .sidebar-area { transform: translateX(0) } and .sidebar-backdrop { display: block; position: fixed; inset: 0; z-index: 99 }
    3. User clicks sidebar-panel's toggle button ("<" icon)
    4. Toggle event dispatched with collapsed: true
    5. main-layout listener ONLY sets sidebar-collapsed attribute
    6. sidebar-open remains set -> backdrop remains visible at z-index 99
    7. Main content has no z-index (defaults to auto/0) -> renders BEHIND the backdrop
    8. User sees dark semi-transparent overlay covering dashboard -> appears "empty/blank"
  implication: The issue is NOT grid layout - dashboard is rendered but hidden BEHIND the backdrop overlay

- timestamp: 2026-01-24T15:00:00Z
  checked: Attribute state through full click sequence after previous fix
  found: |
    Two separate collapsed states exist:
    1. main-layout has `sidebar-collapsed` attribute (controls grid layout)
    2. sidebar-panel has `collapsed` attribute (controls content visibility via display:none)

    Trace through clicks:
    1. Initial: main-layout(sidebar-open:NO, sidebar-collapsed:NO), sidebar-panel(collapsed:NO)
    2. Hamburger click: main-layout sets sidebar-open -> sidebar-panel(collapsed:NO) content VISIBLE
    3. Toggle button click: sidebar-panel sets collapsed, main-layout sets sidebar-collapsed + removes sidebar-open
       State: main-layout(sidebar-open:NO, sidebar-collapsed:YES), sidebar-panel(collapsed:YES)
    4. Hamburger click again: main-layout sets sidebar-open
       State: main-layout(sidebar-open:YES, sidebar-collapsed:YES), sidebar-panel(collapsed:YES)
       **PROBLEM: sidebar-panel still has collapsed=YES, so CSS :host([collapsed]) .sidebar-content { display: none; } hides content**
    5. Another hamburger click: main-layout removes sidebar-open
       State: back to step 3
    6. Another hamburger click: sidebar-panel still collapsed, content still hidden

    The bug is that neither main-layout nor sidebar-panel clears the sidebar-panel's `collapsed` attribute when hamburger is clicked.
  implication: Root cause is dual-state synchronization failure. main-layout only manages sidebar-open, but sidebar-panel's collapsed state persists independently.

## Resolution

root_cause: Two independent collapsed states exist - main-layout's `sidebar-collapsed` and sidebar-panel's `collapsed` attribute. When toggle button collapses sidebar, both get set. When hamburger reopens, only `sidebar-open` is set - neither the main-layout's `sidebar-collapsed` nor sidebar-panel's `collapsed` are cleared. The sidebar-panel's CSS rule `:host([collapsed]) .sidebar-content { display: none; }` keeps the parameter content hidden.
fix: Modified main-layout's hamburger click handler (lines 191-199) to also: 1) remove sidebar-collapsed from main-layout, 2) query sidebar-panel and remove its collapsed attribute. This ensures opening via hamburger fully resets the collapsed state.
verification: |
  - TypeScript build: PASSED
  - Manual test needed: Open in mobile viewport (<=768px), perform this sequence:
    1. Refresh page - welcome page shows
    2. Click hamburger - parameter panel shows with content
    3. Click hamburger to close - welcome page shows
    4. Click hamburger again - **parameter panel should show with content (not empty)**
    5. Repeat toggle cycle - should work consistently every time
files_changed:
  - src/components/ui/main-layout.ts
