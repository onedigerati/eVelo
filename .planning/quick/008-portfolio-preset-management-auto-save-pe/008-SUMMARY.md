---
phase: quick-008
plan: 01
subsystem: ui-components
tags: [portfolio, indexeddb, persistence, auto-save, presets]
dependency-graph:
  requires: [quick-007]
  provides: [portfolio-persistence, preset-management]
  affects: [future-ux-improvements]
tech-stack:
  added: []
  patterns: [auto-save-on-change, temp-portfolio-pattern]
key-files:
  created: []
  modified:
    - src/data/services/portfolio-service.ts
    - src/components/ui/portfolio-composition.ts
decisions:
  - id: temp-portfolio-key
    choice: "Use special '__temp_portfolio__' name for temp portfolios"
    why: "Simple identification without schema changes"
  - id: hide-vs-disable
    choice: "Hide selected assets from available list instead of disabling"
    why: "Cleaner UX - users don't see greyed out unusable items"
  - id: weight-storage-format
    choice: "Store weights as decimal 0-1 in DB, display as percent 0-100 in UI"
    why: "Consistent with existing schema conventions"
metrics:
  duration: 4 min
  completed: 2026-01-22
---

# Quick Task 008: Portfolio Preset Management with Auto-Save

**One-liner:** Full preset button wiring with auto-save to temp portfolio on change and restore on refresh.

## What Changed

### Task 1: Temp Portfolio Service Functions
- Added `TEMP_PORTFOLIO_KEY` constant for identifying temp portfolios
- Added `saveTempPortfolio()` - upserts temp portfolio on any change
- Added `loadTempPortfolio()` - retrieves temp portfolio if exists
- Added `loadLastPortfolio()` - returns temp first, then most recent named
- Added `deleteTempPortfolio()` - cleans up temp after named save

### Task 2: Portfolio Composition UI Wiring
- **Hide selected assets:** Selected symbols filtered entirely from available list (not just disabled)
- **Auto-save:** On any portfolio change, auto-saves to temp portfolio when no named preset selected
- **Page refresh restore:** Loads last portfolio (temp or named) on component mount
- **Save button:** Prompts for name, saves to IndexedDB, deletes temp portfolio
- **Load button:** Opens preset dropdown with all saved portfolios
- **Import button:** Opens file picker, imports JSON portfolio file
- **Export button:** Downloads current portfolio as JSON file
- **Delete button:** Confirms and removes currently selected preset

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ec2b091 | feat | Add temp portfolio service functions |
| f4dbbbf | feat | Wire preset buttons with auto-save and persistence |

## Files Modified

| File | Changes |
|------|---------|
| `src/data/services/portfolio-service.ts` | +85 lines - temp portfolio CRUD functions |
| `src/components/ui/portfolio-composition.ts` | +293/-27 lines - full preset button implementation |

## Verification

- [x] Build succeeds: `npm run build`
- [x] Dev server starts: `npm run dev`
- [x] TypeScript compiles without errors
- [x] Export button added to preset row with proper icon
- [x] Hidden file input wired for import
- [x] Selected assets hidden from available list

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

### Auto-Save Flow
1. User makes any portfolio change (add/remove asset, change weight)
2. `dispatchPortfolioChange()` fires
3. If `_currentPortfolioId` is undefined (no named portfolio selected)
4. `autoSaveToTemp()` called - saves to IndexedDB under `__temp_portfolio__` name

### Load on Refresh Flow
1. `connectedCallback()` triggers `loadInitialPortfolio()`
2. Calls `loadLastPortfolio()` from service
3. Service checks for temp portfolio first, falls back to most recent named
4. `populateFromPortfolio()` converts DB records to UI state
5. Renders and dispatches portfolio-change event

### Weight Conversion
- Storage: 0-1 decimal (e.g., 0.70 for 70%)
- UI: 0-100 percent (e.g., 70 for 70%)
- Conversion in `buildAssetRecords()` (divide by 100) and `populateFromPortfolio()` (multiply by 100)
