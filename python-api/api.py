# api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import polars as pl
import boto3
from io import BytesIO
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = FastAPI()

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
    return {"message": "Parquet API is running"}

@app.get("/api/parquet/preview")
async def get_parquet_preview(limit: int = 100):
    """Get a preview of the first N rows"""
    try:
        print(f"Starting parquet preview with limit={limit}")
        
        s3 = boto3.client(
            's3',
            region_name=os.getenv('AWS_REGION'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        
        bucket = os.getenv('S3_BUCKET')
        key = os.getenv('S3_KEY')
        
        if not bucket or not key:
            raise HTTPException(status_code=500, detail="S3 bucket or key not configured")
        
        print(f"Fetching from S3: {bucket}/{key}")
        obj = s3.get_object(Bucket=bucket, Key=key)
        parquet_bytes = obj['Body'].read()
        
        print("Reading parquet file with Polars...")
        df = pl.read_parquet(BytesIO(parquet_bytes))
        print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
        
        # Get preview
        preview = df.head(limit)
        print(f"Preview shape: {preview.shape}")
        
        # Polars' to_dicts() handles null values and data types properly for JSON
        records = preview.to_dicts()
        
        result = {
            "data": records,
            "total_rows": len(df),
            "preview_rows": len(preview),
            "columns": df.columns
        }
        
        print(f"Returning {len(records)} records")
        return result
    
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print("ERROR:")
        print(error_detail)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/parquet/info")
async def get_parquet_info():
    """Get metadata about the parquet file"""
    try:
        s3 = boto3.client(
            's3',
            region_name=os.getenv('AWS_REGION'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        
        bucket = os.getenv('S3_BUCKET')
        key = os.getenv('S3_KEY')
        
        if not bucket or not key:
            raise HTTPException(status_code=500, detail="S3 bucket or key not configured")
        
        obj = s3.get_object(Bucket=bucket, Key=key)
        df = pl.read_parquet(BytesIO(obj['Body'].read()))
        
        # Get schema info
        schema = {col: str(dtype) for col, dtype in df.schema.items()}
        
        return {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "columns": df.columns,
            "schema": schema,
            "estimated_size_mb": df.estimated_size() / (1024 * 1024)
        }
    
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/parquet/full")
async def get_parquet_full():
    """Get all data (use with caution for large files)"""
    try:
        s3 = boto3.client(
            's3',
            region_name=os.getenv('AWS_REGION'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
        
        bucket = os.getenv('S3_BUCKET')
        key = os.getenv('S3_KEY')
        
        if not bucket or not key:
            raise HTTPException(status_code=500, detail="S3 bucket or key not configured")
        
        obj = s3.get_object(Bucket=bucket, Key=key)
        df = pl.read_parquet(BytesIO(obj['Body'].read()))
        
        records = df.to_dicts()
        
        return {
            "data": records,
            "count": len(df),
            "columns": df.columns
        }
    
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))