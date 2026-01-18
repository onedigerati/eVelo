/**
 * Tiingo API client
 *
 * Fetches historical price data from Tiingo.
 * Free tier: 50 requests/hour, 1000 requests/day
 *
 * @see https://www.tiingo.com/documentation/
 */

import { RateLimitedApiClient } from './base-api';
import { API_RATE_LIMITS } from './rate-limits';
import type { DailyReturn } from '../schemas/market-data';

/**
 * Tiingo historical price data structure
 */
interface TiingoPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

/**
 * Tiingo API client with rate limiting
 *
 * Uses header-based authentication (Authorization: Token).
 * Calculates returns from adjusted close prices.
 */
export class TiingoApiClient extends RateLimitedApiClient {
  private apiKey: string;

  /**
   * Create a Tiingo API client
   *
   * @param apiKey - Tiingo API token
   * @param corsProxyUrl - Optional CORS proxy URL prefix
   */
  constructor(apiKey: string, corsProxyUrl?: string) {
    const limits = API_RATE_LIMITS.tiingo;
    super({
      maxConcurrent: limits.maxConcurrent,
      reservoirAmount: limits.reservoir,
      reservoirRefreshInterval: limits.reservoirRefreshInterval,
      corsProxyUrl
    });
    this.apiKey = apiKey;
  }

  /**
   * Fetch historical daily returns for a symbol
   *
   * Tiingo uses header-based authentication, so we override the fetch
   * to include the Authorization header.
   *
   * @param symbol - Ticker symbol (e.g., 'SPY', 'AAPL')
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Daily returns in chronological order (oldest first)
   */
  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]> {
    const url = `https://api.tiingo.com/tiingo/daily/${symbol}/prices?startDate=${startDate}&endDate=${endDate}`;

    // Tiingo requires header-based auth
    const prices = await this.fetch<TiingoPrice[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.apiKey}`
      }
    });

    // Calculate returns from adjusted close prices
    const returns: DailyReturn[] = [];
    for (let i = 1; i < prices.length; i++) {
      const prevClose = prices[i - 1].adjClose;
      const currClose = prices[i].adjClose;

      returns.push({
        // Parse date to get YYYY-MM-DD (Tiingo returns ISO format with time)
        date: prices[i].date.split('T')[0],
        return: (currClose - prevClose) / prevClose
      });
    }

    return returns;
  }
}
