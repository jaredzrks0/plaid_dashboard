import polars as pl
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import FastAPI, Query
from datetime import datetime
from datetime import timedelta
from typing import List
from fastapi.middleware.cors import CORSMiddleware

from data_models import (
    AccountsTable, TransactionRow, TransactionsResponse,
    MonthlyCategorySpend, MerchantSpend, MonthlyTotal,
    TransactionSummaryResponse, CorrectionCreate, CorrectionRecord,
    SplitCreate
)
from multimodal_communication import S3CloudHelper
import uuid

app = FastAPI(debug=True)
cloud_reader = S3CloudHelper()

# In-memory cache
_transactions_cache: dict = {'df': None, 'ts': 0.0}
_corrections_cache: dict = {'df': None, 'valid': False}
TRANSACTIONS_CACHE_TTL = 300  # 5 minutes — refresh if Plaid data is pulled


def _invalidate_corrections_cache():
    _corrections_cache['valid'] = False

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
def get_current_account_balances(included_accounts: List[str] | None = Query(None)) -> List[AccountsTable]:
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
                       included_accounts: List[str] | None = Query(None)):
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


TRANSACTIONS_PATH = "s3://zirk-finance-tracker/transaction/current/*"
CORRECTIONS_PATH = "s3://zirk-finance-tracker/transaction/corrections/"

TRANSACTION_COLUMNS = [
    'account_id', 'transaction_id', 'transaction_amount', 'transaction_date',
    'description', 'merchant_name', 'merchant_name_specific',
    'primary_financial_category', 'detailed_financial_category',
    'financial_category_confidence_level', 'category', 'payment_channel',
    'iso_currency_code', 'transaction_pending', 'is_subscription',
    'subscription_interval', 'is_split', 'split_origin_id',
    'merchant_city', 'merchant_region',
    'transaction_year', 'transaction_month', 'transaction_day',
    'hidden_from_spending', 'is_corrected'
]

# Define expected types for all transaction columns
TRANSACTION_SCHEMA = {
    'account_id': pl.Utf8,
    'transaction_id': pl.Utf8,
    'transaction_amount': pl.Float64,
    'transaction_date': pl.Datetime,
    'description': pl.Utf8,
    'merchant_name': pl.Utf8,
    'merchant_name_specific': pl.Utf8,
    'primary_financial_category': pl.Utf8,
    'detailed_financial_category': pl.Utf8,
    'financial_category_confidence_level': pl.Utf8,
    'category': pl.Utf8,
    'payment_channel': pl.Utf8,
    'iso_currency_code': pl.Utf8,
    'transaction_pending': pl.Boolean,
    'is_subscription': pl.Boolean,
    'subscription_interval': pl.Utf8,
    'is_split': pl.Boolean,
    'split_origin_id': pl.Utf8,
    'merchant_city': pl.Utf8,
    'merchant_region': pl.Utf8,
    'transaction_year': pl.Int32,
    'transaction_month': pl.Int32,
    'transaction_day': pl.Int32,
    'is_corrected': pl.Boolean,
    'hidden_from_spending': pl.Boolean,
}


def _read_corrections(use_cache: bool = True) -> pl.DataFrame:
    """Read all correction records from S3. Returns empty DataFrame if none exist."""
    if use_cache and _corrections_cache['valid'] and _corrections_cache['df'] is not None:
        return _corrections_cache['df']
    expected_schema = {
        'correction_id': pl.Utf8,
        'transaction_id': pl.Utf8,
        'correction_type': pl.Utf8,
        'corrected_category': pl.Utf8,
        'corrected_detail': pl.Utf8,
        'corrected_merchant_name': pl.Utf8,
        'corrected_amount': pl.Float64,
        'corrected_date': pl.Datetime,
        'original_category': pl.Utf8,
        'original_detail': pl.Utf8,
        'original_merchant_name': pl.Utf8,
        'original_amount': pl.Float64,
        'original_date': pl.Datetime,
        'hidden_from_spending': pl.Boolean,
        'split_index': pl.Int32,
        'split_description': pl.Utf8,
        'created_at': pl.Datetime,
    }

    fallback_df = pl.DataFrame(schema=expected_schema)

    try:
        files = cloud_reader.list_files(
            bucket='zirk-finance-tracker',
            prefix='transaction/corrections/'
        )
        if not files:
            return fallback_df


        def _read_one(file_path: str) -> pl.DataFrame | None:
            try:
                df = pl.read_parquet(file_path)
                cast_cols = {}
                for col in df.columns:
                    if col in ['corrected_category', 'corrected_detail', 'corrected_merchant_name',
                              'original_category', 'original_detail', 'original_merchant_name',
                              'split_description', 'correction_id', 'transaction_id', 'correction_type']:
                        if df[col].dtype != pl.Utf8:
                            cast_cols[col] = pl.Utf8
                    elif col == 'hidden_from_spending':
                        if df[col].dtype != pl.Boolean:
                            cast_cols[col] = pl.Boolean
                    elif col == 'split_index':
                        if df[col].dtype != pl.Int32:
                            cast_cols[col] = pl.Int32
                if cast_cols:
                    df = df.with_columns([pl.col(c).cast(t) for c, t in cast_cols.items()])
                return df
            except Exception:
                return None

        # Read all correction files in parallel
        dfs = []
        with ThreadPoolExecutor(max_workers=16) as executor:
            futures = {executor.submit(_read_one, fp): fp for fp in files}
            for future in as_completed(futures):
                result = future.result()
                if result is not None:
                    dfs.append(result)

        if not dfs:
            return fallback_df

        corrections_df = pl.concat(dfs)
        _corrections_cache['df'] = corrections_df
        _corrections_cache['valid'] = True
        return corrections_df
    except Exception:
        return fallback_df


