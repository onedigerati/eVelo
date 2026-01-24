/**
 * Theme Toggle Component
 *
 * Segmented control for switching between Light, Dark, and System themes.
 * Integrates with theme-service for persistence and synchronization.
 */

import { BaseComponent } from '../base-component';
import { setTheme, getTheme, onThemeChange } from '../../services/theme-service';
import type { ThemePreference } from '../../services/theme-service';

/**
 * ThemeToggle Web Component
 *
 * Renders three-button segmented control for theme selection.
 * Active state syncs with theme-service changes.
 */
export class ThemeToggle extends BaseComponent {
  private unsubscribe?: () => void;

  protected template(): string {
    return `
      <div class="theme-toggle" role="radiogroup" aria-label="Theme selection">
        <button data-theme="light" role="radio" aria-checked="false" aria-label="Light theme">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <line x1="8" y1="1" x2="8" y2="2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="13.5" x2="8" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="15" y1="8" x2="13.5" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="2.5" y1="8" x2="1" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="12.5" y1="3.5" x2="11.5" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="4.5" y1="11.5" x2="3.5" y2="12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="12.5" y1="12.5" x2="11.5" y2="11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="4.5" y1="4.5" x2="3.5" y2="3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Light</span>
        </button>
        <button data-theme="dark" role="radio" aria-checked="false" aria-label="Dark theme">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M14 8.5C13.5 11.5 10.5 14 7 14C3.5 14 1 11.5 1 8C1 4.5 3.5 2 7 2C7.5 2 8 2.1 8.5 2.2C7 3 6 4.8 6 7C6 9.8 8.2 12 11 12C12.2 12 13.3 11.5 14 10.5V8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <span>Dark</span>
        </button>
        <button data-theme="system" role="radio" aria-checked="false" aria-label="System theme">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="3" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <line x1="4" y1="13" x2="12" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="11" x2="8" y2="13" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <span>System</span>
        </button>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .theme-toggle {
        display: inline-flex;
        border-radius: var(--radius-md, 6px);
        overflow: hidden;
        border: 1px solid var(--border-color, #e2e8f0);
        background: var(--surface-primary, #ffffff);
      }

      button {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs, 4px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border: none;
        background: transparent;
        color: var(--text-secondary, #475569);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border-right: 1px solid var(--border-color, #e2e8f0);
      }

      button:last-child {
        border-right: none;
      }

      button:hover {
        background: var(--surface-hover, rgba(13, 148, 136, 0.05));
      }

      button[aria-checked="true"] {
        background: var(--color-primary, #0d9488);
        color: white;
      }

      button svg {
        flex-shrink: 0;
      }

      button:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: -2px;
        z-index: 1;
        position: relative;
      }
    `;
  }

  protected override afterRender(): void {
    // Initialize active state from current theme
    this.updateActiveButton();

    // Attach click handlers to buttons
    this.shadow.querySelectorAll('button[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = (btn as HTMLElement).dataset.theme as ThemePreference;
        setTheme(theme);
      });
    });

    // Subscribe to theme changes (updates active state if changed elsewhere)
    this.unsubscribe = onThemeChange(() => {
      this.updateActiveButton();
    });
  }

  /**
   * Clean up theme change listener
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  /**
   * Update aria-checked and visual active state based on current theme
   */
  private updateActiveButton(): void {
    const currentTheme = getTheme();

    this.shadow.querySelectorAll('button[data-theme]').forEach(btn => {
      const btnTheme = (btn as HTMLElement).dataset.theme;
      const isActive = btnTheme === currentTheme;
      btn.setAttribute('aria-checked', String(isActive));
    });
  }
}

// Register custom element
customElements.define('theme-toggle', ThemeToggle);
