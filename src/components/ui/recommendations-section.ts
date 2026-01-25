/**
 * Recommendations Section Web Component
 *
 * Displays actionable insights and important considerations
 * based on simulation results. Provides recommendations for
 * risk management and strategy optimization.
 */
import { BaseComponent } from '../base-component';
import type { Insight, InsightType, Consideration, ConsiderationType } from '../../utils/insight-generator';
import { getInsightColor } from '../../utils/insight-generator';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the RecommendationsSection component.
 */
export interface RecommendationsSectionProps {
  /** Dynamic insights based on simulation results */
  insights: Insight[];
  /** Standard risk considerations */
  considerations: Consideration[];
}

// ============================================================================
// Component
// ============================================================================

/**
 * Recommendations section displaying actionable insights and considerations.
 *
 * Features:
 * - Insights with colored icons based on severity
 * - Actionable recommendations with "Action:" prefix
 * - Collapsible considerations list
 * - Mobile-responsive layout
 *
 * @example
 * ```html
 * <recommendations-section></recommendations-section>
 * <script>
 *   const section = document.querySelector('recommendations-section');
 *   section.data = {
 *     insights: generateInsights(...),
 *     considerations: generateConsiderations(...)
 *   };
 * </script>
 * ```
 */
export class RecommendationsSection extends BaseComponent {
  private _insights: Insight[] = [];
  private _considerations: Consideration[] = [];
  private _considerationsExpanded: boolean = true;

  /**
   * Set the full data object at once.
   */
  set data(value: RecommendationsSectionProps | null) {
    if (!value) {
      this._insights = [];
      this._considerations = [];
    } else {
      this._insights = value.insights;
      this._considerations = value.considerations;
    }
    this.updateDisplay();
  }

  /**
   * Set insights array.
   */
  set insights(value: Insight[]) {
    this._insights = value;
    this.updateDisplay();
  }

  /**
   * Get insights array.
   */
  get insights(): Insight[] {
    return this._insights;
  }

  /**
   * Set considerations array.
   */
  set considerations(value: Consideration[]) {
    this._considerations = value;
    this.updateDisplay();
  }

  /**
   * Get considerations array.
   */
  get considerations(): Consideration[] {
    return this._considerations;
  }

