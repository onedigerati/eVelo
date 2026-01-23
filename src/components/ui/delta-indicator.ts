/**
 * Delta Indicator Component
 *
 * Reusable component for displaying metric deltas between comparisons.
 * Shows +/- change with correct colors and formatting.
 */

import { BaseComponent } from '../base-component';
import { calculateDelta, type DeltaDirection } from '../../utils/delta-calculations';

/**
 * Delta Indicator - displays change between two values with visual feedback
 *
 * Usage:
 * ```html
 * <delta-indicator
 *   value="1200000"
 *   previous-value="1000000"
 *   format="currency"
 *   label="Median Value">
 * </delta-indicator>
 * ```
 */
export class DeltaIndicator extends BaseComponent {
  static override get observedAttributes(): string[] {
    return ['value', 'previous-value', 'format', 'label'];
  }

  protected template(): string {
    const value = parseFloat(this.getAttribute('value') || '0');
    const previousValue = parseFloat(this.getAttribute('previous-value') || '0');
    const format = this.getAttribute('format') || 'number';
    const label = this.getAttribute('label') || '';

    // Calculate delta metrics
    const delta = calculateDelta(previousValue, value);

    // Format the absolute change
    const formattedDelta = this.formatValue(Math.abs(delta.absolute), format);
    const formattedPercent = delta.percentChange.toFixed(1);

    // Determine sign prefix
    const signPrefix = delta.direction === 'up' ? '+' : delta.direction === 'down' ? '-' : '';

    // Determine arrow
    const arrow = delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→';

    // CSS class for color styling (map 'up' to 'positive', 'down' to 'negative')
    const directionClass = delta.direction === 'up' ? 'positive' : delta.direction === 'down' ? 'negative' : 'neutral';

    return `
      <div class="delta-indicator ${directionClass}">
        ${label ? `<span class="delta-label">${label}</span>` : ''}
        <div class="delta-values">
          <span class="delta-change">${signPrefix}${formattedDelta}</span>
          <span class="delta-percent">(${signPrefix}${formattedPercent}%)</span>
        </div>
        <div class="delta-arrow">${arrow}</div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: inline-block;
      }

      .delta-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        border-radius: var(--radius-md, 6px);
        font-size: var(--font-size-sm, 0.875rem);
      }

      .delta-indicator.positive {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }

      .delta-indicator.negative {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      .delta-indicator.neutral {
        background: rgba(148, 163, 184, 0.1);
        color: #94a3b8;
      }

      .delta-label {
        font-weight: 500;
        margin-right: var(--spacing-xs, 4px);
      }

      .delta-values {
        display: flex;
        align-items: baseline;
        gap: var(--spacing-xs, 4px);
      }

      .delta-change {
        font-weight: 600;
        font-size: var(--font-size-base, 1rem);
      }

      .delta-percent {
        font-size: var(--font-size-sm, 0.875rem);
        opacity: 0.9;
      }

      .delta-arrow {
        font-size: 1.25rem;
        line-height: 1;
        margin-left: auto;
      }
    `;
  }

  /**
   * Format a value based on the specified format type
   */
  private formatValue(value: number, format: string): string {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value);

      case 'percent':
        return `${value.toFixed(1)}%`;

      case 'number':
      default:
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value);
    }
  }
}

// Register the custom element
customElements.define('delta-indicator', DeltaIndicator);
