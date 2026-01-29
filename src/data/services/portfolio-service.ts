/**
 * Portfolio service for IndexedDB CRUD operations
 *
 * Provides save/load/export/import operations for user portfolios.
 * Automatically falls back to localStorage when IndexedDB is unavailable
 * (e.g., when running from content:// URLs on Android).
 */

import { db } from '../db';
import type { PortfolioRecord, AssetRecord } from '../schemas/portfolio';

// =============================================================================
// Debug Logging
// =============================================================================

/** Debug mode flag - set to true to enable verbose logging */
let debugMode = false;
const debugLogs: string[] = [];
const MAX_DEBUG_LOGS = 100;

/**
 * Enable/disable debug mode for portfolio operations
 */
export function setPortfolioDebugMode(enabled: boolean): void {
  debugMode = enabled;
  if (enabled) {
    debugLog('Portfolio debug mode ENABLED');
  }
}

/**
 * Get current debug mode state
 */
export function isPortfolioDebugMode(): boolean {
  return debugMode;
}

/**
 * Log a debug message (console + stored for retrieval)
 */
function debugLog(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  const logEntry = `[${timestamp}] ${message}`;

  console.log(`[Portfolio Debug] ${message}`, data !== undefined ? data : '');

  debugLogs.push(data !== undefined ? `${logEntry}: ${JSON.stringify(data)}` : logEntry);
  if (debugLogs.length > MAX_DEBUG_LOGS) {
    debugLogs.shift();
  }
}

/**
 * Get all debug logs
 */
export function getPortfolioDebugLogs(): string[] {
  return [...debugLogs];
}

/**
 * Clear debug logs
 */
export function clearPortfolioDebugLogs(): void {
  debugLogs.length = 0;
}

// =============================================================================
// Storage Backend Abstraction (IndexedDB with localStorage fallback)
// =============================================================================

const LOCALSTORAGE_KEY = 'evelo_portfolios';
const LOCALSTORAGE_NEXT_ID_KEY = 'evelo_portfolios_next_id';

/** Track if we're using the localStorage fallback */
let usingLocalStorageFallback = false;
let fallbackChecked = false;

/**
 * Check if we're using the localStorage fallback
 */
export function isUsingLocalStorageFallback(): boolean {
  return usingLocalStorageFallback;
}

/**
 * Test if IndexedDB is working and switch to fallback if not
 */
async function ensureStorageBackend(): Promise<void> {
  if (fallbackChecked) return;

  debugLog('Checking IndexedDB availability...');

  try {
    // Try to open/access the database
    await db.portfolios.count();
    debugLog('IndexedDB is available and working');
    fallbackChecked = true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    debugLog('IndexedDB failed, switching to localStorage fallback', { error: errorMsg });
    usingLocalStorageFallback = true;
    fallbackChecked = true;

    // Initialize localStorage if empty
    if (!localStorage.getItem(LOCALSTORAGE_KEY)) {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([]));
      localStorage.setItem(LOCALSTORAGE_NEXT_ID_KEY, '1');
    }
  }
}

/**
 * Get all portfolios from localStorage
 */
