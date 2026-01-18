/**
 * Data services barrel export
 *
 * Re-exports all service modules for convenient access.
 */

// Preset service
export {
  BUNDLED_PRESETS,
  getPresetSymbols,
  getPresetData,
  isPresetSymbol,
  type PresetData,
  type PresetReturn,
} from './preset-service';

// Portfolio service
export {
  // CRUD operations
  savePortfolio,
  loadPortfolio,
  loadAllPortfolios,
  deletePortfolio,
  updatePortfolioName,
  // Export/Import
  EXPORT_VERSION,
  exportPortfolios,
  importPortfolios,
  validatePortfolio,
  // File helpers
  downloadAsFile,
  readFileAsText,
  // Convenience functions
  exportAndDownload,
  importFromFile,
  bulkImportPortfolios
} from './portfolio-service';

export type { PortfolioExport } from './portfolio-service';

// Market data service
export {
  getCachedOrFetch,
  fetchMarketData,
  clearCache,
  getCacheStats,
  getCachedData
} from './market-data-service';

export type { CacheStats } from './market-data-service';
