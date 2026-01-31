---
phase: 33-bulk-historical-data-management
plan: 01
subsystem: data-layer
tags: [bulk-operations, csv, json, validation, dexie, papa-parse]
dependency-graph:
  requires: [32-01, 32-02, 32-03]
  provides: [bulk-export-csv, bulk-export-json, bulk-validation, bulk-save, bulk-reset]
  affects: [33-02, 33-03, 33-04]
tech-stack:
  added: []
  patterns: [bulk-operations, per-asset-validation, denormalized-csv]
key-files:
  created:
    - src/data/services/bulk-export-service.ts
    - src/data/services/bulk-import-service.ts
  modified:
    - src/data/validation/data-validator.ts
    - src/data/services/custom-data-service.ts
    - src/data/services/index.ts
decisions:
  - key: denormalized-csv-format
    choice: One row per return with repeated symbol/name/asset_class
    rationale: More compatible with spreadsheets and easier to filter/sort
metrics:
  duration: 3.5 min
  completed: 2026-01-31
---

# Phase 33 Plan 01: Bulk Data Services Summary

Bulk export/import services with denormalized CSV, per-asset validation, and efficient Dexie bulk operations.

## What Was Built

### 1. Bulk Export Service (`bulk-export-service.ts`)

New service for exporting all assets to a single file:

- **`exportAllToCsv()`**: Creates denormalized CSV with all assets
  - One row per return period, symbol/name/asset_class repeated
  - Uses Papa.unparse() with escapeFormulae for security
  - Format: `symbol,name,asset_class,year,annual_return`

- **`exportAllToJson()`**: Creates structured JSON export
  - Includes version (1) and exportedAt timestamp
  - Assets array in normalized PresetData format
  - 2-space indented for readability

### 2. Bulk Validation Extensions (`data-validator.ts`)

Extended existing validator with bulk operations:

- **`BulkValidationResult`**: Aggregate validation result
  - `valid`: true if at least one asset valid
  - `assets`: Array of per-asset results
  - `summary`: {total, valid, warnings, errors}

- **`AssetValidationResult`**: Per-asset result
  - action: 'add' | 'update' | 'skip'
  - recordCount for data volume feedback
  - Full ValidationResult for detailed errors/warnings

- **`validateBulkCsv()`**: Groups rows by symbol, validates each independently
- **`validateBulkJson()`**: Validates each asset in assets array

### 3. Bulk Import Service (`bulk-import-service.ts`)

Parsing functions without validation:

- **`parseBulkCsv()`**: Parse CSV into structured data
- **`parseBulkJson()`**: Parse JSON into structured data
- **`toPresetData()`**: Convert parsed assets to PresetData format

### 4. Bulk Data Operations (`custom-data-service.ts`)

Efficient bulk database operations:

- **`saveAllCustomData()`**: Bulk save using Dexie's bulkAdd
  - Deletes all existing symbols in one query
  - Inserts all records with single bulkAdd call
  - Returns array of inserted IDs

- **`resetAllToDefaults()`**: Clear all custom data
  - Returns count of deleted records
  - Uses Dexie's clear() for efficiency

## Technical Decisions

### Denormalized CSV Format

Chose one row per return (denormalized) over one file per asset because:
- More compatible with Excel/spreadsheet filtering
- Easier to import from external data sources
- Standard format for time series data exchange

### Async Validation

Bulk validation functions are async because:
- Need to check hasCustomData() to determine action
- Prepares for future parallel validation potential

## Key Files

| File | Purpose |
|------|---------|
| `src/data/services/bulk-export-service.ts` | Export all assets to CSV/JSON |
| `src/data/services/bulk-import-service.ts` | Parse bulk import files |
| `src/data/validation/data-validator.ts` | Bulk validation with per-asset results |
| `src/data/services/custom-data-service.ts` | Bulk save and reset operations |
| `src/data/services/index.ts` | Barrel exports for all new functions |

## Verification Results

- [x] npm run build completes without errors
- [x] All new types properly exported
- [x] Bulk validation returns per-asset results with action field
- [x] Bulk save uses efficient Dexie bulkAdd
- [x] Reset all clears entire customMarketData table

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 33-02 can proceed:
- Bulk export service ready for UI integration
- Bulk validation ready for import preview
- Bulk save/reset ready for import confirmation

All data layer foundations in place for bulk UI components.
