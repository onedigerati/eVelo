---
phase: 25
plan: 01
subsystem: ui-mobile
tags: [sticky, footer, mobile, css, sidebar]
requires:
  - phases: [24]
    reason: "Mobile layout improvements from Phase 24"
provides:
  - "Sticky Run Simulation button on mobile"
  - "Safe-area-inset support for iOS devices"
affects:
  - future-plans: "25-02 (parameter grouping)"
    how: "Footer positioning foundation established"
tech-stack:
  added: []
  patterns:
    - "CSS sticky positioning within flex container"
    - "env(safe-area-inset-bottom) for iOS home indicator"
key-files:
  created: []
  modified:
    - path: "src/components/ui/sidebar-panel.ts"
      changes: "Sticky footer, padding-bottom, safe-area support"
    - path: "src/components/ui/main-layout.ts"
      changes: "Mobile flex container for sticky positioning"
decisions:
  - id: "25-01-D1"
    decision: "Use position: sticky instead of position: fixed for footer"
    rationale: "Sticky maintains layout flow, fixed requires absolute positioning hacks"
metrics:
  duration: "4 min"
  completed: "2026-01-28"
---

# Phase 25 Plan 01: Sticky Run Simulation Button Summary

**One-liner:** CSS sticky footer with safe-area-insets for always-visible Run Simulation button on mobile

## What Was Built

Added sticky positioning to the Run Simulation button footer in sidebar-panel, ensuring it remains visible at all times when users scroll through parameters on mobile devices.

### Key Changes

1. **sidebar-panel.ts - Sticky Footer**
   - Added `position: sticky`, `bottom: 0`, `z-index: 10` to `.sidebar-footer`
   - Added `box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1)` for visual separation
   - Added `padding-bottom: calc(68px + 24px)` to `.sidebar-content` to prevent content overlap
   - Added `-webkit-overflow-scrolling: touch` for iOS momentum scrolling

2. **sidebar-panel.ts - Mobile Safe Area Support**
   - Mobile padding-bottom includes `env(safe-area-inset-bottom, 0px)` for iOS home bar
   - Footer padding respects safe-area-inset for devices with gesture navigation

3. **main-layout.ts - Flex Container Setup**
   - Added `display: flex` and `flex-direction: column` to mobile `.sidebar-area`
   - Added mobile-specific slotted rule with `min-height: 0` for proper sticky behavior

## Technical Details

### CSS Sticky Positioning Requirements

For sticky positioning to work, the parent must have a constrained height. The implementation ensures:
- Grid row with `1fr` provides height constraint
- `min-height: 0` allows grid items to shrink
- Flex container on sidebar-area enables proper sticky behavior

### Safe Area Calculations

```css
/* Desktop */
padding-bottom: calc(68px + 24px);  /* footer + spacing */

/* Mobile */
padding-bottom: calc(68px + 32px + env(safe-area-inset-bottom, 0px));
```

Where:
- 68px = button height (48px min-height + 16px vertical padding)
- 24px/32px = spacing buffer (larger on mobile for thumb clearance)
- env(safe-area-inset-bottom) = iOS home bar, Android gesture bar

## Commits

| Hash | Description |
|------|-------------|
| 6a3f3c0 | feat(25-01): add sticky footer positioning to sidebar-panel |
| 7f5f161 | feat(25-01): ensure mobile layout supports sticky positioning |

## Verification Results

- [x] Build succeeds without TypeScript errors
- [x] sidebar-panel.ts contains `position: sticky` in .sidebar-footer
- [x] sidebar-panel.ts contains `padding-bottom: calc(` in .sidebar-content
- [x] sidebar-panel.ts contains `env(safe-area-inset-bottom` in mobile media query
- [x] main-layout.ts contains `min-height: 0` in .sidebar-area mobile styles

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 25-02:** Mobile Parameter Section Grouping
- Sticky footer foundation is in place
- Parameter sections can be reorganized without affecting footer positioning