def _get_raw_transactions() -> pl.DataFrame:
    """Load full transaction dataset from S3, with in-memory caching."""
    now = time.time()
    if _transactions_cache['df'] is not None and (now - _transactions_cache['ts']) < TRANSACTIONS_CACHE_TTL:
        return _transactions_cache['df']

    scan = pl.scan_parquet(TRANSACTIONS_PATH)
    available_cols = scan.collect_schema().names()
    select_cols = [c for c in TRANSACTION_COLUMNS if c in available_cols]
    df = scan.select(select_cols).collect()

    _transactions_cache['df'] = df
    _transactions_cache['ts'] = now
    return df


def _load_transactions(
    min_date: datetime,
    max_date: datetime,
    account_ids: List[str] | None = None,
) -> pl.DataFrame:
    """Load and filter transactions with corrections applied."""
    df = _get_raw_transactions()

    # Ensure hidden_from_spending column exists before applying corrections
    if 'hidden_from_spending' not in df.columns:
        df = df.with_columns(pl.lit(False).cast(pl.Boolean).alias('hidden_from_spending'))

    corrections = _read_corrections()
    df = _apply_corrections(df, corrections)

    # Mark credit card payments, transfers, and interest as hidden from spending
    df = df.with_columns(
        pl.when(
            (pl.col('detailed_financial_category').fill_null('').str.to_lowercase().str.contains('credit card'))
            | (pl.col('primary_financial_category').fill_null('').str.to_lowercase().str.contains('credit card'))
            | (pl.col('detailed_financial_category').fill_null('').str.to_lowercase().str.contains('transfer'))
            | (pl.col('primary_financial_category').fill_null('').str.to_lowercase().str.contains('transfer'))
            | (pl.col('detailed_financial_category').fill_null('').str.to_lowercase().str.contains('interest'))
            | (pl.col('primary_financial_category').fill_null('').str.to_lowercase().str.contains('interest'))
            | (pl.col('transaction_pending').fill_null(False))
        )
        .then(True)
        .otherwise(pl.col('hidden_from_spending').fill_null(False))
        .alias('hidden_from_spending')
    )

    if 'transaction_date' in df.columns:
        df = df.filter(
            (pl.col('transaction_date') >= min_date)
            & (pl.col('transaction_date') < max_date + timedelta(1))
        )

    if account_ids:
        df = df.filter(pl.col('account_id').is_in(account_ids))

    return df


