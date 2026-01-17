/**
 * Monte Carlo Core Simulation
 *
 * Executes configurable iterations of portfolio growth simulation,
 * using bootstrap or regime-switching return generation.
 *
 * Features:
 * - Batch processing with progress reporting
 * - AbortSignal support for cancellation
 * - Seeded RNG for reproducibility
 * - Inflation adjustment (real vs nominal returns)
 */

import seedrandom from 'seedrandom';
import { mean, stddev, percentile } from '../math';
import { simpleBootstrap, blockBootstrap } from './bootstrap';
import { generateCorrelatedRegimeReturns } from './regime-switching';
import type {
  SimulationConfig,
  PortfolioConfig,
  SimulationOutput,
  YearlyPercentiles,
  SimulationStatistics,
} from './types';

/** Batch size for progress reporting */
const BATCH_SIZE = 1000;

/** Default inflation rate (3%) */
const DEFAULT_INFLATION_RATE = 0.03;

/**
 * Run Monte Carlo simulation
 *
 * Executes configurable iterations of portfolio growth simulation,
 * using bootstrap or regime-switching return generation.
 *
 * @param config Simulation configuration
 * @param portfolio Portfolio with assets and correlations
 * @param onProgress Optional progress callback (percent: 0-100)
 * @param signal Optional AbortSignal for cancellation
 * @returns Simulation output with terminal values and statistics
 */
export async function runMonteCarlo(
  config: SimulationConfig,
  portfolio: PortfolioConfig,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<SimulationOutput> {
  const {
    iterations,
    timeHorizon,
    initialValue,
    inflationAdjusted,
    inflationRate = DEFAULT_INFLATION_RATE,
    resamplingMethod,
    blockSize,
    seed,
  } = config;

  // Create seeded RNG for reproducibility
  const rng = seedrandom(seed ?? Date.now().toString());

  // Terminal values array (transferred back to main thread)
  const terminalValues = new Float64Array(iterations);

  // Track yearly values for percentile calculation
  // Structure: yearlyValues[year][iteration]
  const yearlyValues: number[][] = Array.from(
    { length: timeHorizon },
    () => new Array(iterations)
  );

  const numAssets = portfolio.assets.length;
  const weights = portfolio.assets.map(a => a.weight);

  // Run iterations in batches
  for (let batch = 0; batch < iterations; batch += BATCH_SIZE) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new DOMException('Simulation cancelled', 'AbortError');
    }

    const batchEnd = Math.min(batch + BATCH_SIZE, iterations);

    for (let i = batch; i < batchEnd; i++) {
      // Generate returns for this iteration
      const assetReturns = generateIterationReturns(
        resamplingMethod,
        timeHorizon,
        portfolio,
        rng,
        blockSize
      );

      // Simulate portfolio growth
      let portfolioValue = initialValue;

      for (let year = 0; year < timeHorizon; year++) {
        // Calculate weighted portfolio return
        let portfolioReturn = 0;
        for (let a = 0; a < numAssets; a++) {
          portfolioReturn += weights[a] * assetReturns[a][year];
        }

        // Apply return to portfolio value
        portfolioValue *= (1 + portfolioReturn);

        // Apply inflation adjustment if enabled
        if (inflationAdjusted) {
          portfolioValue /= (1 + inflationRate);
        }

        // Store yearly value
        yearlyValues[year][i] = portfolioValue;
      }

      // Store terminal value
      terminalValues[i] = portfolioValue;
    }

    // Report progress
    if (onProgress) {
      onProgress((batchEnd / iterations) * 100);
    }

    // Yield to event loop between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Calculate statistics
  const terminalArray = Array.from(terminalValues);
  const statistics = calculateStatistics(terminalArray, initialValue);
  const yearlyPercentiles = calculateYearlyPercentiles(yearlyValues);

  return {
    terminalValues,
    yearlyPercentiles,
    statistics,
  };
}

/**
 * Generate returns for one simulation iteration
 */
function generateIterationReturns(
  method: SimulationConfig['resamplingMethod'],
  years: number,
  portfolio: PortfolioConfig,
  rng: () => number,
  blockSize?: number
): number[][] {
  const numAssets = portfolio.assets.length;

  if (method === 'regime') {
    // Use regime-switching with correlation
    const { returns } = generateCorrelatedRegimeReturns(
      years,
      numAssets,
      portfolio.correlationMatrix,
      rng
    );
    return returns;
  }

  // Bootstrap methods - sample each asset's historical returns
  const returns: number[][] = [];

  for (const asset of portfolio.assets) {
    const historical = asset.historicalReturns;

    if (method === 'block') {
      returns.push(blockBootstrap(historical, years, rng, blockSize));
    } else {
      // 'simple' bootstrap
      returns.push(simpleBootstrap(historical, years, rng));
    }
  }

  // Note: For bootstrap, we resample actual historical data which already
  // embeds historical correlation. For more precise correlation control,
  // would need to decorrelate/recorrelate. Keeping simple for now.

  return returns;
}

/**
 * Calculate summary statistics from terminal values
 */
function calculateStatistics(
  values: number[],
  initialValue: number
): SimulationStatistics {
  const successCount = values.filter(v => v >= initialValue).length;

  return {
    mean: mean(values),
    median: percentile(values, 0.5),
    stddev: stddev(values),
    successRate: (successCount / values.length) * 100,
  };
}

/**
 * Calculate percentiles for each year
 */
function calculateYearlyPercentiles(
  yearlyValues: number[][]
): YearlyPercentiles[] {
  return yearlyValues.map((values, year) => ({
    year: year + 1,
    p10: percentile(values, 0.1),
    p25: percentile(values, 0.25),
    p50: percentile(values, 0.5),
    p75: percentile(values, 0.75),
    p90: percentile(values, 0.9),
  }));
}
