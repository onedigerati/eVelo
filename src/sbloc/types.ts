/**
 * SBLOC (Securities-Backed Line of Credit) Types
 *
 * Type definitions for securities-backed lending simulation following the
 * Buy-Borrow-Die wealth management strategy. These types support:
 * - SBLOC configuration and terms
 * - State tracking during simulation
 * - Margin call and liquidation event handling
 * - Asset-class-specific LTV limits
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Compounding frequency for interest calculations
 *
 * The compounding frequency determines how often interest is calculated and
 * added to the principal, which affects the Effective Annual Rate (EAR).
 *
 * - 'annual': Interest calculated once per year. EAR = nominal rate.
 * - 'monthly': Interest calculated 12x/year. EAR = (1 + r/12)^12 - 1.
 *
 * Example at 7.4% nominal rate:
 * - Annual:  EAR = 7.40% ($7,400 interest on $100,000)
 * - Monthly: EAR = 7.66% ($7,660 interest on $100,000)
 *
 * Most real SBLOCs use daily or monthly compounding. Users should select
 * 'monthly' for more realistic/conservative simulations.
 */
export type CompoundingFrequency = 'annual' | 'monthly';

/**
 * SBLOC Configuration - User-configurable securities-backed loan terms
 *
 * These parameters define the lending terms for BBD strategy simulation.
 * Typical values based on major brokerages (Schwab, Fidelity, Interactive Brokers):
 * - Interest rates: 6-9% annual (varies with Fed funds rate + spread)
 * - Max LTV: 50-70% depending on asset type
 * - Maintenance margin: 30-50% (varies by broker)
 *
 * @example
 * ```typescript
 * const config: SBLOCConfig = {
 *   annualInterestRate: 0.074,  // 7.4% annual rate
 *   maxLTV: 0.65,               // 65% max loan-to-value
 *   maintenanceMargin: 0.50,    // 50% maintenance threshold
 *   liquidationHaircut: 0.05,   // 5% forced sale discount
 *   annualWithdrawal: 50000,    // $50k/year draw
 *   compoundingFrequency: 'annual',
 *   startYear: 0                // Start immediately
 * };
 * ```
 */
export interface SBLOCConfig {
  /**
   * Annual interest rate as decimal (e.g., 0.074 for 7.4%)
   * Typical range: 0.05 - 0.10 depending on market conditions
   */
  annualInterestRate: number;

  /**
   * Maximum loan-to-value ratio before margin call (e.g., 0.65 for 65%)
   * When LTV exceeds this, margin call is triggered
   */
  maxLTV: number;

  /**
   * Maintenance margin threshold - warning zone starts here (e.g., 0.50 for 50%)
   * When LTV is between maintenanceMargin and maxLTV, account is in warning zone
   */
  maintenanceMargin: number;

  /**
   * Forced sale loss percentage during liquidation (e.g., 0.05 for 5%)
   * Applied as discount when assets are forcibly sold to meet margin call
   */
  liquidationHaircut: number;

  /**
   * Annual withdrawal amount in dollars
   * This is the yearly draw from the line of credit for living expenses
   */
  annualWithdrawal: number;

  /**
   * How interest compounds on the loan balance
   *
   * - 'annual': Interest calculated once per year. EAR equals nominal rate.
   * - 'monthly': Interest calculated 12x/year at (rate/12) per month.
   *              EAR = (1 + r/12)^12 - 1, roughly 0.26% higher than nominal.
   *
   * Impact example at 7.4% nominal over 30 years on $1M loan:
   * - Annual:  Final balance = $8.5M
   * - Monthly: Final balance = $9.2M (8% more debt)
   *
   * Most real SBLOCs compound daily or monthly. Select 'monthly' for
   * more realistic/conservative projections.
   *
   * @default 'annual'
   */
  compoundingFrequency: CompoundingFrequency;

  /**
   * Year when BBD withdrawals begin (0 = immediately, 5 = year 5, etc.)
   * Useful for modeling accumulation phase before retirement draws
   */
  startYear: number;

  /**
   * Annual growth rate for withdrawal amounts (e.g., 0.03 for 3%)
   * Models inflation-adjusted spending to maintain purchasing power.
   *
   * Year 0 withdrawal = annualWithdrawal
   * Year N withdrawal = annualWithdrawal * (1 + withdrawalGrowthRate)^N
   *
   * Note: When used with Monte Carlo simulation (monte-carlo.ts), growth is
   * computed externally via SBLOCSimConfig.annualWithdrawalRaise and passed
   * as an adjusted annualWithdrawal each year. This field is for standalone
   * SBLOC engine use only.
   *
   * @default 0.03 (3% annual growth)
   */
  withdrawalGrowthRate?: number;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * SBLOC State - Current state during simulation
 *
 * Tracks the real-time status of the securities-backed loan throughout
 * each simulation iteration. Updated after each time step.
 *
 * @example
 * ```typescript
 * const state: SBLOCState = {
 *   loanBalance: 150000,      // Current debt
 *   portfolioValue: 500000,   // Current collateral
 *   currentLTV: 0.30,         // 30% loan-to-value
 *   inWarningZone: false,     // Below maintenance threshold
 *   yearsSinceStart: 3        // 3 years into withdrawal phase
 * };
 * ```
 */
export interface SBLOCState {
  /**
   * Current outstanding loan balance in dollars
   * Includes principal + accrued interest
   */
  loanBalance: number;

  /**
   * Current market value of pledged securities (collateral)
   * This fluctuates with market returns
   */
  portfolioValue: number;

  /**
   * Current loan-to-value ratio (loanBalance / portfolioValue)
   * Range: 0 to 1+ (can exceed 1 if portfolio crashes below loan balance)
   */
  currentLTV: number;

