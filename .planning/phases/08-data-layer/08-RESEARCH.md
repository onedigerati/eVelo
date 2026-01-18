# Phase 8: Data Layer - Research

**Researched:** 2026-01-18
**Domain:** Client-side data persistence, financial API integration, bundled presets
**Confidence:** HIGH

## Summary

Phase 8 implements the data layer for eVelo: IndexedDB persistence with Dexie.js, integrations with multiple financial data APIs (FMP, EODHD, Alpha Vantage, Tiingo, Yahoo Finance), portfolio save/load/export/import functionality, bundled historical presets, and CORS proxy configuration. The established patterns for client-side data persistence are well-documented, but financial APIs have specific quirks (rate limits, authentication methods, data formats) that require careful handling.

**Primary recommendation:** Use Dexie.js 4.x for all IndexedDB operations with TypeScript interfaces, Bottleneck for client-side rate limiting across all API providers, and a configurable CORS proxy approach (user-provided or self-hosted). Bundle S&P 500 historical data as static JSON imports that get inlined by Vite at build time.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie.js | 4.x | IndexedDB wrapper | TypeScript-first, handles browser bugs, bulk operations optimized |
| Bottleneck | 2.19.x | Rate limiting | Zero-dep, works in browser, battle-tested, reservoir pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| compress-json | latest | JSON compression (optional) | If bundled data exceeds 1MB uncompressed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie.js | Raw IndexedDB | More verbose, no bug workarounds, callback-based |
| Bottleneck | p-limit | p-limit is concurrency only, no rate limiting |
| Bottleneck | p-ratelimit | Less mature, smaller community |

**Installation:**
```bash
npm install dexie bottleneck
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  data/
    db.ts                    # Dexie database instance and schema
    schemas/
      portfolio.ts           # Portfolio interface and schema
      market-data.ts         # MarketData interface and schema
      presets.ts             # Bundled data types
    api/
      base-api.ts            # Abstract API client with rate limiting
      fmp-api.ts             # Financial Modeling Prep
      eodhd-api.ts           # EODHD
      alpha-vantage-api.ts   # Alpha Vantage
      tiingo-api.ts          # Tiingo
      yahoo-api.ts           # Yahoo Finance (fallback)
      cors-proxy.ts          # CORS proxy configuration
    services/
      portfolio-service.ts   # Save/load/export/import logic
      market-data-service.ts # Fetch, cache, retrieve market data
      preset-service.ts      # Load bundled presets
    presets/
      sp500.json             # Bundled S&P 500 historical data
      indices.json           # Major indices data
```

### Pattern 1: Dexie Database Singleton with TypeScript

**What:** Single database instance with strongly-typed tables and schema versioning.

**When to use:** Always. All IndexedDB access goes through this singleton.

**Example:**
```typescript
// src/data/db.ts
import Dexie, { type EntityTable } from 'dexie';

export interface Portfolio {
  id?: number;
  name: string;
  assets: Asset[];
  created: Date;
  modified: Date;
}

export interface CachedMarketData {
  id?: number;
  symbol: string;
  source: 'fmp' | 'eodhd' | 'alphavantage' | 'tiingo' | 'yahoo';
  startDate: string;
  endDate: string;
  data: DailyReturn[];
  fetchedAt: Date;
}

export interface UserSettings {
  id: 'settings'; // singleton
  corsProxyUrl?: string;
  apiKeys: {
    fmp?: string;
    eodhd?: string;
    alphaVantage?: string;
    tiingo?: string;
  };
  preferredSource: string;
}

class EveloDatabase extends Dexie {
  portfolios!: EntityTable<Portfolio, 'id'>;
  marketData!: EntityTable<CachedMarketData, 'id'>;
  settings!: EntityTable<UserSettings, 'id'>;

  constructor() {
    super('evelo');

    this.version(1).stores({
      portfolios: '++id, name, modified',
      marketData: '++id, [symbol+source], fetchedAt',
      settings: 'id'
    });
  }
}

export const db = new EveloDatabase();
```

### Pattern 2: Rate-Limited API Client Base Class

**What:** Abstract base class that wraps all API calls with Bottleneck rate limiting.

**When to use:** For every financial API integration.

