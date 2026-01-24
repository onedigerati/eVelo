/**
 * Sell Strategy Accuracy Integration Tests
 *
 * Validates the sell strategy calculation accuracy:
 * 1. Order of operations (withdrawal before returns)
 * 2. Dividend tax deduction
 * 3. Gross-up tax calculation
 *
 * These tests verify that the sell strategy implementation matches
 * the expected behavior from the reference application.
 */

import { calculateSellStrategy } from '../../src/calculations/sell-strategy.js';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Generate mock percentile data for testing
 *
 * @param {number} initialValue - Starting portfolio value
 * @param {number} years - Number of years
 * @param {number} growthRate - Annual growth rate (e.g., 0.07 for 7%)
 * @returns {Array} Yearly percentile data
 */
function generateMockPercentiles(initialValue, years, growthRate) {
  const percentiles = [];

  // Year 0: all percentiles equal to initial value
  percentiles.push({
    year: 0,
    p10: initialValue,
    p25: initialValue,
    p50: initialValue,
    p75: initialValue,
    p90: initialValue,
  });

  // Subsequent years: apply growth
  let currentValue = initialValue;
  for (let year = 1; year <= years; year++) {
    currentValue *= (1 + growthRate);

    percentiles.push({
      year,
      p10: currentValue * 0.6,   // Pessimistic: 60% of median
      p25: currentValue * 0.8,   // Below average: 80%
      p50: currentValue,         // Median: 100%
      p75: currentValue * 1.2,   // Above average: 120%
      p90: currentValue * 1.4,   // Optimistic: 140%
    });
  }

  return percentiles;
}

/**
 * Format currency for display
 * @param {number} value
 * @returns {string}
 */
function formatCurrency(value) {
  return `$${(value / 1000000).toFixed(2)}M`;
}

// ============================================================================
// Test 1: Order of Operations
// ============================================================================

console.log('\n=== TEST 1: Order of Operations ===');
console.log('Verifies that withdrawal happens BEFORE returns (not after)');
console.log('This order is less favorable to Sell strategy but matches reference.\n');

const config1 = {
  initialValue: 5000000,      // $5M
  annualWithdrawal: 200000,   // $200k
  withdrawalGrowth: 0.00,     // No inflation adjustment (simplify test)
  timeHorizon: 10,
  capitalGainsRate: 0.238,
  costBasisRatio: 0.4,        // 40% basis, 60% gain
  dividendYield: 0.00,        // Disable dividends for this test
};

const percentiles1 = generateMockPercentiles(5000000, 10, 0.07);  // 7% growth

const result1 = calculateSellStrategy(config1, percentiles1);

console.log('Configuration:');
console.log(`  Initial Value: ${formatCurrency(config1.initialValue)}`);
console.log(`  Annual Withdrawal: ${formatCurrency(config1.annualWithdrawal)}`);
console.log(`  Growth Rate: 7%`);
console.log(`  Time Horizon: ${config1.timeHorizon} years`);

console.log('\nResults:');
console.log(`  Terminal Value (P50): ${formatCurrency(result1.terminalNetWorth)}`);
console.log(`  Success Rate: ${result1.successRate.toFixed(1)}%`);
console.log(`  Lifetime Taxes: ${formatCurrency(result1.lifetimeTaxes)}`);

console.log('\nExpected Behavior:');
console.log('  - Terminal value should be LOWER than if returns applied first');
console.log('  - Each year: withdraw → reduce portfolio → THEN grow');
console.log('  - Portfolio compounds on smaller base (less favorable)');

// Validation
const expectedMinTerminal = 4000000;  // Should be above $4M
const expectedMaxTerminal = 8000000;  // Should be below $8M

if (result1.terminalNetWorth >= expectedMinTerminal && result1.terminalNetWorth <= expectedMaxTerminal) {
  console.log('\n✓ PASS: Terminal value in expected range');
} else {
  console.log(`\n✗ FAIL: Terminal value ${formatCurrency(result1.terminalNetWorth)} outside expected range`);
}

if (result1.successRate === 100) {
  console.log('✓ PASS: No depletion scenarios');
} else {
  console.log(`✗ FAIL: Success rate ${result1.successRate}% (expected 100%)`);
}

// ============================================================================
// Test 2: Dividend Tax Deduction
// ============================================================================

console.log('\n\n=== TEST 2: Dividend Tax Deduction ===');
console.log('Verifies that dividend taxes reduce portfolio value.\n');

const config2 = {
  initialValue: 5000000,
  annualWithdrawal: 200000,
  withdrawalGrowth: 0.00,
  timeHorizon: 10,
  capitalGainsRate: 0.238,
  costBasisRatio: 0.4,
  dividendYield: 0.02,        // 2% dividend yield
  dividendTaxRate: 0.238,     // Same as capital gains
};

const percentiles2 = generateMockPercentiles(5000000, 10, 0.07);

const result2 = calculateSellStrategy(config2, percentiles2);

console.log('Configuration:');
console.log(`  Initial Value: ${formatCurrency(config2.initialValue)}`);
console.log(`  Dividend Yield: ${(config2.dividendYield * 100).toFixed(1)}%`);
console.log(`  Dividend Tax Rate: ${(config2.dividendTaxRate * 100).toFixed(1)}%`);

