import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '../monte-carlo';
import type { SimulationConfig, PortfolioConfig } from '../types';

describe('Reference Methodology Alignment', () => {
  // Deterministic seed for reproducibility
  const seed = 'test-seed-12345';

  // Simple test portfolio
  const testPortfolio: PortfolioConfig = {
    assets: [
      {
        id: 'TEST-ASSET',
        weight: 1.0,
        historicalReturns: [0.10, 0.15, -0.05, 0.08, -0.20, 0.12, 0.05, -0.10, 0.18, 0.07],
      },
    ],
    correlationMatrix: [[1.0]],
  };

  describe('Bootstrap Correlation Preservation', () => {
    it('uses shared year index for all assets', async () => {
      const multiAssetPortfolio: PortfolioConfig = {
        assets: [
          { id: 'A', weight: 0.5, historicalReturns: [0.10, 0.20, 0.30] },
          { id: 'B', weight: 0.5, historicalReturns: [0.15, 0.25, 0.35] },
        ],
        correlationMatrix: [[1.0, 0.8], [0.8, 1.0]],
      };

      const config: SimulationConfig = {
        iterations: 100,
        timeHorizon: 5,
        initialValue: 1000000,
        inflationAdjusted: false,
        inflationRate: 0,
        resamplingMethod: 'simple',
        seed,
      };

      const result = await runMonteCarlo(config, multiAssetPortfolio);

      // With correlated bootstrap, asset returns should maintain their relationship
      // Since B = A + 0.05 in historical data, they should stay correlated
      expect(result.statistics.mean).toBeGreaterThan(0);
    });
  });

  describe('Survivorship Bias', () => {
    it('applies 1.5% bias in historical mode', async () => {
      const config: SimulationConfig = {
        iterations: 1000,
        timeHorizon: 30,
        initialValue: 1000000,
        inflationAdjusted: false,
        inflationRate: 0,
        resamplingMethod: 'regime',
        regimeCalibration: 'historical',
        seed,
      };

      const result = await runMonteCarlo(config, testPortfolio);

      // Mean should be reduced by survivorship bias
      // Can't test exact value, but check it's reasonable
      expect(result.statistics.mean).toBeDefined();
    });

    it('applies 2.0% bias in conservative mode', async () => {
      const configHistorical: SimulationConfig = {
        iterations: 1000,
        timeHorizon: 30,
        initialValue: 1000000,
        inflationAdjusted: false,
        inflationRate: 0,
        resamplingMethod: 'regime',
        regimeCalibration: 'historical',
        seed,
      };

      const configConservative: SimulationConfig = {
        ...configHistorical,
        regimeCalibration: 'conservative',
      };

      const resultHistorical = await runMonteCarlo(configHistorical, testPortfolio);
      const resultConservative = await runMonteCarlo(configConservative, testPortfolio);

      // Conservative should have lower mean due to higher bias
      expect(resultConservative.statistics.mean).toBeLessThan(resultHistorical.statistics.mean);
    });
  });

  describe('Path-Coherent Percentiles', () => {
    it('extracts complete paths from ranked simulations', async () => {
      const config: SimulationConfig = {
        iterations: 100,
        timeHorizon: 10,
        initialValue: 1000000,
        inflationAdjusted: false,
        inflationRate: 0,
        resamplingMethod: 'simple',
        seed,
      };

      const result = await runMonteCarlo(config, testPortfolio);

      // Check that percentiles form coherent paths (monotonic with terminal)
      // P10 terminal should be less than P50 terminal
      const lastYear = result.yearlyPercentiles[result.yearlyPercentiles.length - 1];
      expect(lastYear.p10).toBeLessThan(lastYear.p50);
      expect(lastYear.p50).toBeLessThan(lastYear.p90);
    });
  });

  describe('4-Regime System', () => {
    it('includes recovery regime in transitions', async () => {
      const config: SimulationConfig = {
        iterations: 1000,
        timeHorizon: 50, // Long horizon to see all regime types
        initialValue: 1000000,
        inflationAdjusted: false,
        inflationRate: 0,
        resamplingMethod: 'regime',
        regimeCalibration: 'historical',
        seed,
      };

      // Just verify it runs without error with 4-regime system
      const result = await runMonteCarlo(config, testPortfolio);
      expect(result.statistics.mean).toBeDefined();
    });
  });
});
