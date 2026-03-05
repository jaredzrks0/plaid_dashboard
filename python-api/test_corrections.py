#!/usr/bin/env python3
"""
Diagnostic script to test correction reading and application.
Run this to debug correction issues.
"""

import sys
import polars as pl
from datetime import datetime
from multimodal_communication import S3CloudHelper

# Test 1: Can we read corrections from S3?
print("=== Test 1: Reading Corrections from S3 ===")
cloud_reader = S3CloudHelper()
try:
    files = cloud_reader.list_files(
        bucket='zirk-finance-tracker',
        prefix='transaction/corrections/'
    )
    print(f"✓ Found {len(files) if files else 0} correction files")
    if files:
        print(f"  Sample files: {files[:3]}")

        # Try to read the parquet files
        try:
            corrections_df = pl.read_parquet("s3://zirk-finance-tracker/transaction/corrections/*")
            print(f"✓ Successfully read {corrections_df.height} correction records")
            print(f"  Columns: {corrections_df.columns}")
            if corrections_df.height > 0:
                print(f"  Sample correction: {corrections_df.limit(1).to_dicts()}")
        except Exception as e:
            print(f"✗ Error reading parquet files: {e}")
except Exception as e:
    print(f"✗ Error listing files: {e}")

# Test 2: Are corrections being created with correct fields?
print("\n=== Test 2: Checking Correction Schema ===")
try:
    # Read each file separately to handle schema mismatches
    files = cloud_reader.list_files(
        bucket='zirk-finance-tracker',
        prefix='transaction/corrections/'
    )

    dfs = []
    for file_path in files:
        df = pl.read_parquet(file_path)
        # Cast string columns to ensure consistency
        cast_cols = {}
        for col in df.columns:
            if col in ['corrected_category', 'corrected_detail', 'corrected_merchant_name',
                      'original_category', 'original_detail', 'original_merchant_name']:
                if df[col].dtype != pl.Utf8:
                    cast_cols[col] = pl.Utf8
        if cast_cols:
            df = df.with_columns([pl.col(c).cast(t) for c, t in cast_cols.items()])
        dfs.append(df)

    corrections_df = pl.concat(dfs)
    expected_fields = [
        'correction_id', 'transaction_id', 'correction_type',
        'corrected_category', 'corrected_detail', 'corrected_merchant_name',
        'corrected_amount', 'corrected_date', 'hidden_from_spending'
    ]

    missing_fields = [f for f in expected_fields if f not in corrections_df.columns]
    if missing_fields:
        print(f"⚠ Missing fields: {missing_fields}")
    else:
        print(f"✓ All expected fields present")

    # Show correction types
    if 'correction_type' in corrections_df.columns:
        types = corrections_df.select('correction_type').unique().to_series().to_list()
        print(f"  Correction types found: {types}")

        for ct in types:
            count = corrections_df.filter(pl.col('correction_type') == ct).height
            print(f"    {ct}: {count} corrections")

except Exception as e:
    print(f"✗ Error analyzing schema: {e}")

# Test 3: Can we match corrections to transactions?
print("\n=== Test 3: Matching Corrections to Transactions ===")
try:
    transactions_df = pl.scan_parquet("s3://zirk-finance-tracker/transaction/current/*").limit(100).collect()

    # Read corrections with type casting
    files = cloud_reader.list_files(
        bucket='zirk-finance-tracker',
        prefix='transaction/corrections/'
    )
    dfs = []
    for file_path in files:
        df = pl.read_parquet(file_path)
        cast_cols = {}
        for col in df.columns:
            if col in ['corrected_category', 'corrected_detail', 'corrected_merchant_name',
                      'original_category', 'original_detail', 'original_merchant_name']:
                if df[col].dtype != pl.Utf8:
                    cast_cols[col] = pl.Utf8
        if cast_cols:
            df = df.with_columns([pl.col(c).cast(t) for c, t in cast_cols.items()])
        dfs.append(df)

    corrections_df = pl.concat(dfs)

    txn_ids = set(transactions_df.select('transaction_id').to_series().to_list())
    corr_ids = set(corrections_df.select('transaction_id').unique().to_series().to_list())

    matched = txn_ids.intersection(corr_ids)
    print(f"✓ Transactions in DB: {len(txn_ids)}")
    print(f"✓ Unique corrections: {len(corr_ids)}")
    print(f"✓ Matching IDs: {len(matched)}")

    if matched:
        sample_id = list(matched)[0]
        print(f"\n  Sample matched transaction: {sample_id}")
        txn = transactions_df.filter(pl.col('transaction_id') == sample_id).to_dicts()[0]
        corr = corrections_df.filter(pl.col('transaction_id') == sample_id).to_dicts()
        print(f"    Original category: {txn.get('primary_financial_category')}")
        for c in corr:
            print(f"    Correction: {c.get('corrected_category')} (type: {c.get('correction_type')})")

except Exception as e:
    print(f"✗ Error matching corrections: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Diagnostic Complete ===")
