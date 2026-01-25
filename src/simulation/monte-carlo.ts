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
  calibrateRegimeModelWithMode,
  calculatePortfolioRegimeParams,
} from './regime-calibration';
import {
  initializeSBLOCState,
  stepSBLOCYear,
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
  RegimeCalibrationMode,
  RegimeParamsMap,
} from './types';
import { DEFAULT_REGIME_PARAMS } from './types';

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

  // Calibrate regime parameters if using regime method
  let assetRegimeParams: RegimeParamsMap[] | undefined;

  if (resamplingMethod === 'regime') {
    const calibrationMode = config.regimeCalibration ?? 'historical';
    console.log(`Regime calibration mode: ${calibrationMode}`);

    // Calibrate each asset's regime parameters from its historical data
    assetRegimeParams = portfolio.assets.map((asset, idx) => {
      if (asset.historicalReturns.length >= 10) {
        const params = calibrateRegimeModelWithMode(asset.historicalReturns, calibrationMode);
        console.log(`Asset ${asset.id} regime params (${calibrationMode}):`, {
          bull: { mean: (params.bull.mean * 100).toFixed(1) + '%', stddev: (params.bull.stddev * 100).toFixed(1) + '%' },
          bear: { mean: (params.bear.mean * 100).toFixed(1) + '%', stddev: (params.bear.stddev * 100).toFixed(1) + '%' },
          crash: { mean: (params.crash.mean * 100).toFixed(1) + '%', stddev: (params.crash.stddev * 100).toFixed(1) + '%' },
        });
        return params;
      }
      console.log(`Asset ${asset.id}: Using default params (insufficient data)`);
      return DEFAULT_REGIME_PARAMS;
    });
  }

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
        blockSize,
        config.regimeCalibration,
        assetRegimeParams
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
          // Note: We compute effectiveWithdrawal externally (using sblocRaiseRate growth)
          // rather than using the SBLOC engine's withdrawalGrowthRate. This keeps the
          // engine stateless - it just uses the withdrawal amount we pass each year.
          // The SBLOCConfig.withdrawalGrowthRate field exists for standalone engine use.
          //
          // yearsOfWithdrawals = how many years of withdrawals have occurred (0-indexed)
          // Year 0: baseWithdrawal * (1+r)^0 = baseWithdrawal
          // Year 1: baseWithdrawal * (1+r)^1 = baseWithdrawal * (1+r)
          const yearsOfWithdrawals = Math.max(0, year - sblocWithdrawalStartYear);
          const effectiveWithdrawal = year >= sblocWithdrawalStartYear
            ? sblocBaseWithdrawal * Math.pow(1 + sblocRaiseRate, yearsOfWithdrawals)
            : 0;

          // Shared SBLOC engine config for this year
          // Note: compoundingFrequency is 'annual' here; stepSBLOCYear adjusts to 'monthly'
          // internally when config.sbloc.monthlyWithdrawal is true
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
          // Note: portfolioReturn is the annual return. The SBLOC engine applies this
          // return to its internal portfolio tracking (independent of MC's portfolioValue).
          // After the SBLOC step, we sync MC's portfolioValue to match the SBLOC state.
          // stepSBLOCYear handles monthly vs annual mode internally based on monthlyWithdrawal flag
          const yearResult = stepSBLOCYear(
            prevState,
            sblocConfig,
            portfolioReturn,
            year,
            config.sbloc.monthlyWithdrawal ?? false
          );
          sblocStates[i].push(yearResult.newState);

          // Track first margin call year
          if (yearResult.marginCallTriggered && marginCallYears[i] === -1) {
            marginCallYears[i] = year + 1;
          }

          // Sync portfolio value with SBLOC engine's tracked value
          // This accounts for any forced liquidations that reduced the portfolio
          // Note: We sync to the SBLOC state's portfolioValue, NOT set to 0 on failure
          // portfolioFailed means net worth (portfolio - loan) <= 0, but the portfolio
          // still has value - it's just less than the loan balance
          portfolioValue = yearResult.newState.portfolioValue;
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

  // Report entering post-processing phase
  if (onProgress) {
    onProgress(100); // Ensure 100% is shown before post-processing
  }

  // Yield to allow progress update to render
  await new Promise(resolve => setTimeout(resolve, 0));

  // Calculate statistics
  const terminalArray = Array.from(terminalValues);

  // Diagnostic logging for CAGR debugging
  const negativeCount = terminalArray.filter(v => v < 0).length;
  const zeroCount = terminalArray.filter(v => v === 0).length;
  const minTerminal = Math.min(...terminalArray);
  const maxTerminal = Math.max(...terminalArray);
  console.log(`[MC Debug] Terminal values: min=${minTerminal.toFixed(0)}, max=${maxTerminal.toFixed(0)}, negative=${negativeCount}, zero=${zeroCount}, total=${iterations}`);
  if (negativeCount > 0) {
    console.warn(`[MC Debug] WARNING: ${negativeCount} negative terminal values found!`);
    const negatives = terminalArray.filter(v => v < 0).slice(0, 5);
    console.warn(`[MC Debug] Sample negative values:`, negatives);
  }

  const statistics = calculateStatistics(terminalArray, initialValue);
  console.log(`[MC Debug] Statistics: median=${statistics.median.toFixed(0)}, mean=${statistics.mean.toFixed(0)}, successRate=${statistics.successRate.toFixed(1)}%`);

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
        p10: loanBalancesByYear.map(yv => percentile(yv, 10)),
        p25: loanBalancesByYear.map(yv => percentile(yv, 25)),
        p50: loanBalancesByYear.map(yv => percentile(yv, 50)),
        p75: loanBalancesByYear.map(yv => percentile(yv, 75)),
        p90: loanBalancesByYear.map(yv => percentile(yv, 90)),
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
          const medianLoan = percentile(yv, 50);
          return Math.max(0, medianLoan - cumWithdrawal);
        }),
      },
    };

    // Compute margin call statistics
    marginCallStats = computeMarginCallStats(marginCallYears, timeHorizon, iterations);

    // Compute estate analysis (median case)
    const finalStates = sblocStates.map(iterStates => iterStates[timeHorizon - 1]);
    const medianLoan = percentile(finalStates.map(s => s?.loanBalance ?? 0), 50);
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
  blockSize?: number,
  regimeCalibration?: RegimeCalibrationMode,
  assetRegimeParams?: RegimeParamsMap[]
): number[][] {
  const numAssets = portfolio.assets.length;

  if (method === 'regime') {
    // Use regime-switching with correlation and calibrated params
    const { returns } = generateCorrelatedRegimeReturns(
      years,
      numAssets,
      portfolio.correlationMatrix,
      rng,
      'bull', // initialRegime
      undefined, // matrix (use default)
      undefined, // shared params (not used when assetRegimeParams provided)
      assetRegimeParams
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
  const successCount = values.filter(v => v > initialValue).length;

  return {
    mean: mean(values),
    median: percentile(values, 50),
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
    p10: percentile(values, 10),
    p25: percentile(values, 25),
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p90: percentile(values, 90),
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
      // Year 0 of withdrawals: baseWithdrawal * (1+r)^0 = baseWithdrawal
      // Year 1 of withdrawals: baseWithdrawal * (1+r)^1 = baseWithdrawal * (1+r)
      // etc.
      const withdrawal = baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals);
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
      // Year 0 of withdrawals: baseWithdrawal * (1+r)^0 = baseWithdrawal
      // Year 1 of withdrawals: baseWithdrawal * (1+r)^1 = baseWithdrawal * (1+r)
      // etc.
      const withdrawal = baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals);
      cumulative += withdrawal;
    }
  }

  return cumulative;
}
