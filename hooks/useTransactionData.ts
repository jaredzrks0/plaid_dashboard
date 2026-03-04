import { useState, useEffect, useCallback, useRef } from 'react';
import { TransactionsResponse, TransactionFilters } from '@/types/finance';

const API_BASE_URL = 'http://localhost:8000';

interface UseTransactionDataParams {
  filters: TransactionFilters;
  limit: number;
  offset: number;
}

interface UseTransactionDataReturn {
  data: TransactionsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactionData({ filters, limit, offset }: UseTransactionDataParams): UseTransactionDataReturn {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevKeyRef = useRef<string>('');

  const fetchData = useCallback(async (force = false) => {
    const params = new URLSearchParams();

    if (filters.minDate) params.set('min_date', filters.minDate);
    if (filters.maxDate) params.set('max_date', filters.maxDate);
    if (filters.search) params.set('search', filters.search);
    params.set('sort_by', filters.sortBy);
    params.set('sort_desc', String(filters.sortDesc));
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    filters.categories.forEach(c => params.append('categories', c));
    filters.accountIds.forEach(a => params.append('account_ids', a));
    filters.paymentChannels.forEach(p => params.append('payment_channels', p));

    const key = params.toString();
    if (!force && key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/transactions/?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const result: TransactionsResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters, limit, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    prevKeyRef.current = '';
    fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refetch };
}