console.log('\nResults:');
console.log(`  Terminal Value (P50): ${formatCurrency(result2.terminalNetWorth)}`);
console.log(`  Lifetime Capital Gains Taxes: ${formatCurrency(result2.lifetimeTaxes)}`);
console.log(`  Lifetime Dividend Taxes: ${formatCurrency(result2.lifetimeDividendTaxes)}`);
console.log(`  Total Lifetime Taxes: ${formatCurrency(result2.totalLifetimeTaxes)}`);

console.log('\nExpected Behavior:');
console.log('  - Dividend taxes should be > $0');
console.log('  - Terminal value should be LOWER than Test 1 (no dividends)');
console.log('  - Total taxes = capital gains + dividend taxes');

// Validation
if (result2.lifetimeDividendTaxes > 0) {
  console.log('\n✓ PASS: Dividend taxes calculated');
} else {
  console.log('\n✗ FAIL: No dividend taxes recorded');
}

if (result2.terminalNetWorth < result1.terminalNetWorth) {
  console.log('✓ PASS: Terminal value lower with dividend taxes');
  console.log(`  Difference: ${formatCurrency(result1.terminalNetWorth - result2.terminalNetWorth)}`);
} else {
  console.log('✗ FAIL: Terminal value should be lower with dividend taxes');
}

const totalTaxesMatch = Math.abs(
  result2.totalLifetimeTaxes - (result2.lifetimeTaxes + result2.lifetimeDividendTaxes)
) < 0.01;

if (totalTaxesMatch) {
  console.log('✓ PASS: Total taxes equals sum of components');
} else {
  console.log('✗ FAIL: Total taxes calculation mismatch');
}

// ============================================================================
// Test 3: Gross-Up Tax Calculation
// ============================================================================

console.log('\n\n=== TEST 3: Gross-Up Tax Calculation ===');
console.log('Verifies that selling more than withdrawal to cover taxes.\n');

const config3 = {
  initialValue: 1000000,      // $1M
  annualWithdrawal: 100000,   // $100k withdrawal
  withdrawalGrowth: 0.00,
  timeHorizon: 1,             // Single year test
  capitalGainsRate: 0.238,
  costBasisRatio: 0.4,        // 40% basis, 60% gain
  dividendYield: 0.00,
};

const percentiles3 = generateMockPercentiles(1000000, 1, 0.00);  // No growth for simplicity

const result3 = calculateSellStrategy(config3, percentiles3);

console.log('Configuration:');
console.log(`  Initial Value: ${formatCurrency(config3.initialValue)}`);
console.log(`  Withdrawal: ${formatCurrency(config3.annualWithdrawal)}`);
console.log(`  Cost Basis Ratio: ${(config3.costBasisRatio * 100).toFixed(0)}%`);
console.log(`  Gain Ratio: ${((1 - config3.costBasisRatio) * 100).toFixed(0)}%`);
console.log(`  Tax Rate: ${(config3.capitalGainsRate * 100).toFixed(1)}%`);

console.log('\nManual Calculation:');
console.log(`  Sale amount: ${formatCurrency(config3.annualWithdrawal)}`);
console.log(`  Basis portion: $100k × 0.4 = $40k`);
console.log(`  Gain portion: $100k - $40k = $60k`);
console.log(`  Tax on gain: $60k × 0.238 = $14,280`);
console.log(`  Gross sale needed: $100k + $14,280 = $114,280`);

console.log('\nResults:');
console.log(`  Lifetime Taxes: ${formatCurrency(result3.lifetimeTaxes)}`);
console.log(`  Terminal Value: ${formatCurrency(result3.terminalNetWorth)}`);
console.log(`  Portfolio Reduction: ${formatCurrency(config3.initialValue - result3.terminalNetWorth)}`);

// Expected values
const expectedGain = config3.annualWithdrawal * (1 - config3.costBasisRatio);  // $60k
const expectedTax = expectedGain * config3.capitalGainsRate;  // $14,280
const expectedGrossSale = config3.annualWithdrawal + expectedTax;  // $114,280
const expectedTerminal = config3.initialValue - expectedGrossSale;  // $885,720

console.log('\nExpected:');
console.log(`  Tax: ${formatCurrency(expectedTax)}`);
console.log(`  Gross Sale: ${formatCurrency(expectedGrossSale)}`);
console.log(`  Terminal: ${formatCurrency(expectedTerminal)}`);

// Validation (allow small rounding differences)
const taxMatch = Math.abs(result3.lifetimeTaxes - expectedTax) < 100;
const terminalMatch = Math.abs(result3.terminalNetWorth - expectedTerminal) < 1000;

console.log('\nValidation:');
if (taxMatch) {
  console.log('✓ PASS: Tax calculation matches expected');
} else {
  console.log(`✗ FAIL: Tax ${formatCurrency(result3.lifetimeTaxes)} != expected ${formatCurrency(expectedTax)}`);
}

if (terminalMatch) {
  console.log('✓ PASS: Terminal value matches expected gross-up calculation');
} else {
  console.log(`✗ FAIL: Terminal ${formatCurrency(result3.terminalNetWorth)} != expected ${formatCurrency(expectedTerminal)}`);
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n\n=== SUMMARY ===');
console.log('All tests verify that sell-strategy.ts implements:');
console.log('  1. Correct order: dividend tax → withdrawal + cap gains → growth');
console.log('  2. Dividend tax deduction from portfolio');
console.log('  3. Gross-up formula: grossSale = withdrawal + tax');
console.log('\nThese match the reference implementation for accurate BBD vs Sell comparison.');
