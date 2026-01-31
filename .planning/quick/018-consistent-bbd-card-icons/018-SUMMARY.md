---
phase: quick-018
plan: 01
subsystem: ui
tags: [unicode, icons, welcome-screen, visual-consistency]

# Dependency graph
requires:
  - phase: 17-welcome-page-user-guide
    provides: welcome-screen component with BBD step cards
provides:
  - Consistent flat Unicode icons for all three BBD step cards
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flat Unicode symbols over emoji for cross-platform consistency"

key-files:
  created: []
  modified:
    - src/components/ui/welcome-screen.ts

key-decisions:
  - "Black upward triangle for Buy (growth/appreciation)"
  - "Clockwise circle arrow for Borrow (money circulation)"
  - "Balance scale for Die (already correct, kept unchanged)"

patterns-established:
  - "Use Unicode code points (not emoji) for consistent cross-platform rendering"

# Metrics
duration: 2min
completed: 2026-01-31
---

# Quick Task 018: Consistent BBD Card Icons Summary

**Replaced 3D emoji icons with flat Unicode symbols for visual consistency across all three BBD step cards**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-31T00:23:50Z
- **Completed:** 2026-01-31T00:25:50Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced Buy icon from 3D chart emoji to solid upward triangle
- Replaced Borrow icon from detailed bank emoji to clockwise circle arrow
- All three BBD cards now share consistent flat, line-art aesthetic

## Task Commits

1. **Task 1: Replace BBD card icons with flat Unicode symbols** - `7086b9a` (fix)

## Files Modified

- `src/components/ui/welcome-screen.ts` - Updated icon HTML entities in template()

## Icon Changes

| Card   | Before (Emoji)           | After (Unicode)          | Symbol |
|--------|--------------------------|--------------------------|--------|
| Buy    | `&#x1F4C8;` (3D chart)   | `&#x25B2;` (triangle)    | Black up-pointing triangle |
| Borrow | `&#x1F3E6;` (bank)       | `&#x21BB;` (arrow)       | Clockwise open circle arrow |
| Die    | `&#x2696;` (scale)       | `&#x2696;` (scale)       | Balance scale (unchanged) |

## Decisions Made

- Used Unicode code points instead of emoji for consistent rendering across platforms
- Chose geometric shapes that intuitively convey meaning:
  - Triangle pointing up = growth/appreciation
  - Circle arrow = circulation/borrowing cycle
  - Balance scale = weighing inheritance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Visual consistency achieved across welcome screen
- No blockers or concerns

---
*Quick Task: 018-consistent-bbd-card-icons*
*Completed: 2026-01-31*
