/**
 * Configuration Module
 *
 * Centralized configuration for all financial calculations.
 * Import from here to access defaults and types.
 *
 * This module serves as the single source of truth for calculation parameters
 * that were previously hardcoded throughout the codebase. Centralizing these
 * values enables:
 * - Consistent defaults across all calculation modules
 * - Easy overriding for user-specific situations
 * - Clear documentation of assumptions and sources
 *
 * @module config
 *
 * @example
 * ```typescript
 * import {
 *   DEFAULT_SELL_CONFIG,
 *   DEFAULT_TAX_CONFIG,
 *   type SellCalculationConfig,
 * } from '@/config';
 *
 * // Use defaults directly
 * const taxRate = DEFAULT_TAX_CONFIG.federalCapitalGainsRate;
 *
 * // Override specific values
 * const myConfig: SellCalculationConfig = {
 *   ...DEFAULT_SELL_CONFIG,
 *   costBasisRatio: 0.3,  // My portfolio has 30% basis
 * };
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  SellCalculationConfig,
  TaxCalculationConfig,
  SBLOCCalculationConfig,
} from './types';

// ============================================================================
// Default Value Exports
// ============================================================================

export {
  DEFAULT_SELL_CONFIG,
  DEFAULT_TAX_CONFIG,
  DEFAULT_SBLOC_CALC_CONFIG,
} from './calculation-defaults';
