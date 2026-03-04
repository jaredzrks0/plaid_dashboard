'use client';

import { useState } from 'react';
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
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
  onSubmitCorrection: (correction: CorrectionCreate) => Promise<boolean>;
  onSubmitSplit: (split: SplitCreate) => Promise<boolean>;
}

export function TransactionTable({
  transactions,
  totalCount,
  categories,
  filters,
  onFiltersChange,
  limit,
  offset,
  onPageChange,
  onSubmitCorrection,
  onSubmitSplit,
}: TransactionTableProps) {
  const { theme } = useTheme();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return null;
    return (
      <svg className="w-3 h-3 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d={filters.sortDesc ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
      </svg>
    );
  };

  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

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
                <th className={thClass} onClick={() => handleSort('transaction_amount')}>
                  Amount <SortIcon column="transaction_amount" />
                </th>
                <th className={thClass}>Channel</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${tdClass} text-center py-12`}>
                    <p className={theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}>
                      No transactions found
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map(txn => (
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
                    <td className={`${tdClass} whitespace-nowrap font-medium ${
                      txn.transaction_amount < 0
                        ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                        : (theme === 'dark' ? 'text-slate-200' : 'text-gray-900')
                    }`}>
                      {formatCurrency(txn.transaction_amount)}
                    </td>
                    <td className={tdClass}>
                      {txn.payment_channel && (
                        <span className="capitalize text-xs">{txn.payment_channel}</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {txn.transaction_pending ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="success">Posted</Badge>
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        onClick={() => setEditingTransaction(txn)}
                        className={theme === 'dark'
                          ? 'text-xs font-medium text-blue-400 hover:text-blue-300'
                          : 'text-xs font-medium text-blue-600 hover:text-blue-500'
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className={theme === 'dark'
            ? 'px-4 py-3 border-t border-slate-700/50 flex items-center justify-between'
            : 'px-4 py-3 border-t border-gray-200 flex items-center justify-between'
          }>
            <p className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
              Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className={theme === 'dark'
                  ? `px-3 py-1.5 text-sm rounded-lg ${offset === 0 ? 'text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`
                  : `px-3 py-1.5 text-sm rounded-lg ${offset === 0 ? 'text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }
              >
                Previous
              </button>
              <span className={theme === 'dark' ? 'px-3 py-1.5 text-sm text-slate-400' : 'px-3 py-1.5 text-sm text-gray-600'}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(offset + limit)}
                disabled={offset + limit >= totalCount}
                className={theme === 'dark'
                  ? `px-3 py-1.5 text-sm rounded-lg ${offset + limit >= totalCount ? 'text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`
                  : `px-3 py-1.5 text-sm rounded-lg ${offset + limit >= totalCount ? 'text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editingTransaction && (
        <CorrectionModal
          transaction={editingTransaction}
          categories={categories}
          onSubmitCorrection={onSubmitCorrection}
          onSubmitSplit={onSubmitSplit}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </>
  );
}
