export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  weight: number;               // 0-1, must sum to 1
  returns?: number[];           // historical returns
}

export type AssetClass = 'equity' | 'bond' | 'reit' | 'commodity' | 'cash';

export interface Portfolio {
  id: string;
  name: string;
  assets: Asset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CorrelationMatrix {
  assetIds: string[];
  matrix: number[][];           // symmetric correlation matrix
}
