/**
 * Salary Equivalent Calculation
 *
 * SBLOC (Securities-Based Line of Credit) withdrawals are loan proceeds, not income.
 * Unlike salary which is taxed, you keep 100% of what you borrow. To have the same
 * spending power from salary, you'd need to earn significantly more to net the same
 * after-tax amount.
 *
 * This module calculates the pre-tax salary equivalent of tax-free SBLOC withdrawals,
 * helping users understand the true value of the BBD strategy's tax-free access to
 * their wealth.
 *
 * Example:
 * - SBLOC withdrawal: $100,000 (tax-free)
 * - At 37% effective tax rate, to net $100,000 from salary:
 *   - You'd need to earn: $100,000 / (1 - 0.37) = $158,730
 *   - Tax savings: $158,730 - $100,000 = $58,730
 *
 * Key Insight:
 * For high-income individuals, every $1 borrowed tax-free through SBLOC
 * is worth approximately $1.59 of pre-tax salary. This is the "Borrow"
 * advantage in Buy-Borrow-Die.
 *
 * @module calculations/salary-equivalent
 */

import type { SalaryEquivalent } from './types';

/**
 * Calculate the pre-tax salary equivalent of a tax-free withdrawal
 *
 * SBLOC withdrawals are not taxable income - they're loan proceeds secured
 * by your investment portfolio. This calculation shows what you'd need to
 * earn as salary (which IS taxable) to have the same after-tax spending power.
 *
 * Formula:
 * - salaryEquivalent = annualWithdrawal / (1 - effectiveTaxRate)
 * - taxSavings = salaryEquivalent - annualWithdrawal
 *
 * Why this matters:
 * - Salary is taxed at income tax rates (up to 37% federal + state)
 * - SBLOC draws are untaxed (loan, not income)
 * - To net $100k from salary at 37% tax rate, you must earn $158,730
 * - The $58,730 difference is your annual tax savings
 *
 * @param annualWithdrawal - The tax-free SBLOC withdrawal amount
 * @param effectiveTaxRate - Combined effective tax rate as decimal (0.37 = 37%)
 * @returns Complete SalaryEquivalent result with equivalent salary and savings
 *
 * @example
 * ```typescript
 * // $50k withdrawal at 37% tax rate
 * const result = calculateSalaryEquivalent(50000, 0.37);
 * // result.salaryEquivalent = 79365 ($79,365 salary needed)
 * // result.taxSavings = 29365 ($29,365 saved annually)
 *
 * // $100k withdrawal at 45% combined rate (fed + state)
 * const highTax = calculateSalaryEquivalent(100000, 0.45);
 * // highTax.salaryEquivalent = 181818 ($181,818 salary needed)
 * // highTax.taxSavings = 81818 ($81,818 saved annually)
 * ```
 */
export function calculateSalaryEquivalent(
  annualWithdrawal: number,
  effectiveTaxRate: number
): SalaryEquivalent {
  // Handle edge cases
  if (annualWithdrawal <= 0) {
    return {
      annualWithdrawal: 0,
      salaryEquivalent: 0,
      effectiveTaxRate,
      taxSavings: 0,
    };
  }

  // Tax rate must be between 0 and 1 (exclusive)
  if (effectiveTaxRate <= 0) {
    // 0% tax rate means salary equals withdrawal (no tax benefit)
    return {
      annualWithdrawal,
      salaryEquivalent: annualWithdrawal,
      effectiveTaxRate: 0,
      taxSavings: 0,
    };
  }

  if (effectiveTaxRate >= 1) {
    // 100% tax rate is invalid (would need infinite salary)
    // Return Infinity to indicate the impossibility
    return {
      annualWithdrawal,
      salaryEquivalent: Infinity,
      effectiveTaxRate,
      taxSavings: Infinity,
    };
  }

  // Core calculation:
  // After-tax income = salary * (1 - taxRate)
  // So: salary = after-tax income / (1 - taxRate)
  const salaryEquivalent = annualWithdrawal / (1 - effectiveTaxRate);

  // Tax savings is the difference between what you'd need to earn
  // and what you actually spend
  const taxSavings = salaryEquivalent - annualWithdrawal;

  return {
    annualWithdrawal,
    salaryEquivalent,
    effectiveTaxRate,
    taxSavings,
  };
}
