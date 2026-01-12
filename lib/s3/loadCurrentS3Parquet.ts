import pl from "nodejs-polars";

export async function loadCurrentS3Parquet(bucket: string, table_name: string) {
  if (!bucket) {
    throw new Error("Bucket name must be provided");
  }

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION environment variable must be set");
  }

  try {
    // Read Parquet directly from S3 using scanParquet
    const df = pl
      .scanParquet(
        `s3://${bucket}/${table_name}/current/*.parquet`,
        {
          cloudOptions: {
            aws_region: region,
          },
        }
      )
      .collectSync();

    return df; // Return the DataFrame
  } catch (error) {
    console.error("Failed to load Parquet file from S3:", error);
    throw error;
  }
}