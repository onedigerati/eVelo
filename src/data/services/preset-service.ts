/**
 * Preset data service for accessing bundled historical market data
 *
 * Provides synchronous access to pre-bundled S&P 500 and index data
 * that Vite inlines at build time. No network requests required.
 */

// Static imports - Vite inlines these at build time
import sp500Data from '../presets/sp500.json';
import indicesData from '../presets/indices.json';

/**
 * Single day's return in a preset dataset
 */
export interface PresetReturn {
  date: string;
  return: number;
}

/**
 * Bundled preset data structure
 */
export interface PresetData {
  symbol: string;
  name: string;
  startDate: string;
  endDate: string;
  returns: PresetReturn[];
}

/**
 * All bundled preset data keyed by symbol
 *
 * These are inlined at build time by Vite, so access is synchronous
 * and requires no network requests.
 */
export const BUNDLED_PRESETS: Record<string, PresetData> = {
  SPY: sp500Data as PresetData,
  QQQ: (indicesData as Record<string, PresetData>).QQQ,
  IWM: (indicesData as Record<string, PresetData>).IWM,
  AGG: (indicesData as Record<string, PresetData>).AGG,
};

/**
 * Get all available preset symbols
 *
 * @returns Array of symbol strings (e.g., ['SPY', 'QQQ', 'IWM', 'AGG'])
 */
export function getPresetSymbols(): string[] {
  return Object.keys(BUNDLED_PRESETS);
}

/**
 * Get preset data for a specific symbol
 *
 * @param symbol - The symbol to look up (e.g., 'SPY')
 * @returns PresetData if found, undefined otherwise
 */
export function getPresetData(symbol: string): PresetData | undefined {
  return BUNDLED_PRESETS[symbol.toUpperCase()];
}

/**
 * Check if a symbol has bundled preset data
 *
 * @param symbol - The symbol to check
 * @returns true if preset data exists for this symbol
 */
export function isPresetSymbol(symbol: string): boolean {
  return symbol.toUpperCase() in BUNDLED_PRESETS;
}
