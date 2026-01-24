/**
 * Chart Theme Configurations
 *
 * Light and dark color themes for Chart.js visualizations.
 * Colors are optimized for visibility and accessibility on their respective backgrounds.
 */

import type { ChartTheme } from './types';
import { DEFAULT_CHART_THEME } from './types';

/**
 * Light theme for charts (default)
 * Uses DEFAULT_CHART_THEME values from types.ts
 */
export const lightChartTheme: ChartTheme = DEFAULT_CHART_THEME;

/**
 * Dark theme for charts
 * Colors brightened for visibility on dark backgrounds
 */
export const darkChartTheme: ChartTheme = {
  // Primary palette - brighter blues for dark background
  primary: '#60a5fa',    // blue-400 (brighter than light theme)
  secondary: '#94a3b8',  // slate-400
  accent: '#a78bfa',     // violet-400 (brighter)

  // Percentile bands: brightened for dark background visibility
  percentiles: {
    p90: '#4ade80',      // green-400 (brighter than p90 light)
    p75: '#a7f3d0',      // emerald-200 (much brighter)
    p50: '#60a5fa',      // blue-400 (brighter median)
    p25: '#fcd34d',      // amber-300 (brighter)
    p10: '#f87171',      // red-400 (brighter than p10 light)
  },

  // Financial positive/negative - brighter for contrast
  positive: '#22c55e',   // green-500 (brighter)
  negative: '#f87171',   // red-400 (brighter)

  // Chart canvas - dark background
  background: '#0f172a', // slate-900 (matches dark surface-primary)
  grid: '#334155',       // slate-700 (visible but subtle on dark)
  text: '#f1f5f9',       // slate-100 (high contrast on dark)
};

/**
 * Get current chart theme based on document data-theme attribute
 * @returns ChartTheme configuration (light or dark)
 */
export function getChartTheme(): ChartTheme {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark ? darkChartTheme : lightChartTheme;
}
