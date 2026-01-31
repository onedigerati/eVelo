# Phase 32: Historical Asset Data Management - Research

**Researched:** 2026-01-31
**Domain:** Data viewing, CSV/JSON export/import, validation UX, spreadsheet compatibility
**Confidence:** HIGH

## Summary

Phase 32 implements a user interface for viewing, exporting, importing, and managing historical asset data used by eVelo's simulation engine. The existing codebase has well-established patterns: bundled JSON presets with `PresetData` interface (symbol, name, assetClass, startDate, endDate, returns array), Dexie.js for IndexedDB persistence, and a BaseComponent class for Web Components. The key challenges are: (1) displaying large datasets (30+ years of returns) in a readable way, (2) providing Excel/Google Sheets compatible export formats, (3) validating imported data with helpful error messages, and (4) detecting anomalies in custom data that might indicate user error.

**Primary recommendation:** Use Papa Parse for CSV parsing/unparsing (RFC 4180 compliant, TypeScript types available), implement a virtual scrolling table for large datasets, and provide both CSV and JSON export formats. For validation, use late/on-blur validation patterns with specific error messages. For anomaly detection, use simple statistical checks (range validation, year gaps, extreme outliers beyond 3 standard deviations from historical norms).

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Papa Parse | 5.x | CSV parsing/unparsing | RFC 4180 compliant, fast, TypeScript types (@types/papaparse), handles edge cases |
| Dexie.js | 4.x | Custom data persistence | Already in use (db.ts), proven patterns from Phase 8 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing BaseComponent | N/A | Web Component base | All UI components extend this |
| Existing modal-dialog | N/A | Confirmation/error dialogs | Import validation errors, reset confirmation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Papa Parse | csv-parse | Papa Parse is simpler, browser-focused, better docs |
| Papa Parse | Manual parsing | Edge cases (quoted commas, newlines in fields) are tricky |
| Virtual scrolling | Pagination | Pagination requires more UI complexity, virtual scroll is smoother |
| JSON + CSV | JSON only | CSV is more accessible for Excel/Google Sheets users |

**Installation:**
```bash
npm install papaparse
npm install -D @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  components/ui/
    historical-data-viewer.ts     # Main component for viewing/managing data
    data-table.ts                 # Reusable virtual-scrolling data table
  data/
    services/
      preset-service.ts           # Already exists - add export/import methods
      custom-data-service.ts      # NEW: Custom user data management
    schemas/
      custom-market-data.ts       # NEW: Schema for user-imported data
    validation/
      data-validator.ts           # NEW: Validation logic for imports
```

### Pattern 1: Data Export to CSV/JSON

**What:** Export bundled or custom data in user-editable formats using Blob download.

**When to use:** User clicks "Export" on a dataset.

**Example:**
```typescript
// src/data/services/preset-service.ts (additions)
import Papa from 'papaparse';
import type { PresetData, PresetReturn } from './preset-service';

export interface ExportableRow {
  year: string;
  annual_return: number;
  asset_class?: string;
}

export function exportToCsv(data: PresetData): string {
  const rows: ExportableRow[] = data.returns.map(r => ({
    year: r.date,  // "1995" or "1995-01-01"
    annual_return: r.return,
    asset_class: data.assetClass
  }));

  return Papa.unparse(rows, {
    header: true,
    newline: '\n'
  });
}

export function exportToJson(data: PresetData): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    symbol: data.symbol,
    name: data.name,
    assetClass: data.assetClass,
    startDate: data.startDate,
    endDate: data.endDate,
    returns: data.returns
  }, null, 2);
}

export function downloadAsFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Pattern 2: Data Import with Validation

**What:** Parse uploaded CSV/JSON with progressive validation and clear error reporting.

**When to use:** User imports a custom data file.

**Example:**
```typescript
// src/data/validation/data-validator.ts
import Papa from 'papaparse';
import type { PresetData, PresetReturn } from '../services/preset-service';

export interface ValidationResult {
  valid: boolean;
  data?: PresetData;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'format' | 'missing_field' | 'invalid_value' | 'duplicate';
  row?: number;
  field?: string;
  message: string;
}