**Example:**
```typescript
// src/data/api/base-api.ts
import Bottleneck from 'bottleneck';

export interface ApiConfig {
  maxConcurrent: number;
  reservoirAmount: number;
  reservoirRefreshInterval: number; // ms
  corsProxyUrl?: string;
}

export abstract class RateLimitedApiClient {
  protected limiter: Bottleneck;
  protected corsProxyUrl?: string;

  constructor(config: ApiConfig) {
    this.limiter = new Bottleneck({
      maxConcurrent: config.maxConcurrent,
      reservoir: config.reservoirAmount,
      reservoirRefreshAmount: config.reservoirAmount,
      reservoirRefreshInterval: config.reservoirRefreshInterval,
    });
    this.corsProxyUrl = config.corsProxyUrl;

    // Log rate limit events
    this.limiter.on('failed', (error, jobInfo) => {
      console.error(`API request failed (attempt ${jobInfo.retryCount}):`, error);
    });
  }

  protected async fetch<T>(url: string): Promise<T> {
    return this.limiter.schedule(async () => {
      const finalUrl = this.corsProxyUrl
        ? `${this.corsProxyUrl}${encodeURIComponent(url)}`
        : url;

      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
  }

  abstract getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]>;
}
```

### Pattern 3: Bulk Operations with Batch Processing

**What:** Process large datasets in batches to avoid memory issues and provide progress feedback.

**When to use:** When storing bundled data or bulk API results.

**Example:**
```typescript
// src/data/services/market-data-service.ts
const BATCH_SIZE = 1000;

export async function storeMarketData(
  data: CachedMarketData[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = data.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    await db.marketData.bulkPut(batch);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalBatches) * 100));
    }
  }
}
```

### Pattern 4: Portfolio Export/Import with Validation

**What:** JSON-based export/import with schema validation and version handling.

**When to use:** For portfolio save/load and file export/import.

**Example:**
```typescript
// src/data/services/portfolio-service.ts
const EXPORT_VERSION = 1;

export interface PortfolioExport {
  version: number;
  exportedAt: string;
  portfolios: Portfolio[];
}

export function exportPortfolios(portfolios: Portfolio[]): string {
  const exportData: PortfolioExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    portfolios: portfolios.map(p => ({
      ...p,
      id: undefined // Strip auto-generated IDs
    }))
  };
  return JSON.stringify(exportData, null, 2);
}

export function importPortfolios(json: string): Portfolio[] {
  const data = JSON.parse(json) as PortfolioExport;

  // Version check for future compatibility
  if (data.version > EXPORT_VERSION) {
    throw new Error(`Export version ${data.version} is newer than supported ${EXPORT_VERSION}`);
  }

  // Validate required fields
  if (!Array.isArray(data.portfolios)) {
    throw new Error('Invalid export format: missing portfolios array');
  }

  return data.portfolios.map(p => ({
    ...p,
    id: undefined, // Let Dexie assign new IDs
    created: new Date(p.created),
    modified: new Date()
  }));
}

// File download helper
export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// File upload helper
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
```

### Pattern 5: Bundled Data as Static Imports

**What:** Include historical data as JSON files that Vite inlines at build time.

**When to use:** For the bundled S&P 500 and indices presets.

**Example:**
```typescript
// src/data/presets/sp500.json
// Pre-processed daily returns: { date: "YYYY-MM-DD", return: 0.0123 }[]
// Approximately 7,500 trading days for 30 years

// src/data/services/preset-service.ts
import sp500Data from '../presets/sp500.json';
import indicesData from '../presets/indices.json';

export interface PresetData {
  symbol: string;
  name: string;
  startDate: string;
  endDate: string;
  returns: { date: string; return: number }[];
}

// JSON imports are inlined by Vite at build time
export const BUNDLED_PRESETS: Record<string, PresetData> = {
  'SPY': sp500Data as PresetData,
  // Additional indices...
};

export function getPresetSymbols(): string[] {
  return Object.keys(BUNDLED_PRESETS);
}

export function getPresetData(symbol: string): PresetData | undefined {
  return BUNDLED_PRESETS[symbol];
}
```

### Anti-Patterns to Avoid

- **Opening multiple database connections:** Always use the singleton pattern. Multiple Dexie instances to the same database cause contention.
- **Storing raw API responses:** Transform to normalized format immediately. Don't cache provider-specific JSON structures.
- **Synchronous localStorage for large data:** Use IndexedDB for anything over a few KB. localStorage is synchronous and blocks the main thread.
- **Hard-coded API keys in source:** Store in IndexedDB settings table. User enters keys via UI.
- **Unbounded API calls:** Always use rate limiting. Even seemingly simple loops can trigger rate limits.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB wrapper | Custom Promise wrapper | Dexie.js | Browser bug workarounds, TypeScript support, optimized bulk ops |
| Rate limiting | setTimeout chains | Bottleneck | Reservoir pattern, concurrency control, retry handling |
| JSON date handling | Manual parsing | Store as ISO strings | Date objects don't serialize to JSON |
| File download | Manual link creation | Blob + URL.createObjectURL | Cross-browser compatibility |
| Schema migration | Manual version checks | Dexie.version().upgrade() | Atomic migrations with rollback |

