/**
 * Preset data service for accessing bundled historical market data
 *
 * Provides synchronous access to pre-bundled market data that Vite
 * inlines at build time. No network requests required.
 *
 * Data sources:
 * - stocks.json: 43 tickers with annual returns (2025-2055)
 * - indices.json: Additional index funds (IWM, AGG)
 */

// Static imports - Vite inlines these at build time
import stocksData from '../presets/stocks.json';
import indicesData from '../presets/indices.json';

/**
 * Single period's return in a preset dataset
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
  assetClass?: string;
  startDate: string;
  endDate: string;
  returns: PresetReturn[];
}

// Type the imported JSON data
const typedStocksData = stocksData as Record<string, PresetData>;
const typedIndicesData = indicesData as Record<string, PresetData>;

/**
 * All bundled preset data keyed by symbol
 *
 * These are inlined at build time by Vite, so access is synchronous
 * and requires no network requests.
 *
 * Includes 43 stocks with annual returns plus additional index funds.
 */
export const BUNDLED_PRESETS: Record<string, PresetData> = {
  // All 43 tickers from stocks.json (annual returns 2025-2055)
  ...typedStocksData,
  // Additional indices not in stocks.json
  IWM: typedIndicesData.IWM,
  AGG: typedIndicesData.AGG,
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
