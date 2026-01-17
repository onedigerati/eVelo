/**
 * Simulation module
 *
 * Provides Monte Carlo simulation with Web Worker support:
 * - Non-blocking execution via Web Worker
 * - Progress reporting during simulation
 * - Cancellation support
 * - Zero-copy result transfer
 */

import * as Comlink from 'comlink';
import type { SimulationConfig, PortfolioConfig, SimulationOutput } from './types';

// Re-export all types
export * from './types';

// Re-export bootstrap and regime functions for direct use if needed
export { simpleBootstrap, blockBootstrap, optimalBlockLength } from './bootstrap';
export {
  nextRegime,
  generateRegimeReturns,
  generateCorrelatedRegimeReturns
} from './regime-switching';

/**
 * Lazy-initialized worker instance
 * Created on first simulation call
 */
let worker: Comlink.Remote<typeof import('./simulation.worker')> | null = null;

/**
 * Get or create the simulation worker
 */
function getWorker(): Comlink.Remote<typeof import('./simulation.worker')> {
  if (!worker) {
    worker = new ComlinkWorker<typeof import('./simulation.worker')>(
      new URL('./simulation.worker', import.meta.url),
      { type: 'module' }
    );
  }
  return worker;
}

/**
 * Run Monte Carlo simulation
 *
 * Executes simulation in Web Worker to prevent UI blocking.
 * Progress updates are delivered via callback.
 *
 * @param config Simulation configuration
 * @param portfolio Portfolio with assets and correlations
 * @param onProgress Optional progress callback (0-100 percent)
 * @returns Promise resolving to simulation results
 * @throws DOMException with name 'AbortError' if cancelled
 *
 * @example
 * ```typescript
 * const result = await runSimulation(
 *   { iterations: 10000, timeHorizon: 30, ... },
 *   { assets: [...], correlationMatrix: [...] },
 *   (percent) => console.log(`${percent}% complete`)
 * );
 * console.log('Median terminal value:', result.statistics.median);
 * ```
 */
export async function runSimulation(
  config: SimulationConfig,
  portfolio: PortfolioConfig,
  onProgress?: (percent: number) => void
): Promise<SimulationOutput> {
  const w = getWorker();

  // Verify worker is ready
  await w.healthCheck();

  // Wrap progress callback with Comlink.proxy for cross-thread calls
  const proxyProgress = onProgress ? Comlink.proxy(onProgress) : undefined;

  return w.simulate(config, portfolio, proxyProgress);
}

/**
 * Cancel in-progress simulation
 *
 * Signals the worker to abort the current simulation.
 * The runSimulation promise will reject with AbortError.
 */
export function cancelSimulation(): void {
  const w = getWorker();
  w.cancel();
}

/**
 * Terminate the simulation worker
 *
 * Call when cleaning up or when worker is no longer needed.
 * Next simulation will create a fresh worker.
 */
export function terminateWorker(): void {
  if (worker) {
    // Workers have terminate method, but Comlink remote doesn't expose it
    // Just null out the reference; browser will GC when no references remain
    worker = null;
  }
}
