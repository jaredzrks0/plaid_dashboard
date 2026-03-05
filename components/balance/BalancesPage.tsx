'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBalanceData } from '@/hooks/useBalanceData';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NetWorthSummary } from './NetWorthSummary';
import { AccountsGrid } from './AccountsGrid';
import { HistoricalBalanceChart } from './HistoricalBalanceChart';
import { Card, CardContent } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

type Tab = 'networth' | 'account_cards' | 'historical_balances';

export function BalancesPage() {
  const { data, loading, error } = useBalanceData();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('networth');
  const [groupBy, setGroupBy] = useState<'account_type' | 'institution'>('account_type');

  useEffect(() => {
    const tab = searchParams.get('tab') as Tab;
    if (tab && ['networth', 'account_cards', 'historical_balances'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className={theme === 'dark' ? 'h-48 bg-slate-800/50 rounded-xl' : 'h-48 bg-gray-200 rounded-xl'}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className={theme === 'dark' ? 'h-48 bg-slate-800/50 rounded-xl' : 'h-48 bg-gray-200 rounded-xl'}></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-6 text-center">
            <div className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
              <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-6 text-center">
            <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}>No data available</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navActiveTab={activeTab} onNavTabChange={setActiveTab}>
      <div className="space-y-8">

        {activeTab === 'networth' && (
          <NetWorthSummary
            data={{
              assets: data.totalAssets,
              liabilities: data.totalLiabilities,
              netWorth: data.netWorth,
              assetsByType: data.assetsByType,
              liabilitiesByType: data.liabilitiesByType,
            }}
          />
        )}

        {activeTab === 'account_cards' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className={theme === 'dark' ? 'text-sm font-medium text-slate-400' : 'text-sm font-medium text-gray-600'}>
                  Group by:
                </span>
                <div className={theme === 'dark'
                  ? 'flex gap-2 bg-slate-800/30 rounded-lg p-1'
                  : 'flex gap-2 bg-gray-100 rounded-lg p-1'
                }>
                  <button
                    onClick={() => setGroupBy('account_type')}
                    className={theme === 'dark'
                      ? `px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          groupBy === 'account_type'
                            ? 'bg-slate-700 text-slate-50'
                            : 'text-slate-400 hover:text-slate-200'
                        }`
                      : `px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          groupBy === 'account_type'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`
                    }
                  >
                    Account Type
                  </button>
                  <button
                    onClick={() => setGroupBy('institution')}
                    className={theme === 'dark'
                      ? `px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          groupBy === 'institution'
                            ? 'bg-slate-700 text-slate-50'
                            : 'text-slate-400 hover:text-slate-200'
                        }`
                      : `px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          groupBy === 'institution'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`
                    }
                  >
                    Bank
                  </button>
                </div>
              </div>
            </div>
            <AccountsGrid accounts={data.accounts} groupBy={groupBy} />
          </>
        )}

        {activeTab === 'historical_balances' && (
          <HistoricalBalanceChart accounts={data.accounts} />
        )}
      </div>
    </DashboardLayout>
  );
}
