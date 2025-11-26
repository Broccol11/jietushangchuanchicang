export enum AssetCategory {
  STOCK = 'Stock',
  FUND = 'Fund',
  BOND = 'Bond',
  CRYPTO = 'Crypto',
  CASH = 'Cash',
  OTHER = 'Other'
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  amount: number; // Total value
  returnRate: number; // Percentage, e.g., 5.5 for 5.5%
  currency: string;
  lastUpdated: string; // ISO Date
}

export interface HistoryPoint {
  date: string;
  totalNetWorth: number;
  totalReturnRate: number;
}

export interface AnalysisResponse {
  assetAllocationAnalysis: string;
  investmentAdvice: string;
  adjustmentSuggestions: string;
}

export type ViewState = 'dashboard' | 'holdings';
