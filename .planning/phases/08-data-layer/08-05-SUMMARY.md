---
phase: 08
plan: 05
subsystem: data
tags: [cors, yahoo-api, settings, api-keys, indexeddb]
dependency-graph:
  requires: [08-03]
  provides: [cors-proxy-utils, yahoo-client, settings-persistence]
  affects: [09-orchestration]
tech-stack:
  added: []
  patterns: [singleton-settings, cors-proxy-abstraction]
key-files:
  created:
    - src/data/api/cors-proxy.ts
    - src/data/api/yahoo-api.ts
    - src/data/services/settings-service.ts
  modified:
    - src/data/api/index.ts
    - src/data/services/index.ts
    - src/data/index.ts
decisions:
  - CORS proxy abstraction with 4 modes (none, allorigins, corsproxy, custom)
  - Yahoo API as last-resort fallback with conservative rate limiting
  - Settings as singleton in IndexedDB with API key secure storage
metrics:
  duration: 4 min
  completed: 2026-01-18
---

# Phase 8 Plan 5: CORS Proxy, Yahoo API, and Settings Service Summary

CORS proxy utilities with 4 modes, Yahoo Finance fallback client with conservative rate limiting, and settings persistence service for API keys and preferences.

## What Was Built

### CORS Proxy Utilities (src/data/api/cors-proxy.ts)
- **CorsProxyConfig type**: Proxy configuration with type and optional custom URL
- **CORS_PROXY_OPTIONS**: URL transformers for each proxy type
  - `none`: Pass-through, no proxy
  - `allorigins`: `https://api.allorigins.win/raw?url=`
  - `corsproxy`: `https://corsproxy.io/?`
  - `custom`: User-provided URL prefix
- **getCorsProxyUrl()**: Get proxy URL prefix for a config
- **wrapUrlWithProxy()**: Transform target URL through configured proxy

### Yahoo Finance Client (src/data/api/yahoo-api.ts)
- **YahooApiClient**: Extends RateLimitedApiClient for chart API access
- Conservative rate limiting: 1 request per 2 seconds, no concurrency
- Parses unofficial chart API response for timestamps and adjusted close
- Calculates daily returns from price history
- **YAHOO_DISCLAIMER**: Warning constant for UI display
- Robust error handling for API structure changes

### Settings Service (src/data/services/settings-service.ts)
- **SETTINGS_ID**: Singleton key constant
- **DEFAULT_SETTINGS**: Default user settings
- **getSettings()**: Retrieve stored settings or defaults
- **saveSettings()**: Merge and persist partial settings updates
- API key helpers:
  - **getApiKey(source)**: Get API key for a data source
  - **setApiKey(source, key)**: Store API key
  - **clearApiKey(source)**: Remove API key
- CORS helpers:
  - **getCorsConfig()**: Get current proxy configuration
  - **setCorsConfig(config)**: Update proxy configuration

### Barrel Exports
- Updated `src/data/api/index.ts`: Added cors-proxy and yahoo-api exports
- Updated `src/data/services/index.ts`: Added settings-service exports
- Updated `src/data/index.ts`: Complete data layer barrel with all modules

## Key Implementation Details

### CORS Proxy Design
```typescript
// Each proxy type has different URL encoding requirements
export const CORS_PROXY_OPTIONS: Record<CorsProxyType, (url, customUrl?) => string> = {
  none: (url) => url,
  allorigins: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  corsproxy: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  custom: (url, customUrl) => customUrl ? `${customUrl}/${encodeURIComponent(url)}` : url
};
```

### Yahoo API Rate Limiting
```typescript
// Conservative limits for unofficial API
const config: ApiConfig = {
  maxConcurrent: 1,
  minTime: 2000  // 1 request per 2 seconds
};
```

### Settings Singleton Pattern
```typescript
// Fixed key ensures only one settings record
export const SETTINGS_ID = 'settings' as const;

// Merge partial updates with existing settings
async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  const existing = await getSettings();
  const merged = { ...existing, ...settings, id: SETTINGS_ID };
  await db.settings.put(merged);
}
```

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 4 CORS proxy modes | Covers common use cases: none (local), allorigins/corsproxy (free public), custom (self-hosted) |
| Yahoo as last-resort | Unofficial API that may break; conservative rate limiting minimizes risk |
| Singleton settings | User preferences are global; single record simplifies access |
| API keys in IndexedDB | More secure than localStorage, consistent with other data storage |
| Type-safe key mapping | ApiSource -> ApiKeys field mapping prevents typos |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ApiSource type mismatch**
- **Found during:** Task 3
- **Issue:** Plan referenced 'bundled' as ApiSource but actual type only has: fmp, eodhd, alphavantage, tiingo, yahoo
- **Fix:** Removed 'bundled' from keyMap records
- **Files modified:** src/data/services/settings-service.ts

## Next Phase Readiness

Phase 8 (Data Layer) is now complete. All 5 plans delivered:
1. Database schema and Dexie setup
2. Bundled preset data service
3. API clients with rate limiting
4. Portfolio CRUD and export/import
5. CORS proxy, Yahoo fallback, settings service

Ready for Phase 9 (Orchestration) which will wire together the data layer with UI components and simulation engine.