export interface ValidationWarning {
  type: 'anomaly' | 'gap' | 'extreme_value';
  row?: number;
  message: string;
}

export function parseAndValidateCsv(
  content: string,
  symbol: string,
  name: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Parse CSV
  const parsed = Papa.parse<{ year: string; annual_return: string }>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_')
  });

  // Check for parse errors
  if (parsed.errors.length > 0) {
    parsed.errors.forEach(e => {
      errors.push({
        type: 'format',
        row: e.row,
        message: `CSV format error: ${e.message}`
      });
    });
  }

  // Validate required columns
  const hasYear = parsed.meta.fields?.includes('year');
  const hasReturn = parsed.meta.fields?.includes('annual_return');

  if (!hasYear || !hasReturn) {
    errors.push({
      type: 'missing_field',
      message: `Missing required column(s): ${!hasYear ? 'year' : ''} ${!hasReturn ? 'annual_return' : ''}`.trim()
    });
    return { valid: false, errors, warnings };
  }

  // Validate each row
  const returns: PresetReturn[] = [];
  const seenYears = new Set<string>();

  parsed.data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row

    // Validate year
    const year = row.year?.trim();
    if (!year || !/^\d{4}(-\d{2}-\d{2})?$/.test(year)) {
      errors.push({
        type: 'invalid_value',
        row: rowNum,
        field: 'year',
        message: `Row ${rowNum}: Invalid year format "${year}". Expected YYYY or YYYY-MM-DD.`
      });
      return;
    }

    // Check for duplicates
    if (seenYears.has(year)) {
      errors.push({
        type: 'duplicate',
        row: rowNum,
        field: 'year',
        message: `Row ${rowNum}: Duplicate year "${year}".`
      });
      return;
    }
    seenYears.add(year);

    // Validate return value
    const returnVal = parseFloat(row.annual_return);
    if (isNaN(returnVal)) {
      errors.push({
        type: 'invalid_value',
        row: rowNum,
        field: 'annual_return',
        message: `Row ${rowNum}: Invalid return value "${row.annual_return}". Expected decimal (e.g., 0.10 for 10%).`
      });
      return;
    }

    // Check for extreme values (warning, not error)
    if (returnVal < -0.9 || returnVal > 3.0) {
      warnings.push({
        type: 'extreme_value',
        row: rowNum,
        message: `Row ${rowNum}: Return of ${(returnVal * 100).toFixed(1)}% is unusually extreme.`
      });
    }

    returns.push({ date: year, return: returnVal });
  });

  // Check for year gaps (warning)
  const sortedYears = [...seenYears].sort();
  for (let i = 1; i < sortedYears.length; i++) {
    const prev = parseInt(sortedYears[i - 1].substring(0, 4));
    const curr = parseInt(sortedYears[i].substring(0, 4));
    if (curr - prev > 1) {
      warnings.push({
        type: 'gap',
        message: `Missing data between ${prev} and ${curr}.`
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Build result
  const sortedReturns = returns.sort((a, b) => a.date.localeCompare(b.date));
  const data: PresetData = {
    symbol,
    name,
    startDate: sortedReturns[0].date,
    endDate: sortedReturns[sortedReturns.length - 1].date,
    returns: sortedReturns
  };

  return { valid: true, data, errors: [], warnings };
}
```

### Pattern 3: Virtual Scrolling Table for Large Datasets

**What:** Render only visible rows to handle 30+ years of data efficiently.

**When to use:** Displaying historical return data (potentially 30+ rows).

**Example:**
```typescript
// src/components/ui/data-table.ts
import { BaseComponent } from '../base-component';

interface DataRow {
  year: string;
  return: number;
}

export class DataTable extends BaseComponent {
  private _data: DataRow[] = [];
  private _visibleRows = 20;
  private _rowHeight = 36; // px
  private _scrollTop = 0;

  set data(value: DataRow[]) {
    this._data = value;
    this.render();
  }

  protected template(): string {
    const totalHeight = this._data.length * this._rowHeight;
    const startIndex = Math.floor(this._scrollTop / this._rowHeight);
    const endIndex = Math.min(startIndex + this._visibleRows + 2, this._data.length);
    const offsetY = startIndex * this._rowHeight;

    const visibleData = this._data.slice(startIndex, endIndex);

    return `
      <div class="table-container" style="max-height: ${this._visibleRows * this._rowHeight}px; overflow-y: auto;">
        <div class="table-spacer" style="height: ${totalHeight}px; position: relative;">
          <table style="transform: translateY(${offsetY}px);">
            <thead>
              <tr>
                <th>Year</th>
                <th>Annual Return</th>
              </tr>
            </thead>
            <tbody>
              ${visibleData.map(row => `
                <tr>
                  <td>${row.year}</td>
                  <td class="${row.return >= 0 ? 'positive' : 'negative'}">
                    ${(row.return * 100).toFixed(2)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  protected afterRender(): void {
    const container = this.$('.table-container');
    container?.addEventListener('scroll', (e) => {
      this._scrollTop = (e.target as HTMLElement).scrollTop;
      this.render();
    });
  }

  protected styles(): string {
    return `
      .table-container {
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: var(--spacing-sm);
        text-align: left;
        border-bottom: 1px solid var(--border-color);
        height: ${this._rowHeight}px;
        box-sizing: border-box;
      }
      th {
        background: var(--surface-secondary);
        font-weight: 600;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .positive { color: var(--color-success); }
      .negative { color: var(--color-danger); }
    `;
  }
}

customElements.define('data-table', DataTable);
```

### Pattern 4: File Upload with Drag-and-Drop

**What:** Accept file input via click or drag-and-drop.

**When to use:** Import custom historical data.

**Example:**
```typescript
// src/components/ui/file-drop-zone.ts
import { BaseComponent } from '../base-component';

export class FileDropZone extends BaseComponent {
  private _isDragging = false;

  protected template(): string {
    return `
      <div class="drop-zone ${this._isDragging ? 'dragging' : ''}">
        <input type="file" id="file-input" accept=".csv,.json" hidden />
        <label for="file-input" class="drop-label">
          <span class="icon">&#x1F4C1;</span>
          <span class="text">Drop CSV or JSON file here, or click to browse</span>
          <span class="hint">Supported: .csv, .json</span>
        </label>
      </div>
    `;
  }

  protected afterRender(): void {
    const dropZone = this.$('.drop-zone');
    const fileInput = this.$('#file-input') as HTMLInputElement;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Visual feedback
    dropZone?.addEventListener('dragenter', () => {
      this._isDragging = true;
      this.render();
    });
    dropZone?.addEventListener('dragleave', () => {
      this._isDragging = false;
      this.render();
    });

    // Handle drop
    dropZone?.addEventListener('drop', (e: DragEvent) => {
      this._isDragging = false;
      const files = e.dataTransfer?.files;
      if (files?.length) {
        this.handleFile(files[0]);
      }
    });

    // Handle file input change
    fileInput?.addEventListener('change', () => {
      if (fileInput.files?.length) {
        this.handleFile(fileInput.files[0]);
        fileInput.value = ''; // Reset for same file re-upload
      }
    });
  }

  private handleFile(file: File): void {
    this.dispatchEvent(new CustomEvent('file-selected', {
      detail: { file },
      bubbles: true,
      composed: true
    }));
  }

  protected styles(): string {
    return `
      .drop-zone {
        border: 2px dashed var(--border-color);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-xl);
        text-align: center;
        transition: border-color 0.2s, background 0.2s;
        cursor: pointer;
      }
      .drop-zone.dragging, .drop-zone:hover {
        border-color: var(--color-primary);
        background: var(--color-primary-light, rgba(13, 148, 136, 0.05));
      }
      .drop-label {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        cursor: pointer;
      }
      .icon { font-size: 2rem; }
      .text { color: var(--text-primary); }
      .hint { color: var(--text-tertiary); font-size: 0.875rem; }
    `;
  }
}

customElements.define('file-drop-zone', FileDropZone);
```

### Pattern 5: Custom Data Persistence in IndexedDB

**What:** Store user-imported data separate from bundled presets.

**When to use:** After successful import validation.

**Example:**
```typescript
// src/data/schemas/custom-market-data.ts
import type { PresetData, PresetReturn } from '../services/preset-service';

export interface CustomMarketData {
  id?: number;
  symbol: string;
  name: string;
  assetClass?: string;
  startDate: string;
  endDate: string;
  returns: PresetReturn[];
  importedAt: string; // ISO date
  source: 'user-import' | 'bundled-modified';
}

// Add to db.ts schema version increment:
// this.version(2).stores({
//   ...existing,
//   customMarketData: '++id, symbol, importedAt'
// });

// src/data/services/custom-data-service.ts
import { db } from '../db';
import type { CustomMarketData } from '../schemas/custom-market-data';
import type { PresetData } from './preset-service';

export async function saveCustomData(data: PresetData, source: 'user-import' | 'bundled-modified'): Promise<number> {
  const record: CustomMarketData = {
    ...data,
    importedAt: new Date().toISOString(),
    source
  };
  return db.customMarketData.add(record);
}

export async function getCustomData(symbol: string): Promise<CustomMarketData | undefined> {
  return db.customMarketData.where('symbol').equals(symbol).first();
}

export async function getAllCustomData(): Promise<CustomMarketData[]> {
  return db.customMarketData.toArray();
}

export async function deleteCustomData(symbol: string): Promise<void> {
  await db.customMarketData.where('symbol').equals(symbol).delete();
}

export async function resetToDefaults(symbol: string): Promise<void> {
  await deleteCustomData(symbol);
  // Bundled data is always available via preset-service
}
```

### Anti-Patterns to Avoid

- **Loading all data into DOM:** Use virtual scrolling for datasets > 20 rows. Don't render 30+ table rows directly.
- **Validation on every keystroke:** For file imports, validate on submission, not during typing. Use late validation.
- **Generic error messages:** "Invalid file" is unhelpful. Specify row numbers and expected formats.
- **Relying on file extension alone:** Validate actual content, not just .csv/.json extension.
- **Modifying bundled data in place:** Keep bundled presets read-only. Store modifications in separate IndexedDB table.
- **Blocking UI during validation:** Large file parsing should use Web Worker or async chunking.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | String.split(',') | Papa Parse | Quoted fields, escaped commas, newlines in values |
| CSV generation | Manual string concatenation | Papa.unparse() | Proper escaping, RFC 4180 compliance |
| File download | Manual Blob handling each time | downloadAsFile() helper | URL.revokeObjectURL cleanup, consistent pattern |
| Numeric formatting | Manual toFixed() everywhere | Intl.NumberFormat | Locale-aware, handles edge cases |
| Date parsing | new Date(string) | Store as ISO strings | Timezone issues, browser inconsistencies |

**Key insight:** CSV looks simple but has many edge cases (commas in values, quotes, newlines). Papa Parse handles these correctly; hand-rolled parsers almost never do.

## Common Pitfalls

### Pitfall 1: Excel Formula Injection

**What goes wrong:** Imported CSV contains malicious formulas like `=HYPERLINK("http://evil.com")` that execute when exported and opened in Excel.

**Why it happens:** User imports data from untrusted source.

**How to avoid:** Sanitize all string values on import:
```typescript
function sanitizeForExcel(value: string): string {
  // Prefix dangerous characters with single quote
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}
```

**Warning signs:** String values starting with =, +, -, @, or tab character.

### Pitfall 2: Number Format Confusion (Percentage vs Decimal)

**What goes wrong:** User enters 10 meaning 10% but system interprets as 1000%.

**Why it happens:** Ambiguity between percentage display and decimal storage.

**How to avoid:**
1. Clear documentation: "Enter as decimal: 0.10 for 10%"
2. Auto-detect and warn: if value > 1.0, suggest conversion
3. Preview imported values with % sign before saving

**Warning signs:** Simulation results are wildly unrealistic.

### Pitfall 3: Year Format Inconsistency

**What goes wrong:** Mix of "1995", "1995-01-01", "01/01/1995" causes parsing failures or wrong ordering.

**Why it happens:** Users export from different sources with different date formats.

**How to avoid:**
1. Accept multiple formats on import (YYYY, YYYY-MM-DD)
2. Normalize to consistent format (YYYY or YYYY-MM-DD) on save
3. Reject ambiguous formats (MM/DD/YYYY vs DD/MM/YYYY)

**Warning signs:** Data sorted incorrectly, gaps where none expected.

### Pitfall 4: Lost Precision in CSV Round-Trip

**What goes wrong:** Export shows "0.10" but re-import loses precision due to floating-point.

**Why it happens:** JavaScript floating-point representation.

**How to avoid:**
```typescript
// Export with sufficient precision
const csvReturn = return.toFixed(6);  // 6 decimal places

// Import with explicit parsing
const importedReturn = parseFloat(value);
```

**Warning signs:** Values slightly different after export/import cycle.

### Pitfall 5: Silent Data Loss on Large Files

**What goes wrong:** Browser hangs or crashes on multi-MB CSV file.

**Why it happens:** Papa Parse synchronous mode blocks main thread.

**How to avoid:**
```typescript
// Use streaming for files > 100KB
Papa.parse(file, {
  step: (row) => {
    // Process row by row
    processedRows.push(validateRow(row.data));
  },
  complete: () => {
    finishImport(processedRows);
  }
});
```

**Warning signs:** UI freeze during import, browser "page unresponsive" warning.

### Pitfall 6: Confusing Bundled vs Custom Data

**What goes wrong:** User edits data, forgets they edited, wonders why results differ.

**Why it happens:** No clear indication that custom data is active.

**How to avoid:**
1. Visual indicator when custom data is in use (badge, different background)
2. Clear "Reset to Default" button
3. Track modification source in metadata

**Warning signs:** Users reporting unexpected simulation results.

## Code Examples

Verified patterns from official sources:

### Papa Parse CSV Parsing with Error Handling

```typescript
// Source: https://www.papaparse.com/docs
import Papa from 'papaparse';

interface ParsedRow {
  year: string;
  annual_return: string;
}

function parseHistoricalCsv(content: string): { data: ParsedRow[]; errors: string[] } {
  const result = Papa.parse<ParsedRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    dynamicTyping: false,  // Keep as strings for validation
  });

  const errors = result.errors.map(e =>
    `Line ${(e.row ?? 0) + 2}: ${e.message}`
  );

  return { data: result.data, errors };
}
```

### Papa Parse CSV Generation

```typescript
// Source: https://www.papaparse.com/docs
import Papa from 'papaparse';

function generateCsv(data: { year: string; return: number }[]): string {
  const rows = data.map(d => ({
    year: d.year,
    annual_return: d.return.toFixed(6)
  }));

  return Papa.unparse(rows, {
    header: true,
    newline: '\n'
  });
}
```

### Blob Download Pattern

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

### FileReader for Upload

```typescript
// Source: MDN FileReader documentation
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
```

## Data Format Specification

### CSV Format (Recommended for Users)

```csv
year,annual_return
1995,0.148800
1996,0.159300
1997,0.176100
1998,-0.170600
```

**Rules:**
- First row is header: `year,annual_return`
- Year format: `YYYY` (preferred) or `YYYY-MM-DD`
- Return format: decimal (0.10 = 10%), 4-6 decimal places recommended
- UTF-8 encoding
- Unix-style line endings (\n) or Windows (\r\n) both accepted

### JSON Format (Recommended for Advanced Users)

```json
{
  "version": 1,
  "exportedAt": "2026-01-31T12:00:00.000Z",
  "symbol": "CUSTOM",
  "name": "My Custom Data",
  "assetClass": "equity_stock",
  "startDate": "1995",
  "endDate": "2024",
  "returns": [
    { "date": "1995", "return": 0.1488 },
    { "date": "1996", "return": 0.1593 }
  ]
}
```

**Rules:**
- Version field for future compatibility
- Returns array sorted by date
- Dates as strings (not Date objects)
- Returns as decimals

## Validation Rules

### Required Validations (Errors)

| Rule | Error Message |
|------|---------------|
| File is valid CSV/JSON | "Unable to parse file. Please check format." |
| Has 'year' column | "Missing required column: year" |
| Has 'annual_return' column | "Missing required column: annual_return" |
| Year is valid format | "Row X: Invalid year format 'Y'. Expected YYYY or YYYY-MM-DD." |
| Return is numeric | "Row X: Invalid return value 'Y'. Expected decimal (e.g., 0.10 for 10%)." |
| No duplicate years | "Row X: Duplicate year 'Y'." |
| At least 5 years of data | "Insufficient data. Minimum 5 years required for simulation." |

### Optional Validations (Warnings)

| Rule | Warning Message |
|------|-----------------|
| Return > 300% | "Row X: Return of Y% is unusually extreme." |
| Return < -90% | "Row X: Return of Y% is unusually extreme." |
| Year gaps | "Missing data between X and Y." |
| All returns same sign | "All returns are positive/negative. This is unusual." |

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CSV parsing | Papa Parse with streaming | 2024+ standard | Handles edge cases, large files |
| Full DOM rendering | Virtual scrolling | 2024+ standard | Better performance for large datasets |
| Alert boxes for errors | Inline validation messages | 2024+ UX standard | Better user experience |
| Single export format | CSV + JSON options | User preference | Accessibility for different skill levels |

**Best practices for 2026:**
- Late validation (on blur/submit) outperforms real-time for file uploads
- Inline error messages with specific row numbers are essential
- Progress indicators for files > 100KB
- Drag-and-drop is expected, not optional

**Deprecated/outdated:**
- Synchronous file parsing for large files
- Generic "invalid file" error messages
- Alert/confirm dialogs for validation errors (use inline)

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal virtual scroll implementation**
   - What we know: Virtual scroll is needed for 30+ rows
   - What's unclear: Whether to use intersection observer or scroll position tracking
   - Recommendation: Start with scroll position (simpler), optimize later if needed

2. **Anomaly detection sensitivity**
   - What we know: Should warn on extreme values and gaps
   - What's unclear: Exact thresholds (>300%? >200%?)
   - Recommendation: Start conservative (warn at 300%), adjust based on user feedback

3. **Multi-asset import**
   - What we know: Current bundled data is per-symbol
   - What's unclear: Should import support multiple symbols in one file?
   - Recommendation: Start with single-symbol, defer multi-symbol to future phase

## Sources

### Primary (HIGH confidence)
- [Papa Parse Official Documentation](https://www.papaparse.com/docs) - CSV parsing API
- [MDN File Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop) - Drag/drop events
- [MDN Blob Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Blob) - File download pattern

### Secondary (MEDIUM confidence)
- [CSV Formatting Best Practices (Integrate.io)](https://www.integrate.io/blog/csv-formatting-tips-and-tricks-for-data-accuracy/) - CSV format guidelines
- [Form Validation UX (Smashing Magazine)](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/) - Late validation patterns
- [Accessible Form Validation (UXPin)](https://www.uxpin.com/studio/blog/accessible-form-validation-best-practices/) - ARIA and error messaging
- [Form Validation Best Practices (IvyForms)](https://ivyforms.com/blog/form-validation-best-practices/) - UX improvements

### Tertiary (LOW confidence, needs validation)
- Virtual scrolling implementation details (multiple blog sources)
- Exact anomaly detection thresholds for financial data

## Metadata

**Confidence breakdown:**
- Papa Parse patterns: HIGH - Official documentation, well-established library
- Export/download patterns: HIGH - MDN documentation, standard browser APIs
- Validation patterns: HIGH - Multiple UX research sources agree
- Virtual scrolling: MEDIUM - Standard technique, implementation varies
- Anomaly detection thresholds: MEDIUM - Domain-specific, may need tuning

**Research date:** 2026-01-31
**Valid until:** ~60 days for library patterns, ~30 days for UX best practices
