export interface Account {
  account_id: string;
  final_four: string;
  account_name: string;
  major_account_type: string;
  account_type: string;
  available_balance: number | null;
  current_balance: number | null;
  limit: number | null;
  currency_type: string;
  last_updated: string | null;
  item_id: string;
  institution_name: string;
  item_consent_expiration_date: string | null;
  last_pulled: string;
  last_pulled_year: number;
  last_pulled_month: number;
  last_pulled_day: number | null;
  is_cache: boolean;
  display_name: string;
}

export interface AccountTypeBalance {
  type: string;
  balance: number;
  accounts: Account[];
}

export interface NetWorthData {
  assets: number;
  liabilities: number;
  netWorth: number;
  assetsByType: AccountTypeBalance[];
  liabilitiesByType: AccountTypeBalance[];
}

export interface BalanceSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accounts: Account[];
  assetsByType: AccountTypeBalance[];
  liabilitiesByType: AccountTypeBalance[];
}

export type TimePeriod = '1m' | '3m' | '6m' | '1y' | 'custom';

export interface DateRange {
  minDate: string;
  maxDate: string;
}

export interface HistoricalDataPoint {
  date: string;
  sortKey: string;
  [accountName: string]: number | string;
}