---
phase: 08
plan: 03
subsystem: data-layer
tags: [api, rate-limiting, caching, bottleneck, indexeddb]

dependencies:
  requires:
    - "08-01"  # Database setup with IndexedDB schemas
  provides:
    - "Rate-limited API clients for FMP, EODHD, Alpha Vantage, Tiingo"
    - "Market data service with IndexedDB caching"
    - "7-day cache expiration for historical data"
  affects:
    - "08-02"  # Portfolio service (already exists, uses same db)
    - "09-*"   # App integration will use fetchMarketData

tech-stack:
  added:
    - bottleneck  # Already installed in 08-01
  patterns:
    - "Abstract base class for rate-limited API clients"
    - "Provider-specific rate limit configuration"
    - "Cache-aware fetch with IndexedDB persistence"

key-files:
  created:
    - src/data/api/rate-limits.ts
    - src/data/api/base-api.ts
    - src/data/api/fmp-api.ts
    - src/data/api/eodhd-api.ts
    - src/data/api/alpha-vantage-api.ts
    - src/data/api/tiingo-api.ts
    - src/data/api/index.ts
    - src/data/services/market-data-service.ts
  modified:
    - src/data/services/index.ts
    - src/data/index.ts

decisions:
  - id: "08-03-01"
    decision: "Pass optional reservoir/minTime as undefined to Bottleneck"
    rationale: "Bottleneck ignores undefined config values, allows inline object construction"
  - id: "08-03-02"
    decision: "Calculate returns from adjusted close for EODHD/Alpha Vantage/Tiingo"
    rationale: "FMP provides changePercent, others require calculation for accuracy"
  - id: "08-03-03"
    decision: "Yahoo API throws error rather than fallback implementation"
    rationale: "Yahoo Finance is unreliable; prefer explicit error over silent failure"

metrics:
  duration: "5 min"
  completed: "2026-01-18"
---

# Phase 08 Plan 03: API Clients Summary

Rate-limited API clients for FMP, EODHD, Alpha Vantage, and Tiingo with IndexedDB caching layer.

## What Was Built

### API Rate Limiting (rate-limits.ts, base-api.ts)
- `API_RATE_LIMITS` configuration for per-provider free tier limits
- `RateLimitedApiClient` abstract base class with Bottleneck rate limiting
- CORS proxy URL support via URL prefix prepending
- Error logging on rate limit failures

### API Client Implementations
- `FmpApiClient` - Financial Modeling Prep (250/day, uses changePercent)
- `EodhdApiClient` - EODHD (20/day free, calculates from adjusted_close)
- `AlphaVantageApiClient` - Alpha Vantage (25/day, 5/min with minTime)
- `TiingoApiClient` - Tiingo (50/hour, header-based auth)

### Market Data Service (market-data-service.ts)
- `getCachedOrFetch()` - Cache-aware data fetching
- `fetchMarketData()` - Provider-agnostic data fetch with caching
- `clearCache()` - Clear cached data by symbol/source
- `getCacheStats()` - Get cache entry count and data points
- `getCachedData()` - Direct cache access without fetch

## Key Implementation Details

### Rate Limit Configuration
```typescript
const API_RATE_LIMITS = {
  fmp: { maxConcurrent: 1, reservoir: 250, refreshInterval: 24h },
  eodhd: { maxConcurrent: 5, reservoir: 20, refreshInterval: 24h },
  alphaVantage: { maxConcurrent: 1, reservoir: 25, refreshInterval: 24h, minTime: 12s },
  tiingo: { maxConcurrent: 2, reservoir: 50, refreshInterval: 1h }
};
```

### Caching Strategy
- 7-day cache expiration before data refresh
- Cache stored in IndexedDB via Dexie.js
- Compound index [symbol+source] for efficient lookups
- Date range filtering on cached data retrieval

## Decisions Made

1. **Inline Bottleneck config construction** - Avoids TypeScript readonly issues with ConstructorOptions
2. **Provider-specific return calculation** - FMP uses changePercent, others calculate from adjusted close
3. **Yahoo API not implemented** - Throws explicit error; unreliable API, use bundled presets

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] npm run build succeeds
- [x] All four API clients extend RateLimitedApiClient
- [x] market-data-service exports getCachedOrFetch, fetchMarketData, clearCache
- [x] src/data/index.ts exports all API and service modules

## Commits

| Commit | Description |
|--------|-------------|
| c98e7ec | feat(08-03): create rate limiting config and base API client |
| f4a2dc3 | feat(08-03): create FMP and EODHD API clients |
| 50de563 | feat(08-03): create Alpha Vantage and Tiingo API clients |
| f81d7bf | feat(08-03): create market data service with IndexedDB caching |

## Next Phase Readiness

**Ready for:** Phase 09 (App Integration) can use fetchMarketData to retrieve historical data with automatic caching.

**Blockers:** None

**Notes:**
- API keys must be provided at runtime (stored in IndexedDB settings)
- CORS proxy may be needed depending on deployment environment
- Yahoo Finance intentionally not implemented; bundled presets provide fallback
