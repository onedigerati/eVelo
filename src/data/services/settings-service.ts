/**
 * User settings persistence service
 *
 * Manages user preferences including API keys, CORS proxy configuration,
 * and UI preferences. Settings are stored as a singleton in IndexedDB.
 */

import { db } from '../db';
import type { UserSettings, ApiKeys } from '../schemas/settings';
import { getDefaultSettings } from '../schemas/settings';
import type { ApiSource } from '../schemas/market-data';
import type { CorsProxyConfig } from '../api/cors-proxy';

/**
 * Singleton key for settings record
 */
export const SETTINGS_ID = 'settings' as const;

/**
 * Default user settings
 * Exported for convenience when initializing settings
 */
export const DEFAULT_SETTINGS: UserSettings = getDefaultSettings();

/**
 * Get current user settings
 *
 * Returns stored settings or defaults if none exist.
 *
 * @returns Current user settings
 */
export async function getSettings(): Promise<UserSettings> {
  const settings = await db.settings.get(SETTINGS_ID);
  return settings ?? DEFAULT_SETTINGS;
}

/**
 * Save user settings
 *
 * Merges provided settings with existing settings and persists to IndexedDB.
 *
 * @param settings - Partial settings to update
 */
export async function saveSettings(
  settings: Partial<UserSettings>
): Promise<void> {
  const existing = await getSettings();
  const merged: UserSettings = {
    ...existing,
    ...settings,
    id: SETTINGS_ID, // Always ensure singleton ID
    // Deep merge apiKeys if provided
    apiKeys: settings.apiKeys
      ? { ...existing.apiKeys, ...settings.apiKeys }
      : existing.apiKeys
  };
  await db.settings.put(merged);
}

// =============================================================================
// API Key Helpers
// =============================================================================

/**
 * Get an API key for a specific data source
 *
 * @param source - The API data source
 * @returns The API key or undefined if not set
 */
export async function getApiKey(source: ApiSource): Promise<string | undefined> {
  const settings = await getSettings();
  // Map ApiSource to ApiKeys field names
  const keyMap: Record<ApiSource, keyof ApiKeys | null> = {
    fmp: 'fmp',
    eodhd: 'eodhd',
    alphavantage: 'alphavantage',
    tiingo: 'tiingo',
    yahoo: null // Yahoo doesn't use API keys
  };
  const keyField = keyMap[source];
  if (keyField === null) {
    return undefined;
  }
  return settings.apiKeys[keyField];
}

/**
 * Set an API key for a specific data source
 *
 * @param source - The API data source
 * @param key - The API key to store
 */
export async function setApiKey(source: ApiSource, key: string): Promise<void> {
  const settings = await getSettings();
  // Map ApiSource to ApiKeys field names
  const keyMap: Record<ApiSource, keyof ApiKeys | null> = {
    fmp: 'fmp',
    eodhd: 'eodhd',
    alphavantage: 'alphavantage',
    tiingo: 'tiingo',
    yahoo: null // Yahoo doesn't use API keys
  };
  const keyField = keyMap[source];
  if (keyField === null) {
    // Source doesn't use API keys, silently ignore
    return;
  }

  const updatedKeys: ApiKeys = {
    ...settings.apiKeys,
    [keyField]: key
  };
  await saveSettings({ apiKeys: updatedKeys });
}

/**
 * Clear an API key for a specific data source
 *
 * @param source - The API data source
 */
export async function clearApiKey(source: ApiSource): Promise<void> {
  const settings = await getSettings();
  // Map ApiSource to ApiKeys field names
  const keyMap: Record<ApiSource, keyof ApiKeys | null> = {
    fmp: 'fmp',
    eodhd: 'eodhd',
    alphavantage: 'alphavantage',
    tiingo: 'tiingo',
    yahoo: null // Yahoo doesn't use API keys
  };
  const keyField = keyMap[source];
  if (keyField === null) {
    return;
  }

  const updatedKeys: ApiKeys = { ...settings.apiKeys };
  delete updatedKeys[keyField];
  await saveSettings({ apiKeys: updatedKeys });
}

// =============================================================================
// CORS Proxy Helpers
// =============================================================================

/**
 * Get current CORS proxy configuration
 *
 * @returns Current CORS proxy settings
 */
export async function getCorsConfig(): Promise<CorsProxyConfig> {
  const settings = await getSettings();
  return {
    type: settings.corsProxyType,
    customUrl: settings.corsProxyUrl
  };
}

/**
 * Update CORS proxy configuration
 *
 * @param config - CORS proxy configuration to apply
 */
export async function setCorsConfig(config: CorsProxyConfig): Promise<void> {
  await saveSettings({
    corsProxyType: config.type,
    corsProxyUrl: config.customUrl
  });
}