**Key insight:** IndexedDB has numerous browser-specific bugs (especially Safari). Dexie.js has years of workarounds baked in. Rolling your own IndexedDB wrapper is a maintenance nightmare.

## Common Pitfalls

### Pitfall 1: Safari IndexedDB Lazy Loading Bug

**What goes wrong:** First IndexedDB access in Safari can hang indefinitely.

**Why it happens:** Safari lazy-loads IndexedDB module; if first access is complex, it gets stuck.

**How to avoid:** Add early dummy IndexedDB access at app startup:
```typescript
// In your app initialization, before any real DB access
if ('indexedDB' in window) {
  window.indexedDB.open('test');
}
```

**Warning signs:** App works in Chrome but hangs on first load in Safari.

### Pitfall 2: Quota Exceeded Without Warning

**What goes wrong:** Storage operations silently fail when quota exceeded.

**Why it happens:** IndexedDB has per-origin quotas (typically 50% of free disk, varies by browser).

**How to avoid:**
```typescript
// Check quota before large operations
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const { quota, usage } = await navigator.storage.estimate();
  const availableMB = ((quota ?? 0) - (usage ?? 0)) / (1024 * 1024);
  if (availableMB < 50) {
    console.warn('Low storage space:', availableMB.toFixed(2), 'MB remaining');
  }
}

// Request persistent storage for important data
const persisted = await navigator.storage.persist();
if (!persisted) {
  console.warn('Storage may be cleared by browser');
}
```

**Warning signs:** QuotaExceededError exceptions, data mysteriously disappearing in incognito mode.

### Pitfall 3: API Rate Limit Exceeded

**What goes wrong:** API returns 429 errors, key gets temporarily blocked.

**Why it happens:** Loops fetching data for multiple symbols without throttling.

**How to avoid:** Always use Bottleneck with conservative limits:
```typescript
// Conservative defaults for free tiers
const API_LIMITS = {
  fmp: { reservoir: 250, interval: 24 * 60 * 60 * 1000 }, // 250/day
  alphaVantage: { reservoir: 25, interval: 24 * 60 * 60 * 1000 }, // 25/day
  tiingo: { reservoir: 50, interval: 60 * 60 * 1000 }, // 50/hour
  eodhd: { reservoir: 20, interval: 24 * 60 * 60 * 1000 }, // 20/day free
};
```

**Warning signs:** 429 status codes, "rate limit exceeded" error messages.

### Pitfall 4: Yahoo Finance Endpoint Breakage

**What goes wrong:** Yahoo Finance wrapper stops working after site update.

**Why it happens:** Unofficial API based on scraping; no stability guarantees.

**How to avoid:**
1. Use Yahoo Finance only as last-resort fallback
2. Cache aggressively
3. Have graceful degradation to bundled presets
4. Don't rely on Yahoo for critical functionality

**Warning signs:** Sudden failures across all Yahoo requests, CORS errors, 403 responses.

### Pitfall 5: CORS Proxy Unavailability

**What goes wrong:** Third-party CORS proxy goes down or rate-limits.

**Why it happens:** Free CORS proxies are not production-grade.

**How to avoid:**
1. Make CORS proxy URL user-configurable
2. Provide instructions for self-hosted proxy
3. Design for graceful degradation (cached data, bundled presets)

**Warning signs:** Network errors on previously working API calls.

### Pitfall 6: Dexie Schema Migration Breaking Production

**What goes wrong:** Schema version bump causes data loss or upgrade failure.

**Why it happens:** Forgot to keep old version + add upgrade function.

**How to avoid:**
```typescript
// ALWAYS keep old version and add upgrade function
db.version(1).stores({
  portfolios: '++id, name'
});

db.version(2).stores({
  portfolios: '++id, name, modified' // Added index
}).upgrade(tx => {
  return tx.table('portfolios').toCollection().modify(portfolio => {
    portfolio.modified = portfolio.modified || portfolio.created || new Date();
  });
});
```

**Warning signs:** "VersionError" exceptions, database reset in production.

## Code Examples

Verified patterns from official sources:

### Financial Modeling Prep API Client

