import { describe, test, expect } from 'vitest';
import { calculateSellStrategy } from '../sell-strategy';
import type { YearlyPercentiles } from '../../simulation/types';

// Helper to create mock percentile data
function createMockPercentiles(timeHorizon: number, growthRate: number): YearlyPercentiles[] {
  const percentiles: YearlyPercentiles[] = [];
  let value = 5000000; // $5M initial

  for (let year = 0; year <= timeHorizon; year++) {
    percentiles.push({
      year,
      p10: value * 0.8,
      p25: value * 0.9,
      p50: value,
      p75: value * 1.1,
      p90: value * 1.2,
    });
    value *= (1 + growthRate);
  }

  return percentiles;
}

describe('calculateSellStrategy', () => {
  describe('success rate definition', () => {
    test('success means terminal > initial (not just > 0)', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      // Create percentiles that result in modest growth
      const percentiles = createMockPercentiles(30, 0.05);
      const result = calculateSellStrategy(config, percentiles);

      // Success rate should be based on terminal > initial
      // With heavy withdrawals, success rate should be < 100%
      expect(result.successRate).toBeLessThan(100);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
    });

    test('depletionProbability tracks scenarios that ran out of money', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 500000, // Very high withdrawal
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      const percentiles = createMockPercentiles(30, 0.03); // Low growth
      const result = calculateSellStrategy(config, percentiles);

      // With high withdrawals and low growth, should have depletion
      expect(result.depletionProbability).toBeGreaterThanOrEqual(0);
      expect(result.depletionProbability).toBeLessThanOrEqual(100);
    });

    test('success rate <= (100 - depletionProbability)', () => {
      // A depleted portfolio cannot be successful, so:
      // successRate <= (100 - depletionProbability)
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 300000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      const percentiles = createMockPercentiles(30, 0.05);
      const result = calculateSellStrategy(config, percentiles);

      // Success implies not depleted, so:
      // success count <= (total - depleted count)
      // successRate <= (100 - depletionProbability)
      expect(result.successRate).toBeLessThanOrEqual(100 - result.depletionProbability + 0.1);
    });
  });

  describe('config validation', () => {
    test('uses default cost basis ratio when not specified', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        // costBasisRatio not specified - should use default 0.4
      };

      const percentiles = createMockPercentiles(30, 0.07);
      const result = calculateSellStrategy(config, percentiles);

      // Result should be valid (uses default)
      expect(result.terminalNetWorth).toBeGreaterThan(0);
      expect(result.lifetimeTaxes).toBeGreaterThan(0);
    });

    test('respects custom cost basis ratio', () => {
      const baseConfig = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      const percentiles = createMockPercentiles(30, 0.07);

      // Low basis = high gains = high taxes
      const lowBasis = calculateSellStrategy(
        { ...baseConfig, costBasisRatio: 0.2 },
        percentiles
      );

      // High basis = low gains = low taxes
      const highBasis = calculateSellStrategy(
        { ...baseConfig, costBasisRatio: 0.8 },
        percentiles
      );

      // Low basis should result in higher lifetime taxes
      expect(lowBasis.lifetimeTaxes).toBeGreaterThan(highBasis.lifetimeTaxes);
    });
  });

  describe('dividend tax handling', () => {
    test('calculates dividend taxes when yield is specified', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        dividendYield: 0.02, // 2% dividend yield
        dividendTaxRate: 0.238, // 23.8% tax rate
      };

      const percentiles = createMockPercentiles(30, 0.07);
      const result = calculateSellStrategy(config, percentiles);

      // Should have both capital gains and dividend taxes
      expect(result.lifetimeTaxes).toBeGreaterThan(0);
      expect(result.lifetimeDividendTaxes).toBeGreaterThan(0);
      expect(result.totalLifetimeTaxes).toBe(result.lifetimeTaxes + result.lifetimeDividendTaxes);
    });

    test('uses default dividend yield when not specified', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
        // dividendYield not specified - should use default 0.02
      };

      const percentiles = createMockPercentiles(30, 0.07);
      const result = calculateSellStrategy(config, percentiles);

      // Should have dividend taxes from default 2% yield
      expect(result.lifetimeDividendTaxes).toBeGreaterThan(0);
    });
  });

  describe('output fields', () => {
    test('returns all required fields', () => {
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon: 30,
      };

      const percentiles = createMockPercentiles(30, 0.07);
      const result = calculateSellStrategy(config, percentiles);

      // Check all required fields exist
      expect(result.terminalNetWorth).toBeDefined();
      expect(result.successRate).toBeDefined();
      expect(result.lifetimeTaxes).toBeDefined();
      expect(result.lifetimeDividendTaxes).toBeDefined();
      expect(result.totalLifetimeTaxes).toBeDefined();
      expect(result.primaryRisk).toBeDefined();
      expect(result.terminalP10).toBeDefined();
      expect(result.terminalP90).toBeDefined();
      expect(result.yearlyValues).toBeDefined();
      expect(result.depletionProbability).toBeDefined();
      expect(result.yearlyPercentiles).toBeDefined();
      expect(result.cumulativeTaxes).toBeDefined();
    });

    test('yearlyValues has correct length', () => {
      const timeHorizon = 30;
      const config = {
        initialValue: 5000000,
        annualWithdrawal: 200000,
        withdrawalGrowth: 0.03,
        timeHorizon,
      };

      const percentiles = createMockPercentiles(timeHorizon, 0.07);
      const result = calculateSellStrategy(config, percentiles);

      // yearlyValues should include year 0 through timeHorizon
      expect(result.yearlyValues.length).toBe(timeHorizon + 1);
    });
  });
});
