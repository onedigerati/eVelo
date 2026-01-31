/**
 * Validation module for imported historical market data
 *
 * Supports CSV and JSON formats with comprehensive error reporting.
 * Uses Papa Parse for RFC 4180-compliant CSV handling.
 *
 * Also provides bulk validation for multi-asset imports with per-asset reporting.
 */

import Papa from 'papaparse';
import type { PresetData, PresetReturn } from '../services/preset-service';
import { hasCustomData } from '../services/custom-data-service';

/**
 * Result of validation attempt
 */
export interface ValidationResult {
  valid: boolean;
  data?: PresetData;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error (blocks import)
 */
export interface ValidationError {
  type: 'format' | 'missing_field' | 'invalid_value' | 'duplicate' | 'insufficient_data';
  row?: number;
  field?: string;
  message: string;
}

/**
 * Validation warning (allows import with caution)
 */
export interface ValidationWarning {
  type: 'anomaly' | 'gap' | 'extreme_value' | 'same_sign';
  row?: number;
  message: string;
}

/**
 * Result of bulk validation (multiple assets)
 */
export interface BulkValidationResult {
  /** True if at least one asset is valid */
  valid: boolean;
  /** Per-asset validation results */
  assets: AssetValidationResult[];
  /** Summary counts */
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
}

/**
 * Validation result for a single asset in bulk import
 */
export interface AssetValidationResult {
  symbol: string;
  name: string;
  /** add = new asset, update = replaces existing, skip = validation failed */
  action: 'add' | 'update' | 'skip';
  /** Number of data rows for this asset */
  recordCount: number;
  /** Detailed validation result */
  result: ValidationResult;
}

/**
 * Parse and validate CSV content
 *
 * Expected format:
 * year,annual_return
 * 1995,0.1488
 * 1996,-0.0523
 *
 * @param content - Raw CSV string
 * @param symbol - Symbol to assign to the data
 * @param name - Display name for the data
 */
export function parseAndValidateCsv(
  content: string,
  symbol: string,
  name: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Parse CSV with Papa Parse
  const parsed = Papa.parse<{ year: string; annual_return: string }>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_')
  });

  // Check for parse errors
  if (parsed.errors.length > 0) {
    parsed.errors.forEach(e => {
      errors.push({
        type: 'format',
        row: e.row !== undefined ? e.row + 2 : undefined, // +2 for header and 0-index
        message: `CSV format error: ${e.message}`
      });
    });
  }

  // Validate required columns
  const fields = parsed.meta.fields || [];
  const hasYear = fields.includes('year');
  const hasReturn = fields.includes('annual_return');

  if (!hasYear || !hasReturn) {
    const missing = [];
    if (!hasYear) missing.push('year');
    if (!hasReturn) missing.push('annual_return');
    errors.push({
      type: 'missing_field',
      message: `Missing required column(s): ${missing.join(', ')}. Expected: year, annual_return`
    });
    return { valid: false, errors, warnings };
  }

  // Validate each row
  const returns: PresetReturn[] = [];
  const seenYears = new Set<string>();
  let positiveCount = 0;
  let negativeCount = 0;

  parsed.data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row

    // Validate year format
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
    const returnStr = row.annual_return?.trim();
    const returnVal = parseFloat(returnStr);

    if (isNaN(returnVal)) {
      errors.push({
        type: 'invalid_value',
        row: rowNum,
        field: 'annual_return',
        message: `Row ${rowNum}: Invalid return value "${returnStr}". Expected decimal (e.g., 0.10 for 10%).`
      });
      return;
    }

    // Track sign distribution
    if (returnVal >= 0) positiveCount++;
    else negativeCount++;

    // Check for extreme values (warning, not error)
    if (returnVal < -0.9) {
      warnings.push({
        type: 'extreme_value',
        row: rowNum,
        message: `Row ${rowNum}: Return of ${(returnVal * 100).toFixed(1)}% is unusually extreme (< -90%).`
      });
    } else if (returnVal > 3.0) {
      warnings.push({
        type: 'extreme_value',
        row: rowNum,
        message: `Row ${rowNum}: Return of ${(returnVal * 100).toFixed(1)}% is unusually extreme (> 300%).`
      });
    }

    returns.push({ date: year, return: returnVal });
  });

  // Check minimum data requirement
  if (returns.length < 5 && errors.length === 0) {
    errors.push({
      type: 'insufficient_data',
      message: `Insufficient data. Found ${returns.length} rows, minimum 5 years required for simulation.`
    });
  }

  // Check for year gaps (warning)
  const sortedYears = [...seenYears].sort();
  for (let i = 1; i < sortedYears.length; i++) {
    const prev = parseInt(sortedYears[i - 1].substring(0, 4));
    const curr = parseInt(sortedYears[i].substring(0, 4));
    if (curr - prev > 1) {
      warnings.push({
        type: 'gap',
        message: `Missing data between ${prev} and ${curr} (${curr - prev - 1} year gap).`
      });
    }
  }

  // Check for all same sign (warning)
  if (returns.length >= 5) {
    if (positiveCount === returns.length) {
      warnings.push({
        type: 'same_sign',
        message: 'All returns are positive. This is unusual for real market data.'
      });
    } else if (negativeCount === returns.length) {
      warnings.push({
        type: 'same_sign',
        message: 'All returns are negative. This is unusual for real market data.'
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Build result
  const sortedReturns = returns.sort((a, b) => a.date.localeCompare(b.date));
  const data: PresetData = {
    symbol: symbol.toUpperCase(),
    name,
    startDate: sortedReturns[0].date,
    endDate: sortedReturns[sortedReturns.length - 1].date,
    returns: sortedReturns
  };

  return { valid: true, data, errors: [], warnings };
}

/**
 * Parse and validate JSON content
 *
 * Expected format matches PresetData interface with version wrapper
 */
export function parseAndValidateJson(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    errors.push({
      type: 'format',
      message: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`
    });
    return { valid: false, errors, warnings };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate required fields
  if (!obj.symbol || typeof obj.symbol !== 'string') {
    errors.push({ type: 'missing_field', field: 'symbol', message: 'Missing or invalid "symbol" field.' });
  }
  if (!obj.name || typeof obj.name !== 'string') {
    errors.push({ type: 'missing_field', field: 'name', message: 'Missing or invalid "name" field.' });
  }
  if (!Array.isArray(obj.returns)) {
    errors.push({ type: 'missing_field', field: 'returns', message: 'Missing or invalid "returns" array.' });
    return { valid: false, errors, warnings };
  }

  // Validate returns array
  const returns: PresetReturn[] = [];
  const seenDates = new Set<string>();
  let positiveCount = 0;
  let negativeCount = 0;

  (obj.returns as Array<{ date?: string; return?: number }>).forEach((item, index) => {
    const rowNum = index + 1;

    if (!item.date || typeof item.date !== 'string') {
      errors.push({
        type: 'invalid_value',
        row: rowNum,
        field: 'date',
        message: `Return #${rowNum}: Missing or invalid "date" field.`
      });
      return;
    }

    if (typeof item.return !== 'number' || isNaN(item.return)) {
      errors.push({
        type: 'invalid_value',
        row: rowNum,
        field: 'return',
        message: `Return #${rowNum}: Missing or invalid "return" value.`
      });
      return;
    }

    if (seenDates.has(item.date)) {
      errors.push({
        type: 'duplicate',
        row: rowNum,
        message: `Return #${rowNum}: Duplicate date "${item.date}".`
      });
      return;
    }
    seenDates.add(item.date);

    // Track sign distribution
    if (item.return >= 0) positiveCount++;
    else negativeCount++;

    // Extreme value warnings
    if (item.return < -0.9 || item.return > 3.0) {
      warnings.push({
        type: 'extreme_value',
        row: rowNum,
        message: `Return #${rowNum}: Value ${(item.return * 100).toFixed(1)}% is unusually extreme.`
      });
    }

    returns.push({ date: item.date, return: item.return });
  });

  // Minimum data check
  if (returns.length < 5 && errors.length === 0) {
    errors.push({
      type: 'insufficient_data',
      message: `Insufficient data. Found ${returns.length} entries, minimum 5 required.`
    });
  }

  // Same sign warning
  if (returns.length >= 5) {
    if (positiveCount === returns.length) {
      warnings.push({ type: 'same_sign', message: 'All returns are positive.' });
    } else if (negativeCount === returns.length) {
      warnings.push({ type: 'same_sign', message: 'All returns are negative.' });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const sortedReturns = returns.sort((a, b) => a.date.localeCompare(b.date));
  const data: PresetData = {
    symbol: (obj.symbol as string).toUpperCase(),
    name: obj.name as string,
    assetClass: typeof obj.assetClass === 'string' ? obj.assetClass : undefined,
    startDate: sortedReturns[0].date,
    endDate: sortedReturns[sortedReturns.length - 1].date,
    returns: sortedReturns
  };

  return { valid: true, data, errors: [], warnings };
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
 * Validate bulk CSV content with multiple assets
 *
 * Expected format:
 * symbol,name,year,annual_return
 * SPY,S&P 500,1995,0.1488
 * SPY,S&P 500,1996,0.2034
 * QQQ,Invesco QQQ,1995,0.2145
 *
 * @param content - Raw CSV string with multiple assets
 * @returns BulkValidationResult with per-asset results
 */
export async function validateBulkCsv(content: string): Promise<BulkValidationResult> {
  const assetResults: AssetValidationResult[] = [];

  // Parse CSV with Papa Parse
  const parsed = Papa.parse<BulkCsvRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_')
  });

  // Check for required columns
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

    return {
      valid: false,
      assets: [],
      summary: { total: 0, valid: 0, warnings: 0, errors: 1 }
    };
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

  // Validate each symbol group
  for (const [symbol, rows] of symbolGroups) {
    // Get name from first row
    const name = rows[0].name?.trim() || symbol;
    const assetClass = rows[0].asset_class?.trim();

    // Create single-asset CSV content for validation
    const singleAssetCsv = 'year,annual_return\n' +
      rows.map(r => `${r.year},${r.annual_return}`).join('\n');

    // Validate using existing single-asset function
    const validationResult = parseAndValidateCsv(singleAssetCsv, symbol, name);

    // Add asset class if provided and validation passed
    if (validationResult.valid && validationResult.data && assetClass) {
      validationResult.data.assetClass = assetClass;
    }

    // Determine action based on existing custom data
    let action: 'add' | 'update' | 'skip' = 'skip';
    if (validationResult.valid) {
      const hasExisting = await hasCustomData(symbol);
      action = hasExisting ? 'update' : 'add';
    }

    assetResults.push({
      symbol,
      name,
      action,
      recordCount: rows.length,
      result: validationResult
    });
  }

  // Calculate summary
  const validCount = assetResults.filter(a => a.result.valid).length;
  const warningCount = assetResults.filter(a => a.result.warnings.length > 0).length;
  const errorCount = assetResults.filter(a => a.result.errors.length > 0).length;

  return {
    valid: validCount > 0,
    assets: assetResults,
    summary: {
      total: assetResults.length,
      valid: validCount,
      warnings: warningCount,
      errors: errorCount
    }
  };
}

/**
 * Validate bulk JSON content with multiple assets
 *
 * Expected format:
 * {
 *   "version": 1,
 *   "assets": [
 *     { "symbol": "SPY", "name": "S&P 500", "returns": [...] },
 *     { "symbol": "QQQ", "name": "Invesco QQQ", "returns": [...] }
 *   ]
 * }
 *
 * @param content - Raw JSON string with multiple assets
 * @returns BulkValidationResult with per-asset results
 */
export async function validateBulkJson(content: string): Promise<BulkValidationResult> {
  const assetResults: AssetValidationResult[] = [];

  // Parse JSON
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

  const obj = parsed as Record<string, unknown>;

  // Check for assets array
  if (!Array.isArray(obj.assets)) {
    return {
      valid: false,
      assets: [],
      summary: { total: 0, valid: 0, warnings: 0, errors: 1 }
    };
  }

  // Validate each asset
  for (const asset of obj.assets as unknown[]) {
    // Create single-asset JSON string
    const assetJson = JSON.stringify(asset);

    // Validate using existing single-asset function
    const validationResult = parseAndValidateJson(assetJson);

    // Extract symbol and name for result
    const assetObj = asset as Record<string, unknown>;
    const symbol = (typeof assetObj.symbol === 'string' ? assetObj.symbol : '').toUpperCase();
    const name = typeof assetObj.name === 'string' ? assetObj.name : symbol;
    const recordCount = Array.isArray(assetObj.returns) ? assetObj.returns.length : 0;

    // Determine action based on existing custom data
    let action: 'add' | 'update' | 'skip' = 'skip';
    if (validationResult.valid && symbol) {
      const hasExisting = await hasCustomData(symbol);
      action = hasExisting ? 'update' : 'add';
    }

    assetResults.push({
      symbol,
      name,
      action,
      recordCount,
      result: validationResult
    });
  }

  // Calculate summary
  const validCount = assetResults.filter(a => a.result.valid).length;
  const warningCount = assetResults.filter(a => a.result.warnings.length > 0).length;
  const errorCount = assetResults.filter(a => a.result.errors.length > 0).length;

  return {
    valid: validCount > 0,
    assets: assetResults,
    summary: {
      total: assetResults.length,
      valid: validCount,
      warnings: warningCount,
      errors: errorCount
    }
  };
}