def _apply_corrections(df: pl.DataFrame, corrections: pl.DataFrame) -> pl.DataFrame:
    """Apply corrections and splits to the transactions DataFrame."""
    # Ensure hidden_from_spending column exists
    if 'hidden_from_spending' not in df.columns:
        df = df.with_columns(pl.lit(None).cast(pl.Boolean).alias('hidden_from_spending'))

    if corrections.height == 0:
        return df.with_columns(pl.lit(False).alias('is_corrected'))

    # Ensure corrections has all expected columns (backward compat with old parquet files)
    for col_name, dtype in [
        ('corrected_detail', pl.Utf8),
        ('corrected_date', pl.Datetime),
        ('original_category', pl.Utf8),
        ('original_detail', pl.Utf8),
        ('original_merchant_name', pl.Utf8),
        ('original_amount', pl.Float64),
        ('original_date', pl.Datetime),
        ('hidden_from_spending', pl.Boolean),
    ]:
        if col_name not in corrections.columns:
            corrections = corrections.with_columns(pl.lit(None).cast(dtype).alias(col_name))

    edits = corrections.filter(pl.col('correction_type') == 'edit')
    splits = corrections.filter(pl.col('correction_type') == 'split')
    date_corrections = corrections.filter(pl.col('correction_type') == 'date')
    hide_corrections = corrections.filter(pl.col('correction_type') == 'hide')


    # Apply simple edits via left join
    if edits.height > 0:
        edit_cols = edits.select([
            'transaction_id',
            'corrected_category',
            'corrected_detail',
            'corrected_merchant_name',
            'corrected_amount',
            'corrected_date',
        ]).unique(subset=['transaction_id'], keep='last')


        df = df.join(edit_cols, on='transaction_id', how='left')

        # Coalesce corrected fields over originals
        has_correction = (
            pl.col('corrected_category').is_not_null()
            | pl.col('corrected_detail').is_not_null()
            | pl.col('corrected_merchant_name').is_not_null()
            | pl.col('corrected_amount').is_not_null()
            | pl.col('corrected_date').is_not_null()
        )

        # Remember coalesce keeps the first non-null from left to right
        df = df.with_columns([
            pl.coalesce(['corrected_category', 'primary_financial_category']).alias('primary_financial_category'),
            pl.coalesce(['corrected_detail', 'detailed_financial_category']).alias('detailed_financial_category'),
            pl.coalesce(['corrected_merchant_name', 'merchant_name']).alias('merchant_name'),
            pl.coalesce(['corrected_amount', 'transaction_amount']).alias('transaction_amount'),
            pl.coalesce(['corrected_date', 'transaction_date']).alias('transaction_date'),
            has_correction.alias('is_corrected'),
        ]).drop(['corrected_category', 'corrected_detail', 'corrected_merchant_name', 'corrected_amount', 'corrected_date'])
    else:
        df = df.with_columns(pl.lit(False).alias('is_corrected'))

    # Apply date-only corrections
    if date_corrections.height > 0:
        date_cols = date_corrections.select([
            'transaction_id', 'corrected_date'
        ]).unique(subset=['transaction_id'], keep='last')
        df = df.join(date_cols, on='transaction_id', how='left')
        df = df.with_columns([
            pl.coalesce(['corrected_date', 'transaction_date']).alias('transaction_date'),
            pl.when(pl.col('corrected_date').is_not_null())
              .then(pl.lit(True))
              .otherwise(pl.col('is_corrected'))
              .alias('is_corrected'),
        ]).drop(['corrected_date'])

    # Apply hide corrections
    if hide_corrections.height > 0:
        hide_cols = hide_corrections.select([
            'transaction_id', 'hidden_from_spending'
        ]).rename({'hidden_from_spending': 'corrected_hidden'}).unique(subset=['transaction_id'], keep='last')
        df = df.join(hide_cols, on='transaction_id', how='left')
        df = df.with_columns([
            pl.coalesce(['corrected_hidden', 'hidden_from_spending']).alias('hidden_from_spending'),
            pl.when(pl.col('corrected_hidden').is_not_null())
              .then(pl.lit(True))
              .otherwise(pl.col('is_corrected'))
              .alias('is_corrected'),
        ]).drop(['corrected_hidden'])

    # Apply splits: replace original rows with split sub-rows
    if splits.height > 0:
        split_txn_ids = splits.select('transaction_id').unique()
        split_ids_list = split_txn_ids['transaction_id'].to_list()

        # Get original rows that have splits
        originals = df.filter(pl.col('transaction_id').is_in(split_ids_list))
        df_no_split = df.filter(~pl.col('transaction_id').is_in(split_ids_list))

        # For each split, create sub-rows from the original
        split_rows = []
        for transaction_id in split_ids_list:
            orig_row = originals.filter(pl.col('transaction_id') == transaction_id)
            if orig_row.height == 0:
                continue
            orig_dict = orig_row.to_dicts()[0]
            txn_splits = splits.filter(pl.col('transaction_id') == transaction_id).sort('split_index')
            for s in txn_splits.to_dicts():
                row = orig_dict.copy()
                row['transaction_amount'] = s['corrected_amount']
                row['primary_financial_category'] = s['corrected_category']
                if s.get('split_description'):
                    row['description'] = s['split_description']
                row['is_split'] = True
                row['split_origin_id'] = transaction_id
                row['transaction_id'] = f"{transaction_id}_split_{s['split_index']}"
                row['is_corrected'] = True
                split_rows.append(row)

        if split_rows:
            split_df = pl.DataFrame(split_rows)
            # Cast all columns to match expected schema
            cast_exprs = []
            for col in split_df.columns:
                if col in TRANSACTION_SCHEMA:
                    cast_exprs.append(pl.col(col).cast(TRANSACTION_SCHEMA[col]))
            if cast_exprs:
                split_df = split_df.with_columns(cast_exprs)

            # Also cast df_no_split to ensure compatible schema
            cast_exprs_no_split = []
            for col in df_no_split.columns:
                if col in TRANSACTION_SCHEMA:
                    cast_exprs_no_split.append(pl.col(col).cast(TRANSACTION_SCHEMA[col]))
            if cast_exprs_no_split:
                df_no_split = df_no_split.with_columns(cast_exprs_no_split)

            df = pl.concat([df_no_split, split_df])

    # Ensure final dataframe has correct schema
    cast_exprs = []
    for col in df.columns:
        if col in TRANSACTION_SCHEMA:
            cast_exprs.append(pl.col(col).cast(TRANSACTION_SCHEMA[col]))
    if cast_exprs:
        df = df.with_columns(cast_exprs)

    return df


