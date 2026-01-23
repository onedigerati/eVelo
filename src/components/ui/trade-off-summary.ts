/**
 * Trade-Off Summary Component
 *
 * Generates plain-language assessment of strategy comparison trade-offs.
 * Analyzes ComparisonMetrics to produce actionable recommendations.
 */

import { BaseComponent } from '../base-component';
import type { ComparisonMetrics } from '../../utils/delta-calculations';

/**
 * Assessment of which strategy performs better
 */
export type StrategyAssessment = 'previous-better' | 'current-better' | 'similar';

/**
 * Structured trade-off summary data
 */
export interface TradeOffSummaryData {
  /** Main takeaway headline */
  headline: string;
  /** Overall assessment */
  assessment: StrategyAssessment;
  /** Key differences (up to 4 bullet points) */
  keyDifferences: string[];
  /** Actionable recommendation */
  recommendation: string;
}

/**
 * Trade-Off Summary Component
 *
 * Displays plain-language comparison assessment for quick decision-making.
 *
 * Usage:
 * ```html
 * <trade-off-summary></trade-off-summary>
 * ```
 *
 * Properties:
 * - metrics: ComparisonMetrics
 * - previousName: string
 * - currentName: string
 */
export class TradeOffSummary extends BaseComponent {
  private _metrics: ComparisonMetrics | null = null;
  private _previousName: string = 'Previous';
  private _currentName: string = 'Current';

  /**
   * Set comparison metrics
   */
  set metrics(value: ComparisonMetrics | null) {
    this._metrics = value;
    this.render();
  }

  /**
   * Set previous strategy name
   */
  set previousName(value: string) {
    this._previousName = value;
    this.render();
  }

  /**
   * Set current strategy name
   */
  set currentName(value: string) {
    this._currentName = value;
    this.render();
  }

  /**
   * Generate trade-off summary from metrics
   */
  private generateSummary(): TradeOffSummaryData {
    if (!this._metrics) {
      return {
        headline: 'No comparison data available',
        assessment: 'similar',
        keyDifferences: [],
        recommendation: 'Generate both simulations to see comparison.',
      };
    }

    // Score each strategy based on metric improvements
    let previousScore = 0;
    let currentScore = 0;

    // Final value (median terminal value) - weighted heavily (+2)
    if (this._metrics.finalValue.direction === 'up') {
      currentScore += 2;
    } else if (this._metrics.finalValue.direction === 'down') {
      previousScore += 2;
    }

    // Success rate (+1)
    if (this._metrics.successRate.direction === 'up') {
      currentScore += 1;
    } else if (this._metrics.successRate.direction === 'down') {
      previousScore += 1;
    }

    // Margin call probability - lower is better (+1)
    if (this._metrics.marginCallProbability) {
      if (this._metrics.marginCallProbability.direction === 'down') {
        currentScore += 1;
      } else if (this._metrics.marginCallProbability.direction === 'up') {
        previousScore += 1;
      }
    }

    // CAGR (+1)
    if (this._metrics.cagr) {
      if (this._metrics.cagr.direction === 'up') {
        currentScore += 1;
      } else if (this._metrics.cagr.direction === 'down') {
        previousScore += 1;
      }
    }

    // Determine assessment
    let assessment: StrategyAssessment;
    if (currentScore > previousScore) {
      assessment = 'current-better';
    } else if (previousScore > currentScore) {
      assessment = 'previous-better';
    } else {
      assessment = 'similar';
    }

    // Generate key differences
    const differences: Array<{ text: string; magnitude: number }> = [];

    // Final value difference
    const finalValueMagnitude = Math.abs(this._metrics.finalValue.absolute);
    if (this._metrics.finalValue.direction !== 'neutral') {
      const better = this._metrics.finalValue.direction === 'up' ? this._currentName : this._previousName;
      differences.push({
        text: `${better} produces ${this.formatCurrency(finalValueMagnitude)} higher median terminal value`,
        magnitude: finalValueMagnitude,
      });
    }

    // Success rate difference
    const successRateMagnitude = Math.abs(this._metrics.successRate.percentChange);
    if (this._metrics.successRate.direction !== 'neutral') {
      const better = this._metrics.successRate.direction === 'up' ? this._currentName : this._previousName;
      differences.push({
        text: `${better} has ${successRateMagnitude.toFixed(1)}% higher success rate`,
        magnitude: successRateMagnitude,
      });
    }

    // Margin call probability difference
    if (this._metrics.marginCallProbability && this._metrics.marginCallProbability.direction !== 'neutral') {
      const better = this._metrics.marginCallProbability.direction === 'down' ? this._currentName : this._previousName;
      const probDiff = Math.abs(this._metrics.marginCallProbability.absolute);
      differences.push({
        text: `${better} has ${probDiff.toFixed(1)}% lower margin call risk`,
        magnitude: probDiff * 100, // Scale for sorting
      });
    }

    // CAGR difference
    if (this._metrics.cagr && this._metrics.cagr.direction !== 'neutral') {
      const better = this._metrics.cagr.direction === 'up' ? this._currentName : this._previousName;
      const cagrDiff = Math.abs(this._metrics.cagr.percentChange);
      differences.push({
        text: `${better} achieves ${cagrDiff.toFixed(1)}% higher CAGR`,
        magnitude: cagrDiff,
      });
    }

    // Sort by magnitude and take top 4
    differences.sort((a, b) => b.magnitude - a.magnitude);
    const keyDifferences = differences.slice(0, 4).map(d => d.text);

    // Generate headline
    let headline: string;
    if (assessment === 'current-better') {
      headline = `${this._currentName} strategy outperforms`;
    } else if (assessment === 'previous-better') {
      headline = `${this._previousName} strategy outperforms`;
    } else {
      headline = 'Strategies produce similar outcomes';
    }

    // Generate recommendation
    let recommendation: string;
    if (assessment === 'current-better') {
      recommendation = `The ${this._currentName} strategy offers better risk-adjusted returns. Consider adopting these parameters.`;
    } else if (assessment === 'previous-better') {
      recommendation = `The ${this._previousName} strategy appears more favorable. Review what changed before switching to ${this._currentName}.`;
    } else {
      recommendation = 'Both strategies produce comparable results. Your choice may depend on personal risk tolerance.';
    }

    return {
      headline,
      assessment,
      keyDifferences,
      recommendation,
    };
  }

