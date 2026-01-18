/**
 * Financial Modeling Prep (FMP) API client
 *
 * Fetches historical price data from FMP's Stable API.
 * Free tier: 250 requests/day
 *
 * @see https://site.financialmodelingprep.com/developer/docs
 */

import { RateLimitedApiClient } from './base-api';
import { API_RATE_LIMITS } from './rate-limits';
import type { DailyReturn } from '../schemas/market-data';

/**
 * FMP historical price data response structure
 */
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

/**
 * FMP API response wrapper
 */
interface FmpHistoricalResponse {
  historical: FmpHistoricalPrice[];
}

/**
 * FMP API client with rate limiting
 *
 * Uses the Stable API endpoint for historical EOD data.
 * Returns daily percentage changes as decimal returns.
 */
export class FmpApiClient extends RateLimitedApiClient {
  private apiKey: string;

  /**
   * Create an FMP API client
   *
   * @param apiKey - FMP API key
   * @param corsProxyUrl - Optional CORS proxy URL prefix
   */
  constructor(apiKey: string, corsProxyUrl?: string) {
    const limits = API_RATE_LIMITS.fmp;
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
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${symbol}&from=${startDate}&to=${endDate}&apikey=${this.apiKey}`;

    const response = await this.fetch<FmpHistoricalResponse>(url);

    // FMP returns data newest first, so reverse to chronological order
    // changePercent is already a percentage, convert to decimal
    return response.historical
      .map((item) => ({
        date: item.date,
        return: item.changePercent / 100
      }))
      .reverse();
  }
}
