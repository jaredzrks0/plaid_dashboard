import { useState, useEffect, useCallback } from 'react';
import { CorrectionRecord, CorrectionCreate, SplitCreate, Transaction } from '@/types/finance';

const API_BASE_URL = 'http://localhost:8000';

interface UseCorrectionsReturn {
  corrections: CorrectionRecord[];
  loading: boolean;
  error: string | null;
  submitCorrection: (correction: CorrectionCreate) => Promise<boolean>;
  submitSplit: (split: SplitCreate) => Promise<boolean>;
  toggleHiddenFromSpending: (transaction: Transaction, hidden: boolean) => Promise<boolean>;
  deleteCorrection: (correctionId: string) => Promise<boolean>;
  refetch: () => void;
}

export function useCorrections(): UseCorrectionsReturn {
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/corrections`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const data: CorrectionRecord[] = await response.json();
      setCorrections(data);
    } catch (err) {
      console.error('Error fetching corrections:', err);
      setError(err instanceof Error ? err.message : 'Failed to load corrections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  const submitCorrection = useCallback(async (correction: CorrectionCreate): Promise<boolean> => {
    try {
      console.log('Submitting correction:', correction);
      const response = await fetch(`${API_BASE_URL}/transactions/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction),
      });
      const responseData = await response.json();
      console.log('Correction response:', { status: response.status, data: responseData });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      await fetchCorrections();
      return true;
    } catch (err) {
      console.error('Error submitting correction:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit correction');
      return false;
    }
  }, [fetchCorrections]);

  const submitSplit = useCallback(async (split: SplitCreate): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/splits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(split),
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      await fetchCorrections();
      return true;
    } catch (err) {
      console.error('Error submitting split:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit split');
      return false;
    }
  }, [fetchCorrections]);

  const toggleHiddenFromSpending = useCallback(async (transaction: Transaction, hidden: boolean): Promise<boolean> => {
    const correction: CorrectionCreate = {
      transaction_id: transaction.transaction_id,
      hidden_from_spending: hidden,
      original_category: transaction.primary_financial_category ?? undefined,
      original_merchant_name: transaction.merchant_name ?? undefined,
      original_amount: transaction.transaction_amount,
      original_date: transaction.transaction_date ?? undefined,
    };
    return submitCorrection(correction);
  }, [submitCorrection]);

  const deleteCorrection = useCallback(async (correctionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/corrections/${correctionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      await fetchCorrections();
      return true;
    } catch (err) {
      console.error('Error deleting correction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete correction');
      return false;
    }
  }, [fetchCorrections]);

  return { corrections, loading, error, submitCorrection, submitSplit, toggleHiddenFromSpending, deleteCorrection, refetch: fetchCorrections };
}
