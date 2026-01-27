/**
 * Correlation heatmap component for asset correlation visualization.
 * Shows a matrix of correlation values with color-coded cells,
 * plus per-asset Expected Annual Return and Annualized Volatility columns.
 */
import { BaseComponent } from '../components/base-component';
import { HeatmapData } from './types';

/**
 * Color scale for correlation values.
 * Red (negative) -> White (zero) -> Blue (positive)
 */
const CORRELATION_COLORS = {
  negativeStrong: '#dc2626', // red-600
  negativeLight: '#fca5a5',  // red-300
  neutral: '#ffffff',        // white
  positiveLight: '#93c5fd',  // blue-300
  positiveStrong: '#2563eb', // blue-600
};

/**
 * Interpolate between two hex colors.
 * @param color1 - Start color (hex)
 * @param color2 - End color (hex)
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated hex color
 */
function interpolateHexColor(color1: string, color2: string, t: number): string {
  // Parse hex colors
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  // Interpolate
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get color for a correlation value using the diverging color scale.
 * @param value - Correlation coefficient (-1 to 1)
 * @param isDiagonal - Whether this is a diagonal cell (self-correlation)
 * @returns Hex color string
 */
export function interpolateColor(value: number, isDiagonal: boolean = false): string {
  // Special case: diagonal cells (1.00) use theme teal color
  if (isDiagonal || value === 1.0) {
    return '#0d9488'; // teal-600 - matches theme
  }

  // Clamp value to valid range
  const clamped = Math.max(-1, Math.min(1, value));

  if (clamped < -0.5) {
    // Strong negative: -1 to -0.5 -> negativeStrong to negativeLight
    const t = (clamped + 1) / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.negativeStrong, CORRELATION_COLORS.negativeLight, t);
  } else if (clamped < 0) {
    // Light negative: -0.5 to 0 -> negativeLight to neutral
    const t = (clamped + 0.5) / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.negativeLight, CORRELATION_COLORS.neutral, t);
  } else if (clamped < 0.5) {
    // Light positive: 0 to 0.5 -> neutral to positiveLight
    const t = clamped / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.neutral, CORRELATION_COLORS.positiveLight, t);
  } else {
    // Strong positive: 0.5 to 1 -> positiveLight to positiveStrong
    const t = (clamped - 0.5) / 0.5;
    return interpolateHexColor(CORRELATION_COLORS.positiveLight, CORRELATION_COLORS.positiveStrong, t);
  }
}

/**
 * Get text color (white or dark) based on background brightness.
 * @param bgColor - Background hex color
 * @returns '#ffffff' or '#1e293b'
 */
function getContrastTextColor(bgColor: string): string {
  const brightness = parseInt(bgColor.slice(1, 3), 16) * 0.299 +
                    parseInt(bgColor.slice(3, 5), 16) * 0.587 +
                    parseInt(bgColor.slice(5, 7), 16) * 0.114;
  return brightness > 186 ? '#1e293b' : '#ffffff';
}

/**
 * Correlation Heatmap Web Component.
 *
 * Displays a correlation matrix as an HTML table with color-coded cells,
 * plus optional Expected Annual Return and Annualized Volatility columns.
 *
 * Usage:
 * ```html
 * <correlation-heatmap></correlation-heatmap>
 * ```
 *
 * Set data via property:
 * ```javascript
 * const heatmap = document.querySelector('correlation-heatmap');
 * heatmap.data = {
 *   labels: ['Stocks', 'Bonds', 'REITs'],
 *   matrix: [
 *     [1.0, -0.3, 0.6],
 *     [-0.3, 1.0, 0.2],
 *     [0.6, 0.2, 1.0]
 *   ],
 *   expectedReturns: [0.10, 0.04, 0.08],  // 10%, 4%, 8%
 *   volatilities: [0.16, 0.05, 0.12]       // 16%, 5%, 12%
 * };
 * ```
 */
export class CorrelationHeatmap extends BaseComponent {
  /** Chart data - set to trigger render */
  private _data: HeatmapData | null = null;

  /**
   * Get current chart data.
   */
  get data(): HeatmapData | null {
    return this._data;
  }

  /**
   * Set chart data and update the display.
   */
  set data(value: HeatmapData | null) {
    this._data = value;
    this.updateDisplay();
  }

