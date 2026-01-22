import polars as pl

from fastapi import FastAPI
from datetime import datetime
from datetime import timedelta
from typing import List
from fastapi.middleware.cors import CORSMiddleware

from data_models import AccountsTable
from multimodal_communication import S3CloudHelper

app = FastAPI(debug=True)
cloud_reader = S3CloudHelper()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Zirk-Finance API is running"}

@app.get('/accounts/current-balances', response_model = List[AccountsTable])
def get_current_account_balances(included_accounts: List | None = None) -> List[AccountsTable]:
    filtered_df = (
        pl.scan_parquet("s3://zirk-finance-tracker/account/current/*")
        .sort('last_pulled', descending=False)
        .unique(subset=['final_four'], keep='last')
    )

    if included_accounts:
        filtered_df = filtered_df.filter(
            pl.col('display_name').is_in(included_accounts)
        )

    return [AccountsTable(**e) for e in filtered_df.collect().to_dicts()]


@app.get('/accounts/', response_model=List[AccountsTable])
def get_accounts_table(min_date: datetime = datetime(2025, 9, 1),
                       max_date: datetime = datetime(2099, 12, 31),
                       included_accounts: List | None = None):
    filtered_df = (
        pl.scan_parquet("s3://zirk-finance-tracker/account/current/*")
        .filter(
            (pl.col('last_pulled') > min_date)
            &(pl.col('last_pulled') <= max_date + timedelta(1))
        )
    )

    if included_accounts:
        filtered_df = filtered_df.filter(
            pl.col('display_name').is_in(included_accounts)
        )

    return [AccountsTable(**e) for e in filtered_df.collect().to_dicts()]




