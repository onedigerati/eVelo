/**
 * SBLOC State Validation
 *
 * Validation functions to catch invalid states (negative values, NaN, Infinity)
 * before they propagate through calculations and cause silent failures.
 *
 * Addresses:
 * - Risk Area #12: No State Validation in SBLOC
 * - Risk Area #11: LTV Floating Point Edge Cases
 */

import type { SBLOCConfig, SBLOCState } from './types';

// ============================================================================
// Custom Error Class
// ============================================================================

/**
 * Error thrown when SBLOC state validation fails
 *
 * Contains the invalid state and the specific field that failed validation,
 * enabling precise debugging and error handling.
 *
 * @example
 * ```typescript
 * try {
 *   validateSBLOCState(state, config);
 * } catch (error) {
 *   if (error instanceof SBLOCStateValidationError) {
 *     console.error(`Field ${error.field} is invalid:`, error.message);
 *     console.error('State at time of error:', error.state);
 *   }
 * }
 * ```
 */
export class SBLOCStateValidationError extends Error {
  constructor(
    message: string,
    public readonly state: Partial<SBLOCState>,
    public readonly field: string
  ) {
    super(`SBLOC State Validation Failed: ${message}`);
    this.name = 'SBLOCStateValidationError';
  }
}

// ============================================================================
// LTV Validation
// ============================================================================

/**
 * Validate LTV value for edge cases
 *
 * Edge case handling:
 * - portfolioValue = 0, loanBalance > 0: Return Infinity (acceptable, means margin call certain)
 * - portfolioValue = 0, loanBalance = 0: Return 0 (no position)
 * - NaN: Throw error (invalid state)
 * - Negative: Throw error (invalid state)
 *
 * @param ltv - The LTV value to validate
 * @param portfolioValue - Current portfolio value (for context in error)
 * @param loanBalance - Current loan balance (for context in error)
 * @returns true if LTV is valid (including Infinity for total loss)
 * @throws SBLOCStateValidationError if LTV is NaN or negative
 *
 * @example
 * ```typescript
 * // Valid case: Infinity when portfolio lost all value
 * validateLTV(Infinity, 0, 100000); // true - margin call certain
 *
 * // Invalid case: NaN
 * validateLTV(NaN, 0, 0); // throws SBLOCStateValidationError
 * ```
 */
export function validateLTV(
  ltv: number,
  portfolioValue: number,
  loanBalance: number
): boolean {
  // NaN is never valid
  if (Number.isNaN(ltv)) {
    throw new SBLOCStateValidationError(
      'LTV is NaN',
      { currentLTV: ltv, portfolioValue, loanBalance },
      'currentLTV'
    );
  }

  // Infinity is valid when portfolio = 0 and loan > 0 (margin call certain)
  if (ltv === Infinity && portfolioValue === 0 && loanBalance > 0) {
    return true;
  }

  // Negative Infinity is invalid
  if (ltv === -Infinity) {
    throw new SBLOCStateValidationError(
      'LTV cannot be negative infinity',
      { currentLTV: ltv, portfolioValue, loanBalance },
      'currentLTV'
    );
  }

  // Infinity without the expected conditions is suspicious
  if (ltv === Infinity) {
    throw new SBLOCStateValidationError(
      'Unexpected Infinity LTV (portfolio > 0 or loan = 0)',
      { currentLTV: ltv, portfolioValue, loanBalance },
      'currentLTV'
    );
  }

  // Negative LTV is invalid
  if (ltv < 0) {
    throw new SBLOCStateValidationError(
      'LTV cannot be negative',
      { currentLTV: ltv, portfolioValue, loanBalance },
      'currentLTV'
    );
  }

  return true;
}

// ============================================================================
// Full State Validation
// ============================================================================

/**
 * Validate complete SBLOC state
 *
 * Call after every state mutation to catch invalid states early.
 * Validates all numeric fields for NaN, negative values, and edge cases.
 *
 * @param state - The SBLOC state to validate
 * @param _config - SBLOC configuration (reserved for future validation rules)
 * @throws SBLOCStateValidationError if any field is invalid
 *
 * @example
 * ```typescript
 * const state = stepSBLOC(prevState, config, return, year);
 *
 * try {
 *   validateSBLOCState(state.newState, config);
 * } catch (error) {
 *   if (error instanceof SBLOCStateValidationError) {
 *     console.warn('Invalid state detected:', error.message);
 *   }
 * }
 * ```
 */
export function validateSBLOCState(
  state: SBLOCState,
  _config: SBLOCConfig
): void {
  // Portfolio value must be non-negative
  if (Number.isNaN(state.portfolioValue)) {
    throw new SBLOCStateValidationError(
      'Portfolio value is NaN',
      state,
      'portfolioValue'
    );
  }
  if (state.portfolioValue < 0) {
    throw new SBLOCStateValidationError(
      'Portfolio value cannot be negative',
      state,
      'portfolioValue'
    );
  }

  // Loan balance must be non-negative
  if (Number.isNaN(state.loanBalance)) {
    throw new SBLOCStateValidationError(
      'Loan balance is NaN',
      state,
      'loanBalance'
    );
  }
  if (state.loanBalance < 0) {
    throw new SBLOCStateValidationError(
      'Loan balance cannot be negative',
      state,
      'loanBalance'
    );
  }

  // Validate LTV (handles NaN, allows Infinity for edge cases)
  validateLTV(state.currentLTV, state.portfolioValue, state.loanBalance);

  // Years since start must be non-negative integer
  if (Number.isNaN(state.yearsSinceStart)) {
    throw new SBLOCStateValidationError(
      'yearsSinceStart is NaN',
      state,
      'yearsSinceStart'
    );
  }
  if (state.yearsSinceStart < 0 || !Number.isInteger(state.yearsSinceStart)) {
    throw new SBLOCStateValidationError(
      'yearsSinceStart must be non-negative integer',
      state,
      'yearsSinceStart'
    );
  }
}
