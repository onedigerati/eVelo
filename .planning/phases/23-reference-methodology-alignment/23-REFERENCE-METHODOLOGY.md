# Reference Application Methodology Extraction

**Purpose:** Comprehensive documentation of financial calculations, models, and logic from the reference PortfolioStrategySimulator.html for alignment with eVelo.

**Source:** `references/PortfolioStrategySimulator.html`

---

## Table of Contents

1. [Monte Carlo Simulation Core](#1-monte-carlo-simulation-core)
2. [Return Models](#2-return-models)
3. [SBLOC / BBD Strategy Logic](#3-sbloc--bbd-strategy-logic)
4. [Sell Assets Strategy](#4-sell-assets-strategy)
5. [Percentile Path Calculation](#5-percentile-path-calculation)
6. [Statistical Metrics](#6-statistical-metrics)
7. [Tax Modeling](#7-tax-modeling)
8. [Regime Configuration Constants](#8-regime-configuration-constants)
9. [Liquidity & Stress Testing](#9-liquidity--stress-testing)
10. [Correlation Calculation](#10-correlation-calculation)
11. [Key Differences from eVelo](#11-key-differences-from-evelo)

---

## 1. Monte Carlo Simulation Core

### Order of Operations (BBD Strategy)

```javascript
// For each simulation year:
// 1. Generate weighted portfolio return for this year
// 2. Apply dividend tax by BORROWING via SBLOC
// 3. Calculate withdrawal for this year
// 4. Apply returns and withdrawals based on frequency

// MONTHLY PROCESSING (numPeriodsPerYear === 12):
const monthlyReturn = Math.pow(1 + portfolioReturn, 1/12) - 1;
const monthlyInterest = Math.pow(1 + sblocRate, 1/12) - 1;
const monthlyWithdrawalAmount = currentWithdrawal / 12;

for (let month = 0; month < 12; month++) {
    portfolioValue *= (1 + monthlyReturn);
    locBalance *= (1 + monthlyInterest);
    locBalance += monthlyWithdrawalAmount;
}

// ANNUAL PROCESSING:
locBalance += currentWithdrawal;  // Borrow at beginning of year
portfolioValue *= (1 + portfolioReturn);
locBalance *= (1 + sblocRate);
```

### Bootstrap Correlation Preservation (Critical)

```javascript
// ISSUE 1 FIX: For bootstrap model, use block bootstrap to preserve asset correlations
// Sample the same historical year index for all assets to maintain their natural correlations
let sharedYearIndex = null;
if (returnModel === 'bootstrap') {
    // Find minimum historical data length across all assets
    const minHistoricalYears = Math.min(...assetNames.map(name => assetReturnsData[name].length));
    sharedYearIndex = Math.floor(Math.random() * minHistoricalYears);
}

assetNames.forEach(assetName => {
    const assetReturns = assetReturnsData[assetName];
    if (assetReturns.length > 0) {
        let assetReturn;
        if (returnModel === 'bootstrap' && sharedYearIndex !== null) {
            // Use shared year index to preserve correlations
            assetReturn = assetReturns[sharedYearIndex] / 100;
        } else {
            // For regime and fat-tail models, sample independently
            assetReturn = sampleReturn(assetReturns, currentRegime, returnModel, assetClass, regimeMode);
        }
        const weight = selectedPortfolioAssets[assetName] / 100;
        portfolioReturn += assetReturn * weight;
    }
});
```

### Key Parameters Collected

```javascript
const startValue = parseFloat(document.getElementById('startValue').value);
const initialLocBalance = parseFloat(document.getElementById('locBalance').value) || 0;
const startYear = parseInt(document.getElementById('startYear').value);
const withdrawalStartYear = parseInt(document.getElementById('withdrawalStartYear').value);
const period = parseInt(document.getElementById('period').value);
const sblocRate = parseFloat(document.getElementById('sblocRate').value) / 100;
const maxBorrowing = parseFloat(document.getElementById('maxBorrowing').value) / 100;
const maintenanceMargin = parseFloat(document.getElementById('maintenanceMargin').value) / 100;
const liquidationHaircut = parseFloat(document.getElementById('liquidationHaircut').value) / 100;
const annualWithdrawal = parseFloat(document.getElementById('annualWithdrawal').value);
const monthlyWithdrawal = document.getElementById('monthlyWithdrawal').checked;
const annualRaise = parseFloat(document.getElementById('annualRaise').value) / 100;
const numSimulations = parseInt(document.getElementById('numSimulations').value);
const inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
```

---

## 2. Return Models

### Bootstrap Model

```javascript
function sampleReturn(historicalReturns, regime, returnModel, assetClass, regimeMode) {
    if (returnModel === 'bootstrap') {
        // Standard bootstrap sampling
        const randomIndex = Math.floor(Math.random() * historicalReturns.length);
        return historicalReturns[randomIndex] / 100;
    }
}
```

### Regime-Switching Model

```javascript
if (returnModel === 'regime') {
    // Calculate historical mean and std dev
    const rawMean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const variance = historicalReturns.reduce((sum, r) => sum + Math.pow(r - rawMean, 2), 0) / historicalReturns.length;
    const stdDev = Math.sqrt(variance);

    // Apply survivorship bias adjustment based on mode
    const survivorshipBiasAdjustment = getSurvivorshipBias(regimeMode);
    const mean = rawMean - survivorshipBiasAdjustment;

    // Get regime parameters for the selected mode
    const params = getRegimeParameters(regime, assetClass, regimeMode);

    // Adjust mean based on regime
    const adjustedMean = (mean * params.meanMultiplier) + params.meanAdjustment;
    const adjustedStdDev = stdDev * params.volMultiplier;

    // Generate normal random variable (Box-Muller transform)
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const sampledReturn = adjustedMean + (z * adjustedStdDev);

    // Clamp extreme returns (-99% to +500%)
    const clampedReturn = Math.max(-99, Math.min(500, sampledReturn));
    return clampedReturn / 100;
}
```

### Fat-Tail Model

```javascript
if (returnModel === 'fat-tail') {
    // Calculate historical mean and standard deviation
    const rawMean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;
    const variance = historicalReturns.reduce((sum, r) => sum + Math.pow(r - rawMean, 2), 0) / historicalReturns.length;
    const stdDev = Math.sqrt(variance);

    // Get asset class-specific parameters
    const fatTailParams = getFatTailParameters(assetClass);

    // Apply survivorship bias adjustment
    const adjustedMean = rawMean - fatTailParams.survivorshipBias;
    const adjustedStdDev = stdDev * fatTailParams.volatilityScaling;

    // Generate Student's t random variable
    const df = fatTailParams.degreesOfFreedom;
    let chiSquared = 0;
    for (let i = 0; i < df; i++) {
        const u1 = Math.max(1e-10, Math.random());
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        chiSquared += z * z;
    }

    const minChiSquared = df / 400;
    chiSquared = Math.max(minChiSquared, chiSquared);
    const tScaling = Math.sqrt(df / chiSquared);

    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    const zNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // Apply negative skew adjustment
    const skewAdjustment = zNormal < 0 ? fatTailParams.skewMultiplier : 1.0;

    const sampledReturn = adjustedMean + (zNormal * tScaling * adjustedStdDev * skewAdjustment);

    // Clamp at ±200%
    const clampedReturn = Math.max(-200, Math.min(200, sampledReturn));
    return clampedReturn / 100;
}
```

### Regime Path Generation

```javascript
function generateRegimePath(years, mode = 'conservative') {
    const regimes = [];
    let currentRegime = 'bull'; // Start in bull market

    const transitions = REGIME_CONFIG[mode].transitions;

    for (let year = 0; year < years; year++) {
        regimes.push(currentRegime);

        // Determine next regime based on transition probabilities
        const rand = Math.random();
        const probs = transitions[currentRegime];

        let cumulative = 0;
        for (const [nextRegime, prob] of Object.entries(probs)) {
            cumulative += prob;
            if (rand < cumulative) {
                currentRegime = nextRegime;
                break;
            }
        }
    }

    return regimes;
}
```

---

## 3. SBLOC / BBD Strategy Logic

### Dividend Tax Handling (BBD borrows to pay)

```javascript
// Apply dividend tax - BORROW via SBLOC instead of liquidating
if (dividendYield > 0 && ordinaryTaxRate > 0) {
    const dividendIncome = portfolioValue * dividendYield;
    const dividendTax = dividendIncome * ordinaryTaxRate;
    locBalance += dividendTax; // Borrow to pay dividend taxes (true BBD)
    totalDividendTaxesPaid += dividendTax;
}
```

### Margin Call Detection and Forced Liquidation

```javascript
// Check for margin call and forced liquidation
const currentLTV = portfolioValue > 0 ? (locBalance / portfolioValue) : 0;
let liquidationOccurred = false;

if (currentLTV >= maxBorrowing && !marginCallTriggered) {
    marginCallTriggered = true;
    liquidationOccurred = true;

    // Forced liquidation: sell assets with haircut to restore safe LTV
    const targetLTV = maintenanceMargin * 0.8; // Target 80% of maintenance margin
    const targetLoc = portfolioValue * targetLTV;
    const excessLoc = locBalance - targetLoc;

    if (excessLoc > 0) {
        // Sell assets to pay down LOC
        const assetsToSell = excessLoc / (1 - liquidationHaircut);

        // Calculate capital gains tax on forced liquidation if enabled
        let capitalGainsTax = 0;
        if (ltcgTaxRate > 0 && costBasis > 0) {
            const assetBasisSold = (assetsToSell / portfolioValue) * costBasis;
            const capitalGain = Math.max(0, assetsToSell - assetBasisSold);
            capitalGainsTax = capitalGain * ltcgTaxRate;
        }

        portfolioValue -= assetsToSell;
        locBalance -= (assetsToSell * (1 - liquidationHaircut));
        portfolioValue -= capitalGainsTax;

        // Update cost basis proportionally
        if (costBasis > 0 && portfolioValue > 0) {
            costBasis = costBasis * (portfolioValue / (portfolioValue + assetsToSell + capitalGainsTax));
        }
    }

    // Recalculate after liquidation
    maxLoc = portfolioValue * maxBorrowing;
    locUsedPct = maxLoc > 0 ? (locBalance / maxLoc) * 100 : 0;
    netPortfolio = portfolioValue - locBalance;

    // If still underwater, mark as complete failure
    if (netPortfolio <= 0 || portfolioValue <= 0) {
        portfolioValue = 0;
        netPortfolio = -locBalance;
        // Break out of year loop - simulation failed
    }
}
```

### Chapter System (Withdrawal Reductions)

```javascript
// Calculate and apply chapter multiplier
let chapterMultiplier = 1.0;
if (enableChapters) {
    if (chapter3StartYear && currentYear >= chapter3StartYear) {
        // Chapter 3: cumulative reductions
        chapterMultiplier = (1 - chapter2ReductionPct / 100) * (1 - chapter3ReductionPct / 100);
    } else if (chapter2StartYear && currentYear >= chapter2StartYear) {
        // Chapter 2: apply only chapter 2 reduction
        chapterMultiplier = (1 - chapter2ReductionPct / 100);
    }
}
currentWithdrawal *= chapterMultiplier;
```

---

## 4. Sell Assets Strategy

### Order of Operations (CRITICAL DIFFERENCE)

```javascript
function runSellAssetsPath(params) {
    // For each year:

    // 1. Apply dividend tax by LIQUIDATING portfolio
    if (dividendYield > 0 && ordinaryTaxRate > 0) {
        const dividendIncome = portfolioValue * dividendYield;
        dividendTax = dividendIncome * ordinaryTaxRate;

        if (dividendTax > portfolioValue) {
            dividendTax = portfolioValue;
            portfolioValue = 0;
        } else {
            portfolioValue -= dividendTax;
        }
        totalTaxesPaid += dividendTax;
    }

    // 2. Calculate withdrawal and capital gains tax (gross-up formula)
    if (requestedWithdrawal > 0 && portfolioValue > 0) {
        // Calculate average cost basis per dollar
        const basisPerDollar = portfolioValue > 0 ? costBasis / portfolioValue : 0;

        // Gross-up formula:
        // amountToSell = withdrawal / (1 - (1 - basisPerDollar) * taxRate)
        const taxableGainPerDollar = Math.max(0, 1 - basisPerDollar);
        const denominator = 1 - (taxableGainPerDollar * ltcgTaxRate);

        if (denominator > 0) {
            totalAmountToSell = requestedWithdrawal / denominator;
        } else {
            totalAmountToSell = requestedWithdrawal * 1.5; // Fallback
        }

        // Check if portfolio can fund the withdrawal
        if (totalAmountToSell > portfolioValue) {
            // WITHDRAWAL SHORTFALL
            failed = true;
            failureYear = currentYear;
            failureReason = 'portfolio_depleted';
        } else {
            // Normal case
            const basisOfSoldAssets = totalAmountToSell * basisPerDollar;
            const capitalGain = Math.max(0, totalAmountToSell - basisOfSoldAssets);
            capitalGainsTax = capitalGain * ltcgTaxRate;
            totalTaxesPaid += capitalGainsTax;

            portfolioValue -= totalAmountToSell;
            costBasis -= basisOfSoldAssets;
        }
    }

    // 3. Apply returns (only if portfolio has value)
    if (portfolioValue > 0) {
        if (numPeriodsPerYear === 12) {
            const monthlyReturn = Math.pow(1 + portfolioReturn, 1/12) - 1;
            for (let month = 0; month < 12; month++) {
                portfolioValue *= (1 + monthlyReturn);
            }
        } else {
            portfolioValue *= (1 + portfolioReturn);
        }
    }
    // Note: Cost basis does NOT grow with market returns
}
```

### Success Rate Definition (Sell Strategy)

```javascript
// Sell strategy success: finalNetWorth > 0 AND not failed
if (sellSim.failed) {
    sellFailureCount++;
} else if (sellSim.finalNetWorth > 0) {
    sellSuccessCount++;
} else {
    sellFailureCount++;
}

const sellSuccessRate = (sellSuccessCount / sellSimulations.length) * 100;
```

---

## 5. Percentile Path Calculation

### Path-Coherent Percentiles (Industry Standard)

```javascript
// PATH-COHERENT PERCENTILES: Industry-standard approach
// Each percentile represents ONE SPECIFIC simulation path from start to finish

// Step 1: Rank all simulations by their TERMINAL (final) net worth
const simulationRankings = allSimulations.map((sim, simIdx) => {
    const lastYear = sim[sim.length - 1];
    return {
        simIdx: simIdx,
        terminalNetWorth: lastYear.netPortfolio,
        simulation: sim
    };
})
// Filter out invalid terminal values (NaN, Infinity) BEFORE sorting
.filter(ranking => isFinite(ranking.terminalNetWorth));

// Sort by terminal net worth (lowest to highest)
simulationRankings.sort((a, b) => a.terminalNetWorth - b.terminalNetWorth);

// Step 2: Identify which specific simulations represent each percentile
const percentileSimulations = {};
percentiles.forEach(p => {
    const index = Math.min(
        Math.floor((p / 100) * simulationRankings.length),
        simulationRankings.length - 1
    );
    percentileSimulations[p] = simulationRankings[index].simIdx;
});

// Step 3: Extract the COMPLETE PATH for each percentile simulation
for (let yearIdx = 0; yearIdx <= period; yearIdx++) {
    percentiles.forEach(p => {
        const simIdx = percentileSimulations[p];
        const sim = allSimulations[simIdx];

        // Calculate inflation adjustment factor
        const inflationFactor = Math.pow(1 + inflationRate / 100, yearIdx);

        if (sim[yearIdx]) {
            // Calculate real (inflation-adjusted) values
            const realPortfolioValue = sim[yearIdx].portfolioValue / inflationFactor;
            const realLocBalance = sim[yearIdx].locBalance / inflationFactor;
            const realNetPortfolio = sim[yearIdx].netPortfolio / inflationFactor;

            percentilesData[p].push({
                year: sim[yearIdx].year,
                portfolioValue: sim[yearIdx].portfolioValue,
                locBalance: sim[yearIdx].locBalance,
                netPortfolio: sim[yearIdx].netPortfolio,
                locUsedPct: sim[yearIdx].locUsedPct,
                realPortfolioValue: realPortfolioValue,
                realLocBalance: realLocBalance,
                realNetPortfolio: realNetPortfolio,
                withdrawal: sim[yearIdx].withdrawal || 0,
                cumulativeWithdrawal: sim[yearIdx].cumulativeWithdrawal || 0
            });
        }
    });
}
```

---

## 6. Statistical Metrics

### Success Rate (BBD Strategy)

```javascript
// Calculate success rate (no margin calls + positive final net worth)
let successfulSimulations = 0;
let marginCallCount = 0;
let depletionFailures = 0;

allSimulations.forEach(sim => {
    const lastYear = sim[sim.length - 1];
    terminalValues.push(lastYear.netPortfolio);

    const hasMarginCall = sim.some(year => year.marginCall);
    if (hasMarginCall) {
        marginCallCount++;
    }

    if (!hasMarginCall && lastYear.netPortfolio > 0) {
        successfulSimulations++;
    } else if (!hasMarginCall && lastYear.netPortfolio <= 0) {
        depletionFailures++;
    }
});

const successRate = (successfulSimulations / allSimulations.length) * 100;
const marginCallRate = (marginCallCount / allSimulations.length) * 100;
```

### Terminal Value Statistics

```javascript
// Filter BEFORE sorting to avoid NaN corruption
const validTerminalValues = terminalValues.filter(v => isFinite(v));
validTerminalValues.sort((a, b) => a - b);

const getPercentile = (arr, percentile) => {
    if (arr.length === 0) return 0;
    const index = Math.floor((percentile / 100) * arr.length);
    return arr[Math.min(index, arr.length - 1)];
};

const terminalStats = {
    min: validTerminalValues[0] || 0,
    max: validTerminalValues[validTerminalValues.length - 1] || 0,
    percentile10: getPercentile(validTerminalValues, 10),
    percentile25: getPercentile(validTerminalValues, 25),
    median: getPercentile(validTerminalValues, 50),
    percentile75: getPercentile(validTerminalValues, 75),
    percentile90: getPercentile(validTerminalValues, 90),
    mean: validTerminalValues.reduce((sum, val) => sum + val, 0) / validTerminalValues.length,
    stdDev: calculateStdDev(validTerminalValues)
};
```

### TWRR Calculation

```javascript
function calculateTWRR(percentilePath, useReal = false) {
    if (!percentilePath || percentilePath.length < 2) return 0;

    let product = 1;
    const valueKey = useReal ? 'realPortfolioValue' : 'portfolioValue';

    for (let i = 1; i < percentilePath.length; i++) {
        const prevValue = percentilePath[i-1][valueKey];
        const currValue = percentilePath[i][valueKey];

        if (prevValue > 0) {
            const periodReturn = (currValue - prevValue) / prevValue;
            product *= (1 + periodReturn);
        }
    }

    const years = percentilePath.length - 1;
    if (years <= 0) return 0;

    const twrr = (Math.pow(product, 1/years) - 1) * 100;
    return twrr;
}
```

### Annualized Volatility

```javascript
function calculateAnnualizedVolatility(percentilePath, useReal = false) {
    if (!percentilePath || percentilePath.length < 2) return 0;

    let returns = [];
    const valueKey = useReal ? 'realPortfolioValue' : 'portfolioValue';

    for (let i = 1; i < percentilePath.length; i++) {
        const prevValue = percentilePath[i-1][valueKey];
        const currValue = percentilePath[i][valueKey];

        if (prevValue > 0) {
            const periodReturn = ((currValue - prevValue) / prevValue) * 100;
            returns.push(periodReturn);
        }
    }

    if (returns.length === 0) return 0;

    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    return volatility;
}
```

### CAGR (Implied) Calculation

```javascript
// Calculate implied CAGR from median result
const years = params.period;
const startValue = params.startValue;
const medianFinal = terminalStats.median;
const impliedCAGR = (medianFinal > 0 && startValue > 0) ?
    (Math.pow(medianFinal / startValue, 1/years) - 1) * 100 :
    null;
```

---

## 7. Tax Modeling

### Dividend Tax Rates

```javascript
const enableTaxModeling = document.getElementById('enableTaxModeling')?.checked || false;
const taxAdvantaged = document.getElementById('taxAdvantaged')?.checked || false;
const dividendYield = enableTaxModeling && !taxAdvantaged ?
    parseFloat(document.getElementById('dividendYield')?.value || 0) / 100 : 0;
const ordinaryTaxRate = enableTaxModeling && !taxAdvantaged ?
    parseFloat(document.getElementById('ordinaryTaxRate')?.value || 0) / 100 : 0;
const ltcgTaxRate = enableTaxModeling && !taxAdvantaged ?
    parseFloat(document.getElementById('ltcgTaxRate')?.value || 0) / 100 : 0;
```

### BBD vs Sell Tax Difference

- **BBD Strategy**: Borrows via SBLOC to pay dividend taxes (portfolio remains whole)
- **Sell Strategy**: Liquidates portfolio to pay dividend taxes (portfolio reduced)

---

## 8. Regime Configuration Constants

### Historical Mode

```javascript
const REGIME_CONFIG = {
    historical: {
        transitions: {
            bull:     { bull: 0.89, bear: 0.06, crash: 0.02, recovery: 0.03 },
            bear:     { bull: 0.05, bear: 0.45, crash: 0.20, recovery: 0.30 },
            crash:    { bull: 0.00, bear: 0.20, crash: 0.10, recovery: 0.70 },
            recovery: { bull: 0.50, bear: 0.05, crash: 0.02, recovery: 0.43 }
        },
        survivorshipBias: 1.5,
        baseParams: {
            bull: {
                meanMultiplier: 1.0,
                meanAdjustment: 0,
                volMultiplier: 0.80,
                correlationSpike: 0.0
            },
            bear: {
                meanMultiplier: 0.30,
                meanAdjustment: -10,
                volMultiplier: 1.60,
                correlationSpike: 0.35
            },
            crash: {
                meanMultiplier: 0.0,
                meanAdjustment: -30,
                volMultiplier: 2.50,
                correlationSpike: 0.65
            },
            recovery: {
                meanMultiplier: 0.75,
                meanAdjustment: 10,
                volMultiplier: 1.30,
                correlationSpike: 0.20
            }
        }
    }
};
```

### Conservative Mode (Stress-Testing)

```javascript
conservative: {
    transitions: {
        bull:     { bull: 0.89, bear: 0.06, crash: 0.02, recovery: 0.03 },
        bear:     { bull: 0.05, bear: 0.45, crash: 0.20, recovery: 0.30 },
        crash:    { bull: 0.00, bear: 0.15, crash: 0.35, recovery: 0.50 },
        recovery: { bull: 0.45, bear: 0.08, crash: 0.02, recovery: 0.45 }
    },
    survivorshipBias: 2.0,
    baseParams: {
        bull: {
            meanMultiplier: 1.0,
            meanAdjustment: 0,
            volMultiplier: 0.75,
            correlationSpike: 0.0
        },
        bear: {
            meanMultiplier: 0.25,
            meanAdjustment: -12,
            volMultiplier: 1.80,
            correlationSpike: 0.40
        },
        crash: {
            meanMultiplier: 0.0,
            meanAdjustment: -35,
            volMultiplier: 3.00,
            correlationSpike: 0.70
        },
        recovery: {
            meanMultiplier: 0.70,
            meanAdjustment: 8,
            volMultiplier: 1.40,
            correlationSpike: 0.25
        }
    }
}
```

### Fat-Tail Parameters by Asset Class

```javascript
const fatTailParams = {
    equity_stock: {
        survivorshipBias: 4.5,
        volatilityScaling: 1.25,
        degreesOfFreedom: 4,
        skewMultiplier: 1.15
    },
    equity_index: {
        survivorshipBias: 2.5,
        volatilityScaling: 1.15,
        degreesOfFreedom: 5,
        skewMultiplier: 1.10
    },
    commodity: {
        survivorshipBias: 1.0,
        volatilityScaling: 1.10,
        degreesOfFreedom: 6,
        skewMultiplier: 1.05
    },
    bond: {
        survivorshipBias: 1.5,
        volatilityScaling: 1.05,
        degreesOfFreedom: 7,
        skewMultiplier: 1.0
    }
};
```

---

## 9. Liquidity & Stress Testing

### Liquidity Metrics

```javascript
function calculateLiquidityMetrics(portfolioValue, locBalance, maxBorrowing) {
    const maxLoc = portfolioValue * maxBorrowing;
    const locUsedPct = maxLoc > 0 ? (locBalance / maxLoc) * 100 : 0;
    const availableCredit = Math.max(0, maxLoc - locBalance);
    const distanceToMarginCall = Math.max(0, 100 - locUsedPct);
    const safetyBuffer = availableCredit;

    return {
        maxLoc,
        locUsedPct,
        availableCredit,
        distanceToMarginCall,
        safetyBuffer
    };
}
```

### Stress Test Scenarios

```javascript
function calculateStressTests(portfolioValue, locBalance, maxBorrowing) {
    const scenarios = [10, 20, 30, 40]; // Portfolio drop percentages
    const results = {};

    scenarios.forEach(dropPct => {
        const stressedValue = portfolioValue * (1 - dropPct / 100);
        const metrics = calculateLiquidityMetrics(stressedValue, locBalance, maxBorrowing);
        const wouldTriggerMarginCall = metrics.locUsedPct >= 100;

        results[`drop${dropPct}`] = {
            dropPct,
            newPortfolioValue: stressedValue,
            newLocUsedPct: metrics.locUsedPct,
            distanceToMarginCall: metrics.distanceToMarginCall,
            marginCallTriggered: wouldTriggerMarginCall
        };
    });

    return results;
}
```

### Aggregated Liquidity Statistics

```javascript
function aggregateLiquidityStats(allSimulations, period, params) {
    // Returns:
    // - liquidityData: percentile paths for distance to margin call
    // - p10SafetyBuffer: 10th percentile safety buffer
    // - p90LocUtilization: 90th percentile LOC utilization
    // - medianLocUtilization: 50th percentile LOC utilization
    // - highRiskYears: count of years with >70% utilization
    // - mostDangerousYear: year with minimum distance to margin call
    // - worstCaseLocUsedPct: highest utilization recorded
}
```

---

## 10. Correlation Calculation

```javascript
function calculateCorrelation(data1, data2) {
    if (data1.length === 0 || data2.length === 0) return 0;

    // Create year-indexed maps for O(1) lookup
    const map1 = new Map(data1.map(d => [d.year, d.return]));
    const map2 = new Map(data2.map(d => [d.year, d.return]));

    // Find overlapping years (intersection of both datasets)
    const overlappingYears = [...map1.keys()].filter(year => map2.has(year));

    // Need at least 2 overlapping years
    if (overlappingYears.length < 2) return 0;

    // Extract aligned returns for the same calendar years
    const x = overlappingYears.map(year => map1.get(year));
    const y = overlappingYears.map(year => map2.get(year));

    // Pearson correlation formula
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    if (denominator === 0) return 0;

    return numerator / denominator;
}
```

---

## 11. Key Differences from eVelo

### Critical Gaps Identified

| Feature | Reference App | eVelo Current | Priority |
|---------|---------------|---------------|----------|
| Bootstrap correlation preservation | Shared year index | Independent sampling | **CRITICAL** |
| 4-regime system | bull/bear/crash/recovery | bull/bear/crash only | HIGH |
| Fat-tail model | Asset-class specific params | Not implemented | HIGH |
| Survivorship bias adjustment | Mode-dependent (1.5-2.0%) | Not applied | HIGH |
| Return clamping | -99% to +500% (regime) | Not applied | MEDIUM |
| Sell strategy runs per iteration | 1 per BBD iteration (same returns) | 10 synthetic scenarios | **CRITICAL** |
| Dividend tax - BBD | Borrows via SBLOC | Not modeled | HIGH |
| Dividend tax - Sell | Liquidates portfolio | Not modeled | HIGH |
| Chapter system | 3-chapter withdrawal reduction | Not implemented | MEDIUM |
| Theoretical debt calculation | Uses actual median CAGR | N/A | LOW |
| Path-coherent percentiles | Full path extraction | Similar approach | VERIFY |
| Asset class differentiation | equity_stock/equity_index/commodity/bond | Not differentiated | HIGH |

### Order of Operations Comparison

**Reference App BBD:**
1. Generate portfolio return
2. Apply dividend tax (borrow via SBLOC)
3. Calculate withdrawal with chapter multiplier
4. Apply returns and withdrawals (monthly or annual)
5. Check margin call, forced liquidation if needed

**Reference App Sell:**
1. Apply dividend tax (liquidate from portfolio)
2. Calculate withdrawal with gross-up formula
3. Check withdrawal shortfall
4. Apply returns to remaining portfolio

**eVelo Current:** Needs verification against reference order

### Return Model Alignment Needed

1. **Bootstrap**: Must use shared year index to preserve natural asset correlations
2. **Regime**: Need 4-regime system (add recovery state), survivorship bias, Box-Muller transform
3. **Fat-Tail**: Need Student's t-distribution with asset-class specific parameters

---

## Summary

This document provides the complete methodology extraction from the reference application. Phase 23 should focus on:

1. **Bootstrap correlation fix** (shared year index sampling)
2. **4-regime system** with proper transition matrices
3. **Fat-tail distribution** with asset-class differentiation
4. **Sell strategy alignment** (1-per-iteration matching BBD returns)
5. **Dividend tax modeling** for both strategies
6. **Chapter system** for withdrawal reductions
7. **Survivorship bias** adjustments
8. **Path-coherent percentile extraction** verification
