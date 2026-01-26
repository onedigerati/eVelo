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
// Note: regime-calibration module is no longer used for main simulation
// The multiplier-based approach from REGIME_CONFIG is used instead
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
  AssetHistoricalStats,
} from './types';
import {
  DEFAULT_REGIME_PARAMS,
  FAT_TAIL_PARAMS,
  CONSERVATIVE_TRANSITION_MATRIX,
  REGIME_CONFIG,
} from './types';

/** Batch size for progress reporting (smaller = better UI responsiveness) */
const BATCH_SIZE = 500;

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

  // Compute historical stats for regime multiplier approach
  let assetHistoricalStats: AssetHistoricalStats[] | undefined;

  if (resamplingMethod === 'regime') {
    const calibrationMode = config.regimeCalibration ?? 'historical';
    const regimeConfig = REGIME_CONFIG[calibrationMode];
    console.log(`Regime model: Multiplier-based approach (${calibrationMode} mode)`);
    console.log(`  Survivorship bias: ${(regimeConfig.survivorshipBias * 100).toFixed(1)}%`);

    // Compute historical mean/stddev for each asset (multiplier-based approach)
    assetHistoricalStats = portfolio.assets.map((asset) => {
      const returns = asset.historicalReturns;
      const assetMean = returns.length > 0 ? mean(returns) : 0.10;
      const assetStddev = returns.length > 1 ? stddev(returns) : 0.20;
      const assetClass = asset.assetClass ?? 'equity_stock';

      console.log(`Asset ${asset.id} (${assetClass}):`, {
        historicalMean: (assetMean * 100).toFixed(1) + '%',
        historicalStddev: (assetStddev * 100).toFixed(1) + '%',
        dataPoints: returns.length,
      });

      return {
        id: asset.id,
        mean: assetMean,
        stddev: assetStddev,
        assetClass,
      };
    });
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

    // Log withdrawal chapter configuration
    if (config.withdrawalChapters?.enabled) {
      console.log(`[MC] Withdrawal chapters enabled (multi-phase strategy)`);
      if (config.withdrawalChapters.chapter2) {
        const ch2Year = config.withdrawalChapters.chapter2.yearsAfterStart;
        const ch2Pct = config.withdrawalChapters.chapter2.reductionPercent;
        console.log(`[MC]   Chapter 2: Reduce by ${ch2Pct}% at year ${sblocWithdrawalStartYear + ch2Year} (${ch2Year} years after withdrawal start)`);
      }
      if (config.withdrawalChapters.chapter3) {
        const ch3Year = config.withdrawalChapters.chapter3.yearsAfterStart;
        const ch3Pct = config.withdrawalChapters.chapter3.reductionPercent;
        console.log(`[MC]   Chapter 3: Reduce by ${ch3Pct}% at year ${sblocWithdrawalStartYear + ch3Year} (${ch3Year} years after withdrawal start)`);
      }
      if (config.withdrawalChapters.chapter2 && config.withdrawalChapters.chapter3) {
        const ch2Mult = 1 - (config.withdrawalChapters.chapter2.reductionPercent / 100);
        const ch3Mult = 1 - (config.withdrawalChapters.chapter3.reductionPercent / 100);
        const cumulativeMult = ch2Mult * ch3Mult;
        console.log(`[MC]   Cumulative reduction: ${((1 - cumulativeMult) * 100).toFixed(1)}% (final withdrawal = ${(cumulativeMult * 100).toFixed(1)}% of base)`);
      }
    } else {
      console.log(`[MC] Withdrawal chapters disabled (constant withdrawal pattern)`);
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
        assetHistoricalStats
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
          // Calculate effective withdrawal for this year (with annual raises and chapters)
          // Note: We compute effectiveWithdrawal externally (using sblocRaiseRate growth)
          // rather than using the SBLOC engine's withdrawalGrowthRate. This keeps the
          // engine stateless - it just uses the withdrawal amount we pass each year.
          // The SBLOCConfig.withdrawalGrowthRate field exists for standalone engine use.
          //
          // yearsOfWithdrawals = how many years of withdrawals have occurred (0-indexed)
          // Year 0: baseWithdrawal * (1+r)^0 = baseWithdrawal
          // Year 1: baseWithdrawal * (1+r)^1 = baseWithdrawal * (1+r)
          const yearsOfWithdrawals = Math.max(0, year - sblocWithdrawalStartYear);
          let effectiveWithdrawal = year >= sblocWithdrawalStartYear
            ? sblocBaseWithdrawal * Math.pow(1 + sblocRaiseRate, yearsOfWithdrawals)
            : 0;

          // Apply chapter multiplier for multi-phase withdrawal strategies
          const chapterMultiplier = calculateChapterMultiplier(
            config.withdrawalChapters,
            year,
            sblocWithdrawalStartYear
          );
          effectiveWithdrawal *= chapterMultiplier;

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

  // Use path-coherent percentile extraction (reference methodology)
  const { percentiles: yearlyPercentiles, simulationIndices } =
    extractPathCoherentPercentiles(yearlyValues, terminalValues);

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
        sblocWithdrawalStartYear,
        config.withdrawalChapters
      ),
      cumulativeInterest: {
        p50: loanBalancesByYear.map((yv, idx) => {
          const cumWithdrawal = calculateCumulativeWithdrawalAtYear(
            idx + 1,
            sblocBaseWithdrawal,
            sblocRaiseRate,
            sblocWithdrawalStartYear,
            config.withdrawalChapters
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

    // Get median dividend taxes borrowed (they're "in the loan" at death, forgiven by step-up)
    const medianDividendTaxesBorrowed = totalDividendTaxesBorrowed
      ? percentile(totalDividendTaxesBorrowed, 50)
      : 0;

    // Estimate taxes if sold (will be replaced by integrated sell strategy results if available)
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
      medianDividendTaxesBorrowed,
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
      // Regime parameters used (if regime method) - now using multiplier-based approach
      regimeParameters: assetHistoricalStats ? portfolio.assets.map((asset, i) => {
        const stats = assetHistoricalStats[i];
        const calibrationMode = config.regimeCalibration ?? 'historical';
        const regimeConfig = REGIME_CONFIG[calibrationMode];
        // Compute what multipliers produce for each regime
        const getRegimeParams = (regime: 'bull' | 'bear' | 'crash' | 'recovery'): { mean: number; stddev: number } => {
          // Get multipliers: use asset class override if available, otherwise base params
          let multipliers = regimeConfig.baseParams[regime];
          if (regime === 'bear' && regimeConfig.bearMarketOverrides[stats.assetClass]) {
            multipliers = regimeConfig.bearMarketOverrides[stats.assetClass]!;
          } else if (regime === 'crash' && regimeConfig.crashMarketOverrides[stats.assetClass]) {
            multipliers = regimeConfig.crashMarketOverrides[stats.assetClass]!;
          }
          return {
            mean: (stats.mean * multipliers.meanMultiplier) + multipliers.meanAdjustment - regimeConfig.survivorshipBias,
            stddev: stats.stddev * multipliers.volMultiplier,
          };
        };
        return {
          assetId: asset.id,
          assetClass: stats.assetClass,
          historicalMean: stats.mean,
          historicalStddev: stats.stddev,
          bull: getRegimeParams('bull'),
          bear: getRegimeParams('bear'),
          crash: getRegimeParams('crash'),
          recovery: getRegimeParams('recovery'),
          usedFallback: false, // Multiplier approach never needs fallback
          validationIssues: [] as string[],
        };
      }) : undefined,
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
      // Path-coherent percentile info (Phase 23-09)
      pathCoherentPercentiles: {
        p10SimIndex: simulationIndices.p10,
        p10TerminalValue: terminalValues[simulationIndices.p10],
        p50SimIndex: simulationIndices.p50,
        p50TerminalValue: terminalValues[simulationIndices.p50],
        p90SimIndex: simulationIndices.p90,
        p90TerminalValue: terminalValues[simulationIndices.p90],
      },
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
      // Path-coherent percentile info (Phase 23-09)
      pathCoherentPercentiles: {
        p10SimIndex: simulationIndices.p10,
        p10TerminalValue: terminalValues[simulationIndices.p10],
        p50SimIndex: simulationIndices.p50,
        p50TerminalValue: terminalValues[simulationIndices.p50],
        p90SimIndex: simulationIndices.p90,
        p90TerminalValue: terminalValues[simulationIndices.p90],
      },
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

    // Update estate analysis to use integrated sell strategy results (if estate analysis exists)
    if (estateAnalysis) {
      const bbdNetEstate = estateAnalysis.bbdNetEstate;
      const sellNetEstate = sellPercentiles.p50; // Use integrated sell strategy median terminal value
      const bbdAdvantage = bbdNetEstate - sellNetEstate;
      const medianDividendTaxesBorrowed = estateAnalysis.medianDividendTaxesBorrowed ?? 0;

      estateAnalysis = {
        bbdNetEstate,
        sellNetEstate,
        bbdAdvantage,
        medianDividendTaxesBorrowed,
      };

      // Log estate comparison with dividend tax details
      console.log('[MC Debug] ═══════════════════════════════════════════════════');
      console.log('[MC Debug] ESTATE ANALYSIS (BBD vs Sell)');
      console.log('[MC Debug] ═══════════════════════════════════════════════════');
      console.log(`[MC Debug] BBD median net estate: $${bbdNetEstate.toFixed(0)}`);
      console.log(`[MC Debug] Sell median net estate: $${sellNetEstate.toFixed(0)}`);
      console.log(`[MC Debug] BBD advantage: $${bbdAdvantage.toFixed(0)} (${((bbdAdvantage/sellNetEstate)*100).toFixed(1)}%)`);
      if (medianDividendTaxesBorrowed > 0) {
        console.log(`[MC Debug] Median dividend taxes borrowed (BBD): $${medianDividendTaxesBorrowed.toFixed(0)}`);
        console.log(`[MC Debug]   (These taxes are "in the loan" at death, forgiven by step-up)`);
        console.log(`[MC Debug]   (Sell strategy paid same taxes by liquidating portfolio)`);
      }
      console.log(`[MC Debug] Sell median taxes paid (lifetime): $${sellTaxes.medianTotal.toFixed(0)}`);
      console.log(`[MC Debug]   - Capital gains: $${sellTaxes.medianCapitalGains.toFixed(0)}`);
      console.log(`[MC Debug]   - Dividend taxes: $${sellTaxes.medianDividend.toFixed(0)}`);
      console.log('[MC Debug] ═══════════════════════════════════════════════════');
    }
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
  assetHistoricalStats?: AssetHistoricalStats[]
): number[][] {
  const numAssets = portfolio.assets.length;

  if (method === 'regime') {
    // Use regime-switching with multiplier-based approach (aligned with reference)
    const calibrationMode = regimeCalibration ?? 'historical';

    const { returns } = generateCorrelatedRegimeReturns(
      years,
      numAssets,
      portfolio.correlationMatrix,
      rng,
      'bull', // initialRegime
      undefined, // matrix - let function use REGIME_CONFIG transitions
      undefined, // shared params (legacy, not used)
      undefined, // assetRegimeParams (legacy, not used)
      calibrationMode,
      assetHistoricalStats // NEW: multiplier-based approach
    );
    return returns;
  }

  if (method === 'fat-tail') {
    // Use fat-tail model with Student's t-distribution
    const allHistoricalReturns = portfolio.assets.map(asset => asset.historicalReturns);
    const assetClasses = portfolio.assets.map(asset => asset.assetClass ?? 'equity_index');

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
 *
 * METHODOLOGY NOTE: There are two approaches to percentile paths:
 *
 * 1. POINT-WISE (current implementation):
 *    - For each year, calculate the Nth percentile VALUE across all iterations
 *    - Each percentile line may combine values from DIFFERENT simulations
 *    - Example: P10 at year 5 might be from sim #42, P10 at year 6 from sim #87
 *    - Pros: Simpler, always shows Nth percentile value for each year
 *    - Cons: Lines may not represent realistic paths (combining different market histories)
 *
 * 2. PATH-COHERENT (reference implementation):
 *    - Rank all simulations by their TERMINAL value (final year)
 *    - P10 line = the complete path of the simulation at the 10th percentile ranking
 *    - Each percentile line represents ONE simulation's journey from start to finish
 *    - Pros: More realistic paths, coherent market history
 *    - Cons: Mid-path values may not be exactly the Nth percentile for that year
 *
 * The current implementation uses POINT-WISE percentiles.
 * See extractPathCoherentPercentiles for PATH-COHERENT alternative.
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
 * Result of path-coherent percentile extraction
 */
interface PathCoherentResult {
  percentiles: YearlyPercentiles[];
  /** Which simulation index represents each percentile */
  simulationIndices: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

/**
 * Extract path-coherent percentiles
 *
 * This is the REFERENCE application methodology:
 * 1. Rank all simulations by their TERMINAL (final) net worth
 * 2. Identify which simulation index represents each percentile
 * 3. Extract the COMPLETE path for each percentile simulation
 *
 * Result: Each percentile line represents ONE coherent simulation path,
 * not a cross-section of different simulations at each year.
 *
 * @param yearlyValues 2D array [year][iteration] of portfolio values
 * @param terminalValues Final net worth for each iteration
 * @returns Object with percentile paths and simulation indices
 */
function extractPathCoherentPercentiles(
  yearlyValues: number[][],
  terminalValues: Float64Array | number[]
): PathCoherentResult {
  const iterations = terminalValues.length;
  const years = yearlyValues.length;

  // Create array of [iteration index, terminal value] pairs
  const rankedSimulations = Array.from(terminalValues)
    .map((value, index) => ({ index, terminalValue: value }))
    // Filter out invalid values (NaN, Infinity)
    .filter(s => isFinite(s.terminalValue))
    // Sort by terminal value (lowest to highest)
    .sort((a, b) => a.terminalValue - b.terminalValue);

  const n = rankedSimulations.length;

  // Find simulation index for each percentile
  const getPercentileIndex = (p: number) => {
    const rank = Math.min(Math.floor((p / 100) * n), n - 1);
    return rankedSimulations[rank].index;
  };

  const simulationIndices = {
    p10: getPercentileIndex(10),
    p25: getPercentileIndex(25),
    p50: getPercentileIndex(50),
    p75: getPercentileIndex(75),
    p90: getPercentileIndex(90),
  };

  // Extract complete paths for each percentile
  const percentiles: YearlyPercentiles[] = [];

  for (let year = 0; year < years; year++) {
    percentiles.push({
      year: year + 1,
      p10: yearlyValues[year][simulationIndices.p10],
      p25: yearlyValues[year][simulationIndices.p25],
      p50: yearlyValues[year][simulationIndices.p50],
      p75: yearlyValues[year][simulationIndices.p75],
      p90: yearlyValues[year][simulationIndices.p90],
    });
  }

  console.log('[MC] Path-coherent percentiles extracted');
  console.log(`[MC]   P10 from simulation #${simulationIndices.p10} (terminal: $${rankedSimulations.find(s => s.index === simulationIndices.p10)?.terminalValue.toFixed(0)})`);
  console.log(`[MC]   P50 from simulation #${simulationIndices.p50} (terminal: $${rankedSimulations.find(s => s.index === simulationIndices.p50)?.terminalValue.toFixed(0)})`);
  console.log(`[MC]   P90 from simulation #${simulationIndices.p90} (terminal: $${rankedSimulations.find(s => s.index === simulationIndices.p90)?.terminalValue.toFixed(0)})`);

  return { percentiles, simulationIndices };
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
 * Calculate cumulative withdrawals for all years, accounting for annual raises,
 * withdrawal start year, and chapter reductions
 */
function calculateCumulativeWithdrawals(
  timeHorizon: number,
  baseWithdrawal: number,
  raiseRate: number,
  startYear: number,
  chapters?: SimulationConfig['withdrawalChapters']
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
      let withdrawal = baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals);

      // Apply chapter multiplier for this year
      const chapterMultiplier = calculateChapterMultiplier(chapters, simYear, startYear);
      withdrawal *= chapterMultiplier;

      cumulative += withdrawal;
    }
    result.push(cumulative);
  }

  return result;
}

/**
 * Calculate cumulative withdrawal at a specific year, accounting for raises and chapters
 */
function calculateCumulativeWithdrawalAtYear(
  year: number,
  baseWithdrawal: number,
  raiseRate: number,
  startYear: number,
  chapters?: SimulationConfig['withdrawalChapters']
): number {
  let cumulative = 0;

  for (let y = 1; y <= year; y++) {
    const simYear = y - 1;
    if (simYear >= startYear) {
      const yearsOfWithdrawals = simYear - startYear;
      // Year 0 of withdrawals: baseWithdrawal * (1+r)^0 = baseWithdrawal
      // Year 1 of withdrawals: baseWithdrawal * (1+r)^1 = baseWithdrawal * (1+r)
      // etc.
      let withdrawal = baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals);

      // Apply chapter multiplier for this year
      const chapterMultiplier = calculateChapterMultiplier(chapters, simYear, startYear);
      withdrawal *= chapterMultiplier;

      cumulative += withdrawal;
    }
  }

  return cumulative;
}

/**
 * Calculate chapter multiplier for multi-phase withdrawal strategies
 *
 * Returns a multiplier (0-1+) based on which chapters are currently active.
 * Chapters reduce withdrawals at specified years to model lifestyle changes.
 *
 * IMPORTANT: Multipliers are CUMULATIVE. If Chapter 2 reduces by 25% and Chapter 3
 * reduces by 25%, the final multiplier is 0.75 * 0.75 = 0.5625 (56.25% of base).
 *
 * @param config Withdrawal chapters configuration
 * @param currentYear Current simulation year (0-indexed)
 * @param withdrawalStartYear Year when withdrawals begin (0-indexed)
 * @returns Multiplier to apply to withdrawal (1.0 = no change, 0.75 = 25% reduction)
 */
function calculateChapterMultiplier(
  config: SimulationConfig['withdrawalChapters'],
  currentYear: number,
  withdrawalStartYear: number
): number {
  // If chapters not enabled, return 1.0 (no change)
  if (!config || !config.enabled) {
    return 1.0;
  }

  // Calculate years since withdrawal started
  const yearsSinceWithdrawalStart = Math.max(0, currentYear - withdrawalStartYear);

  // Start with full withdrawal (multiplier = 1.0)
  let multiplier = 1.0;

  // Apply Chapter 2 reduction if active
  if (config.chapter2 && yearsSinceWithdrawalStart >= config.chapter2.yearsAfterStart) {
    const chapter2Multiplier = 1 - (config.chapter2.reductionPercent / 100);
    multiplier *= chapter2Multiplier;
  }

  // Apply Chapter 3 reduction if active (cumulative with Chapter 2)
  if (config.chapter3 && yearsSinceWithdrawalStart >= config.chapter3.yearsAfterStart) {
    const chapter3Multiplier = 1 - (config.chapter3.reductionPercent / 100);
    multiplier *= chapter3Multiplier;
  }

  return multiplier;
}
