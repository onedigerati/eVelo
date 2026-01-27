/**
 * Worker Loader
 *
 * Handles conditional worker loading for both build modes:
 * - PWA build: Uses Comlink worker via vite-plugin-comlink
 * - Portable build: Uses inline worker with Comlink.wrap
 */

import * as Comlink from 'comlink';
import type { SimulationConfig, PortfolioConfig, SimulationOutput } from './types';

// Type for the worker API
interface SimulationWorkerAPI {
  simulate(
    config: SimulationConfig,
    portfolio: PortfolioConfig,
    onProgress?: (percent: number) => void
  ): Promise<SimulationOutput>;
  cancel(): void;
  healthCheck(): string;
}

let worker: Comlink.Remote<SimulationWorkerAPI> | null = null;

export async function getWorker(): Promise<Comlink.Remote<SimulationWorkerAPI>> {
  if (worker) return worker;

  if (typeof __PORTABLE_BUILD__ !== 'undefined' && __PORTABLE_BUILD__) {
    // Portable build: use inline worker
    const InlineWorker = await import('./simulation.worker?worker&inline');
    const rawWorker = new InlineWorker.default();
    worker = Comlink.wrap<SimulationWorkerAPI>(rawWorker);
  } else {
    // PWA build: use Comlink worker
    worker = new ComlinkWorker<typeof import('./simulation.worker')>(
      new URL('./simulation.worker', import.meta.url),
      { type: 'module' }
    );
  }

  return worker;
}

export function clearWorker(): void {
  worker = null;
}
