/**
 * Data layer barrel export
 *
 * Re-exports database instance, schemas, services, and types for convenient access.
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

// API clients
export {
  API_RATE_LIMITS,
  RateLimitedApiClient,
  FmpApiClient,
  EodhdApiClient,
  AlphaVantageApiClient,
  TiingoApiClient
} from './api';
export type { RateLimitConfig, ApiConfig } from './api';

// Services
export {
  // Preset service
  BUNDLED_PRESETS,
  getPresetSymbols,
  getPresetData,
  isPresetSymbol,
  // Portfolio service
  savePortfolio,
  loadPortfolio,
  loadAllPortfolios,
  deletePortfolio,
  updatePortfolioName,
  EXPORT_VERSION,
  exportPortfolios,
  importPortfolios,
  validatePortfolio,
  downloadAsFile,
  readFileAsText,
  exportAndDownload,
  importFromFile,
  bulkImportPortfolios,
  // Market data service
  getCachedOrFetch,
  fetchMarketData,
  clearCache,
  getCacheStats,
  getCachedData
} from './services';

export type {
  PresetData,
  PresetReturn,
  PortfolioExport,
  CacheStats
} from './services';
