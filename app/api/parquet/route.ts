
// import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
// import parquet from 'parquetjs';

// export async function GET() {
//   try {
//     const s3 = new S3Client({
//       region: process.env.AWS_REGION,
//       credentials: {
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//       },
//     });

//     const command = new GetObjectCommand({
//       Bucket: 'zirk-finance-tracker',
//       Key: 'account/current/*.parquet',
//     });

//     const response = await s3.send(command);
//     const uint8Array = await response.Body?.transformToByteArray();
    
//     if (!uint8Array) throw new Error('No data received');

//     // Convert to Node.js Buffer
//     const buffer = Buffer.from(uint8Array);
    
//     // Read parquet file using openBuffer
//     const reader = await parquet.ParquetReader.openBuffer(buffer);
//     const cursor = reader.getCursor();
    
//     const records: any[] = [];
//     let record = null;
//     while (record = await cursor.next()) {
//       records.push(record);
//     }
    
//     await reader.close();
    
//     return Response.json({ data: records, count: records.length });
//   } catch (error: any) {
//     console.error('Parquet read error:', error);
//     return Response.json({ error: error.message }, { status: 500 });
//   }
// }