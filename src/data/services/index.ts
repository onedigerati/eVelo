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
  getEffectiveData,
  hasCustomDataForSymbol,
  getCustomizedSymbols,
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

// Settings service
export {
  SETTINGS_ID,
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  getApiKey,
  setApiKey,
  clearApiKey,
  getCorsConfig,
  setCorsConfig
} from './settings-service';

// Custom data service
export {
  saveCustomData,
  getCustomData,
  getAllCustomData,
  hasCustomData,
  deleteCustomData,
  resetToDefaults,
  getCustomSymbols,
  // Bulk operations
  saveAllCustomData,
  resetAllToDefaults
} from './custom-data-service';

export type { CustomMarketData } from '../schemas/custom-market-data';

// Bulk export service
export {
  exportAllToCsv,
  exportAllToJson,
  type BulkExportRow,
  type BulkJsonExport
} from './bulk-export-service';

// Bulk import service
export {
  parseBulkCsv,
  parseBulkJson,
  toPresetData,
  type ParsedBulkData,
  type ParsedAsset
} from './bulk-import-service';
