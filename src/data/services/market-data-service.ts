/**
 * Market data service with IndexedDB caching
 *
 * Provides cache-aware fetching of historical market data from
 * multiple API providers. Caches data in IndexedDB to reduce
 * API calls and enable offline access.
 */

import { db } from '../db';
import type { DailyReturn, ApiSource, CachedMarketData } from '../schemas/market-data';
import {
  FmpApiClient,
  EodhdApiClient,
  AlphaVantageApiClient,
  TiingoApiClient
} from '../api';

/**
 * Cache duration in days before data is considered stale
 */
const CACHE_DURATION_DAYS = 7;

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cached entries */
  count: number;
  /** Total number of data points across all entries */
  totalDataPoints: number;
  /** Symbols with cached data */
  symbols: string[];
}

/**
 * Check cache and return data if fresh, otherwise call fetchFn
 *
 * @param symbol - Ticker symbol
 * @param source - API source
 * @param startDate - Start date in YYYY-MM-DD
 * @param endDate - End date in YYYY-MM-DD
 * @param fetchFn - Function to fetch fresh data if cache is stale
 * @returns Daily returns filtered to requested date range
 */
export async function getCachedOrFetch(
  symbol: string,
  source: ApiSource,
  startDate: string,
  endDate: string,
  fetchFn: () => Promise<DailyReturn[]>
): Promise<DailyReturn[]> {
  // Check cache first
  const cached = await db.marketData
    .where('[symbol+source]')
    .equals([symbol, source])
    .first();

  const now = new Date();
  const cacheExpiry = new Date(
    now.getTime() - CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  // Return cached data if fresh
  if (cached && new Date(cached.fetchedAt) > cacheExpiry) {
    // Filter cached data to requested range
    return cached.data.filter((d) => d.date >= startDate && d.date <= endDate);
  }

  // Fetch fresh data
  const freshData = await fetchFn();

  // Store in cache
  const cacheRecord: CachedMarketData = {
    id: cached?.id, // Use existing ID for update, undefined for insert
    symbol,
    source,
    startDate,
    endDate,
    data: freshData,
    fetchedAt: now.toISOString()
  };

  await db.marketData.put(cacheRecord);

  return freshData;
}

/**
 * Fetch market data using appropriate API client with caching
 *
 * @param symbol - Ticker symbol (e.g., 'SPY', 'AAPL')
 * @param source - API source to use
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param apiKey - API key for the selected source
 * @param corsProxyUrl - Optional CORS proxy URL prefix
 * @returns Daily returns in chronological order
 */
export async function fetchMarketData(
  symbol: string,
  source: ApiSource,
  startDate: string,
  endDate: string,
  apiKey: string,
  corsProxyUrl?: string
): Promise<DailyReturn[]> {
  // Create appropriate API client based on source
  const createFetchFn = (): (() => Promise<DailyReturn[]>) => {
    switch (source) {
      case 'fmp': {
        const client = new FmpApiClient(apiKey, corsProxyUrl);
        return () => client.getHistoricalData(symbol, startDate, endDate);
      }
      case 'eodhd': {
        const client = new EodhdApiClient(apiKey, corsProxyUrl);
        return () => client.getHistoricalData(symbol, startDate, endDate);
      }
      case 'alphavantage': {
        const client = new AlphaVantageApiClient(apiKey, corsProxyUrl);
        return () => client.getHistoricalData(symbol, startDate, endDate);
      }
      case 'tiingo': {
        const client = new TiingoApiClient(apiKey, corsProxyUrl);
        return () => client.getHistoricalData(symbol, startDate, endDate);
      }
      case 'yahoo':
        // Yahoo is not implemented - use bundled presets as fallback
        throw new Error(
          'Yahoo Finance API not implemented. Use bundled presets for historical data.'
        );
      default:
        throw new Error(`Unknown API source: ${source}`);
    }
  };

  return getCachedOrFetch(symbol, source, startDate, endDate, createFetchFn());
}

/**
 * Clear cached market data
 *
 * @param symbol - Optional symbol to clear (clears all if not specified)
 * @param source - Optional source to clear (clears all sources if not specified)
 * @returns Number of records deleted
 */
export async function clearCache(
  symbol?: string,
  source?: ApiSource
): Promise<number> {
  if (symbol && source) {
    // Clear specific symbol+source combination
    return db.marketData.where('[symbol+source]').equals([symbol, source]).delete();
  } else if (symbol) {
    // Clear all sources for a symbol
    return db.marketData.where('symbol').equals(symbol).delete();
  } else if (source) {
    // Clear all symbols for a source
    return db.marketData.where('source').equals(source).delete();
  } else {
    // Clear all cached data
    return db.marketData.clear().then(() => -1); // -1 indicates "all cleared"
  }
}

/**
 * Get cache statistics
 *
 * @returns Cache stats including count, total data points, and symbols
 */
export async function getCacheStats(): Promise<CacheStats> {
  const allData = await db.marketData.toArray();

  const symbols = new Set<string>();
  let totalDataPoints = 0;

  for (const record of allData) {
    symbols.add(record.symbol);
    totalDataPoints += record.data.length;
  }

  return {
    count: allData.length,
    totalDataPoints,
    symbols: Array.from(symbols).sort()
  };
}

/**
 * Get cached data for a symbol without fetching
 *
 * @param symbol - Ticker symbol
 * @param source - Optional source filter
 * @returns Cached records or empty array if not cached
 */
export async function getCachedData(
  symbol: string,
  source?: ApiSource
): Promise<CachedMarketData[]> {
  if (source) {
    const record = await db.marketData
      .where('[symbol+source]')
      .equals([symbol, source])
      .first();
    return record ? [record] : [];
  }

  return db.marketData.where('symbol').equals(symbol).toArray();
}
