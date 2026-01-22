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
import {
  initializeSBLOCState,
  stepSBLOC,
  type SBLOCConfig as SBLOCEngineConfig,
  type SBLOCState,
} from '../sbloc';
import type {
  SimulationConfig,
  PortfolioConfig,
  SimulationOutput,
  YearlyPercentiles,
  SimulationStatistics,
  SBLOCTrajectory,
  MarginCallStats,
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

  // Track SBLOC state per iteration per year (only if sbloc config provided)
  let sblocStates: SBLOCState[][] | null = null;
  let marginCallYears: number[] | null = null; // First margin call year per iteration (-1 if none)

  // SBLOC configuration values (extracted for use in year loop)
  const sblocBaseWithdrawal = config.sbloc?.annualWithdrawal ?? 0;
  const sblocRaiseRate = config.sbloc?.annualWithdrawalRaise ?? 0;
  const sblocWithdrawalStartYear = config.timeline?.withdrawalStartYear ?? 0;

  if (config.sbloc) {
    sblocStates = Array.from({ length: iterations }, () => []);
    marginCallYears = new Array(iterations).fill(-1);
  }

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

        // SBLOC simulation step (if enabled)
        if (config.sbloc && sblocStates && marginCallYears) {
          // Calculate effective withdrawal for this year (with annual raises)
          // yearsOfWithdrawals = how many years of withdrawals have occurred
          const yearsOfWithdrawals = Math.max(0, year - sblocWithdrawalStartYear);
          const effectiveWithdrawal = yearsOfWithdrawals > 0
            ? sblocBaseWithdrawal * Math.pow(1 + sblocRaiseRate, yearsOfWithdrawals - 1)
            : sblocBaseWithdrawal;

          // Shared SBLOC engine config for this year
          const sblocConfig: SBLOCEngineConfig = {
            annualInterestRate: config.sbloc.interestRate,
            maxLTV: config.sbloc.maintenanceMargin, // Use maintenance as max for margin call
            maintenanceMargin: config.sbloc.maintenanceMargin,
            liquidationHaircut: config.sbloc.liquidationHaircut,
            annualWithdrawal: effectiveWithdrawal,
            compoundingFrequency: 'annual',
            startYear: sblocWithdrawalStartYear,
          };

          // Get current SBLOC state or initialize
          const prevState = year === 0
            ? initializeSBLOCState(sblocConfig, initialValue, config.sbloc.initialLocBalance)
            : sblocStates[i][year - 1];

          // Step SBLOC forward one year
          // Note: portfolioReturn is the portfolio return this year (before being applied)
          // The SBLOC engine expects the portfolio return as a decimal
          const yearResult = stepSBLOC(prevState, sblocConfig, portfolioReturn, year);
          sblocStates[i].push(yearResult.newState);

          // Track first margin call year
          if (yearResult.marginCallTriggered && marginCallYears[i] === -1) {
            marginCallYears[i] = year + 1;
          }

          // Adjust portfolio value for forced liquidation if any
          if (yearResult.portfolioFailed) {
            portfolioValue = 0;
          }
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

  // Compute SBLOC trajectory and margin call stats (if enabled)
  let sblocTrajectory: SBLOCTrajectory | undefined;
  let marginCallStats: MarginCallStats[] | undefined;
  let estateAnalysis: SimulationOutput['estateAnalysis'] | undefined;

  if (config.sbloc && sblocStates && marginCallYears) {
    // Aggregate loan balances by year
    const loanBalancesByYear = sblocStates[0].map((_, yearIdx) =>
      sblocStates!.map(iterStates => iterStates[yearIdx]?.loanBalance ?? 0)
    );

    sblocTrajectory = {
      years: Array.from({ length: timeHorizon }, (_, i) => i + 1),
      loanBalance: {
        p10: loanBalancesByYear.map(yv => percentile(yv, 0.1)),
        p25: loanBalancesByYear.map(yv => percentile(yv, 0.25)),
        p50: loanBalancesByYear.map(yv => percentile(yv, 0.5)),
        p75: loanBalancesByYear.map(yv => percentile(yv, 0.75)),
        p90: loanBalancesByYear.map(yv => percentile(yv, 0.9)),
      },
      cumulativeWithdrawals: calculateCumulativeWithdrawals(
        timeHorizon,
        sblocBaseWithdrawal,
        sblocRaiseRate,
        sblocWithdrawalStartYear
      ),
      cumulativeInterest: {
        p50: loanBalancesByYear.map((yv, idx) => {
          const cumWithdrawal = calculateCumulativeWithdrawalAtYear(
            idx + 1,
            sblocBaseWithdrawal,
            sblocRaiseRate,
            sblocWithdrawalStartYear
          );
          const medianLoan = percentile(yv, 0.5);
          return Math.max(0, medianLoan - cumWithdrawal);
        }),
      },
    };

    // Compute margin call statistics
    marginCallStats = computeMarginCallStats(marginCallYears, timeHorizon, iterations);

    // Compute estate analysis (median case)
    const finalStates = sblocStates.map(iterStates => iterStates[timeHorizon - 1]);
    const medianLoan = percentile(finalStates.map(s => s?.loanBalance ?? 0), 0.5);
    const medianPortfolio = statistics.median;
    const bbdNetEstate = medianPortfolio - medianLoan;

    // Estimate taxes if sold (simplified: assume all gains above initial, 23.8% tax rate)
    const embeddedGains = Math.max(0, medianPortfolio - initialValue);
    const taxesIfSold = embeddedGains * 0.238;
    const sellNetEstate = medianPortfolio - taxesIfSold;

    estateAnalysis = {
      bbdNetEstate,
      sellNetEstate,
      bbdAdvantage: bbdNetEstate - sellNetEstate,
    };
  }

  return {
    terminalValues,
    yearlyPercentiles,
    statistics,
    sblocTrajectory,
    marginCallStats,
    estateAnalysis,
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

/**
 * Compute margin call statistics by year
 */
function computeMarginCallStats(
  marginCallYears: number[],
  timeHorizon: number,
  iterations: number
): MarginCallStats[] {
  const stats: MarginCallStats[] = [];

  for (let year = 1; year <= timeHorizon; year++) {
    const callsThisYear = marginCallYears.filter(y => y === year).length;
    const callsByYear = marginCallYears.filter(y => y > 0 && y <= year).length;

    stats.push({
      year,
      probability: (callsThisYear / iterations) * 100,
      cumulativeProbability: (callsByYear / iterations) * 100,
    });
  }

  return stats;
}

/**
 * Calculate cumulative withdrawals for all years, accounting for annual raises
 * and withdrawal start year
 */
function calculateCumulativeWithdrawals(
  timeHorizon: number,
  baseWithdrawal: number,
  raiseRate: number,
  startYear: number
): number[] {
  const result: number[] = [];
  let cumulative = 0;

  for (let year = 1; year <= timeHorizon; year++) {
    // year is 1-indexed, startYear is 0-indexed
    // Year 1 corresponds to simulation year 0
    const simYear = year - 1;
    if (simYear >= startYear) {
      const yearsOfWithdrawals = simYear - startYear;
      const withdrawal = yearsOfWithdrawals > 0
        ? baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals - 1)
        : baseWithdrawal;
      cumulative += withdrawal;
    }
    result.push(cumulative);
  }

  return result;
}

/**
 * Calculate cumulative withdrawal at a specific year, accounting for raises
 */
function calculateCumulativeWithdrawalAtYear(
  year: number,
  baseWithdrawal: number,
  raiseRate: number,
  startYear: number
): number {
  let cumulative = 0;

  for (let y = 1; y <= year; y++) {
    const simYear = y - 1;
    if (simYear >= startYear) {
      const yearsOfWithdrawals = simYear - startYear;
      const withdrawal = yearsOfWithdrawals > 0
        ? baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals - 1)
        : baseWithdrawal;
      cumulative += withdrawal;
    }
  }

  return cumulative;
}
