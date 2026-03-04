import { useState, useEffect, useCallback, useRef } from 'react';
import { TransactionSummary } from '@/types/finance';

const API_BASE_URL = 'http://localhost:8000';

interface UseSpendingTrendsParams {
  minDate: string;
  maxDate: string;
  accountIds?: string[];
}

interface UseSpendingTrendsReturn {
  data: TransactionSummary | null;
  loading: boolean;
  error: string | null;
}

export function useSpendingTrends({ minDate, maxDate, accountIds }: UseSpendingTrendsParams): UseSpendingTrendsReturn {
  const [data, setData] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevKeyRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (minDate) params.set('min_date', minDate);
    if (maxDate) params.set('max_date', maxDate);
    accountIds?.forEach(a => params.append('account_ids', a));

    const key = params.toString();
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/monthly_summary?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const result: TransactionSummary = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching spending trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load spending trends');
    } finally {
      setLoading(false);
    }
  }, [minDate, maxDate, accountIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
