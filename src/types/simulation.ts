// Simulation configuration
export interface SimulationConfig {
  iterations: number;           // 1,000 - 100,000
  timeHorizon: number;          // years (10-50)
  inflationAdjusted: boolean;   // real vs nominal
  resamplingMethod: 'simple' | 'block';
  blockSize?: number;           // for block bootstrap
  regimeSwitching: boolean;
}

// Simulation results
export interface SimulationResult {
  year: number;
  values: number[];             // One value per iteration
  percentiles: PercentileValues;
}

export interface PercentileValues {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

// Regime model
export type MarketRegime = 'bull' | 'bear' | 'crash';
