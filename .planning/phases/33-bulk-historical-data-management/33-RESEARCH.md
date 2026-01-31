# Phase 33: Bulk Historical Data Management - Research

**Researched:** 2026-01-31
**Domain:** Bulk CSV/JSON import/export, multi-asset operations, preview-before-commit UX, reset-to-defaults workflows
**Confidence:** HIGH

## Summary

Phase 33 extends Phase 32's single-asset historical data management to bulk operations across all assets. The key challenges are: (1) designing a CSV/JSON format that handles multiple assets with metadata in one file, (2) implementing preview-before-commit to show what will change, (3) providing per-asset validation feedback with partial success/failure reporting, (4) enabling bulk and individual reset-to-defaults functionality, and (5) creating clear format guidance with downloadable templates.

The existing Phase 32 foundation provides strong building blocks: Papa Parse for CSV handling, ValidationResult pattern for error/warning reporting, CustomMarketData schema with IndexedDB persistence, and the HistoricalDataViewer modal component. Phase 33 builds on this by adding multi-asset formats, preview tables, bulk operations, and template downloads.

**Primary recommendation:** Use a denormalized CSV format with symbol/name/asset_class columns repeated for each return row (flat structure compatible with Excel), implement a diff-style preview table showing add/update/skip actions per asset, provide both CSV and JSON template downloads with inline format examples, use two-step confirmation for bulk reset (checkbox + confirm button), and report per-asset success/failure with expandable error details.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Papa Parse | 5.x | CSV parsing/unparsing | Already used in Phase 32, RFC 4180 compliant, handles bulk data |
| Dexie.js | 4.x | Bulk IndexedDB operations | Already used, supports bulkAdd/bulkPut for efficient multi-record saves |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing custom-data-service | N/A | Custom data CRUD | Extend with bulk operations (saveAllCustomData, resetAllToDefaults) |
| Existing data-validator | N/A | Validation logic | Extend with multi-asset validation (validateBulkCsv, validateBulkJson) |
| Existing HistoricalDataViewer | N/A | Modal UI | Add bulk mode with preview table |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flat CSV (denormalized) | Nested JSON with array per asset | CSV is more Excel-compatible, users expect flat rows |
| Preview table | JSON diff viewer | Table is more scannable for multi-asset changes |
| Inline templates | External template files | Inline examples are immediately visible, no download/open friction |
| Two-step reset confirm | Single confirm dialog | Two-step prevents accidental bulk deletion of all custom data |

**Installation:**
No new dependencies required. Phase 32's Papa Parse installation covers bulk needs.

## Architecture Patterns

### Recommended Project Structure

```
src/
  components/ui/
    historical-data-viewer.ts     # EXTEND: Add bulk mode, preview table
    bulk-preview-table.ts         # NEW: Preview changes before commit
  data/
    services/
      custom-data-service.ts      # EXTEND: Add bulk save/delete methods
      bulk-export-service.ts      # NEW: Export all assets to single CSV/JSON
      bulk-import-service.ts      # NEW: Parse and validate multi-asset files
    validation/
      data-validator.ts           # EXTEND: Add bulk validation methods
    formats/
      bulk-format-templates.ts    # NEW: Template strings for CSV/JSON examples
```

### Pattern 1: Bulk CSV Format (Denormalized/Flat)

**What:** Single CSV file with symbol/name/asset_class columns repeated for each return row.

**When to use:** User exports all assets or imports multiple assets at once.

**Example:**
```csv
symbol,name,asset_class,year,annual_return
SPY,S&P 500 ETF Trust,equity_index,1995,0.3758
SPY,S&P 500 ETF Trust,equity_index,1996,0.2296
SPY,S&P 500 ETF Trust,equity_index,1997,0.3336
QQQ,Invesco QQQ Trust,equity_index,1995,0.4102
QQQ,Invesco QQQ Trust,equity_index,1996,0.1876
AAPL,Apple Inc.,equity_stock,1995,0.5602
AAPL,Apple Inc.,equity_stock,1996,-0.1234
```

**Rationale:**
- Excel/Google Sheets native compatibility (flat rows)
- Easy to edit in spreadsheet (add/remove assets)
- Simple to parse with Papa Parse (standard CSV parsing)
- Supports partial imports (subset of symbols)

