import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TransactionsResponse, TransactionFilters, PeriodOption } from '@/types/finance';

const API_BASE_URL = 'http://localhost:8000';

function getMonthBounds(date: Date): { minDate: string; maxDate: string } {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    minDate: first.toISOString().split('T')[0],
    maxDate: last.toISOString().split('T')[0],
  };
}

function getPeriodBounds(period: PeriodOption, viewMonth: Date): { minDate: string; maxDate: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'current':
    case 'prior':
    case 'specific':
      return getMonthBounds(viewMonth);
    case 'l3': {
      const min = new Date(now);
      min.setMonth(min.getMonth() - 3);
      return { minDate: min.toISOString().split('T')[0], maxDate: today };
    }
    case 'l6': {
      const min = new Date(now);
      min.setMonth(min.getMonth() - 6);
      return { minDate: min.toISOString().split('T')[0], maxDate: today };
    }
    case 'ytd':
      return { minDate: `${now.getFullYear()}-01-01`, maxDate: today };
  }
}

interface UseTransactionDataParams {
  filters: TransactionFilters;
}

interface UseTransactionDataReturn {
  data: TransactionsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  selectedPeriod: PeriodOption;
  setSelectedPeriod: (p: PeriodOption) => void;
  viewMonth: Date;
  setViewMonth: (d: Date) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  periodLabel: string;
  isSingleMonth: boolean;
}

export function useTransactionData({ filters }: UseTransactionDataParams): UseTransactionDataReturn {
  const now = new Date();
  const [selectedPeriod, setSelectedPeriodState] = useState<PeriodOption>('current');
  const [viewMonth, setViewMonth] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevKeyRef = useRef<string>('');

  const setSelectedPeriod = useCallback((p: PeriodOption) => {
    setSelectedPeriodState(p);
    if (p === 'current') {
      setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (p === 'prior') {
      setViewMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    }
  }, []);

  const prevMonth = useCallback(() => {
    setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const isSingleMonth = selectedPeriod === 'current' || selectedPeriod === 'prior' || selectedPeriod === 'specific';

  const periodLabel = useMemo(() => {
    if (isSingleMonth) {
      return viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    switch (selectedPeriod) {
      case 'l3': return 'Last 3 Months';
      case 'l6': return 'Last 6 Months';
      case 'ytd': return 'Year to Date';
      default: return '';
    }
  }, [selectedPeriod, viewMonth, isSingleMonth]);

  const { minDate, maxDate } = useMemo(
    () => getPeriodBounds(selectedPeriod, viewMonth),
    [selectedPeriod, viewMonth]
  );

  const fetchData = useCallback(async (force = false) => {
    const params = new URLSearchParams();

    params.set('min_date', minDate);
    params.set('max_date', maxDate);
    if (filters.search) params.set('search', filters.search);
    params.set('sort_by', filters.sortBy);
    params.set('sort_desc', String(filters.sortDesc));
    params.set('limit', '1000');
    params.set('offset', '0');

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
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters, minDate, maxDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    prevKeyRef.current = '';
    fetchData(true);
  }, [fetchData]);

  return {
    data, loading, error, refetch,
    selectedPeriod, setSelectedPeriod,
    viewMonth, setViewMonth,
    prevMonth, nextMonth,
    periodLabel, isSingleMonth,
  };
}
