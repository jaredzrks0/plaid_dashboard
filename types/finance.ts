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

// Transaction types

export interface Transaction {
  account_id: string;
  transaction_id: string;
  transaction_amount: number;
  transaction_date: string | null;
  description: string | null;
  merchant_name: string | null;
  merchant_name_specific: string | null;
  primary_financial_category: string | null;
  detailed_financial_category: string | null;
  financial_category_confidence_level: string | null;
  category: string | null;
  payment_channel: string | null;
  iso_currency_code: string | null;
  transaction_pending: boolean;
  is_subscription: boolean | null;
  is_split: boolean | null;
  split_origin_id: string | null;
  merchant_city: string | null;
  merchant_region: string | null;
  transaction_year: number | null;
  transaction_month: number | null;
  transaction_day: number | null;
  is_corrected: boolean;
  hidden_from_spending: boolean | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total_count: number;
  categories: string[];
  accounts: string[];
}

export interface MonthlyCategorySpend {
  month: string;
  category: string;
  total: number;
}

export interface MerchantSpend {
  merchant_name: string;
  total: number;
  count: number;
}

export interface MonthlyTotal {
  month: string;
  total_spending: number;
  total_income: number;
}

export interface TransactionSummary {
  monthly_by_category: MonthlyCategorySpend[];
  top_merchants: MerchantSpend[];
  monthly_totals: MonthlyTotal[];
}

export interface CorrectionCreate {
  transaction_id: string;
  corrected_category?: string;
  corrected_detail?: string;
  corrected_merchant_name?: string;
  corrected_amount?: number;
  corrected_date?: string;
  original_category?: string;
  original_detail?: string;
  original_merchant_name?: string;
  original_amount?: number;
  original_date?: string;
  hidden_from_spending?: boolean;
}

export interface SplitItem {
  category: string;
  amount: number;
  description?: string;
}

export interface SplitCreate {
  transaction_id: string;
  original_amount: number;
  splits: SplitItem[];
}

export interface CorrectionRecord {
  correction_id: string;
  transaction_id: string;
  correction_type: string;
  corrected_category: string | null;
  corrected_detail: string | null;
  corrected_merchant_name: string | null;
  corrected_amount: number | null;
  corrected_date: string | null;
  original_category: string | null;
  original_detail: string | null;
  original_merchant_name: string | null;
  original_amount: number | null;
  original_date: string | null;
  hidden_from_spending: boolean | null;
  created_at: string;
}

export type PeriodOption = 'current' | 'prior' | 'specific' | 'l3' | 'l6' | 'ytd';

export interface TransactionFilters {
  search: string;
  categories: string[];
  accountIds: string[];
  paymentChannels: string[];
  sortBy: string;
  sortDesc: boolean;
}