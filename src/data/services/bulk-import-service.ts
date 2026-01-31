/**
 * Bulk import service for parsing multi-asset data files
 *
 * Provides parsing functions that extract structured data without validation.
 * Use the validation functions in data-validator.ts for full validation.
 */

import Papa from 'papaparse';
import type { PresetData, PresetReturn } from './preset-service';

/**
 * Parsed bulk data structure
 */
export interface ParsedBulkData {
  /** Successfully parsed assets */
  assets: ParsedAsset[];
  /** Any parse errors encountered */
  parseErrors: string[];
}

/**
 * Single parsed asset (before validation)
 */
export interface ParsedAsset {
  symbol: string;
  name: string;
  assetClass?: string;
  returns: PresetReturn[];
}

/**
 * Bulk CSV row with symbol included
 */
interface BulkCsvRow {
  symbol: string;
  name: string;
  asset_class?: string;
  year: string;
  annual_return: string;
}

/**
 * Parse bulk CSV content into structured data
 *
 * This function only parses - it does not validate.
 * Use validateBulkCsv() for validation.
 *
 * @param content - Raw CSV string with multiple assets
 * @returns ParsedBulkData with assets and any parse errors
 */
export function parseBulkCsv(content: string): ParsedBulkData {
  const parseErrors: string[] = [];

  // Parse CSV with Papa Parse
  const parsed = Papa.parse<BulkCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_')
  });

  // Collect parse errors
  for (const error of parsed.errors) {
    parseErrors.push(`Row ${error.row !== undefined ? error.row + 2 : '?'}: ${error.message}`);
  }

  // Check required columns
  const fields = parsed.meta.fields || [];
  const hasSymbol = fields.includes('symbol');
  const hasName = fields.includes('name');
  const hasYear = fields.includes('year');
  const hasReturn = fields.includes('annual_return');

  if (!hasSymbol || !hasName || !hasYear || !hasReturn) {
    const missing = [];
    if (!hasSymbol) missing.push('symbol');
    if (!hasName) missing.push('name');
    if (!hasYear) missing.push('year');
    if (!hasReturn) missing.push('annual_return');
    parseErrors.push(`Missing required columns: ${missing.join(', ')}`);
    return { assets: [], parseErrors };
  }

  // Group rows by symbol
  const symbolGroups = new Map<string, BulkCsvRow[]>();

  for (const row of parsed.data) {
    const symbol = row.symbol?.trim().toUpperCase();
    if (!symbol) continue;

    if (!symbolGroups.has(symbol)) {
      symbolGroups.set(symbol, []);
    }
    symbolGroups.get(symbol)!.push(row);
  }

  // Convert groups to ParsedAsset
  const assets: ParsedAsset[] = [];

  for (const [symbol, rows] of symbolGroups) {
    const name = rows[0].name?.trim() || symbol;
    const assetClass = rows[0].asset_class?.trim() || undefined;

    const returns: PresetReturn[] = [];
    for (const row of rows) {
      const year = row.year?.trim();
      const returnVal = parseFloat(row.annual_return);

      if (year && !isNaN(returnVal)) {
        returns.push({ date: year, return: returnVal });
      }
    }

    if (returns.length > 0) {
      assets.push({ symbol, name, assetClass, returns });
    }
  }

  return { assets, parseErrors };
}

/**
 * Parse bulk JSON content into structured data
 *
 * This function only parses - it does not validate.
 * Use validateBulkJson() for validation.
 *
 * @param content - Raw JSON string with multiple assets
 * @returns ParsedBulkData with assets and any parse errors
 */
export function parseBulkJson(content: string): ParsedBulkData {
  const parseErrors: string[] = [];
  const assets: ParsedAsset[] = [];

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    parseErrors.push(`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`);
    return { assets, parseErrors };
  }

  const obj = parsed as Record<string, unknown>;

  // Check for assets array
  if (!Array.isArray(obj.assets)) {
    parseErrors.push('Missing or invalid "assets" array');
    return { assets, parseErrors };
  }

  // Extract each asset
  for (const asset of obj.assets as unknown[]) {
    const assetObj = asset as Record<string, unknown>;

    const symbol = typeof assetObj.symbol === 'string'
      ? assetObj.symbol.toUpperCase()
      : '';
    const name = typeof assetObj.name === 'string'
      ? assetObj.name
      : symbol;
    const assetClass = typeof assetObj.assetClass === 'string'
      ? assetObj.assetClass
      : undefined;

    if (!symbol) {
      parseErrors.push('Asset missing symbol');
      continue;
    }

    const returns: PresetReturn[] = [];
    if (Array.isArray(assetObj.returns)) {
      for (const item of assetObj.returns as Array<{ date?: string; return?: number }>) {
        if (typeof item.date === 'string' && typeof item.return === 'number') {
          returns.push({ date: item.date, return: item.return });
        }
      }
    }

    if (returns.length > 0) {
      assets.push({ symbol, name, assetClass, returns });
    }
  }

  return { assets, parseErrors };
}

/**
 * Convert parsed assets to PresetData format
 *
 * @param assets - Array of ParsedAsset
 * @returns Array of PresetData ready for saving
 */
export function toPresetData(assets: ParsedAsset[]): PresetData[] {
  return assets.map(asset => {
    const sortedReturns = [...asset.returns].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return {
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      startDate: sortedReturns[0]?.date || '',
      endDate: sortedReturns[sortedReturns.length - 1]?.date || '',
      returns: sortedReturns
    };
  });
}
