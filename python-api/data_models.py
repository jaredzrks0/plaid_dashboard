from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime

class AccountsTable(BaseModel):
    account_id: str
    final_four: str
    account_name: str
    major_account_type: str
    account_type: str
    available_balance: Optional[float]
    current_balance: Optional[float]
    limit: Optional[float]
    currency_type: str
    last_updated: Optional[datetime]
    item_id: str
    institution_name: str
    item_consent_expiration_date: Optional[datetime]
    last_pulled: datetime
    last_pulled_year: int
    last_pulled_month: int
    last_pulled_day: Optional[float]
    is_cache: bool
    display_name: str


class TransactionRow(BaseModel):
    account_id: str
    transaction_id: str
    transaction_amount: float
    transaction_date: Optional[datetime] = None
    description: Optional[str] = None
    merchant_name: Optional[str] = None
    merchant_name_specific: Optional[str] = None
    primary_financial_category: Optional[str] = None
    detailed_financial_category: Optional[str] = None
    financial_category_confidence_level: Optional[str] = None
    category: Optional[str] = None
    payment_channel: Optional[str] = None
    iso_currency_code: Optional[str] = None
    transaction_pending: bool = False
    is_subscription: Optional[bool] = None
    subscription_interval: Optional[str] = None
    is_split: Optional[bool] = False
    split_origin_id: Optional[str] = None
    merchant_city: Optional[str] = None
    merchant_region: Optional[str] = None
    transaction_year: Optional[int] = None
    transaction_month: Optional[int] = None
    transaction_day: Optional[int] = None
    is_corrected: bool = False
    hidden_from_spending: Optional[bool] = None


class TransactionsResponse(BaseModel):
    transactions: List[TransactionRow]
    total_count: int
    categories: List[str]
    accounts: List[str]


class MonthlyCategorySpend(BaseModel):
    month: str
    category: str
    total: float


class MerchantSpend(BaseModel):
    merchant_name: str
    total: float
    count: int


class MonthlyTotal(BaseModel):
    month: str
    total_spending: float
    total_income: float


class TransactionSummaryResponse(BaseModel):
    monthly_by_category: List[MonthlyCategorySpend]
    top_merchants: List[MerchantSpend]
    monthly_totals: List[MonthlyTotal]


class CorrectionCreate(BaseModel):
    transaction_id: str
    corrected_category: Optional[str] = None
    corrected_detail: Optional[str] = None
    corrected_merchant_name: Optional[str] = None
    corrected_amount: Optional[float] = None
    corrected_date: Optional[datetime] = None
    original_category: Optional[str] = None
    original_detail: Optional[str] = None
    original_merchant_name: Optional[str] = None
    original_amount: Optional[float] = None
    original_date: Optional[datetime] = None
    hidden_from_spending: Optional[bool] = None


class CorrectionRecord(BaseModel):
    correction_id: str
    transaction_id: str
    correction_type: str  # "edit", "split", "date", or "hide"
    corrected_category: Optional[str] = None
    corrected_detail: Optional[str] = None
    corrected_merchant_name: Optional[str] = None
    corrected_amount: Optional[float] = None
    corrected_date: Optional[datetime] = None
    original_category: Optional[str] = None
    original_detail: Optional[str] = None
    original_merchant_name: Optional[str] = None
    original_amount: Optional[float] = None
    original_date: Optional[datetime] = None
    hidden_from_spending: Optional[bool] = None
    created_at: datetime


class SplitItem(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None


class SplitCreate(BaseModel):
    transaction_id: str
    original_amount: float
    splits: List[SplitItem]

    @field_validator('splits')
    @classmethod
    def validate_splits_sum(cls, v: List[SplitItem], info) -> List[SplitItem]:
        total = sum(s.amount for s in v)
        original = info.data.get('original_amount', 0)
        if abs(total - original) > 0.01:
            raise ValueError(f'Split amounts ({total}) must sum to original amount ({original})')
        return v
