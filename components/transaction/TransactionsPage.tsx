'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  sortBy: 'transaction_date',
  sortDesc: true,
};

function TransactionsPageContent() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('recent');

  // Get tab from query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && ['recent', 'trends', 'corrections'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);

  const {
    data, loading, error, refetch,
    selectedPeriod, setSelectedPeriod,
    viewMonth, setViewMonth,
    prevMonth, nextMonth,
    periodLabel, isSingleMonth,
  } = useTransactionData({ filters });

  const { submitCorrection, submitSplit, toggleHiddenFromSpending } = useCorrections();

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
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

  const handleToggleHidden = async (transaction: Parameters<typeof toggleHiddenFromSpending>[0], hidden: boolean) => {
    // Don't refetch - the TransactionTable handles optimistic updates
    return await toggleHiddenFromSpending(transaction, hidden);
  };

  return (
    <div className="space-y-6">
      {/* Recent Transactions tab */}
      {activeTab === 'recent' && (
        <>
          <TransactionFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            availableCategories={data?.categories || []}
            availableAccounts={data?.accounts || []}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            isSingleMonth={isSingleMonth}
            periodLabel={periodLabel}
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
              onSubmitCorrection={handleCorrectionSubmit}
              onSubmitSplit={handleSplitSubmit}
              onToggleHidden={handleToggleHidden}
              onTransactionUpdated={() => {}}
            />
          ) : null}
        </>
      )}

      {/* Spending Trends tab */}
      {activeTab === 'trends' && <SpendingTrends />}

      {/* Corrections tab */}
      {activeTab === 'corrections' && <CorrectionsView onCorrectionDeleted={refetch} />}
    </div>
  );
}

export function TransactionsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
        <TransactionsPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
