/**
 * User settings schema for IndexedDB storage
 *
 * Singleton record storing user preferences including API keys,
 * CORS proxy configuration, and UI preferences.
 */

import type { ApiSource } from './market-data';

/**
 * CORS proxy configuration options
 */
export type CorsProxyType = 'none' | 'allorigins' | 'corsproxy' | 'custom';

/**
 * API keys for various financial data providers
 */
export interface ApiKeys {
  fmp?: string;
  eodhd?: string;
  alphavantage?: string;
  tiingo?: string;
}

/**
 * User settings record for IndexedDB storage
 * Note: This is a singleton - only one record with id='settings' exists
 */
export interface UserSettings {
  id: 'settings'; // Singleton identifier
  corsProxyUrl?: string; // Custom CORS proxy URL if type is 'custom'
  corsProxyType: CorsProxyType;
  apiKeys: ApiKeys;
  preferredSource: ApiSource;
  theme: 'light' | 'dark' | 'system';
}

/**
 * Default user settings
 */
export function getDefaultSettings(): UserSettings {
  return {
    id: 'settings',
    corsProxyType: 'none',
    apiKeys: {},
    preferredSource: 'fmp',
    theme: 'system'
  };
}