  /**
   * Format currency with compact notation
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  protected template(): string {
    const summary = this.generateSummary();

    const differencesList = summary.keyDifferences.length > 0
      ? summary.keyDifferences.map(d => `<li>${d}</li>`).join('')
      : '<li class="no-data">Strategies are nearly identical</li>';

    return `
      <div class="trade-off-summary">
        <div class="summary-headline ${summary.assessment}">
          ${summary.headline}
        </div>
        ${summary.keyDifferences.length > 0 ? `
          <ul class="key-differences">
            ${differencesList}
          </ul>
        ` : ''}
        <p class="recommendation">${summary.recommendation}</p>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .trade-off-summary {
        padding: 1.5rem;
        background: var(--bg-secondary, #f9fafb);
        border-radius: 8px;
        border: 1px solid var(--border-color, #e5e7eb);
      }

      .summary-headline {
        font-size: 1.25rem;
        font-weight: 700;
        margin-bottom: 1rem;
      }

      .summary-headline.previous-better {
        color: #8b5cf6;
      }

      .summary-headline.current-better {
        color: #0d9488;
      }

      .summary-headline.similar {
        color: var(--text-secondary, #6b7280);
      }

      .key-differences {
        list-style: disc;
        padding-left: 1.5rem;
        margin: 0 0 1rem 0;
      }

      .key-differences li {
        margin-bottom: 0.5rem;
        color: var(--text-primary, #111827);
        line-height: 1.5;
      }

      .key-differences li.no-data {
        color: var(--text-secondary, #6b7280);
        font-style: italic;
      }

      .recommendation {
        margin: 0;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color, #e5e7eb);
        font-style: italic;
        color: var(--text-secondary, #6b7280);
        line-height: 1.6;
      }
    `;
  }
}

// Register the custom element
customElements.define('trade-off-summary', TradeOffSummary);
