// scripts/run.ts
import "dotenv/config";
import {loadCurrentS3Parquet} from "../lib/s3/loadCurrentS3Parquet";


const df = await loadCurrentS3Parquet("zirk-finance-tracker", "transaction");

console.log("First 5 rows:");
console.log(df.head(5).toString());

console.log(`\nTotal rows: ${df.height}`);
console.log(`Columns: ${df.columns.join(", ")}`);


