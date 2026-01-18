/**
 * API clients barrel export
 *
 * Re-exports all financial data API clients and configuration.
 */

// Rate limiting configuration
export { API_RATE_LIMITS, type RateLimitConfig } from './rate-limits';

// Base class and types
export { RateLimitedApiClient, type ApiConfig } from './base-api';

// API client implementations
export { FmpApiClient } from './fmp-api';
export { EodhdApiClient } from './eodhd-api';
export { AlphaVantageApiClient } from './alpha-vantage-api';
export { TiingoApiClient } from './tiingo-api';
export { YahooApiClient, YAHOO_DISCLAIMER } from './yahoo-api';

// CORS proxy utilities
export {
  CORS_PROXY_OPTIONS,
  getCorsProxyUrl,
  wrapUrlWithProxy,
  type CorsProxyConfig
} from './cors-proxy';
