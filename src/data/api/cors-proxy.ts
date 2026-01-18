/**
 * CORS proxy configuration utilities
 *
 * Provides URL generation for various CORS proxy services.
 * Browser-based apps need CORS proxies to access APIs that
 * don't support cross-origin requests.
 */

import type { CorsProxyType } from '../schemas/settings';

/**
 * CORS proxy configuration
 */
export interface CorsProxyConfig {
  type: CorsProxyType;
  customUrl?: string;
}

/**
 * URL transformation functions for each proxy type
 *
 * Each function takes a target URL and returns the proxied URL.
 * Note: Different proxies have different URL encoding requirements.
 */
export const CORS_PROXY_OPTIONS: Record<
  CorsProxyType,
  (url: string, customUrl?: string) => string
> = {
  /**
   * No proxy - returns URL unchanged
   */
  none: (url: string) => url,

  /**
   * AllOrigins proxy
   * Format: https://api.allorigins.win/raw?url=ENCODED_URL
   */
  allorigins: (url: string) =>
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,

  /**
   * CorsProxy.io
   * Format: https://corsproxy.io/?ENCODED_URL
   */
  corsproxy: (url: string) =>
    `https://corsproxy.io/?${encodeURIComponent(url)}`,

  /**
   * Custom proxy - uses provided URL prefix
   * Format: CUSTOM_URL + ENCODED_URL
   */
  custom: (url: string, customUrl?: string) => {
    if (!customUrl) return url;
    // Ensure trailing slash for consistent URL construction
    const prefix = customUrl.endsWith('/') ? customUrl : `${customUrl}/`;
    return `${prefix}${encodeURIComponent(url)}`;
  }
};

/**
 * Get the CORS proxy URL prefix for a configuration
 *
 * Returns the proxy URL prefix, or undefined if no proxy is configured.
 * This is useful for API clients that need just the prefix.
 *
 * @param config - CORS proxy configuration
 * @returns Proxy URL prefix or undefined if type is 'none'
 */
export function getCorsProxyUrl(config: CorsProxyConfig): string | undefined {
  switch (config.type) {
    case 'none':
      return undefined;

    case 'allorigins':
      return 'https://api.allorigins.win/raw?url=';

    case 'corsproxy':
      return 'https://corsproxy.io/?';

    case 'custom':
      if (!config.customUrl) return undefined;
      // Ensure trailing slash
      return config.customUrl.endsWith('/')
        ? config.customUrl
        : `${config.customUrl}/`;

    default:
      return undefined;
  }
}

/**
 * Wrap a URL with the configured CORS proxy
 *
 * Takes a target URL and returns the complete proxied URL.
 *
 * @param url - The target URL to access through the proxy
 * @param config - CORS proxy configuration
 * @returns The proxied URL, or original URL if no proxy configured
 */
export function wrapUrlWithProxy(url: string, config: CorsProxyConfig): string {
  return CORS_PROXY_OPTIONS[config.type](url, config.customUrl);
}