function getLocalStoragePortfolios(): PortfolioRecord[] {
  try {
    const data = localStorage.getItem(LOCALSTORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save all portfolios to localStorage
 */
function setLocalStoragePortfolios(portfolios: PortfolioRecord[]): void {
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(portfolios));
}

/**
 * Get next ID for localStorage
 */
function getNextLocalStorageId(): number {
  const nextId = parseInt(localStorage.getItem(LOCALSTORAGE_NEXT_ID_KEY) || '1', 10);
  localStorage.setItem(LOCALSTORAGE_NEXT_ID_KEY, String(nextId + 1));
  return nextId;
}

// =============================================================================
// Constants
// =============================================================================

/** Special key for temp portfolio that auto-saves on any change */
export const TEMP_PORTFOLIO_KEY = '__temp_portfolio__';

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Save a portfolio to IndexedDB (or localStorage fallback)
 * Creates new if no id, updates existing if id present
 * @returns The portfolio id (new or existing)
 */
export async function savePortfolio(
  portfolio: Omit<PortfolioRecord, 'id'> & { id?: number }
): Promise<number> {
  debugLog('savePortfolio called', { name: portfolio.name, id: portfolio.id, assetCount: portfolio.assets?.length });

  // Ensure storage backend is ready (checks IndexedDB, switches to fallback if needed)
  await ensureStorageBackend();

  const now = new Date().toISOString();

  // Use localStorage fallback if IndexedDB isn't working
  if (usingLocalStorageFallback) {
    debugLog('Using localStorage fallback for save');
    return savePortfolioToLocalStorage(portfolio, now);
  }

  try {
    // If id is provided, this is an update
    if (portfolio.id !== undefined) {
      debugLog('Updating existing portfolio', { id: portfolio.id });
      const record: PortfolioRecord = {
        ...portfolio,
        id: portfolio.id,
        modified: now
      };
      // put() always returns the key for auto-increment tables
      const resultId = (await db.portfolios.put(record)) as number;
      debugLog('Update successful', { resultId });
      return resultId;
    }

    // New portfolio - set created timestamp
    debugLog('Creating new portfolio');
    const record: PortfolioRecord = {
      ...portfolio,
      created: now,
      modified: now
    };
    // put() always returns the key for auto-increment tables
    const resultId = (await db.portfolios.put(record)) as number;
    debugLog('Create successful', { resultId });
    return resultId;
  } catch (error) {
    debugLog('ERROR in savePortfolio', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Save portfolio to localStorage (fallback)
 */
function savePortfolioToLocalStorage(
  portfolio: Omit<PortfolioRecord, 'id'> & { id?: number },
  now: string
): number {
  const portfolios = getLocalStoragePortfolios();

  if (portfolio.id !== undefined) {
    // Update existing
    const index = portfolios.findIndex(p => p.id === portfolio.id);
    if (index !== -1) {
      portfolios[index] = { ...portfolio, id: portfolio.id, modified: now } as PortfolioRecord;
      setLocalStoragePortfolios(portfolios);
      debugLog('localStorage update successful', { id: portfolio.id });
      return portfolio.id;
    }
  }

  // Create new
  const newId = getNextLocalStorageId();
  const newRecord: PortfolioRecord = {
    ...portfolio,
    id: newId,
    created: now,
    modified: now
  };
  portfolios.push(newRecord);
  setLocalStoragePortfolios(portfolios);
  debugLog('localStorage create successful', { id: newId });
  return newId;
}

/**
 * Load a single portfolio by id
 */
export async function loadPortfolio(id: number): Promise<PortfolioRecord | undefined> {
  await ensureStorageBackend();

  if (usingLocalStorageFallback) {
    return getLocalStoragePortfolios().find(p => p.id === id);
  }

  return await db.portfolios.get(id);
}

/**
 * Load all portfolios, ordered by most recently modified first
 */
export async function loadAllPortfolios(): Promise<PortfolioRecord[]> {
  debugLog('loadAllPortfolios called');

  // Ensure storage backend is ready
  await ensureStorageBackend();

  // Use localStorage fallback if IndexedDB isn't working
  if (usingLocalStorageFallback) {
    debugLog('Using localStorage fallback for loadAll');
    const portfolios = getLocalStoragePortfolios()
      .sort((a, b) => (b.modified || '').localeCompare(a.modified || ''));
    debugLog('localStorage loadAll success', { count: portfolios.length, names: portfolios.map(p => p.name) });
    return portfolios;
  }

  try {
    const portfolios = await db.portfolios.orderBy('modified').reverse().toArray();
    debugLog('loadAllPortfolios success', { count: portfolios.length, names: portfolios.map(p => p.name) });
    return portfolios;
  } catch (error) {
    debugLog('ERROR in loadAllPortfolios', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Delete a portfolio by id
 */
export async function deletePortfolio(id: number): Promise<void> {
  await ensureStorageBackend();

  if (usingLocalStorageFallback) {
    const portfolios = getLocalStoragePortfolios().filter(p => p.id !== id);
    setLocalStoragePortfolios(portfolios);
    debugLog('localStorage delete successful', { id });
    return;
  }

  await db.portfolios.delete(id);
}

/**
 * Update just the name of a portfolio
 */
export async function updatePortfolioName(id: number, name: string): Promise<void> {
  await ensureStorageBackend();

  const now = new Date().toISOString();

  if (usingLocalStorageFallback) {
    const portfolios = getLocalStoragePortfolios();
    const index = portfolios.findIndex(p => p.id === id);
    if (index !== -1) {
      portfolios[index].name = name;
      portfolios[index].modified = now;
      setLocalStoragePortfolios(portfolios);
    }
    return;
  }

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

// =============================================================================
// File Helpers
// =============================================================================

/**
 * Download content as a file
 * Creates a temporary anchor element to trigger browser download
 */
export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

/**
 * Read file contents as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Export portfolios and trigger file download
 * @param portfolios Portfolios to export
 * @param filename Optional custom filename (default: evelo-portfolios-YYYY-MM-DD.json)
 */
export function exportAndDownload(portfolios: PortfolioRecord[], filename?: string): void {
  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `evelo-portfolios-${date}.json`;
  const json = exportPortfolios(portfolios);
  downloadAsFile(json, filename || defaultFilename);
}

/**
 * Import portfolios from a file
 * Reads file, parses JSON, and validates
 * @throws Error with user-friendly message if file is invalid
 */
export async function importFromFile(file: File): Promise<PortfolioRecord[]> {
  let content: string;
  try {
    content = await readFileAsText(file);
  } catch {
    throw new Error('Failed to read file. Please try again.');
  }

  try {
    return importPortfolios(content);
  } catch (error) {
    if (error instanceof Error) {
      throw error; // Re-throw validation errors as-is
    }
    throw new Error('Failed to parse portfolio file.');
  }
}

/**
 * Bulk import portfolios to database
 * @returns Array of new portfolio IDs
 */
export async function bulkImportPortfolios(portfolios: PortfolioRecord[]): Promise<number[]> {
  await ensureStorageBackend();

  if (usingLocalStorageFallback) {
    const existing = getLocalStoragePortfolios();
    const newIds: number[] = [];

    for (const portfolio of portfolios) {
      const newId = getNextLocalStorageId();
      const newRecord = { ...portfolio, id: newId };
      existing.push(newRecord);
      newIds.push(newId);
    }

    setLocalStoragePortfolios(existing);
    return newIds;
  }

  const ids = await db.portfolios.bulkAdd(portfolios, { allKeys: true });
  return ids as number[];
}

// =============================================================================
// Temp Portfolio Functions
// =============================================================================

/**
 * Save a temp portfolio (auto-save on any change when no named portfolio selected)
 * Upserts: updates if exists, creates if not
 */
export async function saveTempPortfolio(
  assets: AssetRecord[],
  params?: Partial<PortfolioRecord>
): Promise<number> {
  await ensureStorageBackend();

  const now = new Date().toISOString();

  if (usingLocalStorageFallback) {
    const portfolios = getLocalStoragePortfolios();
    const existingIndex = portfolios.findIndex(p => p.name === TEMP_PORTFOLIO_KEY);

    if (existingIndex !== -1) {
      // Update existing
      portfolios[existingIndex] = {
        ...portfolios[existingIndex],
        assets,
        modified: now,
        ...(params || {}),
      };
      setLocalStoragePortfolios(portfolios);
      return portfolios[existingIndex].id!;
    }

    // Create new
    const newId = getNextLocalStorageId();
    const newRecord: PortfolioRecord = {
      id: newId,
      name: TEMP_PORTFOLIO_KEY,
      assets,
      created: now,
      modified: now,
      version: 1,
      ...(params || {}),
    };
    portfolios.push(newRecord);
    setLocalStoragePortfolios(portfolios);
    return newId;
  }

  // Check if temp portfolio already exists
  const existing = await db.portfolios
    .where('name')
    .equals(TEMP_PORTFOLIO_KEY)
    .first();

  if (existing && existing.id !== undefined) {
    // Update existing temp portfolio
    const record: PortfolioRecord = {
      ...existing,
      assets,
      modified: now,
      ...(params || {}), // Spread optional params if provided
    };
    return (await db.portfolios.put(record)) as number;
  }

  // Create new temp portfolio
  const record: PortfolioRecord = {
    name: TEMP_PORTFOLIO_KEY,
    assets,
    created: now,
    modified: now,
    version: 1,
    ...(params || {}), // Spread optional params if provided
  };
  return (await db.portfolios.put(record)) as number;
}

/**
 * Load the temp portfolio if it exists
 */
export async function loadTempPortfolio(): Promise<PortfolioRecord | undefined> {
  await ensureStorageBackend();

  if (usingLocalStorageFallback) {
    return getLocalStoragePortfolios().find(p => p.name === TEMP_PORTFOLIO_KEY);
  }

  return await db.portfolios
    .where('name')
    .equals(TEMP_PORTFOLIO_KEY)
    .first();
}

/**
 * Load the last portfolio (temp or most recently modified named)
 * First tries temp, then falls back to most recent named portfolio
 */
export async function loadLastPortfolio(): Promise<PortfolioRecord | undefined> {
  await ensureStorageBackend();

  // First check for temp portfolio
  const temp = await loadTempPortfolio();
  if (temp) return temp;

  if (usingLocalStorageFallback) {
    // Fall back to most recently modified named portfolio
    const portfolios = getLocalStoragePortfolios()
      .filter(p => p.name !== TEMP_PORTFOLIO_KEY)
      .sort((a, b) => (b.modified || '').localeCompare(a.modified || ''));
    return portfolios[0];
  }

  // Fall back to most recently modified named portfolio
  const portfolios = await db.portfolios
    .orderBy('modified')
    .reverse()
    .filter(p => p.name !== TEMP_PORTFOLIO_KEY)
    .first();

  return portfolios;
}

/**
 * Delete the temp portfolio
 */
export async function deleteTempPortfolio(): Promise<void> {
  await ensureStorageBackend();

  if (usingLocalStorageFallback) {
    const portfolios = getLocalStoragePortfolios().filter(p => p.name !== TEMP_PORTFOLIO_KEY);
    setLocalStoragePortfolios(portfolios);
    return;
  }

  await db.portfolios
    .where('name')
    .equals(TEMP_PORTFOLIO_KEY)
    .delete();
}

/**
 * Find a portfolio by name (case-insensitive match)
 * Returns undefined if not found
 */
export async function findPortfolioByName(name: string): Promise<PortfolioRecord | undefined> {
  const portfolios = await loadAllPortfolios();
  const normalizedName = name.trim().toLowerCase();
  return portfolios.find(p =>
    p.name !== TEMP_PORTFOLIO_KEY &&
    p.name.toLowerCase() === normalizedName
  );
}
