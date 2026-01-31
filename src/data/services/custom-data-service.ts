/**
 * Service for managing custom (user-imported) market data
 *
 * Custom data is stored separately from bundled presets in IndexedDB.
 * When a symbol has custom data, it takes precedence over bundled data.
 */

import { db } from '../db';
import type { CustomMarketData } from '../schemas/custom-market-data';
import type { PresetData } from './preset-service';

/**
 * Save custom market data to IndexedDB
 * If data for this symbol already exists, it will be replaced.
 *
 * @param data - PresetData format from import
 * @param source - Origin of the data
 * @returns The ID of the saved record
 */
export async function saveCustomData(
  data: PresetData,
  source: 'user-import' | 'bundled-modified'
): Promise<number> {
  // Delete existing data for this symbol first
  await deleteCustomData(data.symbol);

  const record: CustomMarketData = {
    symbol: data.symbol.toUpperCase(),
    name: data.name,
    assetClass: data.assetClass,
    startDate: data.startDate,
    endDate: data.endDate,
    returns: data.returns,
    importedAt: new Date().toISOString(),
    source
  };

  return db.customMarketData.add(record) as Promise<number>;
}

/**
 * Get custom data for a specific symbol
 * @returns CustomMarketData if exists, undefined otherwise
 */
export async function getCustomData(symbol: string): Promise<CustomMarketData | undefined> {
  return db.customMarketData.where('symbol').equals(symbol.toUpperCase()).first();
}

/**
 * Get all custom data records
 */
export async function getAllCustomData(): Promise<CustomMarketData[]> {
  return db.customMarketData.toArray();
}

/**
 * Check if custom data exists for a symbol
 */
export async function hasCustomData(symbol: string): Promise<boolean> {
  const count = await db.customMarketData.where('symbol').equals(symbol.toUpperCase()).count();
  return count > 0;
}

/**
 * Delete custom data for a symbol
 */
export async function deleteCustomData(symbol: string): Promise<void> {
  await db.customMarketData.where('symbol').equals(symbol.toUpperCase()).delete();
}

/**
 * Reset to bundled defaults by deleting all custom data for a symbol
 * After this, the bundled preset data will be used again.
 */
export async function resetToDefaults(symbol: string): Promise<void> {
  await deleteCustomData(symbol);
}

/**
 * Get list of symbols that have custom data
 */
export async function getCustomSymbols(): Promise<string[]> {
  const records = await db.customMarketData.toArray();
  return records.map(r => r.symbol);
}

/**
 * Save multiple assets in bulk using efficient Dexie operations
 *
 * Deletes existing data for all symbols first, then bulk inserts.
 * More efficient than calling saveCustomData() multiple times.
 *
 * @param assets - Array of PresetData to save
 * @param source - Origin of the data
 * @returns Array of inserted IDs
 */
export async function saveAllCustomData(
  assets: PresetData[],
  source: 'user-import' | 'bundled-modified'
): Promise<number[]> {
  if (assets.length === 0) {
    return [];
  }

  // Collect all symbols to delete
  const symbols = assets.map(a => a.symbol.toUpperCase());

  // Delete existing data for all symbols in one query
  await db.customMarketData.where('symbol').anyOf(symbols).delete();

  // Prepare records for bulk insert
  const importedAt = new Date().toISOString();
  const records: CustomMarketData[] = assets.map(data => ({
    symbol: data.symbol.toUpperCase(),
    name: data.name,
    assetClass: data.assetClass,
    startDate: data.startDate,
    endDate: data.endDate,
    returns: data.returns,
    importedAt,
    source
  }));

  // Bulk add and return IDs
  const ids = await db.customMarketData.bulkAdd(records, { allKeys: true });
  return ids as number[];
}

/**
 * Reset all custom data to defaults by clearing the entire table
 *
 * After this, all bundled preset data will be used again.
 *
 * @returns Number of records that were deleted
 */
export async function resetAllToDefaults(): Promise<number> {
  // Get count before clearing
  const count = await db.customMarketData.count();

  // Clear entire table
  await db.customMarketData.clear();

  return count;
}
