/**
 * Custom market data schema
 *
 * Defines the structure for user-imported historical market data
 * stored in IndexedDB. Custom data takes precedence over bundled presets.
 */

import type { PresetReturn } from '../services/preset-service';

/**
 * Custom market data stored in IndexedDB
 * Extends bundled preset format with metadata tracking
 */
export interface CustomMarketData {
  id?: number;                    // Auto-increment primary key
  symbol: string;                 // e.g., "SPY", "CUSTOM1"
  name: string;                   // Display name
  assetClass?: string;            // equity_stock, equity_index, bond, etc.
  startDate: string;              // First year/date
  endDate: string;                // Last year/date
  returns: PresetReturn[];        // Array of {date, return}
  importedAt: string;             // ISO timestamp
  source: 'user-import' | 'bundled-modified';
}
