/**
 * Bulk export service for exporting all assets to a single file
 *
 * Supports CSV and JSON formats with all asset data denormalized
 * for easy import into spreadsheets or other systems.
 */

import Papa from 'papaparse';
import { getPresetSymbols, getEffectiveData, type PresetData } from './preset-service';
import { getCustomSymbols } from './custom-data-service';

/**
 * Single row in bulk CSV export (denormalized format)
 */
export interface BulkExportRow {
  symbol: string;
  name: string;
  asset_class: string;
  year: string;
  annual_return: number;
}

/**
 * JSON export structure with metadata
 */
export interface BulkJsonExport {
  version: number;
  exportedAt: string;
  assets: PresetData[];
}

/**
 * Export all assets to CSV format
 *
 * Creates a denormalized CSV where each row represents one year's return
 * for one asset. Symbol, name, and asset_class are repeated for each row.
 *
 * Format:
 * symbol,name,asset_class,year,annual_return
 * SPY,S&P 500 ETF,equity,1995,0.1488
 * SPY,S&P 500 ETF,equity,1996,0.2034
 *
 * @returns CSV string ready for download
 */
export async function exportAllToCsv(): Promise<string> {
  // Get all symbols: bundled presets + custom-only symbols
  const bundledSymbols = getPresetSymbols();
  const customSymbols = await getCustomSymbols();
  const bundledSet = new Set(bundledSymbols);

  // Find custom-only symbols (not in bundled presets)
  const customOnlySymbols = customSymbols.filter(s => !bundledSet.has(s));

  // Combine all symbols and sort alphabetically
  const allSymbols = [...bundledSymbols, ...customOnlySymbols].sort((a, b) => a.localeCompare(b));

  const rows: BulkExportRow[] = [];

  for (const symbol of allSymbols) {
    const data = await getEffectiveData(symbol);
    if (!data) continue;

    // Create one row per return period
    for (const ret of data.returns) {
      rows.push({
        symbol: data.symbol,
        name: data.name,
        asset_class: data.assetClass || '',
        year: ret.date,
        annual_return: ret.return
      });
    }
  }

  // Generate CSV with Papa Parse
  return Papa.unparse(rows, {
    header: true,
    newline: '\n',
    escapeFormulae: true
  });
}

/**
 * Export all assets to JSON format
 *
 * Creates a structured JSON export with version info and timestamp.
 * Assets are stored in normalized format (PresetData structure).
 *
 * @returns JSON string with 2-space indentation
 */
export async function exportAllToJson(): Promise<string> {
  // Get all symbols: bundled presets + custom-only symbols
  const bundledSymbols = getPresetSymbols();
  const customSymbols = await getCustomSymbols();
  const bundledSet = new Set(bundledSymbols);

  // Find custom-only symbols (not in bundled presets)
  const customOnlySymbols = customSymbols.filter(s => !bundledSet.has(s));

  // Combine all symbols and sort alphabetically
  const allSymbols = [...bundledSymbols, ...customOnlySymbols].sort((a, b) => a.localeCompare(b));

  const assets: PresetData[] = [];

  for (const symbol of allSymbols) {
    const data = await getEffectiveData(symbol);
    if (data) {
      assets.push(data);
    }
  }

  const exportData: BulkJsonExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    assets
  };

  return JSON.stringify(exportData, null, 2);
}
