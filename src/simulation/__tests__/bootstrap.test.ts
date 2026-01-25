/**
 * Bootstrap Resampling Tests
 *
 * Tests for correlation-preserving bootstrap methods.
 * Verifies that shared year index sampling maintains cross-asset correlations.
 */

import { describe, it, expect } from 'vitest';
import {
  simpleBootstrap,
  blockBootstrap,
  correlatedBootstrap,
  correlatedBlockBootstrap,
  optimalBlockLength,
} from '../bootstrap';

/**
 * Create a seeded RNG for reproducible tests
 */
function createSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    // Simple LCG (Linear Congruential Generator)
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    return 0;
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
}

describe('Bootstrap Resampling', () => {
  describe('simpleBootstrap', () => {
    it('should resample with replacement', () => {
      const returns = [0.1, 0.2, 0.3];
      const rng = createSeededRng(12345);
      const result = simpleBootstrap(returns, 10, rng);

      expect(result).toHaveLength(10);
      // All resampled values should exist in original data
      result.forEach(value => {
        expect(returns).toContain(value);
      });
    });

    it('should throw error for empty returns', () => {
      const rng = createSeededRng(12345);
      expect(() => simpleBootstrap([], 10, rng)).toThrow('Cannot bootstrap from empty returns array');
    });

    it('should produce different results with different seeds', () => {
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5];
      const result1 = simpleBootstrap(returns, 10, createSeededRng(111));
      const result2 = simpleBootstrap(returns, 10, createSeededRng(222));

      // Very unlikely to be identical with different seeds
      expect(result1).not.toEqual(result2);
    });
  });

  describe('blockBootstrap', () => {
    it('should preserve block structure', () => {
      const returns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const rng = createSeededRng(12345);
      const blockSize = 3;
      const result = blockBootstrap(returns, 12, rng, blockSize);

      expect(result).toHaveLength(12);

      // Check that blocks are contiguous from original series
      // Sample a few blocks and verify they appear in order
      for (let i = 0; i < result.length - 2; i += blockSize) {
        const block = result.slice(i, i + blockSize);
        // Find this block pattern in original data
        let foundInOriginal = false;
        for (let j = 0; j <= returns.length - blockSize; j++) {
          const originalBlock = returns.slice(j, j + blockSize);
          if (JSON.stringify(block.slice(0, Math.min(block.length, blockSize))) ===
              JSON.stringify(originalBlock.slice(0, Math.min(block.length, blockSize)))) {
            foundInOriginal = true;
            break;
          }
        }
        expect(foundInOriginal).toBe(true);
      }
    });

    it('should handle series shorter than target length', () => {
      const returns = [0.1, 0.2, 0.3];
      const rng = createSeededRng(12345);
      const result = blockBootstrap(returns, 10, rng);

      expect(result).toHaveLength(10);
    });

    it('should throw error for empty returns', () => {
      const rng = createSeededRng(12345);
      expect(() => blockBootstrap([], 10, rng)).toThrow('Cannot bootstrap from empty returns array');
    });
  });

  describe('optimalBlockLength', () => {
    it('should return sensible block length for typical data', () => {
      const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i / 10) * 0.1);
      const blockLength = optimalBlockLength(returns);

      expect(blockLength).toBeGreaterThanOrEqual(3);
      expect(blockLength).toBeLessThanOrEqual(25); // n/4 = 25
    });

    it('should handle short series', () => {
      const returns = [0.1, 0.2, 0.3, 0.4, 0.5];
      const blockLength = optimalBlockLength(returns);

      expect(blockLength).toBeGreaterThanOrEqual(3);
    });

    it('should handle constant series', () => {
      const returns = Array.from({ length: 20 }, () => 0.05);
      const blockLength = optimalBlockLength(returns);

      expect(blockLength).toBe(3); // Falls back to minimum
    });
  });

  describe('correlatedBootstrap', () => {
    it('should preserve perfect positive correlation', () => {
      // Create two perfectly correlated assets (same returns)
      const asset1 = [0.10, 0.05, -0.03, 0.12, -0.08, 0.15, 0.02, -0.05];
      const asset2 = [0.10, 0.05, -0.03, 0.12, -0.08, 0.15, 0.02, -0.05]; // Identical

      const rng = createSeededRng(12345);
      const results = correlatedBootstrap([asset1, asset2], 100, rng);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(100);
      expect(results[1]).toHaveLength(100);

      // Calculate correlation of resampled data
      const correlation = calculateCorrelation(results[0], results[1]);

      // Should maintain perfect correlation
      expect(correlation).toBeCloseTo(1.0, 1);
    });

    it('should preserve strong positive correlation', () => {
      // Create two strongly correlated assets
      const asset1 = [0.10, 0.05, -0.03, 0.12, -0.08, 0.15, 0.02, -0.05, 0.08, -0.02];
      const asset2 = [0.12, 0.04, -0.04, 0.14, -0.10, 0.16, 0.03, -0.06, 0.09, -0.03]; // Similar pattern

      const rng = createSeededRng(12345);
      const results = correlatedBootstrap([asset1, asset2], 100, rng);

      // Calculate correlation of original data
      const originalCorr = calculateCorrelation(asset1, asset2);

      // Calculate correlation of resampled data
      const resampledCorr = calculateCorrelation(results[0], results[1]);

      // Resampled correlation should match original correlation
      // (within tolerance due to sampling variability)
      expect(Math.abs(resampledCorr - originalCorr)).toBeLessThan(0.1);
    });

    it('should preserve negative correlation', () => {
      // Create two negatively correlated assets
      const asset1 = [0.10, 0.05, -0.03, 0.12, -0.08, 0.15, 0.02, -0.05];
      const asset2 = [-0.10, -0.05, 0.03, -0.12, 0.08, -0.15, -0.02, 0.05]; // Opposite

      const rng = createSeededRng(12345);
      const results = correlatedBootstrap([asset1, asset2], 100, rng);

      // Calculate correlation of resampled data
      const correlation = calculateCorrelation(results[0], results[1]);

      // Should maintain negative correlation
      expect(correlation).toBeLessThan(-0.9);
    });

    it('should sample same year index for all assets', () => {
      // Create assets with easily verifiable patterns
      const asset1 = [1, 2, 3, 4, 5];
      const asset2 = [10, 20, 30, 40, 50];
      const asset3 = [100, 200, 300, 400, 500];

      const rng = createSeededRng(12345);
      const results = correlatedBootstrap([asset1, asset2, asset3], 10, rng);

      // Verify that for each year, the asset values are from the same historical year
      for (let i = 0; i < 10; i++) {
        const val1 = results[0][i];
        const val2 = results[1][i];
        const val3 = results[2][i];

        // Find which year this came from
        const yearIdx1 = asset1.indexOf(val1);
        const yearIdx2 = asset2.indexOf(val2);
        const yearIdx3 = asset3.indexOf(val3);

        // All three assets should have sampled from the same year
        expect(yearIdx1).toBe(yearIdx2);
        expect(yearIdx2).toBe(yearIdx3);
      }
    });

    it('should handle minimum length constraint', () => {
      // Assets with different historical lengths
      const asset1 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
      const asset2 = [0.15, 0.25, 0.35]; // Much shorter

      const rng = createSeededRng(12345);
      const results = correlatedBootstrap([asset1, asset2], 10, rng);

      // Should only sample from first 3 years (min length)
      results[0].forEach(value => {
        expect([0.1, 0.2, 0.3]).toContain(value);
      });
      results[1].forEach(value => {
        expect([0.15, 0.25, 0.35]).toContain(value);
      });
    });

    it('should throw error for empty asset array', () => {
      const rng = createSeededRng(12345);
      expect(() => correlatedBootstrap([], 10, rng)).toThrow('Cannot bootstrap from empty asset array');
    });

    it('should throw error if all assets have zero length', () => {
      const rng = createSeededRng(12345);
      expect(() => correlatedBootstrap([[], []], 10, rng)).toThrow('All assets must have at least one historical return');
    });
  });

  describe('correlatedBlockBootstrap', () => {
    it('should preserve correlation with block structure', () => {
      // Create two correlated assets with autocorrelation
      const asset1 = [0.10, 0.11, 0.09, -0.03, -0.04, -0.02, 0.12, 0.13, 0.11];
      const asset2 = [0.12, 0.13, 0.11, -0.04, -0.05, -0.03, 0.14, 0.15, 0.13];

      const rng = createSeededRng(12345);
      const blockSize = 3;
      const results = correlatedBlockBootstrap([asset1, asset2], 30, rng, blockSize);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(30);
      expect(results[1]).toHaveLength(30);

      // Calculate correlation of resampled data
      const correlation = calculateCorrelation(results[0], results[1]);

      // Should maintain high correlation
      expect(correlation).toBeGreaterThan(0.8);
    });

    it('should sample same block index for all assets', () => {
      const asset1 = [1, 2, 3, 4, 5, 6];
      const asset2 = [10, 20, 30, 40, 50, 60];

      const rng = createSeededRng(12345);
      const blockSize = 2;
      const results = correlatedBlockBootstrap([asset1, asset2], 10, rng, blockSize);

      // Verify blocks are aligned across assets
      // If asset1 has [1,2], asset2 should have [10,20]
      // If asset1 has [3,4], asset2 should have [30,40]
      // etc.
      for (let i = 0; i < results[0].length; i++) {
        const val1 = results[0][i];
        const val2 = results[1][i];

        // val2 should be val1 * 10
        expect(val2).toBe(val1 * 10);
      }
    });

    it('should handle minimum length constraint with blocks', () => {
      const asset1 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const asset2 = [0.15, 0.25, 0.35]; // Shorter

      const rng = createSeededRng(12345);
      const blockSize = 2;
      const results = correlatedBlockBootstrap([asset1, asset2], 10, rng, blockSize);

      // Should only sample from first 3 years (min length)
      // With blockSize 2, can only use blocks starting at indices 0 or 1
      results[0].forEach(value => {
        expect([0.1, 0.2, 0.3]).toContain(value);
      });
      results[1].forEach(value => {
        expect([0.15, 0.25, 0.35]).toContain(value);
      });
    });

    it('should throw error for empty asset array', () => {
      const rng = createSeededRng(12345);
      expect(() => correlatedBlockBootstrap([], 10, rng)).toThrow('Cannot bootstrap from empty asset array');
    });

    it('should throw error if all assets have zero length', () => {
      const rng = createSeededRng(12345);
      expect(() => correlatedBlockBootstrap([[], []], 10, rng)).toThrow('All assets must have at least one historical return');
    });

    it('should auto-calculate block size if not provided', () => {
      const asset1 = Array.from({ length: 50 }, (_, i) => Math.sin(i / 5) * 0.1);
      const asset2 = Array.from({ length: 50 }, (_, i) => Math.sin(i / 5) * 0.12);

      const rng = createSeededRng(12345);
      const results = correlatedBlockBootstrap([asset1, asset2], 30, rng);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(30);
      expect(results[1]).toHaveLength(30);
    });
  });

  describe('Correlation preservation comparison', () => {
    it('should demonstrate correlation preservation advantage', () => {
      // Create two assets with strong positive correlation
      const asset1 = [0.10, 0.05, -0.03, 0.12, -0.08, 0.15, 0.02, -0.05, 0.08, -0.02];
      const asset2 = [0.12, 0.06, -0.02, 0.14, -0.07, 0.17, 0.03, -0.04, 0.09, -0.01];

      const originalCorr = calculateCorrelation(asset1, asset2);
      expect(originalCorr).toBeGreaterThan(0.95); // Strong positive correlation

      // Independent sampling (old method)
      const rng1 = createSeededRng(11111);
      const independent1 = simpleBootstrap(asset1, 100, rng1);
      const rng2 = createSeededRng(22222); // Different seed = independent
      const independent2 = simpleBootstrap(asset2, 100, rng2);
      const independentCorr = calculateCorrelation(independent1, independent2);

      // Correlated sampling (new method)
      const rng3 = createSeededRng(33333);
      const correlated = correlatedBootstrap([asset1, asset2], 100, rng3);
      const correlatedCorr = calculateCorrelation(correlated[0], correlated[1]);

      // Correlated method should preserve correlation better
      expect(Math.abs(correlatedCorr - originalCorr)).toBeLessThan(0.15);

      // Independent method should break correlation
      // (though with random sampling, might occasionally be close)
      // On average, independent correlation should be much weaker
      console.log(`Original correlation: ${originalCorr.toFixed(3)}`);
      console.log(`Independent sampling correlation: ${independentCorr.toFixed(3)}`);
      console.log(`Correlated sampling correlation: ${correlatedCorr.toFixed(3)}`);
    });
  });
});
