import polars as pl

df = pl.read_parquet("s3://zirk-finance-tracker/account/current/2026-01-21@08:00:03_account_balances.parquet")

x = 1