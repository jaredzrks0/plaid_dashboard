from pydantic import BaseModel
from typing import Optional
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