@app.get('/transactions/', response_model=TransactionsResponse)
def get_transactions(
    min_date: datetime = datetime(1900, 1, 1),
    max_date: datetime = datetime(2099, 12, 31),
    account_ids: List[str] | None = Query(None),
    categories: List[str] | None = Query(None),
    payment_channels: List[str] | None = Query(None),
    search: str | None = None,
    sort_by: str = 'transaction_date',
    sort_desc: bool = True,
    limit: int = 200,
    offset: int = 0,
):
    df = _load_transactions(min_date, max_date, account_ids)
    # Corrections are already applied by _load_transactions() via _apply_corrections()

    # Capture available filter options BEFORE applying category/channel/search filters
    all_categories = sorted(
        df.select('primary_financial_category').drop_nulls().unique().to_series().to_list()
    )
    all_accounts = sorted(
        df.select('account_id').drop_nulls().unique().to_series().to_list()
    )

    # Category filter
    if categories:
        df = df.filter(pl.col('primary_financial_category').is_in(categories))

    # Payment channel filter
    if payment_channels:
        df = df.filter(pl.col('payment_channel').is_in(payment_channels))

    # Search
    if search:
        search_lower = search.lower()
        df = df.filter(
            pl.col('merchant_name').fill_null('').str.to_lowercase().str.contains(search_lower, literal=True)
            | pl.col('merchant_name_specific').fill_null('').str.to_lowercase().str.contains(search_lower, literal=True)
            | pl.col('description').fill_null('').str.to_lowercase().str.contains(search_lower, literal=True)
        )

    total_count = df.height

    # Sort
    if sort_by in df.columns:
        df = df.sort(sort_by, descending=sort_desc, nulls_last=True)

    # Paginate
    df = df.slice(offset, limit)

    transactions = [TransactionRow(**row) for row in df.to_dicts()]

    return TransactionsResponse(
        transactions=transactions,
        total_count=total_count,
        categories=all_categories,
        accounts=all_accounts,
    )


