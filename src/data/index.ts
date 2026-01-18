/**
 * Data layer barrel export
 *
 * Re-exports database instance, schemas, and types for convenient access.
 */

// Database singleton
export { db } from './db';

// Schema types
export type { PortfolioRecord, AssetRecord } from './schemas/portfolio';
export type { CachedMarketData, DailyReturn, ApiSource } from './schemas/market-data';
export type {
  UserSettings,
  ApiKeys,
  CorsProxyType
} from './schemas/settings';
export { getDefaultSettings } from './schemas/settings';
