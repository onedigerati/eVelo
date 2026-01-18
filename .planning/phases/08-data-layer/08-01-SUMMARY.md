---
phase: 08-data-layer
plan: 01
subsystem: data-persistence
tags: [dexie, indexeddb, schemas, typescript]

dependency-graph:
  requires: [07-ui-components]
  provides: [database-singleton, portfolio-schema, market-data-schema, settings-schema]
  affects: [08-02, 08-03, 08-04, 08-05]

tech-stack:
  added:
    - dexie@4.2.1
    - bottleneck@2.19.5
  patterns:
    - Database singleton pattern for IndexedDB access
    - EntityTable typed tables for type-safe CRUD
    - ISO string dates for JSON serialization
    - Safari lazy-load workaround at module level
    - Compound index for multi-field lookups

files:
  created:
    - src/data/db.ts
    - src/data/schemas/portfolio.ts
    - src/data/schemas/market-data.ts
    - src/data/schemas/settings.ts
    - src/data/index.ts

decisions:
  - id: iso-string-dates
    choice: Store dates as ISO strings instead of Date objects
    reason: JSON serialization compatibility and simpler IndexedDB storage
  - id: version-field
    choice: Add version field to PortfolioRecord
    reason: Enable future schema migrations without data loss
  - id: compound-index
    choice: Use compound index [symbol+source] for market data
    reason: Efficient lookups when fetching cached data by symbol and API source

metrics:
  duration: 3 min
  completed: 2026-01-18
---

# Phase 08 Plan 01: Database Setup Summary

**One-liner:** Dexie.js 4.x database singleton with typed schemas for portfolios, market data cache, and user settings.

## What Was Built

### Dependencies Installed

| Package | Version | Purpose |
|---------|---------|---------|
| dexie | 4.2.1 | TypeScript-first IndexedDB wrapper with browser bug workarounds |
| bottleneck | 2.19.5 | Rate limiting for API clients (used in later plans) |

### Database Schema

**Schema Version 1:**

```typescript
portfolios: '++id, name, modified'     // Auto-increment, indexed for queries
marketData: '++id, [symbol+source], fetchedAt'  // Compound index for lookups
settings: 'id'                          // Singleton with fixed 'settings' key
```

### Schema Types

**PortfolioRecord:**
- `id?`: Auto-generated number
- `name`: Portfolio name
- `assets`: Array of AssetRecord (id, symbol, name, assetClass, weight)
- `created`: ISO date string
- `modified`: ISO date string
- `version`: Number for future migrations

**CachedMarketData:**
- `id?`: Auto-generated number
- `symbol`: Stock/index symbol
- `source`: ApiSource ('fmp' | 'eodhd' | 'alphavantage' | 'tiingo' | 'yahoo')
- `startDate`, `endDate`: Date range (YYYY-MM-DD)
- `data`: Array of DailyReturn (date, return)
- `fetchedAt`: ISO timestamp

**UserSettings:**
- `id`: Fixed 'settings' (singleton)
- `corsProxyType`: CorsProxyType
- `corsProxyUrl?`: Custom proxy URL
- `apiKeys`: ApiKeys (fmp, eodhd, alphavantage, tiingo)
- `preferredSource`: ApiSource
- `theme`: 'light' | 'dark' | 'system'

### Safari Workaround

Added early IndexedDB access to prevent Safari lazy-load hang:
```typescript
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  window.indexedDB.open('__safari_workaround');
}
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 754f0de | chore | Install dexie and bottleneck dependencies |
| d762732 | feat | Create database schemas for IndexedDB |
| 2b161b5 | feat | Create Dexie database singleton |

## Verification Results

- [x] npm install dexie bottleneck succeeds
- [x] npm run build succeeds
- [x] All schema interfaces export from src/data/index.ts
- [x] Database class extends Dexie with typed EntityTable fields

## Deviations from Plan

None - plan executed exactly as written.

## Usage Example

```typescript
import { db, getDefaultSettings } from './data';
import type { PortfolioRecord, CachedMarketData } from './data';

// Create portfolio
const portfolio: PortfolioRecord = {
  name: 'My Portfolio',
  assets: [{ id: '1', symbol: 'SPY', name: 'S&P 500', assetClass: 'equity', weight: 1.0 }],
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  version: 1
};
const id = await db.portfolios.add(portfolio);

// Query market data by symbol and source
const cached = await db.marketData
  .where('[symbol+source]')
  .equals(['SPY', 'fmp'])
  .first();

// Get or initialize settings
const settings = await db.settings.get('settings') ?? getDefaultSettings();
```

## Next Phase Readiness

**Ready for 08-02 (API Clients):**
- Database singleton available for caching fetched data
- CachedMarketData schema defines cache structure
- ApiSource type defines supported providers

**Ready for 08-03 (Portfolio Service):**
- PortfolioRecord and AssetRecord schemas defined
- Database CRUD operations available via `db.portfolios`

**Ready for 08-04 (Settings Service):**
- UserSettings schema with API keys and preferences
- getDefaultSettings() helper for initialization