```typescript
// src/data/api/fmp-api.ts
import { RateLimitedApiClient, ApiConfig } from './base-api';
import { DailyReturn } from '../schemas/market-data';

interface FmpHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  changePercent: number;
}

export class FmpApiClient extends RateLimitedApiClient {
  private apiKey: string;

  constructor(apiKey: string, corsProxyUrl?: string) {
    super({
      maxConcurrent: 1,
      reservoirAmount: 250, // Free tier: 250/day
      reservoirRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours
      corsProxyUrl
    });
    this.apiKey = apiKey;
  }

  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]> {
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${symbol}&from=${startDate}&to=${endDate}&apikey=${this.apiKey}`;

    const response = await this.fetch<{ historical: FmpHistoricalPrice[] }>(url);

    return response.historical.map(item => ({
      date: item.date,
      return: item.changePercent / 100 // Convert percentage to decimal
    })).reverse(); // FMP returns newest first
  }
}
```

### Alpha Vantage API Client

```typescript
// src/data/api/alpha-vantage-api.ts
import { RateLimitedApiClient } from './base-api';
import { DailyReturn } from '../schemas/market-data';

interface AlphaVantageResponse {
  'Time Series (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. adjusted close': string;
    '6. volume': string;
  }>;
}

export class AlphaVantageApiClient extends RateLimitedApiClient {
  private apiKey: string;

  constructor(apiKey: string, corsProxyUrl?: string) {
    super({
      maxConcurrent: 1,
      reservoirAmount: 25, // Free tier: 25/day, 5/min
      reservoirRefreshInterval: 24 * 60 * 60 * 1000,
      corsProxyUrl
    });
    this.apiKey = apiKey;
  }

  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]> {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${this.apiKey}`;

    const response = await this.fetch<AlphaVantageResponse>(url);
    const timeSeries = response['Time Series (Daily)'];

    const returns: DailyReturn[] = [];
    const dates = Object.keys(timeSeries).sort();

    for (let i = 1; i < dates.length; i++) {
      const date = dates[i];
      if (date < startDate || date > endDate) continue;

      const prevClose = parseFloat(timeSeries[dates[i - 1]]['5. adjusted close']);
      const currClose = parseFloat(timeSeries[date]['5. adjusted close']);

      returns.push({
        date,
        return: (currClose - prevClose) / prevClose
      });
    }

    return returns;
  }
}
```

### EODHD API Client

```typescript
// src/data/api/eodhd-api.ts
import { RateLimitedApiClient } from './base-api';
import { DailyReturn } from '../schemas/market-data';

interface EodhdPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

export class EodhdApiClient extends RateLimitedApiClient {
  private apiKey: string;

  constructor(apiKey: string, corsProxyUrl?: string) {
    super({
      maxConcurrent: 5,
      reservoirAmount: 20, // Free tier: 20/day (paid: 100,000/day)
      reservoirRefreshInterval: 24 * 60 * 60 * 1000,
      corsProxyUrl
    });
    this.apiKey = apiKey;
  }

  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]> {
    // EODHD uses exchange suffix: AAPL.US for US stocks
    const fullSymbol = symbol.includes('.') ? symbol : `${symbol}.US`;
    const url = `https://eodhd.com/api/eod/${fullSymbol}?from=${startDate}&to=${endDate}&api_token=${this.apiKey}&fmt=json`;

    const prices = await this.fetch<EodhdPrice[]>(url);

    const returns: DailyReturn[] = [];
    for (let i = 1; i < prices.length; i++) {
      const prevClose = prices[i - 1].adjusted_close;
      const currClose = prices[i].adjusted_close;
      returns.push({
        date: prices[i].date,
        return: (currClose - prevClose) / prevClose
      });
    }

    return returns;
  }
}
```

### Tiingo API Client

```typescript
// src/data/api/tiingo-api.ts
import { RateLimitedApiClient } from './base-api';
import { DailyReturn } from '../schemas/market-data';

interface TiingoPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

export class TiingoApiClient extends RateLimitedApiClient {
  private apiKey: string;