@app.get('/transactions/monthly_summary', response_model=TransactionSummaryResponse)
def get_monthly_summary(
    min_date: datetime = datetime(1900, 1, 1),
    max_date: datetime = datetime(2099, 12, 31),
    account_ids: List[str] | None = Query(None),
):
    df = _load_transactions(min_date, max_date, account_ids)

    # Monthly by category (spending only = positive amounts, exclude hidden)
    spending = df.filter(
        (pl.col('transaction_amount') > 0)
        & (~pl.col('hidden_from_spending').fill_null(False))
    )
    monthly_cat = (
        spending
        .with_columns(
            (pl.col('transaction_year').cast(pl.Utf8) + '-' +
             pl.col('transaction_month').cast(pl.Utf8).str.pad_start(2, '0')).alias('month')
        )
        .group_by(['month', 'primary_financial_category'])
        .agg(pl.col('transaction_amount').sum().alias('total'))
        .sort(['month', 'total'], descending=[False, True])
        .drop_nulls(subset=['primary_financial_category'])
    )

    monthly_by_category = [
        MonthlyCategorySpend(month=r['month'], category=r['primary_financial_category'], total=r['total'])
        for r in monthly_cat.to_dicts()
    ]

    # Top merchants (spending only)
    top_merch = (
        spending
        .filter(pl.col('merchant_name').is_not_null())
        .group_by('merchant_name')
        .agg([
            pl.col('transaction_amount').sum().alias('total'),
            pl.col('transaction_id').count().alias('count'),
        ])
        .sort('total', descending=True)
        .head(20)
    )

    top_merchants = [
        MerchantSpend(merchant_name=r['merchant_name'], total=r['total'], count=r['count'])
        for r in top_merch.to_dicts()
    ]

    # Monthly totals (income vs spending, excluding hidden transactions)
    # Spending: all positive amounts from non-hidden transactions
    # Income: transactions with "income" in the category (case-insensitive)
    monthly_totals_df = (
        df
        .with_columns(
            (pl.col('transaction_year').cast(pl.Utf8) + '-' +
             pl.col('transaction_month').cast(pl.Utf8).str.pad_start(2, '0')).alias('month')
        )
        .group_by('month')
        .agg([
            pl.col('transaction_amount')
              .filter((pl.col('transaction_amount') > 0) & (~pl.col('hidden_from_spending').fill_null(False)))
              .sum()
              .alias('total_spending'),
            pl.col('transaction_amount').filter(
                ((pl.col('primary_financial_category').fill_null('').str.to_lowercase().str.contains('income'))
                | (pl.col('detailed_financial_category').fill_null('').str.to_lowercase().str.contains('income')))
                & (~pl.col('hidden_from_spending').fill_null(False))
            ).sum().abs().alias('total_income'),
        ])
        .sort('month')
    )

    monthly_totals = [
        MonthlyTotal(
            month=r['month'],
            total_spending=r['total_spending'] or 0,
            total_income=r['total_income'] or 0,
        )
        for r in monthly_totals_df.to_dicts()
    ]

    return TransactionSummaryResponse(
        monthly_by_category=monthly_by_category,
        top_merchants=top_merchants,
        monthly_totals=monthly_totals,
    )


@app.get('/transactions/corrections', response_model=List[CorrectionRecord])
def get_corrections():
    corrections = _read_corrections()
    if corrections.height == 0:
        return []

    # Deduplicate: for edits, keep unique by transaction_id; for splits, keep all
    results = []
    seen = set()
    for r in corrections.sort('created_at', descending=True).to_dicts():
        key = (r['transaction_id'], r['correction_type'], r.get('split_index'))
        if key in seen:
            continue
        seen.add(key)
        results.append(CorrectionRecord(
            correction_id=r['correction_id'],
            transaction_id=r['transaction_id'],
            correction_type=r['correction_type'],
            corrected_category=r.get('corrected_category'),
            corrected_detail=r.get('corrected_detail'),
            corrected_merchant_name=r.get('corrected_merchant_name'),
            corrected_amount=r.get('corrected_amount'),
            corrected_date=r.get('corrected_date'),
            original_category=r.get('original_category'),
            original_detail=r.get('original_detail'),
            original_merchant_name=r.get('original_merchant_name'),
            original_amount=r.get('original_amount'),
            original_date=r.get('original_date'),
            hidden_from_spending=r.get('hidden_from_spending'),
            created_at=r['created_at'],
        ))

    return results


