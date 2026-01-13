// export default async function Home() {


//   return (
//     <main className="min-h-screen p-10">
//       <div className="max-w-7xl mx-auto shadow-lg p-6 rounded-lg border border-red-500">
//         <h1 className="text-5xl mb-8 text-blue-500 text-center">Dashboard</h1>
        
//         {/* Single example card */}
//         <div className="card hover:card-elevated transition-all duration-200">
//           <div className="flex justify-between items-start mb-4">
//             <div>
//               <h3 className="text-lg font-medium">Chase Checking</h3>
//               <p className="text-secondary text-sm mt-1">****1234</p>
//             </div>
//             <span className="text-tertiary text-sm">Checking</span>
//           </div>
          
//           <div className="flex justify-between items-end">
//             <div>
//               <p className="text-tertiary text-sm">Available Balance</p>
//               <p className="text-2xl font-semibold mt-1">${balance}</p>
//             </div>
//             <span className="text-success text-sm">+2.3%</span>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }
// app/page.tsx
// 

// app/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface ParquetData {
  data: any[];
  total_rows: number;
  preview_rows: number;
  columns: string[];
}

export default function Home() {
  const [parquetData, setParquetData] = useState<ParquetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Fetching data from FastAPI...');
    
    fetch('http://localhost:8000/api/parquet/preview?limit=100')
      .then(res => {
        console.log('Response status:', res.status);
        if (!res.ok) {
          return res.text().then(text => {
            throw new Error(`HTTP ${res.status}: ${text}`);
          });
        }
        return res.json();
      })
      .then(result => {
        console.log('Data received:', result);
        setParquetData(result);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
      })
      .finally(() => {
        console.log('Loading complete');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading parquet data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Data</h2>
          <p className="text-red-600">{error}</p>
          <div className="mt-4 text-sm">
            <p className="font-medium mb-2">Troubleshooting steps:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Check if FastAPI is running on <a href="http://localhost:8000" target="_blank" className="text-blue-600 underline">http://localhost:8000</a></li>
              <li>Check browser console (F12) for detailed errors</li>
              <li>Verify your .env file has correct AWS credentials</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!parquetData) {
    return <div className="p-8">No data available</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Parquet Data Viewer</h1>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-600 text-sm font-medium">Total Rows</p>
          <p className="text-2xl font-bold text-blue-900">
            {parquetData.total_rows.toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600 text-sm font-medium">Columns</p>
          <p className="text-2xl font-bold text-green-900">
            {parquetData.columns.length}
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-purple-600 text-sm font-medium">Showing</p>
          <p className="text-2xl font-bold text-purple-900">
            {parquetData.preview_rows} rows
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Columns</h2>
        <div className="flex flex-wrap gap-2">
          {parquetData.columns.map(col => (
            <span key={col} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {col}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {parquetData.columns.map(col => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parquetData.data.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {parquetData.columns.map(col => (
                    <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {parquetData.preview_rows < parquetData.total_rows && (
        <p className="mt-4 text-sm text-gray-500 text-center">
          Showing {parquetData.preview_rows} of {parquetData.total_rows.toLocaleString()} total rows
        </p>
      )}
    </div>
  );
}