  protected template(): string {
    return `
      <div class="recommendations-wrapper">
        <div class="recommendations-header">
          <h3>Recommendations</h3>
        </div>

        <div class="insights-section">
          <div class="section-header">
            <h4>Actionable Insights</h4>
            <span class="count-badge" id="insights-count">0</span>
          </div>
          <div class="insights-list" id="insights-list">
            <p class="empty-state">No specific insights for this scenario.</p>
          </div>
        </div>

        <div class="considerations-section">
          <button class="section-toggle" id="considerations-toggle" aria-expanded="true">
            <h4>Important Considerations</h4>
            <span class="toggle-icon">&#x25BC;</span>
          </button>
          <div class="considerations-list" id="considerations-list">
            <!-- Considerations rendered here -->
          </div>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        max-width: 100%;
      }

      /* Shadow DOM reset - global box-sizing doesn't penetrate */
      *, *::before, *::after {
        box-sizing: border-box;
      }

      .recommendations-wrapper {
        background: var(--surface-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-lg, 8px);
        overflow: hidden;
      }

      .recommendations-header {
        padding: var(--spacing-lg, 24px);
        padding-bottom: 0;
      }

      .recommendations-header h3 {
        margin: 0;
        font-size: var(--font-size-xl, 1.25rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      /* Insights Section */
      .insights-section {
        padding: var(--spacing-lg, 24px);
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-md, 16px);
      }

      .section-header h4 {
        margin: 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 var(--spacing-xs, 4px);
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 600;
        color: white;
        background: var(--color-primary, #0d9488);
        border-radius: 12px;
      }

      .insights-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md, 16px);
      }

      .empty-state {
        margin: 0;
        padding: var(--spacing-md, 16px);
        text-align: center;
        color: var(--text-secondary, #475569);
        font-size: var(--font-size-sm, 0.875rem);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
      }

      /* Insight Card */
      .insight-card {
        display: flex;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-md, 16px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
        border-left: 4px solid var(--card-accent-color, #e2e8f0);
      }

      .insight-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }

      .insight-content {
        flex: 1;
        min-width: 0;
      }

      .insight-title {
        margin: 0 0 var(--spacing-xs, 4px) 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .insight-message {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        line-height: 1.5;
      }

      .insight-action {
        margin: var(--spacing-sm, 8px) 0 0 0;
        padding: var(--spacing-sm, 8px);
        background: rgba(13, 148, 136, 0.1);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--color-primary, #0d9488);
      }

      .insight-action strong {
        font-weight: 600;
      }

      /* Considerations Section */
      .considerations-section {
        padding: var(--spacing-lg, 24px);
      }

      .section-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0;
        margin-bottom: var(--spacing-md, 16px);
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
      }

      .section-toggle h4 {
        margin: 0;
        font-size: var(--font-size-base, 1rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .toggle-icon {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-secondary, #475569);
        transition: transform 0.2s ease;
      }

      .section-toggle[aria-expanded="false"] .toggle-icon {
        transform: rotate(-90deg);
      }

      .considerations-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .considerations-list.collapsed {
        display: none;
      }

      /* Consideration Item */
      .consideration-item {
        display: flex;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
      }

      .consideration-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
      }

      .consideration-content {
        flex: 1;
        min-width: 0;
      }

      .consideration-title {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--text-primary, #1e293b);
      }

      .consideration-title .value {
        margin-left: var(--spacing-sm, 8px);
        padding: 2px var(--spacing-xs, 4px);
        font-size: var(--font-size-xs, 0.75rem);
        background: var(--surface-tertiary, #e2e8f0);
        border-radius: var(--radius-sm, 4px);
      }

      .consideration-message {
        margin: var(--spacing-xs, 4px) 0 0 0;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-secondary, #475569);
        line-height: 1.4;
      }

      .consideration-action {
        margin: var(--spacing-xs, 4px) 0 0 0;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--color-primary, #0d9488);
        font-weight: 500;
      }

      /* Icon Colors by Type */
      .type-warning {
        color: var(--color-warning, #f59e0b);
      }

      .type-note {
        color: var(--color-info, #3b82f6);
      }

      .type-action {
        color: var(--color-success, #22c55e);
      }

      .type-info {
        color: var(--text-secondary, #6b7280);
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .recommendations-header {
          padding: var(--spacing-md, 16px);
          padding-bottom: 0;
        }

        .recommendations-header h3 {
          font-size: var(--font-size-base, 1rem);
        }

        .insights-section,
        .considerations-section {
          padding: var(--spacing-md, 16px);
        }

        .section-header h4,
        .section-toggle h4 {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .count-badge {
          min-width: 20px;
          height: 20px;
          font-size: 0.65rem;
        }

        .insight-card {
          padding: var(--spacing-sm, 8px);
          gap: var(--spacing-sm, 8px);
        }

        .insight-title {
          font-size: var(--font-size-sm, 0.875rem);
        }

        .insight-message {
          font-size: var(--font-size-xs, 0.75rem);
        }

        .insight-action {
          font-size: var(--font-size-xs, 0.75rem);
          padding: var(--spacing-xs, 4px);
        }

        .consideration-item {
          padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        }

        .consideration-title {
          font-size: var(--font-size-xs, 0.75rem);
        }

        .consideration-message,
        .consideration-action {
          font-size: 0.65rem;
        }
      }

      @media (max-width: 480px) {
        .recommendations-wrapper {
          border-radius: 0;
          border-left: none;
          border-right: none;
        }

        .insight-card {
          flex-direction: column;
          gap: var(--spacing-xs, 4px);
        }

        .insight-icon {
          align-self: flex-start;
        }

        .consideration-item {
          flex-direction: column;
          gap: 2px;
        }

        .consideration-icon {
          align-self: flex-start;
        }
      }
    `;
  }