@app.post('/transactions/corrections', response_model=CorrectionRecord)
def create_correction(correction: CorrectionCreate):
    now = datetime.now(tz=None)
    correction_id = str(uuid.uuid4())

    # Validate that at least one field was corrected
    if not any([
        correction.corrected_category,
        correction.corrected_detail,
        correction.corrected_merchant_name,
        correction.corrected_amount,
        correction.corrected_date,
        correction.hidden_from_spending is not None,
    ]):
        raise ValueError("No corrections provided")

    # Delete any existing corrections for this transaction
    cloud_reader = S3CloudHelper()
    try:
        existing_files = cloud_reader.list_files(
            bucket='zirk-finance-tracker',
            prefix=f'transaction/corrections/{correction.transaction_id}_'
        )
        for file_path in existing_files:
            try:
                key = file_path.split('zirk-finance-tracker/')[-1] if 'zirk-finance-tracker/' in file_path else file_path
                cloud_reader.delete_from_s3(
                    bucket='zirk-finance-tracker',
                    key=key
                )
            except Exception:
                pass
    except Exception:
        pass

    # Determine correction_type
    if correction.hidden_from_spending is not None and not any([
        correction.corrected_category, correction.corrected_detail,
        correction.corrected_merchant_name, correction.corrected_amount,
        correction.corrected_date,
    ]):
        correction_type = 'hide'
    elif correction.corrected_date is not None and not any([
        correction.corrected_category, correction.corrected_detail,
        correction.corrected_merchant_name, correction.corrected_amount,
        correction.hidden_from_spending,
    ]):
        correction_type = 'date'
    else:
        correction_type = 'edit'


    record = pl.DataFrame({
        'correction_id': [correction_id],
        'transaction_id': [correction.transaction_id],
        'correction_type': [correction_type],
        'corrected_category': [correction.corrected_category],
        'corrected_detail': [correction.corrected_detail],
        'corrected_merchant_name': [correction.corrected_merchant_name],
        'corrected_amount': [correction.corrected_amount],
        'corrected_date': [correction.corrected_date],
        'original_category': [correction.original_category],
        'original_detail': [correction.original_detail],
        'original_merchant_name': [correction.original_merchant_name],
        'original_amount': [correction.original_amount],
        'original_date': [correction.original_date],
        'hidden_from_spending': [correction.hidden_from_spending],
        'split_index': [None],
        'split_description': [None],
        'created_at': [now],
    }).cast({
        'corrected_date': pl.Datetime,
        'original_date': pl.Datetime,
        'split_index': pl.Int32,
        'created_at': pl.Datetime,
    })

    # Write to S3
    uploader = S3CloudHelper(obj=record)
    uploader.upload_to_s3(
        bucket_name='zirk-finance-tracker',
        file_name=f'transaction/corrections/{correction.transaction_id}_{correction_id}.parquet',
        file_type='parquet'
    )
    _invalidate_corrections_cache()

    return CorrectionRecord(
        correction_id=correction_id,
        transaction_id=correction.transaction_id,
        correction_type=correction_type,
        corrected_category=correction.corrected_category,
        corrected_detail=correction.corrected_detail,
        corrected_merchant_name=correction.corrected_merchant_name,
        corrected_amount=correction.corrected_amount,
        corrected_date=correction.corrected_date,
        original_category=correction.original_category,
        original_detail=correction.original_detail,
        original_merchant_name=correction.original_merchant_name,
        original_amount=correction.original_amount,
        original_date=correction.original_date,
        hidden_from_spending=correction.hidden_from_spending,
        created_at=now,
    )


@app.post('/transactions/splits', response_model=List[CorrectionRecord])
def create_split(split: SplitCreate):
    now = datetime.now(tz=None)
    correction_id = str(uuid.uuid4())

    rows = []
    for i, item in enumerate(split.splits):
        rows.append({
            'correction_id': correction_id,
            'transaction_id': split.transaction_id,
            'correction_type': 'split',
            'corrected_category': item.category,
            'corrected_merchant_name': None,
            'corrected_amount': item.amount,
            'split_index': i,
            'split_description': item.description,
            'created_at': now,
        })

    record = pl.DataFrame(rows).cast({
        'split_index': pl.Int32,
        'created_at': pl.Datetime,
    })

    uploader = S3CloudHelper(obj=record)
    uploader.upload_to_s3(
        bucket_name='zirk-finance-tracker',
        file_name=f'transaction/corrections/{split.transaction_id}_{correction_id}_split.parquet',
        file_type='parquet'
    )
    _invalidate_corrections_cache()

    return [
        CorrectionRecord(
            correction_id=correction_id,
            transaction_id=split.transaction_id,
            correction_type='split',
            corrected_category=item.category,
            corrected_merchant_name=None,
            corrected_amount=item.amount,
            created_at=now,
        )
        for item in split.splits
    ]


@app.delete('/transactions/corrections/{correction_id}')
def delete_correction(correction_id: str):
    """Delete a correction by removing its parquet file from S3."""
    files = cloud_reader.list_files(
        bucket='zirk-finance-tracker',
        prefix='transaction/corrections/',
    )

    if not files:
        return {"message": "No corrections found"}

    for file_path in files:
        if correction_id in file_path:
            # Extract the key from the s3:// path
            file_key = file_path.replace('s3://zirk-finance-tracker/', '')
            cloud_reader.delete_from_s3(
                bucket_name='zirk-finance-tracker',
                file_name=file_key,
            )
            _invalidate_corrections_cache()
            return {"message": "Correction deleted"}

    return {"message": "Correction not found"}

