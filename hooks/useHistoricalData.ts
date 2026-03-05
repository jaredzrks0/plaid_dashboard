import { useState, useEffect, useCallback, useRef } from 'react';
import { Account, TimePeriod, DateRange, HistoricalDataPoint } from '@/types/finance';

const API_BASE_URL = 'http://localhost:8000';

interface UseHistoricalDataParams {
  timePeriod: TimePeriod;
  customRange: DateRange;
  selectedAccounts: string[];
}

interface UseHistoricalDataReturn {
  data: HistoricalDataPoint[];
  accountNames: string[];
  loading: boolean;
  error: string | null;
}

function getDateRange(timePeriod: TimePeriod, customRange: DateRange): DateRange {
  if (timePeriod === 'custom') return customRange;

  const now = new Date();
  const maxDate = now.toISOString().split('T')[0];
  const min = new Date(now);

  switch (timePeriod) {
    case '1m': min.setMonth(min.getMonth() - 1); break;
    case '3m': min.setMonth(min.getMonth() - 3); break;
    case '6m': min.setMonth(min.getMonth() - 6); break;
    case '1y': min.setFullYear(min.getFullYear() - 1); break;
  }

  return { minDate: min.toISOString().split('T')[0], maxDate };
}

export function useHistoricalData({ timePeriod, customRange, selectedAccounts }: UseHistoricalDataParams): UseHistoricalDataReturn {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [accountNames, setAccountNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevKeyRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    if (timePeriod === 'custom' && (!customRange.minDate || !customRange.maxDate)) {
      return;
    }

    if (selectedAccounts.length === 0) {
      setData([]);
      setAccountNames([]);
      return;
    }

    const { minDate, maxDate } = getDateRange(timePeriod, customRange);
    const params = new URLSearchParams({ min_date: minDate, max_date: maxDate });
    selectedAccounts.forEach(a => params.append('included_accounts', a));

    const key = params.toString();
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/accounts/?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const accounts: Account[] = await response.json();

      const byDate = new Map<string, Map<string, number>>();
      const allNames = new Set<string>();

      for (const acct of accounts) {
        const dateKey = new Date(acct.last_pulled).toISOString().split('T')[0];
        allNames.add(acct.display_name);

        if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
        const dateMap = byDate.get(dateKey)!;
        dateMap.set(acct.display_name, acct.current_balance || 0);
      }

      const sortedDates = Array.from(byDate.keys()).sort();
      const points: HistoricalDataPoint[] = sortedDates.map(dateKey => {
        const dateMap = byDate.get(dateKey)!;
        const point: HistoricalDataPoint = {
          date: new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          sortKey: dateKey,
        };
        for (const name of allNames) {
          if (dateMap.has(name)) {
            point[name] = dateMap.get(name)!;
          }
        }
        return point;
      });

      setData(points);
      setAccountNames(Array.from(allNames).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load historical data');
    } finally {
      setLoading(false);
    }
  }, [timePeriod, customRange, selectedAccounts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, accountNames, loading, error };
}
