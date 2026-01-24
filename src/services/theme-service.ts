/**
 * Theme Service
 *
 * Singleton service for managing application theme state.
 * Handles theme persistence, system preference detection, and DOM updates.
 */

import { db } from '../data/db';
import { getDefaultSettings } from '../data/schemas/settings';

/**
 * Theme preference type
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Resolved theme (no 'system' - always light or dark)
 */
type ResolvedTheme = 'light' | 'dark';

/**
 * Current user theme preference (light/dark/system)
 */
let currentTheme: ThemePreference = 'system';

/**
 * Media query for detecting system dark mode preference
 */
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

/**
 * Resolve theme preference to actual light/dark value
 */
function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme === 'system') {
    return mediaQuery.matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Apply theme to document and dispatch change event
 */
function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved);

  // Dispatch custom event for chart updates and other listeners
  window.dispatchEvent(new CustomEvent('theme-change', {
    detail: { theme: resolved }
  }));
}

/**
 * Initialize theme system
 * Loads theme preference from IndexedDB and applies to DOM.
 * Call this before app components render to prevent FOUC.
 */
export async function initTheme(): Promise<void> {
  try {
    // Load settings from IndexedDB
    const settings = await db.settings.get('settings');
    currentTheme = settings?.theme ?? 'system';
  } catch (error) {
    console.warn('Failed to load theme from IndexedDB, using system default:', error);
    currentTheme = 'system';
  }

  // Apply initial theme
  const resolved = resolveTheme(currentTheme);
  applyTheme(resolved);

  // Listen for system preference changes
  mediaQuery.addEventListener('change', (e) => {
    // Only react if current preference is 'system'
    if (currentTheme === 'system') {
      const newResolved = e.matches ? 'dark' : 'light';
      applyTheme(newResolved);
    }
  });
}

/**
 * Set theme preference and persist to IndexedDB
 */
export async function setTheme(theme: ThemePreference): Promise<void> {
  currentTheme = theme;

  // Persist to IndexedDB
  try {
    const settings = await db.settings.get('settings') ?? getDefaultSettings();
    settings.theme = theme;
    await db.settings.put(settings);
  } catch (error) {
    console.error('Failed to persist theme to IndexedDB:', error);
  }

  // Apply theme immediately
  const resolved = resolveTheme(theme);
  applyTheme(resolved);
}

/**
 * Get current theme preference (may be 'system')
 */
export function getTheme(): ThemePreference {
  return currentTheme;
}

/**
 * Get resolved theme (always 'light' or 'dark', never 'system')
 */
export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(currentTheme);
}

/**
 * Subscribe to theme changes
 * @param callback Called when resolved theme changes
 * @returns Unsubscribe function
 */
export function onThemeChange(callback: (theme: ResolvedTheme) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ theme: ResolvedTheme }>;
    callback(customEvent.detail.theme);
  };

  window.addEventListener('theme-change', handler);

  // Return unsubscribe function
  return () => {
    window.removeEventListener('theme-change', handler);
  };
}