  constructor(apiKey: string, corsProxyUrl?: string) {
    super({
      maxConcurrent: 2,
      reservoirAmount: 50, // Free tier: 50/hour, 1000/day
      reservoirRefreshInterval: 60 * 60 * 1000, // 1 hour
      corsProxyUrl
    });
    this.apiKey = apiKey;
  }

  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]> {
    const url = `https://api.tiingo.com/tiingo/daily/${symbol}/prices?startDate=${startDate}&endDate=${endDate}`;

    // Tiingo uses header-based auth
    const prices = await this.limiter.schedule(async () => {
      const finalUrl = this.corsProxyUrl
        ? `${this.corsProxyUrl}${encodeURIComponent(url)}`
        : url;

      const response = await fetch(finalUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Tiingo API error: ${response.status}`);
      }
      return response.json() as Promise<TiingoPrice[]>;
    });

    const returns: DailyReturn[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push({
        date: prices[i].date.split('T')[0],
        return: (prices[i].adjClose - prices[i - 1].adjClose) / prices[i - 1].adjClose
      });
    }

    return returns;
  }
}
```

### CORS Proxy Configuration

```typescript
// src/data/api/cors-proxy.ts

export const CORS_PROXY_OPTIONS = {
  // User's self-hosted proxy (recommended)
  custom: (url: string) => url,

  // allorigins.win (free, reliable, but has limits)
  allorigins: (url: string) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,

  // corsproxy.io (free, but may have downtime)
  corsproxy: (url: string) =>
    `https://corsproxy.io/?${encodeURIComponent(url)}`,

  // None (for APIs that support CORS)
  none: (url: string) => url,
};

export interface CorsProxyConfig {
  type: keyof typeof CORS_PROXY_OPTIONS;
  customUrl?: string;
}

export function getCorsProxyUrl(config: CorsProxyConfig): string | undefined {
  if (config.type === 'custom' && config.customUrl) {
    // Custom proxy: append encoded URL
    return config.customUrl.endsWith('/')
      ? config.customUrl
      : `${config.customUrl}/`;
  }
  if (config.type === 'none') {
    return undefined;
  }
  // Return prefix for built-in proxies
  switch (config.type) {
    case 'allorigins':
      return 'https://api.allorigins.win/raw?url=';
    case 'corsproxy':
      return 'https://corsproxy.io/?';
    default:
      return undefined;
  }
}
```

### Caching Service with Expiration

```typescript
// src/data/services/market-data-service.ts
import { db, CachedMarketData } from '../db';
import { DailyReturn } from '../schemas/market-data';

const CACHE_DURATION_DAYS = 7; // Refresh data weekly for historical

export async function getCachedOrFetch(
  symbol: string,
  source: string,
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
  const cacheExpiry = new Date(now.getTime() - CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

  if (cached && cached.fetchedAt > cacheExpiry) {
    // Filter cached data to requested range
    return cached.data.filter(d => d.date >= startDate && d.date <= endDate);
  }

  // Fetch fresh data
  const freshData = await fetchFn();

  // Update cache
  await db.marketData.put({
    id: cached?.id,
    symbol,
    source,
    startDate,
    endDate,
    data: freshData,
    fetchedAt: now
  });

  return freshData;
}
```

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw IndexedDB API | Dexie.js 4.x with EntityTable | Dexie 4.x (2024) | Better TypeScript, cleaner primary key handling |
| navigator.storage.estimate() optional | Widely supported | 2024-2025 | Can reliably check storage quota |
| Yahoo Finance direct access | Unofficial/unreliable | Ongoing | Treat as fallback only |
| FMP Legacy API | FMP Stable API | April 2025 | New customers use Stable API only |

**New tools/patterns to consider:**
- **navigator.storage.persist()**: Request durable storage so browser won't evict data
- **Web Locks API**: Now supported in all major browsers for coordinating IndexedDB access

**Deprecated/outdated:**
- **WebSQL**: Fully deprecated, never use
- **Application Cache**: Deprecated, use Service Worker (Phase 10)
- **Yahoo Finance as primary**: Too unreliable for production use

## Financial API Quick Reference

| API | Free Tier Limit | Auth Method | Data Coverage | Reliability |
|-----|-----------------|-------------|---------------|-------------|
| FMP | 250/day | Query param `apikey=` | US equities, indices, 5 years | HIGH |
| EODHD | 20/day | Query param `api_token=` | Global, 30+ years | HIGH |
| Alpha Vantage | 25/day, 5/min | Query param `apikey=` | US equities, indices | HIGH |
| Tiingo | 50/hr, 1000/day | Header `Authorization: Token` | US, 30+ years | HIGH |
| Yahoo Finance | Unofficial | None (scraping) | Global | LOW - breaks frequently |

**Rate Limiting Configuration:**

```typescript
// src/data/api/rate-limits.ts
export const API_RATE_LIMITS = {
  fmp: {
    maxConcurrent: 1,
    reservoir: 250,
    reservoirRefreshInterval: 24 * 60 * 60 * 1000 // 24h
  },
  eodhd: {
    maxConcurrent: 5,
    reservoir: 20, // Free; paid is 100,000
    reservoirRefreshInterval: 24 * 60 * 60 * 1000
  },
  alphaVantage: {
    maxConcurrent: 1,
    reservoir: 25,
    reservoirRefreshInterval: 24 * 60 * 60 * 1000,
    minTime: 12000 // 5/minute = 12 seconds between calls
  },
  tiingo: {
    maxConcurrent: 2,
    reservoir: 50,
    reservoirRefreshInterval: 60 * 60 * 1000 // 1h
  },
  yahoo: {
    maxConcurrent: 1,
    minTime: 1000 // Conservative: 1 request/second
  }
} as const;
```

## Browser Storage Quotas

| Browser | Default Quota | Persistent Storage | Notes |
|---------|---------------|-------------------|-------|
| Chrome | 60% of free disk | Auto-approved if engaged site | Group limit: 20% of global |
| Firefox | 10% of disk or 10GB | User permission prompt | Subject to group limit |
| Safari | Varies (tighter on iOS) | Auto if engaged | Private mode: 0 quota |
| Edge | Same as Chrome | Auto-approved | Chromium-based |

**Recommendations:**
1. Always wrap storage operations in try/catch for QuotaExceededError
2. Request persistent storage at app startup
3. Implement graceful degradation when quota low
4. Test in Safari private browsing mode

## Open Questions

Things that couldn't be fully resolved:

1. **Yahoo Finance current reliability status**
   - What we know: Breaks frequently, unofficial API
   - What's unclear: Specific endpoint structures change without notice
   - Recommendation: Use as last-resort fallback only; cache aggressively

2. **Optimal bundled data format for S&P 500**
   - What we know: Vite inlines JSON imports at build time
   - What's unclear: Performance impact of 30 years of daily data (~500KB-1MB uncompressed)
   - Recommendation: Start with JSON; add compression if bundle size excessive

3. **Self-hosted CORS proxy deployment**
   - What we know: cors-anywhere can be self-hosted on Heroku/Cloudflare
   - What's unclear: Best deployment target for non-technical users
   - Recommendation: Provide instructions for multiple platforms (Cloudflare Workers, Vercel, Netlify)

## Sources

### Primary (HIGH confidence)
- [Dexie.js Official Documentation](https://dexie.org/docs/) - Schema versioning, bulk operations, Safari issues
- [Dexie.js Table.bulkPut()](https://dexie.org/docs/Table/Table.bulkPut()) - Bulk operation API
- [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - Browser storage limits
- [Bottleneck npm package](https://www.npmjs.com/package/bottleneck) - Rate limiting API
- [FMP API Documentation](https://site.financialmodelingprep.com/developer/docs) - Endpoint formats
- [EODHD API Limits](https://eodhd.com/financial-apis/api-limits) - Rate limit details

### Secondary (MEDIUM confidence)
- [Financial Data APIs 2025 Guide](https://www.ksred.com/the-complete-guide-to-financial-data-apis-building-your-own-stock-market-data-pipeline-in-2025/) - API comparison
- [Best Financial Data APIs in 2026](https://www.nb-data.com/p/best-financial-data-apis-in-2026) - Current state of APIs
- [Alpha Vantage API 2026 Guide](https://alphalog.ai/blog/alphavantage-api-complete-guide) - Rate limits and features
- [Tiingo Documentation](https://www.tiingo.com/documentation/) - API structure
- [IndexedDB on Safari - Dexie.js](https://dexie.org/docs/IndexedDB-on-Safari) - Safari workarounds
- [10 Free CORS Proxies](https://nordicapis.com/10-free-to-use-cors-proxies/) - Proxy options

### Tertiary (LOW confidence, needs validation)
- Yahoo Finance current endpoint structure (changes frequently)
- allorigins.win long-term reliability
- Specific Safari 16+ IndexedDB behavior

## Metadata

**Confidence breakdown:**
- Dexie.js patterns: HIGH - Official documentation, well-established library
- Financial API rate limits: HIGH - Multiple sources confirm, recently verified
- CORS proxy patterns: MEDIUM - Multiple options, reliability varies
- Bundled data strategy: MEDIUM - Standard Vite behavior, size impact needs testing
- Safari IndexedDB: MEDIUM - Known issues documented, current behavior unverified for 2026

**Research date:** 2026-01-18
**Valid until:** ~30 days for API limits (may change), ~90 days for library patterns