  protected override afterRender(): void {
    // Set up toggle for considerations section
    const toggle = this.$('#considerations-toggle') as HTMLButtonElement;
    toggle?.addEventListener('click', () => {
      this._considerationsExpanded = !this._considerationsExpanded;
      toggle.setAttribute('aria-expanded', String(this._considerationsExpanded));
      const list = this.$('#considerations-list') as HTMLElement;
      list?.classList.toggle('collapsed', !this._considerationsExpanded);
    });

    this.updateDisplay();
  }

  /**
   * Update the display with current data.
   */
  private updateDisplay(): void {
    this.renderInsights();
    this.renderConsiderations();
  }

  /**
   * Render insights list.
   */
  private renderInsights(): void {
    const container = this.$('#insights-list') as HTMLElement;
    const countBadge = this.$('#insights-count') as HTMLElement;

    if (!container) return;

    // Update count badge
    if (countBadge) {
      countBadge.textContent = String(this._insights.length);
    }

    // Render insights or empty state
    if (this._insights.length === 0) {
      container.innerHTML = `
        <p class="empty-state">No specific insights for this scenario. Your parameters appear well-balanced.</p>
      `;
      return;
    }

    container.innerHTML = this._insights.map(insight => this.renderInsightCard(insight)).join('');
  }

  /**
   * Render a single insight card.
   */
  private renderInsightCard(insight: Insight): string {
    const iconClass = `type-${insight.type}`;
    const accentColor = getInsightColor(insight.type);
    const icon = this.getIconEmoji(insight.type);

    return `
      <div class="insight-card" style="--card-accent-color: ${accentColor}">
        <div class="insight-icon ${iconClass}">${icon}</div>
        <div class="insight-content">
          <h5 class="insight-title">${this.escapeHtml(insight.title)}</h5>
          <p class="insight-message">${this.escapeHtml(insight.message)}</p>
          ${insight.action ? `
            <p class="insight-action">
              <strong>Action:</strong> ${this.escapeHtml(insight.action)}
            </p>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render considerations list.
   */
  private renderConsiderations(): void {
    const container = this.$('#considerations-list') as HTMLElement;
    if (!container) return;

    if (this._considerations.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this._considerations.map(c => this.renderConsiderationItem(c)).join('');

    // Apply collapsed state if needed
    container.classList.toggle('collapsed', !this._considerationsExpanded);
  }

  /**
   * Render a single consideration item.
   */
  private renderConsiderationItem(consideration: Consideration): string {
    const iconClass = `type-${consideration.type}`;
    const icon = this.getConsiderationIcon(consideration.type);

    return `
      <div class="consideration-item">
        <div class="consideration-icon ${iconClass}">${icon}</div>
        <div class="consideration-content">
          <h6 class="consideration-title">
            ${this.escapeHtml(consideration.title)}
            ${consideration.value ? `<span class="value">${this.escapeHtml(consideration.value)}</span>` : ''}
          </h6>
          <p class="consideration-message">${this.escapeHtml(consideration.message)}</p>
          ${consideration.action ? `
            <p class="consideration-action">${this.escapeHtml(consideration.action)}</p>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Get emoji icon for insight type.
   */
  private getIconEmoji(type: InsightType): string {
    switch (type) {
      case 'warning':
        return '&#x26A0;';  // Warning sign
      case 'note':
        return '&#x1F4DD;'; // Memo
      case 'action':
        return '&#x2705;';  // Check mark
      case 'info':
        return '&#x1F4A1;'; // Light bulb
    }
  }

  /**
   * Get emoji icon for consideration type.
   */
  private getConsiderationIcon(type: ConsiderationType): string {
    switch (type) {
      case 'warning':
        return '&#x26A0;';  // Warning sign
      case 'note':
        return '&#x2139;';  // Info
      case 'action':
        return '&#x1F3AF;'; // Target
    }
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
customElements.define('recommendations-section', RecommendationsSection);