**Code Example:**
```typescript
// src/data/services/bulk-export-service.ts
import Papa from 'papaparse';
import { getPresetSymbols, getEffectiveData } from './preset-service';
import type { PresetData } from './preset-service';

export interface BulkExportRow {
  symbol: string;
  name: string;
  asset_class: string;
  year: string;
  annual_return: number;
}

/**
 * Export all assets to single CSV with denormalized format
 */
export async function exportAllToCsv(): Promise<string> {
  const symbols = getPresetSymbols();
  const rows: BulkExportRow[] = [];

  for (const symbol of symbols) {
    const data = await getEffectiveData(symbol);
    if (!data) continue;

    // Create one row per return, repeating symbol/name/asset_class
    data.returns.forEach(ret => {
      rows.push({
        symbol: data.symbol,
        name: data.name,
        asset_class: data.assetClass || 'unknown',
        year: ret.date,
        annual_return: ret.return
      });
    });
  }

  return Papa.unparse(rows, {
    header: true,
    newline: '\n'
  });
}
```

### Pattern 2: Bulk JSON Format (Nested Array)

**What:** JSON file with array of asset objects, each containing full PresetData structure.

**When to use:** Advanced users who prefer structured JSON, or when preserving metadata precisely.

**Example:**
```json
{
  "version": 1,
  "exportedAt": "2026-01-31T12:00:00.000Z",
  "assets": [
    {
      "symbol": "SPY",
      "name": "S&P 500 ETF Trust",
      "assetClass": "equity_index",
      "startDate": "1995",
      "endDate": "2024",
      "returns": [
        { "date": "1995", "return": 0.3758 },
        { "date": "1996", "return": 0.2296 }
      ]
    },
    {
      "symbol": "QQQ",
      "name": "Invesco QQQ Trust",
      "assetClass": "equity_index",
      "returns": [
        { "date": "1995", "return": 0.4102 }
      ]
    }
  ]
}
```

**Code Example:**
```typescript
// src/data/services/bulk-export-service.ts
export async function exportAllToJson(): Promise<string> {
  const symbols = getPresetSymbols();
  const assets: PresetData[] = [];

  for (const symbol of symbols) {
    const data = await getEffectiveData(symbol);
    if (data) {
      assets.push(data);
    }
  }

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    assets
  }, null, 2);
}
```

### Pattern 3: Preview-Before-Commit Table

**What:** Display parsed import data in a table with action indicators (add/update/skip) before saving.

**When to use:** User uploads bulk import file and it passes validation.

**Example UI:**
```
┌─────────┬──────────────┬────────┬─────────┬─────────────┐
│ Symbol  │ Name         │ Action │ Records │ Status      │
├─────────┼──────────────┼────────┼─────────┼─────────────┤
│ SPY     │ S&P 500 ETF  │ UPDATE │ 30      │ ✓ Valid     │
│ QQQ     │ Invesco QQQ  │ UPDATE │ 25      │ ✓ Valid     │
│ CUSTOM1 │ My Custom    │ ADD    │ 10      │ ⚠ Warning   │
│ AAPL    │ Apple Inc.   │ SKIP   │ 3       │ ✗ Error     │
└─────────┴──────────────┴────────┴─────────┴─────────────┘

Expandable per-asset details:
→ SPY: Will replace 30 existing custom returns
→ CUSTOM1: Warning - only 10 years of data (minimum 5 required)
→ AAPL: Error - insufficient data (3 rows, minimum 5 required)

[Cancel] [Import Valid Assets (2)]
```