  protected template(): string {
    return `
      <div class="heatmap-wrapper">
        <div class="table-container">
          <table class="correlation-table" id="correlation-table">
            <thead id="table-head"></thead>
            <tbody id="table-body"></tbody>
          </table>
        </div>
        <div class="note-section" id="note-section"></div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        max-width: 100%;
      }

      /* Shadow DOM reset - global box-sizing doesn't penetrate */
      *, *::before, *::after {
        box-sizing: border-box;
      }

      .heatmap-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: var(--spacing-md, 16px);
      }

      .table-container {
        flex: 1;
        overflow-x: auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        max-width: 100%;
      }

      .correlation-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-sm, 0.875rem);
        min-width: 400px;
      }

      .correlation-table th,
      .correlation-table td {
        padding: var(--spacing-sm, 8px) var(--spacing-xs, 4px);
        text-align: center;
        border: 1px solid var(--border-color, #e2e8f0);
        min-width: 70px;
      }

      .correlation-table th {
        background: #0d9488;
        font-weight: 600;
        color: white;
        white-space: nowrap;
      }

      .correlation-table th.stats-header {
        background: #4A90D9;
        color: white;
        border-left: 2px solid var(--border-color, #e2e8f0);
        min-width: 90px;
      }

      .correlation-table tbody tr:nth-child(odd) td.row-label {
        background: #f8fafc;
      }

      .correlation-table tbody tr:nth-child(even) td.row-label {
        background: #ffffff;
      }

      .correlation-table td.row-label {
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        text-align: left;
        padding-left: var(--spacing-md, 16px);
      }

      .correlation-table td.correlation-cell {
        font-weight: 600;
        min-width: 60px;
      }

      .correlation-table tbody tr:nth-child(odd) td.return-cell,
      .correlation-table tbody tr:nth-child(odd) td.volatility-cell {
        background: #f8fafc;
      }

      .correlation-table tbody tr:nth-child(even) td.return-cell,
      .correlation-table tbody tr:nth-child(even) td.volatility-cell {
        background: #ffffff;
      }

      .correlation-table td.return-cell {
        color: #0d9488;
        font-weight: 600;
        border-left: 2px solid var(--border-color, #e2e8f0);
      }

      .correlation-table td.volatility-cell {
        color: var(--text-secondary, #475569);
        font-weight: 500;
      }

      .correlation-table td.estimated {
        font-style: italic;
        opacity: 0.85;
      }

      .correlation-table .est-suffix {
        font-size: 0.75em;
        opacity: 0.7;
        margin-left: 2px;
      }

      .note-section {
        background: var(--surface-secondary, #f8fafc);
        border: 1px solid var(--border-color, #e2e8f0);
        border-left: 4px solid var(--color-primary, #0d9488);
        border-radius: var(--radius-md, 6px);
        padding: var(--spacing-md, 16px);
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        overflow-wrap: break-word;
        word-wrap: break-word;
      }

      .note-section p {
        margin: 0 0 var(--spacing-sm, 8px) 0;
      }

      .note-section p:last-child {
        margin-bottom: 0;
      }

      .note-section strong {
        color: var(--text-primary, #1e293b);
      }

      .note-section .note-highlight {
        color: #0d9488;
        font-weight: 600;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .heatmap-wrapper {
          gap: var(--spacing-sm, 8px);
        }

        .table-container {
          /* Allow horizontal scrolling on mobile */
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 calc(-1 * var(--spacing-sm, 8px));
          padding: 0 var(--spacing-sm, 8px);
        }

        .correlation-table {
          font-size: var(--font-size-xs, 0.75rem);
          min-width: max-content;
        }

        .correlation-table th,
        .correlation-table td {
          padding: var(--spacing-xs, 4px) var(--spacing-xs, 4px);
          min-width: 48px;
          white-space: nowrap;
        }

        .correlation-table th.stats-header {
          min-width: 60px;
          font-size: 0.65rem;
        }

        .correlation-table td.row-label {
          padding-left: var(--spacing-sm, 8px);
          min-width: 60px;
        }

        .note-section {
          padding: var(--spacing-sm, 8px);
          font-size: 0.75rem;
          line-height: 1.5;
        }

        .note-section p {
          margin-bottom: var(--spacing-xs, 4px);
        }
      }

      @media (max-width: 480px) {
        .correlation-table {
          font-size: 0.65rem;
        }

        .correlation-table th,
        .correlation-table td {
          padding: 3px 2px;
          min-width: 40px;
        }

        .correlation-table th.stats-header {
          min-width: 50px;
          font-size: 0.6rem;
        }

        .correlation-table td.row-label {
          min-width: 50px;
        }
      }
    `;
  }

