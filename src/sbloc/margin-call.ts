/**
 * Margin Call Detection Module
 *
 * Monitors securities-backed loan positions for margin call risk.
 * A margin call occurs when LTV exceeds the maximum allowed ratio,
 * requiring immediate action (add collateral or reduce loan).
 *
 * Risk zones:
 * - Safe: LTV < maintenanceMargin (green)
 * - Warning: maintenanceMargin <= LTV < maxLTV (yellow)
 * - Margin Call: LTV >= maxLTV (red - forced liquidation)
 */

import type { SBLOCConfig, SBLOCState, MarginCallEvent } from './types';
import { calculateLTV } from './ltv';

// ============================================================================
// Margin Call Detection
// ============================================================================

/**
 * Detect if current state triggers a margin call
 *
 * A margin call occurs when LTV reaches or exceeds the maximum allowed ratio.
 * This is the critical threshold that triggers forced liquidation.
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration with maxLTV
 * @returns MarginCallEvent if triggered, null otherwise
 *
 * @example
 * ```typescript
 * const state = {
 *   loanBalance: 700000,
 *   portfolioValue: 1000000,
 *   currentLTV: 0.70,
 *   yearsSinceStart: 5,
 *   inWarningZone: true
 * };
 * const config = { maxLTV: 0.65, ... };
 *
 * // LTV 70% >= maxLTV 65% -> margin call triggered
 * detectMarginCall(state, config);
 * // {
 * //   year: 5,
 * //   ltvAtTrigger: 0.70,
 * //   loanBalance: 700000,
 * //   portfolioValue: 1000000
 * // }
 *
 * // Safe state (40% < 65%)
 * const safe = { loanBalance: 400000, portfolioValue: 1000000, currentLTV: 0.40, ... };
 * detectMarginCall(safe, config); // null
 * ```
 */
export function detectMarginCall(state: SBLOCState, config: SBLOCConfig): MarginCallEvent | null {
  // Recalculate LTV to ensure accuracy (don't rely solely on cached currentLTV)
  const currentLTV = calculateLTV(state.loanBalance, state.portfolioValue);

  // Margin call triggers when LTV reaches or exceeds max
  if (currentLTV >= config.maxLTV) {
    return {
      year: state.yearsSinceStart,
      ltvAtTrigger: currentLTV,
      loanBalance: state.loanBalance,
      portfolioValue: state.portfolioValue,
    };
  }

  return null;
}

// ============================================================================
// Warning Zone Detection
// ============================================================================

/**
 * Check if account is in warning zone (elevated risk but not yet margin call)
 *
 * Warning zone: maintenanceMargin <= LTV < maxLTV
 *
 * This "yellow zone" indicates:
 * - Portfolio has declined or loan has grown
 * - Further decline will trigger margin call
 * - Consider reducing loan or adding collateral
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration with maintenanceMargin and maxLTV
 * @returns true if in warning zone, false otherwise
 *
 * @example
 * ```typescript
 * const config = { maintenanceMargin: 0.50, maxLTV: 0.65, ... };
 *
 * // In warning zone (55% between 50% and 65%)
 * const warning = { currentLTV: 0.55, ... };
 * isInWarningZone(warning, config); // true
 *
 * // Safe zone (40% < 50%)
 * const safe = { currentLTV: 0.40, ... };
 * isInWarningZone(safe, config); // false
 *
 * // Margin call zone (70% >= 65%)
 * const marginCall = { currentLTV: 0.70, ... };
 * isInWarningZone(marginCall, config); // false (past warning into margin call)
 * ```
 */
export function isInWarningZone(state: SBLOCState, config: SBLOCConfig): boolean {
  // Recalculate LTV for accuracy
  const currentLTV = calculateLTV(state.loanBalance, state.portfolioValue);

  // Warning zone is between maintenance margin and max LTV
  return currentLTV >= config.maintenanceMargin && currentLTV < config.maxLTV;
}

// ============================================================================
// Margin Buffer Calculations
// ============================================================================

/**
 * Margin buffer metrics
 */
export interface MarginBuffer {
  /** Dollars portfolio can drop before entering warning zone (negative = already in warning) */
  dollarsUntilWarning: number;
  /** Dollars portfolio can drop before margin call (negative = already in margin call) */
  dollarsUntilMarginCall: number;
  /** Percentage utilization of margin (0 = no loan, 1 = at max, >1 = margin call) */
  percentUntilMarginCall: number;
}

