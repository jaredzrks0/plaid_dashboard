// import * as parquet from "parquetjs-lite";

// export async function loadCurrentS3Parquet(bucket: string, table_name: string) {
//   const url = `https://${bucket}.s3.amazonaws.com/${table_name}/current/2026-01-12%4012%3A06%3A39_account_balances.parquet`;

//   // Fetch the Parquet file as a Buffer
//   const response = await fetch(url);
//   const buffer = await response.arrayBuffer();

//   // Use @alancnet/parquetjs to read the Parquet file
//   const reader = await parquet.ParquetReader.openBuffer(Buffer.from(buffer));
//   const cursor = reader.getCursor();
//   const rows = [];

//   let record = null;
//   while ((record = await cursor.next())) {
//     rows.push(record);
//   }

//   await reader.close();
//   return rows;
//}