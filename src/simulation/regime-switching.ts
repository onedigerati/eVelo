/**
 * Regime-Switching Return Generation
 *
 * Implements a Markov regime-switching model for realistic market simulation.
 * Based on Hamilton (1989) regime-switching methodology.
 *
 * Markets transition between bull, bear, and crash regimes according to
 * a configurable transition matrix, with each regime having distinct
 * return distributions.
 */

import type {
  MarketRegime,
  TransitionMatrix,
  RegimeParamsMap,
} from './types';
import {
  DEFAULT_TRANSITION_MATRIX,
  DEFAULT_REGIME_PARAMS,
} from './types';

/**
 * Determine next market regime via Markov transition
 *
 * Uses the current regime's row in the transition matrix to
 * probabilistically select the next regime.
 *
 * @param current Current market regime
 * @param matrix Transition probability matrix
 * @param rng Random number generator (0-1)
 * @returns Next market regime
 */
export function nextRegime(
  current: MarketRegime,
  matrix: TransitionMatrix,
  rng: () => number
): MarketRegime {
  const probs = matrix[current];
  const r = rng();

  // Cumulative probability selection
  if (r < probs.bull) {
    return 'bull';
  }
  if (r < probs.bull + probs.bear) {
    return 'bear';
  }
  return 'crash';
}