/**
 * Calculate margin buffer - how much cushion before warning/margin call
 *
 * Helps users understand their risk exposure:
 * - Large buffer = safe, can withstand market drops
 * - Small buffer = risky, close to margin call
 * - Negative buffer = already in warning/margin call territory
 *
 * Formulas:
 * - dollarsUntilWarning = portfolioValue - (loanBalance / maintenanceMargin)
 * - dollarsUntilMarginCall = portfolioValue - (loanBalance / maxLTV)
 * - percentUntilMarginCall = 1 - (currentLTV / maxLTV)
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration
 * @returns Buffer metrics showing distance to warning and margin call
 *
 * @example
 * ```typescript
 * const state = {
 *   loanBalance: 400000,
 *   portfolioValue: 1000000,
 *   currentLTV: 0.40,
 *   ...
 * };
 * const config = { maintenanceMargin: 0.50, maxLTV: 0.65, ... };
 *
 * // Warning threshold: portfolio where LTV = 50%
 * // 400k / threshold = 0.50 -> threshold = 800k
 * // Buffer = 1000k - 800k = 200k
 *
 * // Margin call threshold: portfolio where LTV = 65%
 * // 400k / threshold = 0.65 -> threshold = 615.38k
 * // Buffer = 1000k - 615.38k = 384.62k
 *
 * // Percent buffer: 1 - (0.40 / 0.65) = 0.385 (38.5% buffer)
 *
 * calculateMarginBuffer(state, config);
 * // {
 * //   dollarsUntilWarning: 200000,
 * //   dollarsUntilMarginCall: 384615.38,
 * //   percentUntilMarginCall: 0.3846
 * // }
 * ```
 */
export function calculateMarginBuffer(state: SBLOCState, config: SBLOCConfig): MarginBuffer {
  const currentLTV = calculateLTV(state.loanBalance, state.portfolioValue);

  // Portfolio value at which warning zone begins
  // At warning: loanBalance / warningThreshold = maintenanceMargin
  // warningThreshold = loanBalance / maintenanceMargin
  const warningThreshold =
    config.maintenanceMargin > 0 ? state.loanBalance / config.maintenanceMargin : Infinity;

  // Portfolio value at which margin call triggers
  // At margin call: loanBalance / marginCallThreshold = maxLTV
  // marginCallThreshold = loanBalance / maxLTV
  const marginCallThreshold = config.maxLTV > 0 ? state.loanBalance / config.maxLTV : Infinity;

  // Buffer in dollars (positive = safe, negative = already past threshold)
  const dollarsUntilWarning = state.portfolioValue - warningThreshold;
  const dollarsUntilMarginCall = state.portfolioValue - marginCallThreshold;

  // Percent buffer (how much of margin limit is still available)
  // 0 = no loan, 1 = at limit, >1 = over limit
  const percentUntilMarginCall = config.maxLTV > 0 ? 1 - currentLTV / config.maxLTV : 1;

  return {
    dollarsUntilWarning,
    dollarsUntilMarginCall,
    percentUntilMarginCall,
  };
}

/**
 * Calculate what percentage drop in portfolio would trigger a margin call
 *
 * This answers: "How much can my portfolio fall before I get a margin call?"
 *
 * Formula: 1 - (loanBalance / (portfolioValue * maxLTV))
 *        = 1 - (currentLTV / maxLTV)
 *
 * @param state - Current SBLOC state
 * @param config - SBLOC configuration
 * @returns Percentage drop that would trigger margin call (0-1, negative if already in margin call)
 *
 * @example
 * ```typescript
 * const state = {
 *   loanBalance: 400000,
 *   portfolioValue: 1000000,
 *   currentLTV: 0.40,
 *   ...
 * };
 * const config = { maxLTV: 0.65, ... };
 *
 * // Max borrowing at current portfolio = 1M * 0.65 = 650k
 * // Current loan = 400k
 * // Utilization = 400k / 650k = 61.5%
 * // Room until margin call = 1 - 0.615 = 38.5%
 *
 * // Alternative calculation:
 * // Portfolio drop that makes LTV = 65%:
 * // 400k / newPortfolio = 0.65 -> newPortfolio = 615.38k
 * // Drop = (1M - 615.38k) / 1M = 38.46%
 *
 * calculateDropToMarginCall(state, config); // 0.3846 (38.46% drop allowed)
 *
 * // At 60% LTV
 * const closer = { loanBalance: 600000, portfolioValue: 1000000, currentLTV: 0.60, ... };
 * calculateDropToMarginCall(closer, config); // 0.077 (only 7.7% drop before margin call)
 *
 * // Already in margin call (70% LTV)
 * const over = { loanBalance: 700000, portfolioValue: 1000000, currentLTV: 0.70, ... };
 * calculateDropToMarginCall(over, config); // -0.077 (negative = already 7.7% over)
 * ```
 */
export function calculateDropToMarginCall(state: SBLOCState, config: SBLOCConfig): number {
  if (config.maxLTV <= 0) {
    return 0;
  }

  const currentLTV = calculateLTV(state.loanBalance, state.portfolioValue);

  // No loan = infinite buffer (return 1 for 100% drop tolerance)
  if (currentLTV === 0) {
    return 1;
  }

  // Infinite LTV = already in crisis (no collateral)
  if (!Number.isFinite(currentLTV)) {
    return -Infinity;
  }

  // Calculate percentage room until margin call
  // At margin call: currentLTV = maxLTV
  // Room = (maxLTV - currentLTV) / maxLTV = 1 - currentLTV/maxLTV
  return 1 - currentLTV / config.maxLTV;
}
