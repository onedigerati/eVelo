/**
 * Fat-tail return model tests
 */

import { describe, it, expect } from 'vitest';
import {
  studentT,
  generateFatTailReturn,
  generateCorrelatedFatTailReturns,
} from '../fat-tail';

describe('studentT', () => {
  it('should generate values with mean near 0', () => {
    const samples = 10000;
    let sum = 0;

    for (let i = 0; i < samples; i++) {
      sum += studentT(10);
    }

    const mean = sum / samples;

    // Student's t with df > 2 has mean 0
    // Allow generous tolerance due to random sampling
    expect(Math.abs(mean)).toBeLessThan(0.1);
  });

  it('should generate fatter tails with lower degrees of freedom', () => {
    const samples = 10000;
    const threshold = 3.0; // 3 standard deviations

    // Low df (fat tails)
    let fatTailCount = 0;
    for (let i = 0; i < samples; i++) {
      const value = studentT(3);
      if (Math.abs(value) > threshold) {
        fatTailCount++;
      }
    }

    // High df (thin tails, closer to normal)
    let thinTailCount = 0;
    for (let i = 0; i < samples; i++) {
      const value = studentT(30);
      if (Math.abs(value) > threshold) {
        thinTailCount++;
      }
    }

    // Lower df should have more extreme values
    expect(fatTailCount).toBeGreaterThan(thinTailCount);
  });
});

describe('generateFatTailReturn', () => {
  const historicalReturns = [
    0.10, 0.12, -0.05, 0.08, 0.15, 0.05, -0.02, 0.09, 0.11, 0.07,
  ];

  it('should generate returns based on historical statistics', () => {
    const returns: number[] = [];
    const samples = 1000;

    for (let i = 0; i < samples; i++) {
      returns.push(generateFatTailReturn(historicalReturns, 'equity_index'));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / samples;

    // Historical mean is 0.07
    // With survivorship bias of 0.002, expected mean should be ~0.072
    // Allow tolerance for random variation
    expect(mean).toBeGreaterThan(0.05);
    expect(mean).toBeLessThan(0.10);
  });

  it('should apply survivorship bias', () => {
    const returns: number[] = [];
    const samples = 10000;

    // equity_stock has 0.5% survivorship bias
    for (let i = 0; i < samples; i++) {
      returns.push(generateFatTailReturn(historicalReturns, 'equity_stock'));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / samples;
    const historicalMean = historicalReturns.reduce((sum, r) => sum + r, 0) / historicalReturns.length;

    // Mean should be close to historical mean + survivorship bias (0.005)
    // Allow tolerance for random variation (±2%)
    const expectedMean = historicalMean + 0.005;
    expect(mean).toBeGreaterThan(expectedMean - 0.02);
    expect(mean).toBeLessThan(expectedMean + 0.02);
  });

  it('should clamp extreme returns', () => {
    const returns: number[] = [];
    const samples = 10000;

    for (let i = 0; i < samples; i++) {
      const ret = generateFatTailReturn(historicalReturns, 'equity_stock');
      returns.push(ret);
    }

    // All returns should be within [-0.99, 10.0]
    for (const ret of returns) {
      expect(ret).toBeGreaterThanOrEqual(-0.99);
      expect(ret).toBeLessThanOrEqual(10.0);
    }
  });

  it('should throw error for empty historical returns', () => {
    expect(() => generateFatTailReturn([], 'equity_index')).toThrow(
      'generateFatTailReturn: historicalReturns cannot be empty'
    );
  });
});

describe('generateCorrelatedFatTailReturns', () => {
  const historicalReturns1 = [0.10, 0.12, -0.05, 0.08, 0.15];
  const historicalReturns2 = [0.08, 0.10, -0.03, 0.06, 0.12];

  it('should generate returns for multiple assets', () => {
    const correlationMatrix = [
      [1.0, 0.5],
      [0.5, 1.0],
    ];

    const returns = generateCorrelatedFatTailReturns(
      [historicalReturns1, historicalReturns2],
      ['equity_index', 'equity_index'],
      correlationMatrix
    );

    expect(returns).toHaveLength(2);
    expect(typeof returns[0]).toBe('number');
    expect(typeof returns[1]).toBe('number');
  });

  it('should respect correlation structure', () => {
    const samples = 1000;
    const correlationMatrix = [
      [1.0, 0.8],
      [0.8, 1.0],
    ];

    const returns1: number[] = [];
    const returns2: number[] = [];

    for (let i = 0; i < samples; i++) {
      const [r1, r2] = generateCorrelatedFatTailReturns(
        [historicalReturns1, historicalReturns2],
        ['equity_index', 'equity_index'],
        correlationMatrix
      );
      returns1.push(r1);
      returns2.push(r2);
    }

    // Calculate correlation between generated returns
    const mean1 = returns1.reduce((sum, r) => sum + r, 0) / samples;
    const mean2 = returns2.reduce((sum, r) => sum + r, 0) / samples;

    let covariance = 0;
    let var1 = 0;
    let var2 = 0;

    for (let i = 0; i < samples; i++) {
      const dev1 = returns1[i] - mean1;
      const dev2 = returns2[i] - mean2;
      covariance += dev1 * dev2;
      var1 += dev1 * dev1;
      var2 += dev2 * dev2;
    }

    const correlation = covariance / Math.sqrt(var1 * var2);

    // Correlation should be positive and reasonably high (0.8 target)
    // Allow tolerance for random variation
    expect(correlation).toBeGreaterThan(0.5);
    expect(correlation).toBeLessThan(1.0);
  });

  it('should throw error for mismatched asset class length', () => {
    const correlationMatrix = [
      [1.0, 0.5],
      [0.5, 1.0],
    ];

    expect(() =>
      generateCorrelatedFatTailReturns(
        [historicalReturns1, historicalReturns2],
        ['equity_index'], // Wrong length
        correlationMatrix
      )
    ).toThrow('assetClasses length must match historicalReturnsArray length');
  });

  it('should throw error for empty historical returns', () => {
    const correlationMatrix = [
      [1.0, 0.5],
      [0.5, 1.0],
    ];

    expect(() =>
      generateCorrelatedFatTailReturns(
        [[], historicalReturns2],
        ['equity_index', 'equity_index'],
        correlationMatrix
      )
    ).toThrow('generateCorrelatedFatTailReturns: historicalReturns cannot be empty');
  });
});
