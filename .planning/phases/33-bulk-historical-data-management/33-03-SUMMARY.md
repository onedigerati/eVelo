---
phase: 33
plan: 03
subsystem: data-management
tags: [bulk-operations, modal, import-export, ui-integration]

dependency-graph:
  requires: [33-01, 33-02]
  provides: [bulk-import-modal, bulk-export-ui, reset-all-workflow]
  affects: [33-04]

tech-stack:
  added: []
  patterns: [mode-toggle-tabs, two-step-confirmation, preview-before-commit]

key-files:
  created: []
  modified:
    - src/components/ui/historical-data-viewer.ts

decisions:
  - id: dual-mode-toggle
    choice: "Segmented button toggle for Single Asset vs Bulk Operations modes"
    rationale: "Clear visual separation while maintaining single modal context"
  - id: two-step-reset
    choice: "Checkbox confirmation before enabling reset all button"
    rationale: "Prevents accidental data loss with explicit acknowledgment"
  - id: preview-integration
    choice: "Reuse bulk-preview-table component for import preview"
    rationale: "Consistent with single-asset preview pattern, shows per-asset status"

metrics:
  duration: 4 min
  completed: 2026-01-31
---

# Phase 33 Plan 03: Bulk Import Modal Integration Summary

**One-liner:** Extended historical data viewer with dual-mode toggle, bulk export/import UI, preview workflow, and two-step reset confirmation.

## What Was Built

### Mode Toggle System
- Added `OperationMode` type: 'single' | 'bulk'
- Segmented button toggle at top of modal content
- Clear visual indication of active mode
- State reset when switching between modes

### Bulk Operations Section (Bulk Mode)

#### Bulk Export
- "Export All as CSV" and "Export All as JSON" buttons
- Calls `exportAllToCsv()` and `exportAllToJson()` from bulk-export-service
- Downloads with timestamp-based filename (e.g., `all_assets_20260131.csv`)

#### Bulk Import
- Template download links: CSV Template, JSON Template
- Reused `file-drop-zone` component for file selection
- On file selection, validates with `validateBulkCsv()` or `validateBulkJson()`
- Shows `bulk-preview-table` component with validation results
- Preview-confirmed event triggers `saveAllCustomData()` for valid assets
- Preview-cancelled returns to bulk options view

#### Reset to Defaults
- Shows count of assets with custom data
- "No custom data to reset" message when count is zero
- "Reset All to Defaults" danger button when custom data exists
- Two-step confirmation modal with checkbox acknowledgment
- Calls `resetAllToDefaults()` and dispatches `all-data-reset` event

### Events Dispatched
- `bulk-data-imported`: `{ count: number }` - After successful bulk import
- `all-data-reset`: `{ count: number }` - After reset all completes
- Existing single-asset events preserved: `data-imported`, `data-reset`

### Styling
- Mode toggle with active state highlighting
- Bulk sections with consistent card styling
- Reset section with danger color theming
- Confirmation modal overlay (z-index: 1100) above main modal
- Dark theme support for all new elements

## Key Implementation Details

### Bulk File Handling
```typescript
private async handleBulkFileSelected(file: File): Promise<void> {
  const content = await file.text();
  const isJson = file.name.toLowerCase().endsWith('.json');

  if (isJson) {
    this._bulkValidationResult = await validateBulkJson(content);
  } else {
    this._bulkValidationResult = await validateBulkCsv(content);
  }
  this.render();
}
```

### Preview Confirmation Flow
```typescript
private async handleBulkPreviewConfirmed(validRows: PreviewRow[]): Promise<void> {
  const assetsToSave: PresetData[] = [];

  for (const row of validRows) {
    const assetResult = this._bulkValidationResult?.assets.find(
      a => a.symbol === row.symbol && a.result.valid
    );
    if (assetResult?.result.data) {
      assetsToSave.push(assetResult.result.data);
    }
  }

  if (assetsToSave.length > 0) {
    await saveAllCustomData(assetsToSave, 'user-import');
    this.dispatchEvent(new CustomEvent('bulk-data-imported', {
      detail: { count: assetsToSave.length },
      bubbles: true,
      composed: true,
    }));
  }

  this._bulkValidationResult = null;
  await this.loadData();
}
```

### Reset Confirmation Two-Step
```typescript
// Step 1: Show modal with checkbox
this.$('#reset-all-btn')?.addEventListener('click', () => {
  this._showResetAllConfirm = true;
  this._resetAllCheckbox = false;
  this.render();
});

// Step 2: Enable button only when checkbox checked
this.$('#reset-all-confirm-checkbox')?.addEventListener('change', (e) => {
  this._resetAllCheckbox = (e.target as HTMLInputElement).checked;
  const confirmBtn = this.$('#reset-all-confirm') as HTMLButtonElement;
  if (confirmBtn) {
    confirmBtn.disabled = !this._resetAllCheckbox;
  }
});
```

## Files Modified

| File | Lines | Changes |
|------|-------|---------|
| src/components/ui/historical-data-viewer.ts | 1611 | +610 lines (bulk mode, preview, reset) |

## Verification Results

- [x] npm run build completes without errors
- [x] Historical data viewer has bulk mode toggle
- [x] Bulk export downloads work (CSV and JSON)
- [x] Bulk import shows preview table with per-asset status
- [x] Confirm only imports valid assets
- [x] Reset all requires two-step confirmation
- [x] Template downloads work
- [x] File exceeds 1100 line minimum (1611 lines)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 33 Plan 04 (Final Integration) can proceed:
- All bulk services implemented (33-01)
- All bulk UI components implemented (33-02)
- Modal integration complete (33-03)
- Ready for end-to-end testing and polish
