'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactionData } from '@/hooks/useTransactionData';
import { useCorrections } from '@/hooks/useCorrections';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { TransactionFilterBar } from './TransactionFilterBar';
import { TransactionTable } from './TransactionTable';
import { SpendingTrends } from './SpendingTrends';
import { CorrectionsView } from './CorrectionsView';
import { TransactionFilters } from '@/types/finance';

type Tab = 'recent' | 'trends' | 'corrections';

const defaultFilters: TransactionFilters = {
  search: '',
  categories: [],
  accountIds: [],
  paymentChannels: [],
  minDate: '',
  maxDate: '',
  sortBy: 'transaction_date',
  sortDesc: true,
};

export function TransactionsPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('recent');
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const { data, loading, error, refetch } = useTransactionData({ filters, limit, offset });
  const { submitCorrection, submitSplit } = useCorrections();

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
    setOffset(0);
  };

  const handleCorrectionSubmit = async (correction: Parameters<typeof submitCorrection>[0]) => {
    const success = await submitCorrection(correction);
    if (success) refetch();
    return success;
  };

  const handleSplitSubmit = async (split: Parameters<typeof submitSplit>[0]) => {
    const success = await submitSplit(split);
    if (success) refetch();
    return success;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'recent', label: 'Recent Transactions' },
    { key: 'trends', label: 'Spending Trends' },
    { key: 'corrections', label: 'Corrections' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sub-tab bar */}
        <div className={theme === 'dark'
          ? 'border-b border-slate-700/50'
          : 'border-b border-gray-200'
        }>
          <div className="flex gap-8">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={theme === 'dark'
                  ? `px-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                      activeTab === key
                        ? 'text-blue-400 border-b-blue-400'
                        : 'text-slate-400 border-b-transparent hover:text-slate-300'
                    }`
                  : `px-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                      activeTab === key
                        ? 'text-blue-600 border-b-blue-600'
                        : 'text-gray-600 border-b-transparent hover:text-gray-900'
                    }`
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Transactions tab */}
        {activeTab === 'recent' && (
          <>
            <TransactionFilterBar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableCategories={data?.categories || []}
              availableAccounts={data?.accounts || []}
            />

            {loading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className={theme === 'dark' ? 'h-12 bg-slate-800/50 rounded-lg' : 'h-12 bg-gray-200 rounded-lg'} />
                  </div>
                ))}
              </div>
            ) : error ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                    <h3 className="text-lg font-semibold mb-2">Error Loading Transactions</h3>
                    <p>{error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : data ? (
              <TransactionTable
                transactions={data.transactions}
                totalCount={data.total_count}
                categories={data.categories}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                limit={limit}
                offset={offset}
                onPageChange={setOffset}
                onSubmitCorrection={handleCorrectionSubmit}
                onSubmitSplit={handleSplitSubmit}
              />
            ) : null}
          </>
        )}

        {/* Spending Trends tab */}
        {activeTab === 'trends' && <SpendingTrends />}

        {/* Corrections tab */}
        {activeTab === 'corrections' && <CorrectionsView onCorrectionDeleted={refetch} />}
      </div>
    </DashboardLayout>
  );
}
