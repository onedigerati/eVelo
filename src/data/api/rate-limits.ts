/**
 * Rate limiting configuration for financial data APIs
 *
 * Defines per-provider limits based on free tier restrictions.
 * These limits prevent API key blocking due to excessive requests.
 */

/**
 * Rate limit configuration for a single API provider
 */
export interface RateLimitConfig {
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Number of requests allowed per refresh interval */
  reservoir: number;
  /** Time in ms before reservoir refills */
  reservoirRefreshInterval: number;
  /** Minimum time between requests in ms (optional) */
  minTime?: number;
}

/**
 * Pre-configured rate limits for supported API providers
 *
 * These match the free tier limits for each provider:
 * - FMP: 250 requests/day
 * - EODHD: 20 requests/day (free), 100k (paid)
 * - Alpha Vantage: 25 requests/day, 5/minute
 * - Tiingo: 50 requests/hour, 1000/day
 */
export const API_RATE_LIMITS: Record<string, RateLimitConfig> = {
  fmp: {
    maxConcurrent: 1,
    reservoir: 250,
    reservoirRefreshInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  eodhd: {
    maxConcurrent: 5,
    reservoir: 20,
    reservoirRefreshInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  alphaVantage: {
    maxConcurrent: 1,
    reservoir: 25,
    reservoirRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours
    minTime: 12000 // 5/minute = 12 seconds minimum between calls
  },
  tiingo: {
    maxConcurrent: 2,
    reservoir: 50,
    reservoirRefreshInterval: 60 * 60 * 1000 // 1 hour
  }
} as const;
