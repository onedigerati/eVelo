/**
 * Portfolio service for IndexedDB CRUD operations
 *
 * Provides save/load/export/import operations for user portfolios.
 */

import { db } from '../db';
import type { PortfolioRecord } from '../schemas/portfolio';

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Save a portfolio to IndexedDB
 * Creates new if no id, updates existing if id present
 * @returns The portfolio id (new or existing)
 */
export async function savePortfolio(
  portfolio: Omit<PortfolioRecord, 'id'> & { id?: number }
): Promise<number> {
  const now = new Date().toISOString();

  // If id is provided, this is an update
  if (portfolio.id !== undefined) {
    const record: PortfolioRecord = {
      ...portfolio,
      id: portfolio.id,
      modified: now
    };
    // put() always returns the key for auto-increment tables
    return (await db.portfolios.put(record)) as number;
  }

  // New portfolio - set created timestamp
  const record: PortfolioRecord = {
    ...portfolio,
    created: now,
    modified: now
  };
  // put() always returns the key for auto-increment tables
  return (await db.portfolios.put(record)) as number;
}

/**
 * Load a single portfolio by id
 */
export async function loadPortfolio(id: number): Promise<PortfolioRecord | undefined> {
  return await db.portfolios.get(id);
}

/**
 * Load all portfolios, ordered by most recently modified first
 */
export async function loadAllPortfolios(): Promise<PortfolioRecord[]> {
  return await db.portfolios.orderBy('modified').reverse().toArray();
}

/**
 * Delete a portfolio by id
 */
export async function deletePortfolio(id: number): Promise<void> {
  await db.portfolios.delete(id);
}

/**
 * Update just the name of a portfolio
 */
export async function updatePortfolioName(id: number, name: string): Promise<void> {
  const now = new Date().toISOString();
  await db.portfolios.update(id, { name, modified: now });
}

// =============================================================================
// Export/Import
// =============================================================================

/** Current export format version */
export const EXPORT_VERSION = 1;

/** Tolerance for weight sum validation */
const WEIGHT_TOLERANCE = 0.01;

/**
 * Exported portfolio file format
 */
export interface PortfolioExport {
  version: number;
  exportedAt: string;
  portfolios: PortfolioRecord[];
}

/**
 * Export portfolios to JSON string
 * Strips auto-generated IDs for portability
 */
export function exportPortfolios(portfolios: PortfolioRecord[]): string {
  const exportData: PortfolioExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    portfolios: portfolios.map(p => ({
      ...p,
      id: undefined // Strip auto-generated IDs
    }))
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Validate a single portfolio object
 */
export function validatePortfolio(p: unknown): p is PortfolioRecord {
  if (typeof p !== 'object' || p === null) {
    return false;
  }

  const record = p as Record<string, unknown>;

  // Required fields
  if (typeof record.name !== 'string' || !record.name.trim()) {
    return false;
  }

  if (!Array.isArray(record.assets)) {
    return false;
  }

  // Validate each asset
  let weightSum = 0;
  for (const asset of record.assets) {
    if (typeof asset !== 'object' || asset === null) {
      return false;
    }
    const a = asset as Record<string, unknown>;

    if (typeof a.id !== 'string' || !a.id) return false;
    if (typeof a.symbol !== 'string') return false;
    if (typeof a.name !== 'string') return false;
    if (typeof a.assetClass !== 'string') return false;
    if (typeof a.weight !== 'number' || a.weight < 0 || a.weight > 1) return false;

    weightSum += a.weight;
  }

  // Weights should sum to approximately 1
  if (record.assets.length > 0 && Math.abs(weightSum - 1) > WEIGHT_TOLERANCE) {
    return false;
  }

  return true;
}

/**
 * Import portfolios from JSON string
 * Validates format and strips IDs for fresh insertion
 * @throws Error if format is invalid or version is incompatible
 */
export function importPortfolios(json: string): PortfolioRecord[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON format');
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid export file format');
  }

  const exportData = data as Record<string, unknown>;

  // Validate version
  if (typeof exportData.version !== 'number') {
    throw new Error('Missing or invalid version field');
  }
  if (exportData.version > EXPORT_VERSION) {
    throw new Error(`Unsupported export version ${exportData.version}. Please update eVelo to import this file.`);
  }

  // Validate portfolios array
  if (!Array.isArray(exportData.portfolios)) {
    throw new Error('Missing or invalid portfolios array');
  }

  const now = new Date().toISOString();
  const validated: PortfolioRecord[] = [];

  for (let i = 0; i < exportData.portfolios.length; i++) {
    const p = exportData.portfolios[i];
    if (!validatePortfolio(p)) {
      throw new Error(`Invalid portfolio at index ${i}`);
    }

    // Strip ID and update modified timestamp
    validated.push({
      ...p,
      id: undefined, // Let Dexie assign new ID
      created: p.created || now, // Preserve original created if present
      modified: now, // Update modified to import time
      version: p.version || 1
    });
  }

  return validated;
}
