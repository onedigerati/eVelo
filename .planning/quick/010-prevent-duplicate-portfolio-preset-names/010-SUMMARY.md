---
type: quick-summary
task: 010
title: Prevent duplicate portfolio preset names
completed: 2026-01-23
duration: 3 min
---

# Quick Task 010: Prevent Duplicate Portfolio Preset Names

**One-liner:** Case-insensitive duplicate detection with overwrite/change-name modal for portfolio presets

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | e2caede | feat(quick-010): prevent duplicate portfolio preset names |

## Changes Summary

### portfolio-service.ts
- Added `findPortfolioByName(name: string)` helper function
- Case-insensitive lookup using `toLowerCase()` comparison
- Excludes temp portfolio from search results

### portfolio-composition.ts
- Imported `findPortfolioByName` from portfolio-service
- Modified `savePreset()` method with duplicate-aware save flow:
  1. Prompt for name (unchanged)
  2. Check for existing portfolio with same name (case-insensitive)
  3. If duplicate exists and not the current portfolio, show modal with "Overwrite" / "Change Name" options
  4. "Change Name" recursively calls savePreset() to restart flow
  5. "Overwrite" preserves existing portfolio's ID and created timestamp

## Key Implementation Details

- **Case-insensitive:** "Test" and "test" are considered duplicates
- **Self-overwrite allowed:** Saving over the currently loaded portfolio doesn't trigger duplicate warning
- **Timestamp preservation:** When overwriting, the original `created` timestamp is preserved
- **Recursive UX:** "Change Name" returns to save dialog for new name entry

## Verification

- [x] npm run build completes without errors
- [x] TypeScript types satisfied (created timestamp properly handled)
- [x] Duplicate detection is case-insensitive
- [x] Overwrite updates existing portfolio (same ID)
- [x] Change Name returns to save dialog

## Files Modified

- `src/data/services/portfolio-service.ts` - Added findPortfolioByName helper
- `src/components/ui/portfolio-composition.ts` - Duplicate-aware savePreset flow
