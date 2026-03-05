'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Transaction, TransactionFilters, CorrectionCreate, SplitCreate } from '@/types/finance';
import { Badge } from '@/components/ui/Badge';
import { CorrectionModal } from './CorrectionModal';

interface TransactionTableProps {
  transactions: Transaction[];
  totalCount: number;
  categories: string[];
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onSubmitCorrection: (correction: CorrectionCreate) => Promise<boolean>;
  onSubmitSplit: (split: SplitCreate) => Promise<boolean>;
  onToggleHidden?: (transaction: Transaction, hidden: boolean) => Promise<boolean>;
  onTransactionUpdated?: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions,
  totalCount,
  categories,
  filters,
  onFiltersChange,
  onSubmitCorrection,
  onSubmitSplit,
  onToggleHidden,
  onTransactionUpdated,
}: TransactionTableProps) {
  const { theme } = useTheme();
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Update local transactions when props change
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  // Extract unique detailed categories from transactions
  const detailedCategories = Array.from(
    new Set(localTransactions
      .map(t => t.detailed_financial_category)
      .filter((d): d is string => d !== null && d !== undefined)
    )
  ).sort();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      onFiltersChange({ ...filters, sortDesc: !filters.sortDesc });
    } else {
      onFiltersChange({ ...filters, sortBy: column, sortDesc: true });
    }
  };

  const handleToggleHidden = async (transaction: Transaction) => {
    const newHiddenState = !transaction.hidden_from_spending;

    // Optimistic update: update local state immediately
    setLocalTransactions(prev =>
      prev.map(t =>
        t.transaction_id === transaction.transaction_id
          ? { ...t, hidden_from_spending: newHiddenState }
          : t
      )
    );

    // Call the parent handler
    if (onToggleHidden) {
      const success = await onToggleHidden(transaction, newHiddenState);
      if (!success) {
        // Revert on failure
        setLocalTransactions(prev =>
          prev.map(t =>
            t.transaction_id === transaction.transaction_id
              ? { ...t, hidden_from_spending: transaction.hidden_from_spending }
              : t
          )
        );
      }
    }
  };

  const handleCorrectionSubmit = async (correction: CorrectionCreate) => {
    console.log('Table submitting correction:', correction);
    const success = await onSubmitCorrection(correction);
    console.log('Correction submission result:', success);

    if (success) {
      // Update local state with any changes from the correction
      const updatedTxn = localTransactions.find(t => t.transaction_id === correction.transaction_id);
      if (updatedTxn) {
        const newTxn = { ...updatedTxn };
        // Mark as corrected if any correction fields were provided
        if (correction.corrected_category !== undefined ||
            correction.corrected_detail !== undefined ||
            correction.corrected_merchant_name !== undefined ||
            correction.corrected_amount !== undefined ||
            correction.corrected_date !== undefined ||
            correction.hidden_from_spending !== undefined) {
          newTxn.is_corrected = true;
        }
        if (correction.corrected_category !== undefined) newTxn.primary_financial_category = correction.corrected_category;
        if (correction.corrected_detail !== undefined) newTxn.detailed_financial_category = correction.corrected_detail;
        if (correction.corrected_merchant_name !== undefined) newTxn.merchant_name = correction.corrected_merchant_name;
        if (correction.corrected_amount !== undefined) newTxn.transaction_amount = correction.corrected_amount;
        if (correction.corrected_date !== undefined) newTxn.transaction_date = correction.corrected_date;
        if (correction.hidden_from_spending !== undefined) newTxn.hidden_from_spending = correction.hidden_from_spending;

        console.log('Updated transaction locally:', newTxn);
        setLocalTransactions(prev =>
          prev.map(t => t.transaction_id === correction.transaction_id ? newTxn : t)
        );
        onTransactionUpdated?.(newTxn);
      }
    }
    return success;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return null;
    return (
      <svg className="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={filters.sortDesc ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
      </svg>
    );
  };

  const thClass = theme === 'dark'
    ? 'px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none'
    : 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none';

  const tdClass = theme === 'dark' ? 'px-4 py-3 text-sm text-slate-300' : 'px-4 py-3 text-sm text-gray-700';

  const rowClass = theme === 'dark'
    ? 'border-t border-slate-700/30 hover:bg-slate-700/30 transition-colors'
    : 'border-t border-gray-100 hover:bg-gray-50 transition-colors';

  return (
    <>
      <div className={theme === 'dark'
        ? 'bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden'
        : 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'
      }>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}>
              <tr>
                <th className={thClass} onClick={() => handleSort('transaction_date')}>
                  Date <SortIcon column="transaction_date" />
                </th>
                <th className={thClass}>Description</th>
                <th className={thClass}>Category</th>
                <th className={thClass}>Detail</th>
                <th className={thClass} onClick={() => handleSort('transaction_amount')}>
                  Amount <SortIcon column="transaction_amount" />
                </th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {localTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${tdClass} text-center py-12`}>
                    <p className={theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}>
                      No transactions found
                    </p>
                  </td>
                </tr>
              ) : (
                localTransactions.map(txn => (
                  <tr key={txn.transaction_id} className={rowClass}>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      {formatDate(txn.transaction_date)}
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className={theme === 'dark'
                            ? 'font-medium text-slate-200'
                            : 'font-medium text-gray-900'
                          }>
                            {txn.merchant_name || txn.description || 'Unknown'}
                          </p>
                          {txn.merchant_name_specific && txn.merchant_name_specific !== txn.merchant_name && (
                            <p className={theme === 'dark' ? 'text-xs text-slate-500' : 'text-xs text-gray-400'}>
                              {txn.merchant_name_specific}
                            </p>
                          )}
                        </div>
                        {txn.is_corrected && (
                          <Badge variant="warning">Edited</Badge>
                        )}
                        {txn.is_split && (
                          <Badge variant="default">Split</Badge>
                        )}
                        {txn.hidden_from_spending && (
                          <Badge variant="default">Hidden</Badge>
                        )}
                      </div>
                    </td>
                    <td className={tdClass}>
                      {txn.primary_financial_category && (
                        <span className={theme === 'dark'
                          ? 'inline-block px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-300'
                          : 'inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600'
                        }>
                          {txn.primary_financial_category}
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {txn.detailed_financial_category && (
                        <span className={theme === 'dark'
                          ? 'inline-block px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700/50'
                          : 'inline-block px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-100'
                        }>
                          {txn.detailed_financial_category}
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap font-medium ${
                      txn.transaction_amount < 0
                        ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                        : (theme === 'dark' ? 'text-slate-200' : 'text-gray-900')
                    }`}>
                      {formatCurrency(txn.transaction_amount)}
                    </td>
                    <td className={tdClass}>
                      {txn.transaction_pending ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="success">Posted</Badge>
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex items-center justify-end gap-3">
                        {onToggleHidden && (
                          <button
                            onClick={() => handleToggleHidden(txn)}
                            className={theme === 'dark'
                              ? `text-xs font-medium ${txn.hidden_from_spending ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-300'}`
                              : `text-xs font-medium ${txn.hidden_from_spending ? 'text-amber-600 hover:text-amber-500' : 'text-gray-400 hover:text-gray-600'}`
                            }
                            title={txn.hidden_from_spending ? 'Show in spending' : 'Hide from spending'}
                          >
                            {txn.hidden_from_spending ? 'Unhide' : 'Hide'}
                          </button>
                        )}
                        <button
                          onClick={() => setEditingTransaction(txn)}
                          className={theme === 'dark'
                            ? 'text-xs font-medium text-blue-400 hover:text-blue-300'
                            : 'text-xs font-medium text-blue-600 hover:text-blue-500'
                          }
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: total count only */}
        {totalCount > 0 && (
          <div className={theme === 'dark'
            ? 'px-4 py-3 border-t border-slate-700/50'
            : 'px-4 py-3 border-t border-gray-200'
          }>
            <p className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
              {totalCount} transaction{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {editingTransaction && (
        <CorrectionModal
          transaction={editingTransaction}
          categories={categories}
          detailedCategories={detailedCategories}
          onSubmitCorrection={handleCorrectionSubmit}
          onSubmitSplit={onSubmitSplit}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </>
  );
}
