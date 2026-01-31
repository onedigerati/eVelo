/**
 * Dexie database singleton for eVelo
 *
 * Provides typed IndexedDB access for portfolios, market data cache,
 * and user settings.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { PortfolioRecord } from './schemas/portfolio';
import type { CachedMarketData } from './schemas/market-data';
import type { UserSettings } from './schemas/settings';
import type { CustomMarketData } from './schemas/custom-market-data';

// Safari lazy-load workaround
// Safari can hang on first IndexedDB access if it's complex
// This simple open triggers the lazy initialization early
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  window.indexedDB.open('__safari_workaround');
}

/**
 * eVelo database with typed tables
 */
class EveloDatabase extends Dexie {
  portfolios!: EntityTable<PortfolioRecord, 'id'>;
  marketData!: EntityTable<CachedMarketData, 'id'>;
  settings!: EntityTable<UserSettings, 'id'>;
  customMarketData!: EntityTable<CustomMarketData, 'id'>;

  constructor() {
    super('evelo');

    // Schema version 1
    // Indexes:
    // - portfolios: auto-increment id, name and modified for queries
    // - marketData: auto-increment id, compound index on [symbol+source] for lookups, fetchedAt for cleanup
    // - settings: singleton with fixed 'id' key
    this.version(1).stores({
      portfolios: '++id, name, modified',
      marketData: '++id, [symbol+source], fetchedAt',
      settings: 'id'
    });

    // Schema version 2
    // Added:
    // - customMarketData: user-imported historical market data
    this.version(2).stores({
      portfolios: '++id, name, modified',
      marketData: '++id, [symbol+source], fetchedAt',
      settings: 'id',
      customMarketData: '++id, symbol, importedAt'
    });
  }
}

/**
 * Database singleton instance
 */
export const db = new EveloDatabase();
