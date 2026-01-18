/**
 * EODHD API client
 *
 * Fetches historical price data from EODHD.
 * Free tier: 20 requests/day, Paid: 100,000/day
 *
 * @see https://eodhd.com/financial-apis/api-limits
 */

import { RateLimitedApiClient } from './base-api';
import { API_RATE_LIMITS } from './rate-limits';
import type { DailyReturn } from '../schemas/market-data';

/**
 * EODHD historical price data structure
 */
interface EodhdPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

/**
 * EODHD API client with rate limiting
 *
 * Automatically appends exchange suffix for US stocks.
 * Calculates returns from adjusted close prices.
 */
export class EodhdApiClient extends RateLimitedApiClient {
  private apiKey: string;

  /**
   * Create an EODHD API client
   *
   * @param apiKey - EODHD API token
   * @param corsProxyUrl - Optional CORS proxy URL prefix
   */
  constructor(apiKey: string, corsProxyUrl?: string) {
    const limits = API_RATE_LIMITS.eodhd;
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
   * @param symbol - Ticker symbol (e.g., 'SPY', 'AAPL.US')
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Daily returns in chronological order (oldest first)
   */
  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]> {
    // EODHD uses exchange suffix - default to .US for US stocks
    const fullSymbol = symbol.includes('.') ? symbol : `${symbol}.US`;
    const url = `https://eodhd.com/api/eod/${fullSymbol}?from=${startDate}&to=${endDate}&api_token=${this.apiKey}&fmt=json`;

    const prices = await this.fetch<EodhdPrice[]>(url);

    // Calculate returns from adjusted close prices
    // Returns are already in chronological order from EODHD
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
