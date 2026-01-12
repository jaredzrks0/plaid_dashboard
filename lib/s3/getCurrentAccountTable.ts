// lib/s3/getCurrentAccountTable.ts
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function getCurrentAccountTable({
  bucket,
  prefix = "current/",
}: {
  bucket: string;
  prefix?: string;
}): Promise<Buffer> {
  if (!bucket || !process.env.AWS_REGION) {
    throw new Error("AWS_REGION and bucket must be set");
  }

  // 1️⃣ List objects under the prefix
  const listResp = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
  );

  const files = listResp.Contents?.filter(o => o.Key && o.Key !== prefix) ?? [];
  if (!files.length) throw new Error(`No files found under prefix "${prefix}"`);

  // 2️⃣ Pick the latest file by LastModified
  const latest = files.reduce((a, b) =>
    new Date(a.LastModified!) > new Date(b.LastModified!) ? a : b
  );

  console.log("Downloading latest file:", latest.Key);

  // 3️⃣ Fetch the object
  const getResp = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: latest.Key! })
  );

  // 4️⃣ Convert stream to Buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of getResp.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return buffer; // Parquet file as a buffer
}
