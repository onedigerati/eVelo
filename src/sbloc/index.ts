/**
 * SBLOC Module
 *
 * Securities-Backed Line of Credit simulation for Buy-Borrow-Die strategy.
 * Provides types, interest calculations, LTV monitoring, margin call detection,
 * forced liquidation, and the main simulation step function.
 *
 * Key exports:
 * - Types: SBLOCConfig, SBLOCState, MarginCallEvent, LiquidationEvent
 * - Engine: stepSBLOC, initializeSBLOCState (main simulation functions)
 * - Monthly: stepSBLOCYear, stepSBLOCMonth, annualToMonthlyReturns (monthly granularity)
 * - Interest: accrueInterest, projectLoanBalance
 * - LTV: calculateLTV, calculateMaxBorrowing, calculateAvailableCredit
 * - Margin: detectMarginCall, isInWarningZone, calculateMarginBuffer
 * - Liquidation: executeForcedLiquidation, canRecoverFromMarginCall
 */

// Types
export type { CompoundingFrequency } from './types';
export type { SBLOCConfig, SBLOCState, MarginCallEvent, LiquidationEvent, LTVByAssetClass } from './types';

// Constants and utilities
export { DEFAULT_SBLOC_CONFIG, DEFAULT_LTV_BY_ASSET_CLASS, createInitialSBLOCState } from './types';

// Interest calculations
export {
  accrueInterest,
  calculateAnnualInterest,
  calculateMonthlyInterest,
  projectLoanBalance,
  effectiveAnnualRate,
} from './interest';

// LTV calculations
export type { AssetHolding, Portfolio } from './ltv';
export {
  calculateLTV,
  calculateMaxBorrowing,
  getEffectiveLTV,
  isWithinBorrowingLimit,
  calculateAvailableCredit,
} from './ltv';

// Margin call detection
export type { MarginBuffer } from './margin-call';
export {
  detectMarginCall,
  isInWarningZone,
  calculateMarginBuffer,
  calculateDropToMarginCall,
} from './margin-call';

// Forced liquidation
export type { LiquidationAmounts, LiquidationResult } from './liquidation';
export {
  calculateLiquidationAmount,
  calculateHaircutLoss,
  executeForcedLiquidation,
  canRecoverFromMarginCall,
} from './liquidation';

// Engine (main simulation step function)
export type { SBLOCYearResult } from './engine';
export { initializeSBLOCState, stepSBLOC } from './engine';

// Monthly step functions (monthly withdrawal granularity)
export {
  annualToMonthlyReturns,
  stepSBLOCMonth,
  stepSBLOCYear,
} from './monthly';

// State validation
export {
  validateSBLOCState,
  validateLTV,
  SBLOCStateValidationError,
} from './validation';
