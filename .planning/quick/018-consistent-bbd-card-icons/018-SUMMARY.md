---
phase: quick-018
plan: 01
subsystem: ui
tags: [svg, icons, welcome-screen, visual-consistency]

# Dependency graph
requires:
  - phase: 17-welcome-page-user-guide
    provides: welcome-screen component with BBD step cards
provides:
  - Consistent flat SVG line-art icons for all three BBD step cards
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline SVG icons with 2px stroke for consistent flat line-art style"

key-files:
  created: []
  modified:
    - src/components/ui/welcome-screen.ts

key-decisions:
  - "Bar chart SVG for Buy (growing investment)"
  - "Institution/bank SVG for Borrow (lending)"
  - "Balance scale SVG for Die (estate/inheritance)"
  - "Set 2 chosen from mockup options (user preference)"

patterns-established:
  - "Use inline SVG with stroke-based rendering for icon consistency"
  - "48x48px icon size with 2px stroke weight"

# Metrics
duration: 5min
completed: 2026-01-31
---

# Quick Task 018: Consistent BBD Card Icons Summary

**Replaced emoji icons with flat SVG line-art icons for visual consistency across all three BBD step cards**

## Performance

- **Duration:** 5 min (including mockup review)
- **Started:** 2026-01-31
- **Completed:** 2026-01-31
- **Tasks:** 2 (initial Unicode, then SVG refinement)
- **Files modified:** 1

## Accomplishments

- Created HTML mockup with 18 icon options for user review
- Presented 4 recommended icon sets for comparison
- Implemented Set 2 (user's choice): Bar Chart + Institution + Balance Scale
- All three BBD cards now share consistent flat SVG line-art aesthetic

## Task Commits

1. **Task 1: Replace BBD card icons with flat Unicode symbols** - `7086b9a` (initial)
2. **Task 2: Replace with SVG icons (Set 2)** - `954dac7` (final)

## Files Modified

- `src/components/ui/welcome-screen.ts` - Replaced Unicode entities with inline SVG icons

## Icon Changes

| Card   | Before (Emoji)           | After (SVG)              | Description |
|--------|--------------------------|--------------------------|-------------|
| Buy    | `&#x1F4C8;` (3D chart)   | Bar chart SVG            | Growing bar chart (investment growth) |
| Borrow | `&#x1F3E6;` (bank)       | Institution SVG          | Bank/institution (lending source) |
| Die    | `&#x2696;` (emoji scale) | Balance scale SVG        | Balance scale (estate/inheritance) |

## Decisions Made

- Used inline SVG with `stroke="currentColor"` for theme compatibility
- 48x48px icon size with 2px stroke weight for consistent visual weight
- Icons inherit teal color from CSS custom property
- Set 2 chosen for classic finance aesthetic that clearly conveys meaning

## Process

1. Initial implementation used Unicode symbols (quick fix)
2. User requested more depth - created HTML mockup with options
3. Presented 6 options per card + 4 complete sets
4. User selected Set 2 (Bar Chart + Institution + Balance Scale)
5. Implemented SVG icons with proper CSS styling

## Deviations from Plan

- Added mockup creation step based on user feedback
- Changed from Unicode to SVG for better visual depth

## Issues Encountered

None

## Next Phase Readiness

- Visual consistency achieved with professional SVG icons
- No blockers or concerns

---
*Quick Task: 018-consistent-bbd-card-icons*
*Completed: 2026-01-31*
