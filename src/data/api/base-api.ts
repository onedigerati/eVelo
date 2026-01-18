/**
 * Abstract base class for rate-limited API clients
 *
 * Provides Bottleneck-based rate limiting and CORS proxy support
 * for all financial data API implementations.
 */

import Bottleneck from 'bottleneck';
import type { DailyReturn } from '../schemas/market-data';

/**
 * Configuration for a rate-limited API client
 */
export interface ApiConfig {
  /** Maximum concurrent requests */
  maxConcurrent: number;
  /** Number of requests in reservoir (optional) */
  reservoirAmount?: number;
  /** Time in ms before reservoir refills (optional) */
  reservoirRefreshInterval?: number;
  /** Minimum time between requests in ms (optional) */
  minTime?: number;
  /** CORS proxy URL prefix (optional) */
  corsProxyUrl?: string;
}

/**
 * Abstract base class for API clients with rate limiting
 *
 * Subclasses must implement getHistoricalData to fetch
 * daily returns for a symbol within a date range.
 */
export abstract class RateLimitedApiClient {
  protected limiter: Bottleneck;
  protected corsProxyUrl?: string;

  constructor(config: ApiConfig) {
    // Build config object inline to avoid TypeScript readonly issues
    this.limiter = new Bottleneck({
      maxConcurrent: config.maxConcurrent,
      reservoir: config.reservoirAmount,
      reservoirRefreshAmount: config.reservoirAmount,
      reservoirRefreshInterval: config.reservoirRefreshInterval,
      minTime: config.minTime
    });
    this.corsProxyUrl = config.corsProxyUrl;

    // Log rate limit events for debugging
    this.limiter.on('failed', (error, jobInfo) => {
      console.error(
        `API request failed (attempt ${jobInfo.retryCount}):`,
        error
      );
    });
  }

  /**
   * Fetch data from a URL with rate limiting and CORS proxy support
   *
   * @param url - The API endpoint URL
   * @param options - Optional fetch options (headers, etc.)
   * @returns Parsed JSON response
   * @throws Error if response is not OK
   */
  protected async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    return this.limiter.schedule(async () => {
      // Prepend CORS proxy URL if configured
      const finalUrl = this.corsProxyUrl
        ? `${this.corsProxyUrl}${encodeURIComponent(url)}`
        : url;

      const response = await fetch(finalUrl, options);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    });
  }

  /**
   * Fetch historical daily returns for a symbol
   *
   * @param symbol - The ticker symbol (e.g., 'SPY', 'AAPL')
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Array of daily returns in chronological order
   */
  abstract getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]>;
}
