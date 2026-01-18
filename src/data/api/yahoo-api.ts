/**
 * Yahoo Finance fallback API client
 *
 * Uses the unofficial Yahoo Finance chart API as a last-resort fallback.
 * This API has no official documentation and may change or break without notice.
 *
 * Use conservative rate limiting and treat as unreliable.
 */

import { RateLimitedApiClient, type ApiConfig } from './base-api';
import type { DailyReturn } from '../schemas/market-data';

/**
 * Disclaimer for Yahoo Finance API usage
 * This should be shown to users relying on this data source.
 */
export const YAHOO_DISCLAIMER =
  'Yahoo Finance is an unofficial API that may stop working without notice';

/**
 * Yahoo Finance chart API response structure
 *
 * Note: This structure may change as the API is unofficial
 */
interface YahooChartResponse {
  chart: {
    result:
      | {
          meta: {
            symbol: string;
            currency: string;
          };
          timestamp: number[];
          indicators: {
            quote: {
              open: number[];
              high: number[];
              low: number[];
              close: number[];
              volume: number[];
            }[];
            adjclose?: {
              adjclose: number[];
            }[];
          };
        }[]
      | null;
    error: {
      code: string;
      description: string;
    } | null;
  };
}

/**
 * Yahoo Finance API client for historical market data
 *
 * Conservative rate limiting to avoid getting blocked:
 * - 1 request per 2 seconds
 * - No concurrent requests
 */
export class YahooApiClient extends RateLimitedApiClient {
  constructor(corsProxyUrl?: string) {
    const config: ApiConfig = {
      maxConcurrent: 1,
      minTime: 2000, // 1 request per 2 seconds
      corsProxyUrl
    };
    super(config);
  }

  /**
   * Fetch historical daily returns from Yahoo Finance
   *
   * @param symbol - Ticker symbol (e.g., 'SPY', 'AAPL')
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @returns Array of daily returns in chronological order
   * @throws Error if Yahoo API returns an error or data is unavailable
   */
  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReturn[]> {
    // Convert dates to Unix timestamps (seconds)
    const period1 = Math.floor(new Date(startDate).getTime() / 1000);
    const period2 = Math.floor(new Date(endDate).getTime() / 1000);

    // Build Yahoo Finance chart URL
    const baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
    const url = `${baseUrl}/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await this.fetch<YahooChartResponse>(url);

    // Check for API error
    if (response.chart.error) {
      throw new Error(
        `Yahoo Finance error: ${response.chart.error.code} - ${response.chart.error.description}`
      );
    }

    // Check for empty result
    if (!response.chart.result || response.chart.result.length === 0) {
      throw new Error(`Yahoo Finance: No data available for symbol ${symbol}`);
    }

    const result = response.chart.result[0];

    // Extract timestamps and adjusted close prices
    const timestamps = result.timestamp;
    if (!timestamps || timestamps.length === 0) {
      throw new Error(`Yahoo Finance: No timestamps in response for ${symbol}`);
    }

    // Prefer adjusted close, fall back to regular close
    let prices: number[];
    if (result.indicators.adjclose && result.indicators.adjclose[0]?.adjclose) {
      prices = result.indicators.adjclose[0].adjclose;
    } else if (result.indicators.quote && result.indicators.quote[0]?.close) {
      prices = result.indicators.quote[0].close;
    } else {
      throw new Error(
        `Yahoo Finance: No price data in response for ${symbol}`
      );
    }

    // Verify we have matching data
    if (prices.length !== timestamps.length) {
      console.warn(
        `Yahoo Finance: Mismatched data length for ${symbol}: ${timestamps.length} timestamps, ${prices.length} prices`
      );
    }

    // Build daily returns array
    const returns: DailyReturn[] = [];
    const minLength = Math.min(timestamps.length, prices.length);

    for (let i = 1; i < minLength; i++) {
      const prevPrice = prices[i - 1];
      const currPrice = prices[i];

      // Skip if prices are invalid
      if (
        prevPrice == null ||
        currPrice == null ||
        prevPrice === 0 ||
        !isFinite(prevPrice) ||
        !isFinite(currPrice)
      ) {
        continue;
      }

      // Convert timestamp to YYYY-MM-DD
      const date = new Date(timestamps[i] * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // Calculate daily return
      const dailyReturn = (currPrice - prevPrice) / prevPrice;

      returns.push({
        date: dateStr,
        return: dailyReturn
      });
    }

    if (returns.length === 0) {
      throw new Error(
        `Yahoo Finance: Could not calculate any returns for ${symbol}`
      );
    }

    return returns;
  }
}
