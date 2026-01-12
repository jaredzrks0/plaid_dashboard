// scripts/run.ts
import "dotenv/config";
import pl from "nodejs-polars";

async function main() {
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.AWS_REGION!;
  
  // Read Parquet directly from S3 using scanParquet
  const df = pl
    .scanParquet(
      `s3://${bucket}/account/current/*.parquet`,
      {
        cloudOptions: {
          aws_region: region,
        },
      }
    )
    .collectSync();

  console.log("First 5 rows:");
  console.log(df.head(5).toString());
  
  console.log(`\nTotal rows: ${df.height}`);
  console.log(`Columns: ${df.columns.join(", ")}`);
}

main().catch(err => {
  console.error("FAILED");
  console.error(err);
  process.exit(1);
});
