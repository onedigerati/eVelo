export interface SBLOCTerms {
  enabled: boolean;
  maxLTV: number;               // e.g., 0.50 for 50%
  interestRate: number;         // annual rate, e.g., 0.065 for 6.5%
  annualDraw: number;           // dollar amount or percentage
  maintenanceLTV: number;       // margin call threshold
}

export interface SBLOCState {
  balance: number;
  accruedInterest: number;
  currentLTV: number;
  marginCallTriggered: boolean;
  forcedLiquidation: number;    // amount liquidated
}

export interface LTVByAssetClass {
  equity: number;               // typically 0.50-0.70
  bond: number;                 // typically 0.80-0.90
  reit: number;
  commodity: number;
  cash: number;
}
