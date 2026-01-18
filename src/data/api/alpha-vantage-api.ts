/**
 * Alpha Vantage API client
 *
 * Fetches historical price data from Alpha Vantage.
 * Free tier: 25 requests/day, 5 requests/minute
 *
 * @see https://www.alphavantage.co/documentation/
 */

import { RateLimitedApiClient } from './base-api';
import { API_RATE_LIMITS } from './rate-limits';
import type { DailyReturn } from '../schemas/market-data';

/**
 * Alpha Vantage time series daily response structure
 */
interface AlphaVantageResponse {
  'Time Series (Daily)': Record<
    string,
    {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. adjusted close': string;
      '6. volume': string;
    }
  >;
}

/**
 * Alpha Vantage API client with rate limiting
 *
 * Uses TIME_SERIES_DAILY_ADJUSTED endpoint.
 * Calculates returns from adjusted close prices.
 */
export class AlphaVantageApiClient extends RateLimitedApiClient {
  private apiKey: string;

  /**
   * Create an Alpha Vantage API client
   *
   * @param apiKey - Alpha Vantage API key
   * @param corsProxyUrl - Optional CORS proxy URL prefix
   */
  constructor(apiKey: string, corsProxyUrl?: string) {
    const limits = API_RATE_LIMITS.alphaVantage;
    super({
      maxConcurrent: limits.maxConcurrent,
      reservoirAmount: limits.reservoir,
      reservoirRefreshInterval: limits.reservoirRefreshInterval,
      minTime: limits.minTime,
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
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${this.apiKey}`;

    const response = await this.fetch<AlphaVantageResponse>(url);
    const timeSeries = response['Time Series (Daily)'];

    if (!timeSeries) {
      throw new Error('No time series data in Alpha Vantage response');
    }

    // Sort dates chronologically (oldest first)
    const dates = Object.keys(timeSeries).sort();

    const returns: DailyReturn[] = [];
    for (let i = 1; i < dates.length; i++) {
      const date = dates[i];

      // Filter to requested date range
      if (date < startDate || date > endDate) continue;

      const prevClose = parseFloat(
        timeSeries[dates[i - 1]]['5. adjusted close']
      );
      const currClose = parseFloat(timeSeries[date]['5. adjusted close']);

      returns.push({
        date,
        return: (currClose - prevClose) / prevClose
      });
    }

    return returns;
  }
}