**Code Example:**
```typescript
// src/components/ui/bulk-preview-table.ts
import { BaseComponent } from '../base-component';

export interface PreviewRow {
  symbol: string;
  name: string;
  action: 'add' | 'update' | 'skip';
  recordCount: number;
  status: 'valid' | 'warning' | 'error';
  message?: string;
  data?: PresetData;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export class BulkPreviewTable extends BaseComponent {
  private _rows: PreviewRow[] = [];
  private _expandedSymbols = new Set<string>();

  set rows(value: PreviewRow[]) {
    this._rows = value;
    this.render();
  }

  protected template(): string {
    const validCount = this._rows.filter(r => r.status === 'valid').length;

    return `
      <div class="preview-container">
        <table class="preview-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Action</th>
              <th>Records</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this._rows.map(row => this.renderRow(row)).join('')}
          </tbody>
        </table>

        <div class="preview-summary">
          <p>${validCount} of ${this._rows.length} assets ready to import</p>
        </div>

        <div class="preview-actions">
          <button class="btn btn-secondary" id="cancel-preview">Cancel</button>
          <button
            class="btn btn-primary"
            id="confirm-import"
            ${validCount === 0 ? 'disabled' : ''}
          >
            Import Valid Assets (${validCount})
          </button>
        </div>
      </div>
    `;
  }

  private renderRow(row: PreviewRow): string {
    const statusIcon = {
      valid: '✓',
      warning: '⚠',
      error: '✗'
    }[row.status];

    const statusClass = `status-${row.status}`;
    const isExpanded = this._expandedSymbols.has(row.symbol);

    return `
      <tr class="${statusClass}" data-symbol="${row.symbol}">
        <td>${row.symbol}</td>
        <td>${row.name}</td>
        <td><span class="action-badge action-${row.action}">${row.action.toUpperCase()}</span></td>
        <td>${row.recordCount}</td>
        <td>
          <span class="${statusClass}">${statusIcon} ${row.status}</span>
          ${row.message || row.errors?.length || row.warnings?.length ?
            `<button class="btn-expand" data-symbol="${row.symbol}">
              ${isExpanded ? '▼' : '▶'}
            </button>` : ''}
        </td>
      </tr>
      ${isExpanded ? this.renderExpandedDetails(row) : ''}
    `;
  }

  private renderExpandedDetails(row: PreviewRow): string {
    return `
      <tr class="expanded-details">
        <td colspan="5">
          ${row.message ? `<p class="detail-message">${row.message}</p>` : ''}
          ${row.errors?.length ? `
            <div class="detail-errors">
              <strong>Errors:</strong>
              <ul>
                ${row.errors.map(e => `<li>${e.message}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${row.warnings?.length ? `
            <div class="detail-warnings">
              <strong>Warnings:</strong>
              <ul>
                ${row.warnings.map(w => `<li>${w.message}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </td>
      </tr>
    `;
  }

  protected afterRender(): void {
    // Expand/collapse buttons
    this.$$('.btn-expand').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const symbol = (e.target as HTMLElement).dataset.symbol;
        if (symbol) {
          if (this._expandedSymbols.has(symbol)) {
            this._expandedSymbols.delete(symbol);
          } else {
            this._expandedSymbols.add(symbol);
          }
          this.render();
        }
      });
    });

    // Action buttons
    this.$('#cancel-preview')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('preview-cancelled', { bubbles: true, composed: true }));
    });

    this.$('#confirm-import')?.addEventListener('click', () => {
      const validRows = this._rows.filter(r => r.status === 'valid');
      this.dispatchEvent(new CustomEvent('preview-confirmed', {
        detail: { rows: validRows },
        bubbles: true,
        composed: true
      }));
    });
  }

  protected styles(): string {
    return `
      .preview-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }
      .preview-table th, .preview-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }
      .action-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .action-add { background: rgba(5, 150, 105, 0.1); color: var(--color-success); }
      .action-update { background: rgba(13, 148, 136, 0.1); color: var(--color-primary); }
      .action-skip { background: rgba(156, 163, 175, 0.1); color: var(--text-tertiary); }
      .status-valid { color: var(--color-success); }
      .status-warning { color: #d97706; }
      .status-error { color: var(--color-danger); }
      .expanded-details td {
        background: var(--surface-secondary);
        padding: 16px;
      }
      .preview-summary {
        margin-bottom: 16px;
        padding: 12px;
        background: var(--surface-secondary);
        border-radius: var(--border-radius-md);
      }
      .preview-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
    `;
  }
}

customElements.define('bulk-preview-table', BulkPreviewTable);
```

### Pattern 4: Bulk Validation with Per-Asset Reporting

**What:** Validate each asset independently, accumulate success/failure counts, allow partial imports.

**When to use:** User uploads bulk import file.

**Code Example:**
```typescript
// src/data/validation/data-validator.ts (extension)
export interface BulkValidationResult {
  valid: boolean;
  assets: AssetValidationResult[];
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
}

export interface AssetValidationResult {
  symbol: string;
  name: string;
  action: 'add' | 'update' | 'skip';
  result: ValidationResult;
}

/**
 * Validate bulk CSV with denormalized format
 * Groups rows by symbol, validates each asset separately
 */
export async function validateBulkCsv(content: string): Promise<BulkValidationResult> {
  const parsed = Papa.parse<BulkExportRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_')
  });

  const errors: ValidationError[] = [];

  // Check for required columns
  const fields = parsed.meta.fields || [];
  const requiredFields = ['symbol', 'name', 'year', 'annual_return'];
  const missingFields = requiredFields.filter(f => !fields.includes(f));

  if (missingFields.length > 0) {
    errors.push({
      type: 'missing_field',
      message: `Missing required columns: ${missingFields.join(', ')}`
    });
    return {
      valid: false,
      assets: [],
      summary: { total: 0, valid: 0, warnings: 0, errors: 1 }
    };
  }

  // Group rows by symbol
  const assetGroups = new Map<string, BulkExportRow[]>();
  parsed.data.forEach(row => {
    const symbol = row.symbol?.trim().toUpperCase();
    if (!symbol) return;

    if (!assetGroups.has(symbol)) {
      assetGroups.set(symbol, []);
    }
    assetGroups.get(symbol)!.push(row);
  });

  // Validate each asset separately
  const assets: AssetValidationResult[] = [];

  for (const [symbol, rows] of assetGroups) {
    const name = rows[0].name || symbol;
    const assetClass = rows[0].asset_class || undefined;

    // Convert to single-asset CSV format for existing validator
    const singleAssetCsv = Papa.unparse(
      rows.map(r => ({ year: r.year, annual_return: r.annual_return })),
      { header: true }
    );

    const result = parseAndValidateCsv(singleAssetCsv, symbol, name);
    if (result.data && assetClass) {
      result.data.assetClass = assetClass;
    }

    // Determine action (add vs update)
    const hasExisting = await hasCustomData(symbol);
    const action = hasExisting ? 'update' : 'add';

    assets.push({
      symbol,
      name,
      action: result.valid ? action : 'skip',
      result
    });
  }

  // Calculate summary
  const valid = assets.filter(a => a.result.valid).length;
  const warnings = assets.filter(a => a.result.warnings.length > 0).length;
  const errorsCount = assets.filter(a => !a.result.valid).length;

  return {
    valid: valid > 0, // Allow partial success
    assets,
    summary: {
      total: assets.length,
      valid,
      warnings,
      errors: errorsCount
    }
  };
}

/**
 * Validate bulk JSON with nested array format
 */
export async function validateBulkJson(content: string): Promise<BulkValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    return {
      valid: false,
      assets: [],
      summary: { total: 0, valid: 0, warnings: 0, errors: 1 }
    };
  }

  const obj = parsed as { assets?: unknown[] };

  if (!Array.isArray(obj.assets)) {
    return {
      valid: false,
      assets: [],
      summary: { total: 0, valid: 0, warnings: 0, errors: 1 }
    };
  }

  const assets: AssetValidationResult[] = [];

  for (const assetData of obj.assets) {
    const assetJson = JSON.stringify(assetData);
    const result = parseAndValidateJson(assetJson);

    if (result.data) {
      const hasExisting = await hasCustomData(result.data.symbol);
      assets.push({
        symbol: result.data.symbol,
        name: result.data.name,
        action: result.valid ? (hasExisting ? 'update' : 'add') : 'skip',
        result
      });
    }
  }

  const valid = assets.filter(a => a.result.valid).length;
  const warnings = assets.filter(a => a.result.warnings.length > 0).length;
  const errorsCount = assets.filter(a => !a.result.valid).length;

  return {
    valid: valid > 0,
    assets,
    summary: { total: assets.length, valid, warnings, errors: errorsCount }
  };
}
```

### Pattern 5: Template Download with Inline Examples

**What:** Provide downloadable CSV/JSON templates with example data pre-filled.

**When to use:** User clicks "Download Template" before preparing their import file.

**Code Example:**
```typescript
// src/data/formats/bulk-format-templates.ts

/**
 * CSV template with example data for 2 assets
 */
export const BULK_CSV_TEMPLATE = `symbol,name,asset_class,year,annual_return
SPY,S&P 500 ETF Trust,equity_index,1995,0.3758
SPY,S&P 500 ETF Trust,equity_index,1996,0.2296
SPY,S&P 500 ETF Trust,equity_index,1997,0.3336
CUSTOM1,My Custom Asset,equity_stock,2020,0.1250
CUSTOM1,My Custom Asset,equity_stock,2021,-0.0320
CUSTOM1,My Custom Asset,equity_stock,2022,0.0890`;

/**
 * JSON template with example data for 2 assets
 */
export const BULK_JSON_TEMPLATE = {
  version: 1,
  exportedAt: new Date().toISOString(),
  assets: [
    {
      symbol: "SPY",
      name: "S&P 500 ETF Trust",
      assetClass: "equity_index",
      startDate: "1995",
      endDate: "1997",
      returns: [
        { date: "1995", return: 0.3758 },
        { date: "1996", return: 0.2296 },
        { date: "1997", return: 0.3336 }
      ]
    },
    {
      symbol: "CUSTOM1",
      name: "My Custom Asset",
      assetClass: "equity_stock",
      startDate: "2020",
      endDate: "2022",
      returns: [
        { date: "2020", return: 0.1250 },
        { date: "2021", return: -0.0320 },
        { date: "2022", return: 0.0890 }
      ]
    }
  ]
};

/**
 * Download CSV template as file
 */
export function downloadCsvTemplate(): void {
  const blob = new Blob([BULK_CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bulk_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download JSON template as file
 */
export function downloadJsonTemplate(): void {
  const json = JSON.stringify(BULK_JSON_TEMPLATE, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bulk_import_template.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Pattern 6: Two-Step Bulk Reset Confirmation

**What:** Require explicit checkbox confirmation plus button click for destructive bulk delete.

**When to use:** User clicks "Reset All to Defaults" to delete all custom data.

**Code Example:**
```typescript
// In HistoricalDataViewer or new bulk management modal
private showResetAllConfirmation(): void {
  const confirmed = confirm(
    'Are you sure you want to reset ALL custom data to defaults?\n\n' +
    'This will delete custom data for all assets and cannot be undone.'
  );

  if (confirmed) {
    this.resetAllToDefaults();
  }
}

// Better: Use modal with checkbox
private renderResetAllModal(): string {
  return `
    <div class="modal-overlay">
      <div class="modal-container">
        <h2>Reset All Data to Defaults</h2>
        <p class="warning-text">
          This will delete all custom historical data and restore bundled defaults for all assets.
          <strong>This action cannot be undone.</strong>
        </p>

        <label class="checkbox-label">
          <input type="checkbox" id="confirm-reset-checkbox" />
          I understand this will permanently delete all custom data
        </label>

        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancel-reset">Cancel</button>
          <button
            class="btn btn-danger"
            id="confirm-reset"
            disabled
          >
            Reset All to Defaults
          </button>
        </div>
      </div>
    </div>
  `;
}

protected afterRender(): void {
  // Enable confirm button only when checkbox is checked
  this.$('#confirm-reset-checkbox')?.addEventListener('change', (e) => {
    const confirmBtn = this.$('#confirm-reset');
    if (confirmBtn) {
      confirmBtn.disabled = !(e.target as HTMLInputElement).checked;
    }
  });

  this.$('#confirm-reset')?.addEventListener('click', async () => {
    await this.resetAllToDefaults();
    this.hideResetAllModal();
  });
}

private async resetAllToDefaults(): Promise<void> {
  const customSymbols = await getCustomSymbols();

  for (const symbol of customSymbols) {
    await resetToDefaults(symbol);
  }

  // Notify success
  this.dispatchEvent(new CustomEvent('all-data-reset', {
    detail: { count: customSymbols.length },
    bubbles: true,
    composed: true
  }));
}
```

### Pattern 7: Bulk Save to IndexedDB

**What:** Use Dexie's bulkPut for efficient multi-record saves.

**When to use:** After user confirms bulk import preview.

**Code Example:**
```typescript
// src/data/services/custom-data-service.ts (extension)
import { db } from '../db';
import type { CustomMarketData } from '../schemas/custom-market-data';
import type { PresetData } from './preset-service';

/**
 * Save multiple assets at once using bulk operation
 * More efficient than multiple individual saves
 */
export async function saveAllCustomData(
  assets: PresetData[],
  source: 'user-import' | 'bundled-modified'
): Promise<number[]> {
  // Delete existing data for these symbols first
  const symbols = assets.map(a => a.symbol.toUpperCase());
  await db.customMarketData.where('symbol').anyOf(symbols).delete();

  // Prepare bulk insert records
  const records: CustomMarketData[] = assets.map(data => ({
    symbol: data.symbol.toUpperCase(),
    name: data.name,
    assetClass: data.assetClass,
    startDate: data.startDate,
    endDate: data.endDate,
    returns: data.returns,
    importedAt: new Date().toISOString(),
    source
  }));

  // Bulk insert (returns array of IDs)
  return db.customMarketData.bulkAdd(records, { allKeys: true }) as Promise<number[]>;
}

/**
 * Reset all custom data to bundled defaults
 * Deletes all records from customMarketData table
 */
export async function resetAllToDefaults(): Promise<number> {
  const count = await db.customMarketData.count();
  await db.customMarketData.clear();
  return count;
}
```

### Anti-Patterns to Avoid

- **Importing without preview:** Always show what will change before committing bulk operations. Users need to verify multi-asset imports.
- **All-or-nothing validation:** Allow partial success when some assets are valid and others have errors. Don't fail the entire import.
- **Single confirm for destructive bulk delete:** Use two-step confirmation (checkbox + button) for "reset all to defaults". Single confirm is too easy to accidentally trigger.
- **Generic bulk error messages:** Report per-asset errors with specific row/column details. "3 assets failed" is not helpful without details.
- **Nested CSV structure:** Don't try to represent multi-asset data as nested CSV. Use flat/denormalized rows (repeat symbol/name per row).
- **Blocking UI during bulk operations:** Use progress indicators or async chunking for large bulk imports/exports (50+ assets).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulk CSV parsing | Manual row-by-row parsing | Papa Parse with validation wrapper | Handles edge cases, consistent with Phase 32 |
| Per-asset validation | Custom loop with error accumulation | Extend existing ValidationResult pattern | Already established, consistent error types |
| Bulk IndexedDB save | Loop with individual puts | Dexie bulkAdd/bulkPut | More efficient, atomic operation |
| Diff table UI | Custom table from scratch | Extend existing data-table component | Virtual scrolling already implemented |
| Template download | Hard-coded strings in multiple places | Centralized template constants | Single source of truth, easier to maintain |
| Progress indication | Custom progress bar | Browser-native or simple percentage counter | Bulk operations likely fast enough (<1s for 50 assets) |

**Key insight:** Bulk operations are just single-asset operations wrapped in validation loops and preview tables. Reuse Phase 32's validation logic per-asset rather than creating new bulk-specific validators.

## Common Pitfalls

### Pitfall 1: Symbol Normalization Inconsistency

**What goes wrong:** Bulk import has "spy" (lowercase) but bundled data uses "SPY" (uppercase), causing duplicate entries.

**Why it happens:** Inconsistent normalization between single-asset and bulk-asset imports.

**How to avoid:**
```typescript
// Always normalize symbols to uppercase on import
const symbol = row.symbol?.trim().toUpperCase();

// Consistent normalization in all services
export async function getCustomData(symbol: string) {
  return db.customMarketData.where('symbol').equals(symbol.toUpperCase()).first();
}
```

**Warning signs:** Preview shows "add" for existing symbols, duplicate symbols in database.

### Pitfall 2: Partial Import Without Clear Feedback

**What goes wrong:** Import shows "3 of 5 assets imported" but user doesn't know which 2 failed or why.

**Why it happens:** Generic success message without per-asset reporting.

**How to avoid:**
```typescript
// Show detailed per-asset results after import
interface ImportResult {
  total: number;
  success: string[]; // Array of imported symbols
  skipped: { symbol: string; reason: string }[]; // Failed assets with reasons
}

// Display in UI
"Successfully imported 3 assets: SPY, QQQ, AAPL
Skipped 2 assets:
  - CUSTOM1: Insufficient data (3 rows, minimum 5 required)
  - INVALID: Invalid year format in row 2"
```

**Warning signs:** Users confused about import results, reporting "some data is missing".

### Pitfall 3: Lost Data on Accidental Bulk Reset

**What goes wrong:** User clicks "Reset All to Defaults", loses weeks of custom data entry.

**Why it happens:** Single-click confirmation is too easy to trigger accidentally.

**How to avoid:**
1. Two-step confirmation: checkbox + button
2. Show count of affected assets: "This will delete custom data for 12 assets"
3. Consider soft delete with undo period (advanced)

**Warning signs:** User support requests for "how to recover deleted data".

### Pitfall 4: Memory Issues with Large Exports

**What goes wrong:** Exporting 50 assets × 30 years = 1500 rows causes browser to freeze.

**Why it happens:** Papa.unparse generates entire CSV string in memory synchronously.

**How to avoid:**
```typescript
// For large exports, check size first
const estimatedRows = symbols.length * 30; // Assume 30 years average

if (estimatedRows > 1000) {
  // Show progress indicator
  const progress = document.getElementById('export-progress');
  progress.textContent = 'Generating export file...';

  // Use setTimeout to prevent blocking
  await new Promise(resolve => setTimeout(resolve, 0));
}

const csv = Papa.unparse(rows, { header: true });
```

**Warning signs:** Browser "page unresponsive" warning during export, UI freeze.

### Pitfall 5: Missing Asset Class in Bulk Format

**What goes wrong:** Bulk CSV import doesn't include asset_class column, imported assets have no class metadata.

**Why it happens:** Asset class is optional in single-asset format but important for grouping/filtering.

**How to avoid:**
1. Make asset_class optional in validation but recommended in templates
2. Provide default value if missing: "unknown" or derive from symbol (SPY → equity_index)
3. Warn if asset_class is missing during preview

**Warning signs:** Assets imported successfully but don't appear in correct groups in UI.

### Pitfall 6: Overwriting Bundled Data Markers

**What goes wrong:** Bulk import for "SPY" creates custom data entry, but UI doesn't clearly show it's overriding bundled data.

**Why it happens:** Same as single-asset import, but more confusing at scale.

**How to avoid:**
```typescript
// In preview table, clearly indicate action
interface PreviewRow {
  action: 'add' | 'update' | 'skip';
  message?: string;
}

// Set message for updates
if (hasCustomData) {
  message = 'Will replace existing custom data';
} else if (isBundledSymbol) {
  message = 'Will override bundled data';
} else {
  message = 'New custom asset';
}
```

**Warning signs:** Users surprised that simulation results changed after bulk import.

## Code Examples

Verified patterns from official sources:

### Papa Parse Bulk Unparse

```typescript
// Source: https://www.papaparse.com/docs
import Papa from 'papaparse';

interface BulkRow {
  symbol: string;
  name: string;
  year: string;
  annual_return: number;
}

const rows: BulkRow[] = [
  { symbol: 'SPY', name: 'S&P 500', year: '1995', annual_return: 0.3758 },
  { symbol: 'SPY', name: 'S&P 500', year: '1996', annual_return: 0.2296 },
];

const csv = Papa.unparse(rows, {
  header: true,
  newline: '\n',
  escapeFormulae: true // Prevent CSV injection
});
```

### Dexie Bulk Operations

```typescript
// Source: https://dexie.org/docs/Table/Table.bulkAdd()
import { db } from './db';

// Bulk insert - more efficient than loop
const records = [
  { symbol: 'SPY', name: 'S&P 500', returns: [...] },
  { symbol: 'QQQ', name: 'Invesco QQQ', returns: [...] }
];

// Returns array of generated IDs
const ids = await db.customMarketData.bulkAdd(records, { allKeys: true });

// Bulk update - more efficient than loop
await db.customMarketData.bulkPut(records);

// Bulk delete - using where clause
await db.customMarketData.where('symbol').anyOf(['SPY', 'QQQ']).delete();
```

### Blob Download Pattern (from Phase 32)

```typescript
// Source: MDN Blob documentation
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up to avoid memory leaks
  URL.revokeObjectURL(url);
}
```

## Bulk Format Specification

### CSV Format (Denormalized/Flat)

```csv
symbol,name,asset_class,year,annual_return
SPY,S&P 500 ETF Trust,equity_index,1995,0.3758
SPY,S&P 500 ETF Trust,equity_index,1996,0.2296
QQQ,Invesco QQQ Trust,equity_index,1995,0.4102
CUSTOM1,My Custom Asset,equity_stock,2020,0.1250
```

**Rules:**
- First row is header: `symbol,name,asset_class,year,annual_return`
- Symbol/name/asset_class repeated for each return row (denormalized)
- Symbol will be normalized to uppercase on import
- Asset class values: `equity_stock`, `equity_index`, `bond`, `commodity`, `unknown`
- Year format: `YYYY` (preferred) or `YYYY-MM-DD`
- Return format: decimal (0.10 = 10%), 4-6 decimal places recommended
- UTF-8 encoding
- Minimum 5 rows per symbol required for validation
- Supports subset imports (don't need all bundled symbols)

### JSON Format (Nested Array)

```json
{
  "version": 1,
  "exportedAt": "2026-01-31T12:00:00.000Z",
  "assets": [
    {
      "symbol": "SPY",
      "name": "S&P 500 ETF Trust",
      "assetClass": "equity_index",
      "startDate": "1995",
      "endDate": "2024",
      "returns": [
        { "date": "1995", "return": 0.3758 },
        { "date": "1996", "return": 0.2296 }
      ]
    }
  ]
}
```

**Rules:**
- Version field for future compatibility
- Assets array contains full PresetData objects
- Each asset validated independently
- Returns array sorted by date
- Dates as strings (not Date objects)
- Returns as decimals

## Validation Rules (Bulk-Specific)

### Required Validations (Errors)

| Rule | Error Message |
|------|---------------|
| File is valid CSV/JSON | "Unable to parse file. Please check format." |
| CSV has required columns | "Missing required columns: symbol, name, year, annual_return" |
| JSON has required 'assets' array | "Missing 'assets' array in JSON file." |
| Per-asset: minimum 5 years | "Asset X: Insufficient data (Y rows, minimum 5 required)" |
| Per-asset: valid year format | "Asset X, Row Y: Invalid year format" |
| Per-asset: numeric return | "Asset X, Row Y: Invalid return value" |

### Optional Validations (Warnings)

| Rule | Warning Message |
|------|-----------------|
| Missing asset_class | "Asset X: No asset class specified (will use 'unknown')" |
| Overriding bundled data | "Asset X: Will override bundled data" |
| Per-asset: extreme values | "Asset X, Row Y: Return of Z% is unusually extreme" |
| Per-asset: year gaps | "Asset X: Missing data between years Y and Z" |

### Bulk-Specific Rules

| Rule | Behavior |
|------|----------|
| Partial validation success | Allow import of valid assets, skip invalid ones |
| Duplicate symbols in file | Last occurrence wins (like database upsert) |
| Mixed case symbols | Normalize to uppercase before comparison |
| Empty rows | Skip silently (Papa Parse skipEmptyLines) |

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All-or-nothing imports | Partial success with per-asset reporting | 2024+ standard | Better UX, fewer total failures |
| Import without preview | Preview-before-commit with diff table | 2025+ standard | Reduces mistakes, builds trust |
| Single confirmation for bulk delete | Two-step confirmation (checkbox + button) | 2025+ standard | Prevents accidental data loss |
| Generic "X failed" messages | Per-asset error details with row/column | 2024+ standard | Easier troubleshooting |
| Alert dialogs for errors | Inline validation with expandable details | 2024+ standard | Better accessibility, scannable |
| Template as separate doc | Downloadable template with pre-filled examples | 2025+ standard | Faster onboarding |

**Best practices for 2026:**
- Preview tables are expected for bulk operations, not optional
- Per-record validation feedback is standard (not just "file failed")
- Template downloads should include example data, not just headers
- Two-step confirmation for destructive bulk actions prevents errors
- Partial success (import valid, skip invalid) is better UX than all-or-nothing

**Deprecated/outdated:**
- Bulk import without preview/confirmation
- Single generic error message for multi-asset failures
- Requiring perfect file (reject entire import if one asset has error)
- Alert/confirm dialogs for bulk operation results

## Open Questions

Things that couldn't be fully resolved:

1. **Bulk import performance threshold**
   - What we know: 50 assets × 30 years = 1500 rows is manageable
   - What's unclear: At what point (100 assets? 200?) should we add progress indicators or chunking?
   - Recommendation: Start without chunking, add progress indicator if import takes >500ms. Profile with 100+ assets.

2. **Reset all confirmation UX variation**
   - What we know: Two-step confirmation (checkbox + button) is best practice
   - What's unclear: Should we also show list of affected symbols, or just count?
   - Recommendation: Show count only ("12 assets will be reset"). Listing all symbols is verbose for 50+ items.

3. **Bulk export default format**
   - What we know: CSV is more accessible for most users
   - What's unclear: Should bulk export default to CSV or JSON?
   - Recommendation: Default to CSV (Excel-compatible), offer JSON as secondary option.

4. **Asset class auto-detection**
   - What we know: Some symbols clearly indicate class (SPY → index)
   - What's unclear: Should we auto-populate asset_class if missing based on symbol?
   - Recommendation: Don't auto-detect. Require explicit asset_class or use "unknown". Auto-detection risks incorrect classification.

## Sources

### Primary (HIGH confidence)
- [Papa Parse Official Documentation](https://www.papaparse.com/docs) - CSV parsing/unparsing API (verified)
- [Dexie.js Bulk Operations](https://dexie.org/docs/Table/Table.bulkAdd()) - bulkAdd, bulkPut, bulkDelete methods
- [MDN Blob Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Blob) - File download pattern
- Phase 32 Research & Implementation - Existing validation patterns, CustomMarketData schema

### Secondary (MEDIUM confidence)
- [Microsoft Learn: Export bulk work items with CSV](https://learn.microsoft.com/en-us/azure/devops/boards/queries/import-work-items-from-csv?view=azure-devops) - Bulk CSV best practices
- [How To Design Bulk Import UX (+ Figma Prototypes)](https://smart-interface-design-patterns.com/articles/bulk-ux/) - Preview, mapping, repair patterns
- [CSV Import Best Practices | Dromo](https://dromo.io/blog/ultimate-guide-to-csv-imports) - Validation, error handling
- [5 Best Practices for Building a CSV Uploader](https://www.oneschema.co/blog/building-a-csv-uploader) - Template download, preview
- [Designing An Attractive And Usable Data Importer For Your App](https://www.smashingmagazine.com/2020/12/designing-attractive-usable-data-importer-app/) - UX patterns
- [Bulk action UX: 8 design guidelines with examples for SaaS](https://www.eleken.co/blog-posts/bulk-actions-ux) - Confirmation patterns
- [Delete with additional confirmation - Cloudscape](https://cloudscape.design/patterns/resource-management/delete/delete-with-additional-confirmation/) - Two-step confirmation
- [CSVBox: Preview CSV data before saving](https://blog.csvbox.io/csv-preview-before-save/) - Preview UX
- [IBM Cloud: CSV file format for importing metadata asset details](https://dataplatform.cloud.ibm.com/docs/content/wsj/catalog/csv-format-metadata.html) - Metadata columns

### Tertiary (LOW confidence, Phase 32 validated)
- Bulk validation thresholds (no definitive source, using Phase 32's 5-year minimum)
- Asset class auto-detection patterns (no consensus found)

## Metadata

**Confidence breakdown:**
- Papa Parse bulk patterns: HIGH - Official docs confirm unparse handles arrays of objects
- Dexie bulk operations: HIGH - Official docs, well-established API
- Preview-before-commit UX: HIGH - Multiple authoritative sources agree (2024-2026)
- Two-step confirmation: HIGH - AWS Cloudscape, Nielsen Norman Group, Microsoft guidelines
- Denormalized CSV format: MEDIUM - Common in enterprise tools but no official standard
- Bulk validation patterns: MEDIUM - Derived from Phase 32 patterns (proven) + web search best practices
- Template download patterns: MEDIUM - Multiple SaaS examples, no formal standard

**Research date:** 2026-01-31
**Valid until:** ~60 days for technical patterns, ~30 days for UX best practices (fast-moving field)
