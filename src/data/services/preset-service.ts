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
import { getCustomData, hasCustomData } from './custom-data-service';

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

/**
 * Get effective data for a symbol (custom data takes precedence)
 *
 * This is the recommended function to use when fetching data for simulation.
 * It checks for user-imported custom data first, falling back to bundled presets.
 *
 * @param symbol - The symbol to look up
 * @returns PresetData if found (custom or bundled), undefined otherwise
 */
export async function getEffectiveData(symbol: string): Promise<PresetData | undefined> {
  const upperSymbol = symbol.toUpperCase();

  // Check for custom data first
  const customData = await getCustomData(upperSymbol);
  if (customData) {
    return {
      symbol: customData.symbol,
      name: customData.name,
      assetClass: customData.assetClass,
      startDate: customData.startDate,
      endDate: customData.endDate,
      returns: customData.returns
    };
  }

  // Fall back to bundled preset
  return BUNDLED_PRESETS[upperSymbol];
}

/**
 * Check if a symbol has custom data that overrides bundled data
 *
 * @param symbol - The symbol to check
 * @returns true if custom data exists for this symbol
 */
export async function hasCustomDataForSymbol(symbol: string): Promise<boolean> {
  return hasCustomData(symbol.toUpperCase());
}

/**
 * Get list of symbols that have custom data overrides
 *
 * @returns Array of symbols with custom data
 */
export async function getCustomizedSymbols(): Promise<string[]> {
  const { getCustomSymbols } = await import('./custom-data-service');
  return getCustomSymbols();
}
