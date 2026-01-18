/**
 * SBLOC Module
 *
 * Securities-Backed Line of Credit simulation for Buy-Borrow-Die strategy.
 * Provides types, interest calculations, and state management.
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
