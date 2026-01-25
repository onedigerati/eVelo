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
import {
  simpleBootstrap,
  blockBootstrap,
  correlatedBootstrap,
  correlatedBlockBootstrap,
} from './bootstrap';
import { generateCorrelatedRegimeReturns } from './regime-switching';
import {
  calibrateRegimeModelWithValidation,
  calculatePortfolioRegimeParams,
  type CalibratedRegimeResult,
} from './regime-calibration';
import { generateCorrelatedFatTailReturns } from './fat-tail';
import type { AssetClass } from './types';
import {
  initializeSBLOCState,
  stepSBLOCYear,
  type SBLOCConfig as SBLOCEngineConfig,
  type SBLOCState,
} from '../sbloc';
import {
  calculateSellStrategyFromReturns,
  type SellStrategyFromReturnsConfig,
  type SellIterationResult,
} from '../calculations/sell-strategy';
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
  SellStrategyOutput,
} from './types';
import {
  DEFAULT_REGIME_PARAMS,
  FAT_TAIL_PARAMS,
  CONSERVATIVE_TRANSITION_MATRIX,
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

  // Calibrate regime parameters if using regime method
  let assetRegimeParams: RegimeParamsMap[] | undefined;
  let assetCalibrationResults: CalibratedRegimeResult[] | undefined;

  if (resamplingMethod === 'regime') {
    const calibrationMode = config.regimeCalibration ?? 'historical';
    console.log(`Regime calibration mode: ${calibrationMode}`);

    // Calibrate each asset's regime parameters from its historical data (with validation)
    assetCalibrationResults = portfolio.assets.map((asset) => {
      if (asset.historicalReturns.length >= 10) {
        const result = calibrateRegimeModelWithValidation(
          asset.historicalReturns,
          calibrationMode,
          asset.id
        );
        const status = result.validation.usedFallback ? '⚠️ FALLBACK' : '✓';
        console.log(`Asset ${asset.id} regime params (${calibrationMode}) ${status}:`, {
          bull: { mean: (result.params.bull.mean * 100).toFixed(1) + '%', stddev: (result.params.bull.stddev * 100).toFixed(1) + '%' },
          bear: { mean: (result.params.bear.mean * 100).toFixed(1) + '%', stddev: (result.params.bear.stddev * 100).toFixed(1) + '%' },
          crash: { mean: (result.params.crash.mean * 100).toFixed(1) + '%', stddev: (result.params.crash.stddev * 100).toFixed(1) + '%' },
        });
        if (result.validation.issues.length > 0) {
          console.log(`  Issues:`, result.validation.issues.map(i => `[${i.severity}] ${i.message}`));
        }
        return result;
      }
      console.log(`Asset ${asset.id}: Using default params (insufficient data)`);
      return {
        params: DEFAULT_REGIME_PARAMS,
        validation: { isValid: true, issues: [], usedFallback: true },
      } as CalibratedRegimeResult;
    });

    assetRegimeParams = assetCalibrationResults.map(r => r.params);
  }

  // Track SBLOC state per iteration per year (only if sbloc config provided)
  let sblocStates: SBLOCState[][] | null = null;
  let marginCallYears: number[] | null = null; // First margin call year per iteration (-1 if none)
  let marginCallCounts: number[] | null = null; // Total margin calls per iteration
  let totalHaircutLosses: number[] | null = null; // Total haircut losses per iteration
  let totalInterestCharged: number[] | null = null; // Total interest charged per iteration
  let totalDividendTaxesBorrowed: number[] | null = null; // Total dividend taxes borrowed per iteration

  // SBLOC configuration values (extracted for use in year loop)
  const sblocBaseWithdrawal = config.sbloc?.annualWithdrawal ?? 0;
  const sblocRaiseRate = config.sbloc?.annualWithdrawalRaise ?? 0;
  const sblocWithdrawalStartYear = config.timeline?.withdrawalStartYear ?? 0;

  // Track portfolio returns for diagnostics
  let iterationReturns: number[] | null = null; // Cumulative return per iteration
  let firstFailureYear: number[] | null = null; // Year when portfolio first failed (-1 if never)

  // Track sell strategy results per iteration (only if sellStrategy config provided)
  let sellIterationResults: SellIterationResult[] | null = null;
  let sellYearlyValues: number[][] | null = null; // [iteration][year]

  if (config.sbloc) {
    sblocStates = Array.from({ length: iterations }, () => []);
    marginCallYears = new Array(iterations).fill(-1);
    marginCallCounts = new Array(iterations).fill(0);
    totalHaircutLosses = new Array(iterations).fill(0);
    totalInterestCharged = new Array(iterations).fill(0);
    totalDividendTaxesBorrowed = new Array(iterations).fill(0);
    iterationReturns = new Array(iterations).fill(0);
    firstFailureYear = new Array(iterations).fill(-1);

    // Log dividend tax configuration
    const dividendTaxEnabled = config.taxModeling?.enabled && !config.taxModeling?.taxAdvantaged;
    if (dividendTaxEnabled) {
      const divYield = (config.taxModeling!.dividendYield * 100).toFixed(2);
      const divTaxRate = (config.taxModeling!.ordinaryTaxRate * 100).toFixed(1);
      console.log(`[MC] BBD dividend tax borrowing enabled: ${divYield}% yield × ${divTaxRate}% tax rate`);
      console.log(`[MC] BBD borrows to pay dividend taxes (portfolio stays whole)`);
      console.log(`[MC] Sell strategy liquidates to pay same taxes (reduces compound growth)`);
    } else {
      console.log(`[MC] Dividend tax modeling disabled (tax-advantaged account or taxes disabled)`);
    }
  }

  if (config.sellStrategy) {
    sellIterationResults = [];
    sellYearlyValues = Array.from({ length: iterations }, () => []);
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
      let cumulativeReturn = 1; // Track cumulative return for this iteration

      // Track portfolio returns for sell strategy (one per year)
      const iterationPortfolioReturns: number[] = [];

      for (let year = 0; year < timeHorizon; year++) {
        // Calculate weighted portfolio return
        let portfolioReturn = 0;
        for (let a = 0; a < numAssets; a++) {
          portfolioReturn += weights[a] * assetReturns[a][year];
        }

        // Store portfolio return for sell strategy
        iterationPortfolioReturns.push(portfolioReturn);

        // Track cumulative return
        cumulativeReturn *= (1 + portfolioReturn);

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
          //
          // Dividend tax handling:
          // If tax modeling is enabled and account is taxable, BBD borrows via SBLOC to pay
          // dividend taxes. This preserves compound growth on the full portfolio value.
          // Sell strategy must liquidate to pay the same taxes (reduces compound growth).
          const dividendYield = config.taxModeling?.enabled && !config.taxModeling?.taxAdvantaged
            ? (config.taxModeling.dividendYield ?? 0)
            : 0;
          const dividendTaxRate = config.taxModeling?.enabled && !config.taxModeling?.taxAdvantaged
            ? (config.taxModeling.ordinaryTaxRate ?? 0)
            : 0;

          const sblocConfig: SBLOCEngineConfig = {
            annualInterestRate: config.sbloc.interestRate,
            maxLTV: config.sbloc.targetLTV, // Margin call triggers when LTV exceeds target (e.g., 65%)
            maintenanceMargin: config.sbloc.maintenanceMargin,
            liquidationHaircut: config.sbloc.liquidationHaircut,
            annualWithdrawal: effectiveWithdrawal,
            compoundingFrequency: 'annual',
            startYear: sblocWithdrawalStartYear,
            dividendYield,
            dividendTaxRate,
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

          // Track margin call counts and haircut losses
          if (yearResult.marginCallTriggered && marginCallCounts) {
            marginCallCounts[i]++;
          }
          if (yearResult.liquidationEvent && totalHaircutLosses) {
            totalHaircutLosses[i] += yearResult.liquidationEvent.haircut;
          }
          if (totalInterestCharged) {
            totalInterestCharged[i] += yearResult.interestCharged;
          }
          if (totalDividendTaxesBorrowed) {
            totalDividendTaxesBorrowed[i] += yearResult.dividendTaxBorrowed;
          }

          // Track first failure year
          if (yearResult.portfolioFailed && firstFailureYear && firstFailureYear[i] === -1) {
            firstFailureYear[i] = year + 1;
          }

          // Sync portfolio value with SBLOC engine's tracked value
          // This accounts for any forced liquidations that reduced the portfolio
          // Note: We sync to the SBLOC state's portfolioValue, NOT set to 0 on failure
          // portfolioFailed means net worth (portfolio - loan) <= 0, but the portfolio
          // still has value - it's just less than the loan balance
          portfolioValue = yearResult.newState.portfolioValue;
        }

        // Store yearly value
        // For SBLOC simulations, store NET WORTH (portfolio - loan) instead of gross portfolio
        if (config.sbloc && sblocStates) {
          const currentState = sblocStates[i][year];
          const loanBalance = currentState?.loanBalance ?? 0;
          yearlyValues[year][i] = portfolioValue - loanBalance;
        } else {
          yearlyValues[year][i] = portfolioValue;
        }
      }

      // Run sell strategy for this iteration (if enabled)
      if (config.sellStrategy && sellIterationResults && sellYearlyValues) {
        const sellConfig: SellStrategyFromReturnsConfig = {
          initialValue,
          annualWithdrawal: sblocBaseWithdrawal,
          withdrawalGrowth: sblocRaiseRate,
          timeHorizon,
          costBasisRatio: config.sellStrategy.costBasisRatio,
          dividendYield: config.sellStrategy.dividendYield,
          // capitalGainsRate and dividendTaxRate use defaults from DEFAULT_SELL_CONFIG
        };

        const sellResult = calculateSellStrategyFromReturns(
          sellConfig,
          iterationPortfolioReturns
        );

        sellIterationResults.push(sellResult);
        sellYearlyValues[i] = sellResult.yearlyValues;
      }

      // Store terminal value
      terminalValues[i] = portfolioValue;

      // Store cumulative return for diagnostics
      if (iterationReturns) {
        iterationReturns[i] = cumulativeReturn - 1; // Convert to percentage (e.g., 1.5 -> 0.5 = 50%)
      }
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

  // ============================================================================
  // CRITICAL FIX: Convert terminal portfolio values to NET WORTH for BBD strategy
  // ============================================================================
  // For BBD strategy with SBLOC, terminalValues currently contains GROSS portfolio values.
  // All metrics (CAGR, median, success rate, histogram) should use NET WORTH (portfolio - loan).
  //
  // Why this matters:
  // - A portfolio can have $500K value with $600K loan = -$100K net worth (failed)
  // - Using gross value shows $500K which is misleading
  // - CAGR calculated from gross value is meaningless
  // - Success rate should compare net worth growth, not gross portfolio
  //
  // For non-SBLOC simulations, loan is $0 so net worth = portfolio value (no change).
  // ============================================================================

  if (config.sbloc && sblocStates) {
    // Replace terminalValues with terminal NET WORTH for each iteration
    for (let i = 0; i < iterations; i++) {
      const finalState = sblocStates[i][timeHorizon - 1];
      const loanBalance = finalState?.loanBalance ?? 0;
      const portfolioValue = terminalValues[i];
      const netWorth = portfolioValue - loanBalance;
      terminalValues[i] = netWorth;
    }

    console.log('[MC Debug] BBD Strategy: Converted terminalValues to NET WORTH (portfolio - loan)');
  } else {
    console.log('[MC Debug] No SBLOC: terminalValues already correct (portfolio values, no loan)');
  }

  // Calculate statistics from terminal net worth
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

  // Additional SBLOC diagnostics
  if (config.sbloc && marginCallCounts && totalHaircutLosses && totalInterestCharged) {
    const mcCounts = marginCallCounts;
    const noMarginCalls = mcCounts.filter(c => c === 0).length;
    const oneMarginCall = mcCounts.filter(c => c === 1).length;
    const twoMarginCalls = mcCounts.filter(c => c === 2).length;
    const threeOrMore = mcCounts.filter(c => c >= 3).length;
    const maxMarginCalls = Math.max(...mcCounts);

    const medianHaircut = percentile(totalHaircutLosses, 50);
    const meanHaircut = mean(totalHaircutLosses);
    const maxHaircut = Math.max(...totalHaircutLosses);

    const medianInterest = percentile(totalInterestCharged, 50);
    const meanInterest = mean(totalInterestCharged);

    // Track final gross portfolio values
    const finalGrossPortfolios = sblocStates!.map(states => states[timeHorizon - 1]?.portfolioValue ?? 0);
    const medianGrossPortfolio = percentile(finalGrossPortfolios, 50);
    const meanGrossPortfolio = mean(finalGrossPortfolios);

    console.log(`[MC Debug] ═══════════════════════════════════════════════════`);
    console.log(`[MC Debug] SBLOC DIAGNOSTIC SUMMARY`);
    console.log(`[MC Debug] ═══════════════════════════════════════════════════`);
    console.log(`[MC Debug] Margin Call Distribution:`);
    console.log(`[MC Debug]   0 margin calls: ${noMarginCalls} (${(noMarginCalls/iterations*100).toFixed(1)}%)`);
    console.log(`[MC Debug]   1 margin call:  ${oneMarginCall} (${(oneMarginCall/iterations*100).toFixed(1)}%)`);
    console.log(`[MC Debug]   2 margin calls: ${twoMarginCalls} (${(twoMarginCalls/iterations*100).toFixed(1)}%)`);
    console.log(`[MC Debug]   3+ margin calls: ${threeOrMore} (${(threeOrMore/iterations*100).toFixed(1)}%)`);
    console.log(`[MC Debug]   Max margin calls in any iteration: ${maxMarginCalls}`);
    console.log(`[MC Debug] Haircut Losses (from forced liquidations):`);
    console.log(`[MC Debug]   Median: $${medianHaircut.toFixed(0)}`);
    console.log(`[MC Debug]   Mean: $${meanHaircut.toFixed(0)}`);
    console.log(`[MC Debug]   Max: $${maxHaircut.toFixed(0)}`);
    console.log(`[MC Debug] Interest Charged:`);
    console.log(`[MC Debug]   Median: $${medianInterest.toFixed(0)}`);
    console.log(`[MC Debug]   Mean: $${meanInterest.toFixed(0)}`);
    console.log(`[MC Debug] Final Gross Portfolio:`);
    console.log(`[MC Debug]   Median: $${medianGrossPortfolio.toFixed(0)}`);
    console.log(`[MC Debug]   Mean: $${meanGrossPortfolio.toFixed(0)}`);
    console.log(`[MC Debug] ═══════════════════════════════════════════════════`);
  }

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
    // IMPORTANT: statistics.median is now NET WORTH (already has loan subtracted)
    const medianNetWorth = statistics.median;
    const bbdNetEstate = medianNetWorth;

    // Estimate taxes if sold (simplified: assume all gains above initial, 23.8% tax rate)
    // For sell strategy, we need to calculate gross portfolio value to estimate embedded gains
    // Median gross portfolio = median net worth + median loan
    const medianGrossPortfolio = medianNetWorth + medianLoan;
    const embeddedGains = Math.max(0, medianGrossPortfolio - initialValue);
    const taxesIfSold = embeddedGains * 0.238;
    const sellNetEstate = medianGrossPortfolio - taxesIfSold;

    estateAnalysis = {
      bbdNetEstate,
      sellNetEstate,
      bbdAdvantage: bbdNetEstate - sellNetEstate,
    };
  }

  // Build debug stats if SBLOC is enabled
  let debugStats: SimulationOutput['debugStats'];
  if (config.sbloc && marginCallCounts && totalHaircutLosses && totalInterestCharged && totalDividendTaxesBorrowed && sblocStates && iterationReturns && firstFailureYear) {
    const mcCounts = marginCallCounts;
    const finalGrossPortfolios = sblocStates.map(states => states[timeHorizon - 1]?.portfolioValue ?? 0);

    // Analyze failure patterns
    const failedIterations = firstFailureYear.filter(y => y > 0);
    const successfulIterations = firstFailureYear.filter(y => y === -1);

    // Get returns for successful vs failed iterations
    const successfulReturns = iterationReturns.filter((_, i) => firstFailureYear[i] === -1);
    const failedReturns = iterationReturns.filter((_, i) => firstFailureYear[i] > 0);

    debugStats = {
      marginCallDistribution: {
        noMarginCalls: mcCounts.filter(c => c === 0).length,
        oneMarginCall: mcCounts.filter(c => c === 1).length,
        twoMarginCalls: mcCounts.filter(c => c === 2).length,
        threeOrMore: mcCounts.filter(c => c >= 3).length,
        maxMarginCalls: Math.max(...mcCounts),
      },
      haircutLosses: {
        median: percentile(totalHaircutLosses, 50),
        mean: mean(totalHaircutLosses),
        max: Math.max(...totalHaircutLosses),
      },
      interestCharged: {
        median: percentile(totalInterestCharged, 50),
        mean: mean(totalInterestCharged),
      },
      dividendTaxesBorrowed: {
        median: percentile(totalDividendTaxesBorrowed, 50),
        mean: mean(totalDividendTaxesBorrowed),
        max: Math.max(...totalDividendTaxesBorrowed),
      },
      finalGrossPortfolio: {
        median: percentile(finalGrossPortfolios, 50),
        mean: mean(finalGrossPortfolios),
      },
      // New diagnostics
      portfolioReturns: {
        median: percentile(iterationReturns, 50),
        mean: mean(iterationReturns),
        p10: percentile(iterationReturns, 10),
        p90: percentile(iterationReturns, 90),
      },
      failureAnalysis: {
        totalFailed: failedIterations.length,
        totalSucceeded: successfulIterations.length,
        medianFailureYear: failedIterations.length > 0 ? percentile(failedIterations, 50) : 0,
        avgFailureYear: failedIterations.length > 0 ? mean(failedIterations) : 0,
        successfulAvgReturn: successfulReturns.length > 0 ? mean(successfulReturns) : 0,
        failedAvgReturn: failedReturns.length > 0 ? mean(failedReturns) : 0,
      },
      // Regime parameters used (if regime method)
      regimeParameters: assetCalibrationResults ? portfolio.assets.map((asset, i) => ({
        assetId: asset.id,
        bull: assetCalibrationResults[i].params.bull,
        bear: assetCalibrationResults[i].params.bear,
        crash: assetCalibrationResults[i].params.crash,
        recovery: assetCalibrationResults[i].params.recovery,
        usedFallback: assetCalibrationResults[i].validation.usedFallback,
        validationIssues: assetCalibrationResults[i].validation.issues.map(iss => iss.message),
      })) : undefined,
      calibrationMode: resamplingMethod === 'regime' ? (config.regimeCalibration ?? 'historical') : undefined,
      // Fat-tail parameters used (if fat-tail method)
      fatTailParameters: resamplingMethod === 'fat-tail' ? portfolio.assets.map(asset => {
        const assetClass = asset.assetClass ?? 'equity_index';
        const params = FAT_TAIL_PARAMS[assetClass];
        return {
          assetId: asset.id,
          assetClass,
          degreesOfFreedom: params.degreesOfFreedom,
          skewMultiplier: params.skewMultiplier,
          survivorshipBias: params.survivorshipBias,
          volatilityScaling: params.volatilityScaling,
        };
      }) : undefined,
    };
  } else if (resamplingMethod === 'fat-tail') {
    // Build minimal debug stats for fat-tail method (without SBLOC)
    debugStats = {
      marginCallDistribution: {
        noMarginCalls: 0,
        oneMarginCall: 0,
        twoMarginCalls: 0,
        threeOrMore: 0,
        maxMarginCalls: 0,
      },
      haircutLosses: {
        median: 0,
        mean: 0,
        max: 0,
      },
      interestCharged: {
        median: 0,
        mean: 0,
      },
      dividendTaxesBorrowed: {
        median: 0,
        mean: 0,
        max: 0,
      },
      finalGrossPortfolio: {
        median: 0,
        mean: 0,
      },
      // Fat-tail parameters
      fatTailParameters: portfolio.assets.map(asset => {
        const assetClass = asset.assetClass ?? 'equity_index';
        const params = FAT_TAIL_PARAMS[assetClass];
        return {
          assetId: asset.id,
          assetClass,
          degreesOfFreedom: params.degreesOfFreedom,
          skewMultiplier: params.skewMultiplier,
          survivorshipBias: params.survivorshipBias,
          volatilityScaling: params.volatilityScaling,
        };
      }),
    };
  }

  // Compute sell strategy statistics (if enabled)
  let sellStrategyOutput: SellStrategyOutput | undefined;
  if (config.sellStrategy && sellIterationResults && sellYearlyValues) {
    console.log('[MC Debug] Computing sell strategy statistics from', sellIterationResults.length, 'iterations');

    // Extract terminal values
    const sellTerminalValues = sellIterationResults.map(r => r.terminalValue);

    // Calculate success rate (terminal > initial)
    const sellSuccessCount = sellTerminalValues.filter(v => v > initialValue).length;
    const sellSuccessRate = (sellSuccessCount / iterations) * 100;

    // Calculate depletion probability
    const sellDepletedCount = sellIterationResults.filter(r => r.depleted).length;
    const sellDepletionProbability = (sellDepletedCount / iterations) * 100;

    // Calculate percentiles
    const sellPercentiles = {
      p10: percentile(sellTerminalValues, 10),
      p25: percentile(sellTerminalValues, 25),
      p50: percentile(sellTerminalValues, 50),
      p75: percentile(sellTerminalValues, 75),
      p90: percentile(sellTerminalValues, 90),
    };

    // Calculate tax metrics
    const capitalGainsTaxes = sellIterationResults.map(r => r.totalCapitalGainsTaxes);
    const dividendTaxes = sellIterationResults.map(r => r.totalDividendTaxes);
    const totalTaxes = sellIterationResults.map(r => r.totalCapitalGainsTaxes + r.totalDividendTaxes);

    const sellTaxes = {
      medianCapitalGains: percentile(capitalGainsTaxes, 50),
      medianDividend: percentile(dividendTaxes, 50),
      medianTotal: percentile(totalTaxes, 50),
    };

    // Calculate yearly percentiles across all iterations
    const sellYearlyPercentiles: YearlyPercentiles[] = [];
    for (let year = 0; year <= timeHorizon; year++) {
      const yearValues = sellYearlyValues
        .map(iterYearly => iterYearly[year])
        .filter(v => v !== undefined);

      sellYearlyPercentiles.push({
        year,
        p10: percentile(yearValues, 10),
        p25: percentile(yearValues, 25),
        p50: percentile(yearValues, 50),
        p75: percentile(yearValues, 75),
        p90: percentile(yearValues, 90),
      });
    }

    sellStrategyOutput = {
      terminalValues: sellTerminalValues,
      successRate: sellSuccessRate,
      percentiles: sellPercentiles,
      taxes: sellTaxes,
      depletionProbability: sellDepletionProbability,
      yearlyPercentiles: sellYearlyPercentiles,
    };

    console.log('[MC Debug] Sell strategy results:', {
      successRate: sellSuccessRate.toFixed(1) + '%',
      depletionProbability: sellDepletionProbability.toFixed(1) + '%',
      medianTerminal: sellPercentiles.p50.toFixed(0),
      medianTaxes: sellTaxes.medianTotal.toFixed(0),
    });
  }

  return {
    terminalValues,
    yearlyPercentiles,
    statistics,
    sblocTrajectory,
    marginCallStats,
    estateAnalysis,
    debugStats,
    sellStrategy: sellStrategyOutput,
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
    const calibrationMode = regimeCalibration ?? 'historical';

    // Log survivorship bias application and transition matrix selection
    const bias = calibrationMode === 'conservative' ? '2.0%' : '1.5%';
    const matrixType = calibrationMode === 'conservative' ? 'conservative' : 'historical';
    console.log(`[Regime] Applying ${bias} survivorship bias adjustment (${calibrationMode} mode)`);
    console.log(`[Regime] Using ${matrixType} transition matrix`);

    // Use conservative transition matrix when in conservative mode
    const transitionMatrix = calibrationMode === 'conservative'
      ? CONSERVATIVE_TRANSITION_MATRIX
      : undefined; // undefined means use default (historical) matrix

    const { returns } = generateCorrelatedRegimeReturns(
      years,
      numAssets,
      portfolio.correlationMatrix,
      rng,
      'bull', // initialRegime
      transitionMatrix,
      undefined, // shared params (not used when assetRegimeParams provided)
      assetRegimeParams,
      calibrationMode
    );
    return returns;
  }

  if (method === 'fat-tail') {
    // Use fat-tail model with Student's t-distribution
    const allHistoricalReturns = portfolio.assets.map(asset => asset.historicalReturns);
    const assetClasses = portfolio.assets.map(asset => asset.assetClass ?? 'equity_index');

    console.log('[MC Debug] Fat-tail model selected');
    console.log('[MC Debug] Asset classes:', assetClasses);

    // Generate returns for all years
    const returns: number[][] = Array(numAssets).fill(0).map(() => []);

    for (let year = 0; year < years; year++) {
      const yearReturns = generateCorrelatedFatTailReturns(
        allHistoricalReturns,
        assetClasses,
        portfolio.correlationMatrix
      );

      // Assign year returns to each asset
      for (let asset = 0; asset < numAssets; asset++) {
        returns[asset].push(yearReturns[asset]);
      }
    }

    return returns;
  }

  // Bootstrap methods - use correlated sampling to preserve cross-asset correlation
  // Gather all historical returns for correlated sampling
  const allHistoricalReturns = portfolio.assets.map(asset => asset.historicalReturns);

  if (method === 'block') {
    // Use correlated block bootstrap: same blocks for all assets
    return correlatedBlockBootstrap(allHistoricalReturns, years, rng, blockSize);
  } else {
    // 'simple' bootstrap: use correlated sampling (same year index for all assets)
    // This preserves the natural correlation structure in historical data
    return correlatedBootstrap(allHistoricalReturns, years, rng);
  }
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
