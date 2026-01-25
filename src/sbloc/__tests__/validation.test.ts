import { describe, test, expect } from 'vitest';
import {
  validateSBLOCState,
  validateLTV,
  SBLOCStateValidationError,
} from '../validation';
import type { SBLOCConfig, SBLOCState } from '../types';

const defaultConfig: SBLOCConfig = {
  annualInterestRate: 0.074,
  maxLTV: 0.65,
  maintenanceMargin: 0.50,
  liquidationHaircut: 0.05,
  annualWithdrawal: 50000,
  compoundingFrequency: 'annual',
  startYear: 0,
};

describe('validateLTV', () => {
  test('accepts valid LTV values', () => {
    expect(validateLTV(0.3, 1000000, 300000)).toBe(true);
    expect(validateLTV(0.5, 1000000, 500000)).toBe(true);
    expect(validateLTV(0, 1000000, 0)).toBe(true);
  });

  test('accepts Infinity when portfolio is 0 and loan > 0', () => {
    // This is a valid edge case - portfolio crashed but loan exists
    expect(validateLTV(Infinity, 0, 100000)).toBe(true);
  });

  test('throws on NaN LTV', () => {
    expect(() => validateLTV(NaN, 0, 0)).toThrow(SBLOCStateValidationError);
    expect(() => validateLTV(NaN, 1000, 500)).toThrow(SBLOCStateValidationError);
  });

  test('throws on negative LTV', () => {
    expect(() => validateLTV(-0.5, 1000000, 500000)).toThrow(SBLOCStateValidationError);
  });

  test('throws on negative Infinity LTV', () => {
    expect(() => validateLTV(-Infinity, 1000000, 500000)).toThrow(SBLOCStateValidationError);
  });

  test('throws on unexpected Infinity (portfolio > 0)', () => {
    // Infinity is only valid when portfolio = 0 AND loan > 0
    expect(() => validateLTV(Infinity, 1000000, 500000)).toThrow(SBLOCStateValidationError);
    expect(() => validateLTV(Infinity, 0, 0)).toThrow(SBLOCStateValidationError);
  });
});

describe('validateSBLOCState', () => {
  test('accepts valid state', () => {
    const state: SBLOCState = {
      portfolioValue: 1000000,
      loanBalance: 300000,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: 5,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).not.toThrow();
  });

  test('throws on negative portfolio value', () => {
    const state: SBLOCState = {
      portfolioValue: -100000,
      loanBalance: 300000,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: 5,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).toThrow(SBLOCStateValidationError);
  });

  test('throws on NaN portfolio value', () => {
    const state: SBLOCState = {
      portfolioValue: NaN,
      loanBalance: 300000,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: 5,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).toThrow(SBLOCStateValidationError);
  });

  test('throws on negative loan balance', () => {
    const state: SBLOCState = {
      portfolioValue: 1000000,
      loanBalance: -50000,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: 5,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).toThrow(SBLOCStateValidationError);
  });

  test('throws on NaN loan balance', () => {
    const state: SBLOCState = {
      portfolioValue: 1000000,
      loanBalance: NaN,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: 5,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).toThrow(SBLOCStateValidationError);
  });

  test('throws on fractional yearsSinceStart', () => {
    const state: SBLOCState = {
      portfolioValue: 1000000,
      loanBalance: 300000,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: 5.5, // Invalid - should be integer
    };

    expect(() => validateSBLOCState(state, defaultConfig)).toThrow(SBLOCStateValidationError);
  });

  test('throws on negative yearsSinceStart', () => {
    const state: SBLOCState = {
      portfolioValue: 1000000,
      loanBalance: 300000,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: -1, // Invalid - should be non-negative
    };

    expect(() => validateSBLOCState(state, defaultConfig)).toThrow(SBLOCStateValidationError);
  });

  test('throws on NaN yearsSinceStart', () => {
    const state: SBLOCState = {
      portfolioValue: 1000000,
      loanBalance: 300000,
      currentLTV: 0.3,
      inWarningZone: false,
      yearsSinceStart: NaN,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).toThrow(SBLOCStateValidationError);
  });

  test('accepts zero portfolio with zero loan (no position)', () => {
    const state: SBLOCState = {
      portfolioValue: 0,
      loanBalance: 0,
      currentLTV: 0,
      inWarningZone: false,
      yearsSinceStart: 10,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).not.toThrow();
  });

  test('accepts total loss scenario (portfolio=0, loan>0, LTV=Infinity)', () => {
    const state: SBLOCState = {
      portfolioValue: 0,
      loanBalance: 100000,
      currentLTV: Infinity,
      inWarningZone: true,
      yearsSinceStart: 10,
    };

    expect(() => validateSBLOCState(state, defaultConfig)).not.toThrow();
  });
});

describe('SBLOCStateValidationError', () => {
  test('includes state and field information', () => {
    try {
      validateLTV(NaN, 1000000, 500000);
      // Should not reach here
      expect.fail('Expected SBLOCStateValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(SBLOCStateValidationError);
      const validationError = error as SBLOCStateValidationError;
      expect(validationError.field).toBe('currentLTV');
      expect(validationError.state).toHaveProperty('currentLTV');
      expect(validationError.message).toContain('NaN');
    }
  });

  test('error name is correct', () => {
    try {
      validateLTV(-0.5, 1000000, 500000);
      expect.fail('Expected SBLOCStateValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(SBLOCStateValidationError);
      expect((error as Error).name).toBe('SBLOCStateValidationError');
    }
  });
});