  /**
   * Whether account is in warning zone (between maintenanceMargin and maxLTV)
   * Indicates elevated risk but no immediate margin call
   */
  inWarningZone: boolean;

  /**
   * Years elapsed since withdrawal phase began
   * Used to track when to apply annual withdrawals
   */
  yearsSinceStart: number;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Margin Call Event - Triggered when LTV exceeds maxLTV
 *
 * Records the conditions at the moment a margin call occurs.
 * Multiple margin calls can occur during a single simulation iteration
 * if the portfolio continues to decline.
 *
 * @example
 * ```typescript
 * const marginCall: MarginCallEvent = {
 *   year: 7,
 *   ltvAtTrigger: 0.68,      // LTV when call triggered
 *   loanBalance: 340000,
 *   portfolioValue: 500000
 * };
 * ```
 */
export interface MarginCallEvent {
  /** Year of simulation when margin call occurred */
  year: number;

  /** LTV ratio at the moment of trigger (exceeded maxLTV) */
  ltvAtTrigger: number;

  /** Outstanding loan balance when triggered */
  loanBalance: number;

  /** Portfolio value when triggered */
  portfolioValue: number;
}

/**
 * Liquidation Event - Result of forced asset sale to meet margin call
 *
 * When a margin call cannot be met with additional collateral,
 * assets are forcibly sold (at a haircut) to reduce the loan balance.
 *
 * @example
 * ```typescript
 * const liquidation: LiquidationEvent = {
 *   year: 7,
 *   assetsLiquidated: 100000,   // Gross assets sold
 *   haircut: 5000,              // 5% loss from forced sale
 *   loanRepaid: 95000,          // Net applied to loan
 *   newLoanBalance: 245000,
 *   newPortfolioValue: 400000,
 *   capitalGainsTax: 15000      // Tax triggered by sale
 * };
 * ```
 */
export interface LiquidationEvent {
  /** Year of simulation when liquidation occurred */
  year: number;

  /** Gross dollar amount of assets liquidated */
  assetsLiquidated: number;

  /** Dollar amount lost to forced-sale haircut */
  haircut: number;

  /** Net amount applied to loan repayment (assetsLiquidated - haircut) */
  loanRepaid: number;

  /** Loan balance after liquidation */
  newLoanBalance: number;

  /** Portfolio value after liquidation */
  newPortfolioValue: number;

  /**
   * Capital gains tax triggered by forced sale (optional)
   * For future use - enables tax-aware simulation
   */
  capitalGainsTax?: number;
}

// ============================================================================
// Asset-Class LTV Types
// ============================================================================

/**
 * LTV Limits by Asset Class
 *
 * Different asset types have different borrowing capacity based on their
 * volatility and liquidity. More stable assets support higher LTV.
 *
 * Typical brokerage LTV limits:
 * - Equities: 50-70% (volatile, but liquid)
 * - Bonds: 80-95% (stable, liquid)
 * - Cash equivalents: 95-100% (most stable)
 *
 * @example
 * ```typescript
 * const ltvLimits: LTVByAssetClass = {
 *   equities: 0.65,  // 65% for stocks
 *   bonds: 0.85,     // 85% for fixed income
 *   cash: 0.95       // 95% for money market
 * };
 * ```
 */
export interface LTVByAssetClass {
  /**
   * Max LTV for equity holdings (stocks, ETFs)
   * Typically 0.50-0.70 due to higher volatility
   */
  equities: number;

  /**
   * Max LTV for bond holdings (treasuries, corporate bonds)
   * Typically 0.80-0.95 due to lower volatility
   */
  bonds: number;

  /**
   * Max LTV for cash equivalents (money market, T-bills)
   * Typically 0.95-1.00 due to minimal volatility
   */
  cash: number;
}

// ============================================================================
// Default Constants
// ============================================================================

/**
 * Default SBLOC configuration based on typical brokerage terms
 *
 * These values represent middle-of-the-road assumptions for
 * securities-backed lending as of 2024-2025.
 */
export const DEFAULT_SBLOC_CONFIG: SBLOCConfig = {
  annualInterestRate: 0.074,    // 7.4% (Fed funds + ~2% spread)
  maxLTV: 0.65,                 // 65% max borrowing
  maintenanceMargin: 0.50,      // 50% warning threshold
  liquidationHaircut: 0.05,     // 5% forced sale loss
  annualWithdrawal: 50000,      // $50k annual draw
  compoundingFrequency: 'annual',
  startYear: 0,
  withdrawalGrowthRate: 0.03,   // 3% annual growth (inflation adjustment)
};

/**
 * Default LTV limits by asset class
 *
 * Conservative estimates based on major brokerage margin policies.
 */
export const DEFAULT_LTV_BY_ASSET_CLASS: LTVByAssetClass = {
  equities: 0.65,   // 65% for stocks
  bonds: 0.85,      // 85% for bonds
  cash: 0.95,       // 95% for cash equivalents
};

/**
 * Create initial SBLOC state with zero loan balance
 *
 * @param portfolioValue - Initial portfolio value
 * @returns Clean SBLOC state ready for simulation
 *
 * @example
 * ```typescript
 * const initialState = createInitialSBLOCState(1000000);
 * // { loanBalance: 0, portfolioValue: 1000000, currentLTV: 0, ... }
 * ```
 */
export function createInitialSBLOCState(portfolioValue: number): SBLOCState {
  return {
    loanBalance: 0,
    portfolioValue,
    currentLTV: 0,
    inWarningZone: false,
    yearsSinceStart: 0,
  };
}