  protected override afterRender(): void {
    this.updateDisplay();
  }

  /**
   * Update the table display with current data.
   */
  private updateDisplay(): void {
    const thead = this.$('#table-head') as HTMLTableSectionElement | null;
    const tbody = this.$('#table-body') as HTMLTableSectionElement | null;
    const noteSection = this.$('#note-section') as HTMLElement | null;

    if (!thead || !tbody || !noteSection) return;

    if (!this._data || this._data.labels.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = '<tr><td colspan="99">No data available</td></tr>';
      noteSection.innerHTML = '';
      return;
    }

    const { labels, matrix, expectedReturns, volatilities, isEstimate } = this._data;
    const hasStats = expectedReturns && volatilities &&
                     expectedReturns.length === labels.length &&
                     volatilities.length === labels.length;

    // Build header row
    let headerHtml = '<tr><th>Name</th>';
    for (const label of labels) {
      headerHtml += `<th>${this.escapeHtml(label)}</th>`;
    }
    if (hasStats) {
      headerHtml += '<th class="stats-header">Expected Annual<br>Return</th>';
      headerHtml += '<th class="stats-header">Annualized<br>Volatility</th>';
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    // Build body rows
    let bodyHtml = '';
    for (let row = 0; row < labels.length; row++) {
      bodyHtml += '<tr>';
      bodyHtml += `<td class="row-label">${this.escapeHtml(labels[row])}</td>`;

      for (let col = 0; col < matrix[row].length; col++) {
        const value = matrix[row][col];
        const isDiagonal = row === col;
        const bgColor = interpolateColor(value, isDiagonal);
        const textColor = getContrastTextColor(bgColor);
        bodyHtml += `<td class="correlation-cell" style="background-color: ${bgColor}; color: ${textColor};">${value.toFixed(2)}</td>`;
      }

      if (hasStats) {
        const returnValue = expectedReturns![row];
        const volValue = volatilities![row];
        const isEst = isEstimate?.[row] ?? false;
        const estClass = isEst ? ' estimated' : '';
        const estSuffix = isEst ? '<span class="est-suffix">(est)</span>' : '';
        bodyHtml += `<td class="return-cell${estClass}">${(returnValue * 100).toFixed(2)}%${estSuffix}</td>`;
        bodyHtml += `<td class="volatility-cell${estClass}">${(volValue * 100).toFixed(2)}%${estSuffix}</td>`;
      }

      bodyHtml += '</tr>';
    }
    tbody.innerHTML = bodyHtml;

    // Check if any values are estimates
    const hasEstimates = isEstimate?.some(v => v) ?? false;

    // Build note section
    noteSection.innerHTML = `
      <p><strong>Correlation Matrix:</strong> Calculated using Pearson correlation coefficient on year-aligned historical returns. Values range from -1.0 (perfect negative correlation) to +1.0 (perfect positive correlation). Diagonal cells (1.00) represent each asset correlated with itself.</p>
      <p><strong class="note-highlight">Expected Annual Return:</strong> Arithmetic mean of all year-over-year returns from historical data. Formula: <em>mu = (sum r_i) / n</em> where r_i represents each annual return and n is the number of years of data.</p>
      <p><strong>Annualized Volatility:</strong> Standard deviation of annual returns, measuring return dispersion. Formula: <em>sigma = sqrt(sum(r_i - mu)^2 / n)</em>. Higher volatility indicates greater price fluctuation and risk. Used in modern portfolio theory to assess risk-adjusted returns.</p>
      <p><strong class="note-highlight">Diversification Insight:</strong> Lower correlations (closer to 0 or negative) provide better diversification benefits. Assets with correlations above 0.90 move very similarly and offer limited diversification value.</p>
      ${hasEstimates ? '<p><strong>(est)</strong> indicates estimated values using market average assumptions (8% return, 16% volatility) because historical data is unavailable for that asset.</p>' : ''}
    `;
  }

  /**
   * Escape HTML special characters to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Register the custom element
customElements.define('correlation-heatmap', CorrelationHeatmap);
