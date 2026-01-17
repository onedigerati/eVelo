/**
 * Simulation Web Worker
 *
 * This file is loaded in a Web Worker context via vite-plugin-comlink.
 * All exported functions become async on the main thread.
 *
 * Features:
 * - Non-blocking Monte Carlo simulation
 * - Zero-copy Float64Array transfer
 * - Cancellation via AbortController
 * - Health check for worker readiness
 */

import * as Comlink from 'comlink';
import { runMonteCarlo } from './monte-carlo';
import type { SimulationConfig, PortfolioConfig, SimulationOutput } from './types';

/** Current abort controller for cancellation */
let currentAbortController: AbortController | null = null;

/**
 * Run Monte Carlo simulation in worker
 *
 * @param config Simulation parameters
 * @param portfolio Portfolio configuration
 * @param onProgress Progress callback (wrapped by Comlink.proxy on main thread)
 * @returns Simulation results with transferable Float64Array
 */
export async function simulate(
  config: SimulationConfig,
  portfolio: PortfolioConfig,
  onProgress?: (percent: number) => void
): Promise<SimulationOutput> {
  // Create abort controller for this simulation
  currentAbortController = new AbortController();

  try {
    const result = await runMonteCarlo(
      config,
      portfolio,
      onProgress,
      currentAbortController.signal
    );

    // Transfer the Float64Array buffer for zero-copy performance
    return Comlink.transfer(result, [result.terminalValues.buffer]);
  } finally {
    currentAbortController = null;
  }
}

/**
 * Cancel in-progress simulation
 */
export function cancel(): void {
  if (currentAbortController) {
    currentAbortController.abort();
  }
}

/**
 * Health check for worker readiness
 */
export function healthCheck(): string {
  return 'Worker ready';
}
