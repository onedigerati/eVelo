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
