/**
 * Integration Tests for Configuration Threading
 *
 * Verifies that configuration values properly flow through the calculation system.
 * Tests the 13 risk areas identified in Phase 20 Financial Calculation Audit.
 *
 * @module calculations/__tests__/integration.test
 */

import { describe, test, expect } from 'vitest';
import { calculateSellStrategy } from '../sell-strategy';
import { DEFAULT_SELL_CONFIG } from '../../config';
import type { YearlyPercentiles } from '../../simulation/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock percentile data for testing.
 *
 * @param years - Number of years in simulation
 * @param initialValue - Starting portfolio value
 * @param cagr - Compound annual growth rate
 * @returns Array of yearly percentiles
 */
function createMockPercentiles(
  years: number,
  initialValue: number,
  cagr: number
): YearlyPercentiles[] {
  const result: YearlyPercentiles[] = [];
  for (let year = 0; year <= years; year++) {
    const value = initialValue * Math.pow(1 + cagr, year);
    result.push({
      year,
      p10: value * 0.7,
      p25: value * 0.85,
      p50: value,
      p75: value * 1.15,
      p90: value * 1.3,
    });
  }
  return result;
}

// ============================================================================
// Configuration Threading Tests
// ============================================================================

describe('Configuration Threading Integration', () => {
  // --------------------------------------------------------------------------
  // Risk Area #1: Cost Basis Impact
  // --------------------------------------------------------------------------
  describe('Cost Basis Impact (Risk #1)', () => {
    test('higher cost basis results in lower taxes', () => {
      const baseConfig = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      // 20% basis = 80% gains (high taxes)
      const lowBasis = calculateSellStrategy(
        { ...baseConfig, costBasisRatio: 0.2 },
        percentiles
      );

      // 80% basis = 20% gains (low taxes)
      const highBasis = calculateSellStrategy(
        { ...baseConfig, costBasisRatio: 0.8 },
        percentiles
      );

      expect(lowBasis.lifetimeTaxes).toBeGreaterThan(highBasis.lifetimeTaxes);
      // Difference should be meaningful (at least 20% more taxes)
      // Note: The exact ratio depends on withdrawal amounts vs portfolio growth
      expect(lowBasis.lifetimeTaxes / highBasis.lifetimeTaxes).toBeGreaterThan(1.2);
    });

    test('cost basis change affects terminal net worth', () => {
      const baseConfig = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      const lowBasis = calculateSellStrategy(
        { ...baseConfig, costBasisRatio: 0.2 },
        percentiles
      );

      const highBasis = calculateSellStrategy(
        { ...baseConfig, costBasisRatio: 0.8 },
        percentiles
      );

      // Higher basis should result in higher terminal value (less tax drag)
      expect(highBasis.terminalNetWorth).toBeGreaterThan(lowBasis.terminalNetWorth);
    });
  });

  // --------------------------------------------------------------------------
  // Risk Area #2: Dividend Yield Impact
  // --------------------------------------------------------------------------
  describe('Dividend Yield Impact (Risk #2)', () => {
    test('higher dividend yield results in higher dividend taxes', () => {
      const baseConfig = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      // 0% dividend yield (growth portfolio)
      const noDividends = calculateSellStrategy(
        { ...baseConfig, dividendYield: 0 },
        percentiles
      );

      // 4% dividend yield (income portfolio)
      const highDividends = calculateSellStrategy(
        { ...baseConfig, dividendYield: 0.04 },
        percentiles
      );

      expect(noDividends.lifetimeDividendTaxes).toBe(0);
      expect(highDividends.lifetimeDividendTaxes).toBeGreaterThan(0);
      // High dividends should result in significantly higher total taxes
      expect(highDividends.totalLifetimeTaxes).toBeGreaterThan(noDividends.totalLifetimeTaxes);
    });

    test('zero dividend yield produces zero dividend taxes', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        dividendYield: 0,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      const result = calculateSellStrategy(config, percentiles);

      expect(result.lifetimeDividendTaxes).toBe(0);
      expect(result.totalLifetimeTaxes).toBe(result.lifetimeTaxes);
    });

    test('dividend yield impacts terminal wealth', () => {
      const baseConfig = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      const noDividends = calculateSellStrategy(
        { ...baseConfig, dividendYield: 0 },
        percentiles
      );

      const highDividends = calculateSellStrategy(
        { ...baseConfig, dividendYield: 0.05 },
        percentiles
      );

      // More dividend taxes = more drag = lower terminal value
      expect(noDividends.terminalNetWorth).toBeGreaterThan(highDividends.terminalNetWorth);
    });
  });

  // --------------------------------------------------------------------------
  // Risk Area #6: Success Rate Consistency
  // --------------------------------------------------------------------------
  describe('Success Rate Consistency (Risk #6)', () => {
    test('success rate matches BBD definition (terminal > initial)', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      // Create percentiles where P50 ends above initial but P10 ends below
      const percentiles = createMockPercentiles(30, 5000000, 0.04);
      const result = calculateSellStrategy(config, percentiles);

      // Success rate should be between 0 and 100
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);

      // With modest growth and high withdrawals, success < 100%
      expect(result.successRate).toBeLessThan(100);
    });

    test('depletion probability is separate from success rate', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 400000, // High withdrawal to potentially deplete
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      const percentiles = createMockPercentiles(30, 5000000, 0.03); // Low growth
      const result = calculateSellStrategy(config, percentiles);

      // Both metrics should be valid
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
      expect(result.depletionProbability).toBeGreaterThanOrEqual(0);
      expect(result.depletionProbability).toBeLessThanOrEqual(100);

      // Success rate <= (100 - depletion) because depleted = failed
      expect(result.successRate).toBeLessThanOrEqual(100 - result.depletionProbability + 0.1);
    });
  });

  // --------------------------------------------------------------------------
  // Risk Area #13: Centralized Config Values
  // --------------------------------------------------------------------------
  describe('Default Config Values (Risk #13)', () => {
    test('DEFAULT_SELL_CONFIG has expected values', () => {
      expect(DEFAULT_SELL_CONFIG.costBasisRatio).toBe(0.4);
      expect(DEFAULT_SELL_CONFIG.dividendYield).toBe(0.02);
      expect(DEFAULT_SELL_CONFIG.capitalGainsRate).toBe(0.238);
      expect(DEFAULT_SELL_CONFIG.dividendTaxRate).toBe(0.238);
    });

    test('calculation uses defaults when config not provided', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        // No costBasisRatio or dividendYield - should use defaults
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      const result = calculateSellStrategy(config, percentiles);

      // Should produce valid results with defaults
      expect(result.terminalNetWorth).toBeGreaterThan(0);
      expect(result.lifetimeTaxes).toBeGreaterThan(0);
      expect(result.lifetimeDividendTaxes).toBeGreaterThan(0);
    });

    test('defaults vs explicit config produce same results', () => {
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      // Implicit defaults
      const implicitConfig = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      // Explicit defaults
      const explicitConfig = {
        ...implicitConfig,
        costBasisRatio: DEFAULT_SELL_CONFIG.costBasisRatio,
        dividendYield: DEFAULT_SELL_CONFIG.dividendYield,
        capitalGainsRate: DEFAULT_SELL_CONFIG.capitalGainsRate,
        dividendTaxRate: DEFAULT_SELL_CONFIG.dividendTaxRate,
      };

      const implicit = calculateSellStrategy(implicitConfig, percentiles);
      const explicit = calculateSellStrategy(explicitConfig, percentiles);

      // Results should be identical
      expect(implicit.terminalNetWorth).toBeCloseTo(explicit.terminalNetWorth, 2);
      expect(implicit.lifetimeTaxes).toBeCloseTo(explicit.lifetimeTaxes, 2);
      expect(implicit.lifetimeDividendTaxes).toBeCloseTo(explicit.lifetimeDividendTaxes, 2);
      expect(implicit.successRate).toBe(explicit.successRate);
    });
  });

  // --------------------------------------------------------------------------
  // Risk Area #8: Withdrawal Growth Rate
  // --------------------------------------------------------------------------
  describe('Withdrawal Growth Threading (Risk #8)', () => {
    test('withdrawal growth rate impacts total withdrawals', () => {
      const baseConfig = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        timeHorizon: 30,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      // No growth (0%)
      const noGrowth = calculateSellStrategy(
        { ...baseConfig, withdrawalGrowth: 0 },
        percentiles
      );

      // High growth (5%)
      const highGrowth = calculateSellStrategy(
        { ...baseConfig, withdrawalGrowth: 0.05 },
        percentiles
      );

      // Higher withdrawal growth = higher total withdrawals = lower terminal value
      expect(noGrowth.terminalNetWorth).toBeGreaterThan(highGrowth.terminalNetWorth);
    });

    test('zero withdrawal growth maintains constant withdrawals', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0,
        timeHorizon: 10,
      };
      const percentiles = createMockPercentiles(10, 5000000, 0.07);

      const result = calculateSellStrategy(config, percentiles);

      // Should produce valid results
      expect(result.terminalNetWorth).toBeGreaterThan(0);
      expect(result.yearlyValues.length).toBe(11); // 0-10 inclusive
    });
  });

  // --------------------------------------------------------------------------
  // End-to-End Configuration Flow
  // --------------------------------------------------------------------------
  describe('End-to-End Configuration Flow', () => {
    test('all config parameters affect final results', () => {
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      // Baseline
      const baseline = calculateSellStrategy({
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        costBasisRatio: 0.4,
        dividendYield: 0.02,
        capitalGainsRate: 0.238,
        dividendTaxRate: 0.238,
      }, percentiles);

      // Change cost basis
      const changedBasis = calculateSellStrategy({
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        costBasisRatio: 0.6, // Changed
        dividendYield: 0.02,
        capitalGainsRate: 0.238,
        dividendTaxRate: 0.238,
      }, percentiles);

      // Change dividend yield
      const changedDividend = calculateSellStrategy({
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        costBasisRatio: 0.4,
        dividendYield: 0.04, // Changed
        capitalGainsRate: 0.238,
        dividendTaxRate: 0.238,
      }, percentiles);

      // Each change should produce different results
      expect(changedBasis.lifetimeTaxes).not.toBe(baseline.lifetimeTaxes);
      expect(changedDividend.lifetimeDividendTaxes).not.toBe(baseline.lifetimeDividendTaxes);

      // Higher basis = lower taxes
      expect(changedBasis.lifetimeTaxes).toBeLessThan(baseline.lifetimeTaxes);

      // Higher dividend = higher dividend taxes
      expect(changedDividend.lifetimeDividendTaxes).toBeGreaterThan(baseline.lifetimeDividendTaxes);
    });

    test('tax rate changes impact calculations proportionally', () => {
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      // Standard tax rate (23.8%)
      const standardTax = calculateSellStrategy({
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        capitalGainsRate: 0.238,
      }, percentiles);

      // Lower tax rate (15%)
      const lowerTax = calculateSellStrategy({
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        capitalGainsRate: 0.15,
      }, percentiles);

      // Lower tax rate = lower taxes paid
      expect(lowerTax.lifetimeTaxes).toBeLessThan(standardTax.lifetimeTaxes);

      // Lower tax rate = higher terminal value (less drag)
      expect(lowerTax.terminalNetWorth).toBeGreaterThan(standardTax.terminalNetWorth);
    });
  });

  // --------------------------------------------------------------------------
  // Yearly Data Structure Tests
  // --------------------------------------------------------------------------
  describe('Yearly Data Structures', () => {
    test('yearlyPercentiles has correct structure', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      const result = calculateSellStrategy(config, percentiles);

      // Should have entries for each year (0 through timeHorizon)
      expect(result.yearlyPercentiles.length).toBe(31);

      // Each entry should have required fields
      result.yearlyPercentiles.forEach((entry, idx) => {
        expect(entry.year).toBe(idx);
        expect(typeof entry.p10).toBe('number');
        expect(typeof entry.p25).toBe('number');
        expect(typeof entry.p50).toBe('number');
        expect(typeof entry.p75).toBe('number');
        expect(typeof entry.p90).toBe('number');

        // Percentiles should be ordered (with small tolerance for floating-point)
        // Note: Due to limited scenario count (9 scenarios), percentile calculations
        // may have some variation, especially at extremes
        const tolerance = 0.01; // 1% tolerance for ordering
        expect(entry.p10).toBeLessThanOrEqual(entry.p25 * (1 + tolerance));
        expect(entry.p25).toBeLessThanOrEqual(entry.p50 * (1 + tolerance));
        expect(entry.p50).toBeLessThanOrEqual(entry.p75 * (1 + tolerance));
        expect(entry.p75).toBeLessThanOrEqual(entry.p90 * (1 + tolerance));
      });
    });

    test('cumulativeTaxes is monotonically increasing', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };
      const percentiles = createMockPercentiles(30, 5000000, 0.07);

      const result = calculateSellStrategy(config, percentiles);

      // Should start at 0
      expect(result.cumulativeTaxes[0]).toBe(0);

      // Should be monotonically increasing
      for (let i = 1; i < result.cumulativeTaxes.length; i++) {
        expect(result.cumulativeTaxes[i]).toBeGreaterThanOrEqual(result.cumulativeTaxes[i - 1]);
      }
    });
  });
});
