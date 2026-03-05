'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBalanceData } from '@/hooks/useBalanceData';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NetWorthSummary } from './NetWorthSummary';
import { AccountsGrid } from './AccountsGrid';
import { HistoricalBalanceChart } from './HistoricalBalanceChart';
import { Card, CardContent } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

type Tab = 'networth' | 'account_cards' | 'historical_balances';

export function BalancesPage() {
  const router = useRouter();
  const { data, loading, error } = useBalanceData();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('networth');
  const [groupBy, setGroupBy] = useState<'account_type' | 'institution'>('account_type');
  const [accountsDropdownOpen, setAccountsDropdownOpen] = useState(false);
  const [transactionsDropdownOpen, setTransactionsDropdownOpen] = useState(false);
  const accountsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transactionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAccountsTab = activeTab === 'account_cards' || activeTab === 'historical_balances';

  const handleAccountsMouseEnter = () => {
    if (accountsTimeoutRef.current) clearTimeout(accountsTimeoutRef.current);
    setAccountsDropdownOpen(true);
  };

  const handleAccountsMouseLeave = () => {
    accountsTimeoutRef.current = setTimeout(() => setAccountsDropdownOpen(false), 150);
  };

  const handleTransactionsMouseEnter = () => {
    if (transactionsTimeoutRef.current) clearTimeout(transactionsTimeoutRef.current);
    setTransactionsDropdownOpen(true);
  };

  const handleTransactionsMouseLeave = () => {
    transactionsTimeoutRef.current = setTimeout(() => setTransactionsDropdownOpen(false), 150);
  };

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

  const accountsDropdownItems: { tab: Tab; label: string }[] = [
    { tab: 'account_cards', label: 'Account Cards' },
    { tab: 'historical_balances', label: 'Historical Balances' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className={theme === 'dark'
          ? 'border-b border-slate-700/50'
          : 'border-b border-gray-200'
        }>
          <div className="flex gap-8">
            {/* Net Worth tab */}
            <button
              onClick={() => setActiveTab('networth')}
              className={theme === 'dark'
                ? `px-1 py-3 text-lg font-semibold transition-colors border-b-2 ${
                    activeTab === 'networth'
                      ? 'text-blue-400 border-b-blue-400'
                      : 'text-slate-400 border-b-transparent hover:text-slate-300'
                  }`
                : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 ${
                    activeTab === 'networth'
                      ? 'text-blue-600 border-b-blue-600'
                      : 'text-gray-600 border-b-transparent hover:text-gray-900'
                  }`
              }
            >
              Net Worth
            </button>

            {/* Accounts dropdown tab */}
            <div
              className="relative"
              onMouseEnter={handleAccountsMouseEnter}
              onMouseLeave={handleAccountsMouseLeave}
            >
              <button
                className={theme === 'dark'
                  ? `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                      isAccountsTab
                        ? 'text-blue-400 border-b-blue-400'
                        : 'text-slate-400 border-b-transparent hover:text-slate-300'
                    }`
                  : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                      isAccountsTab
                        ? 'text-blue-600 border-b-blue-600'
                        : 'text-gray-600 border-b-transparent hover:text-gray-900'
                    }`
                }
              >
                Accounts
                <svg
                  className={`w-4 h-4 transition-transform ${accountsDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {accountsDropdownOpen && (
                <div
                  className={theme === 'dark'
                    ? 'absolute top-full left-0 mt-1 w-52 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-50 py-1 overflow-hidden'
                    : 'absolute top-full left-0 mt-1 w-52 rounded-lg bg-white border border-gray-200 shadow-xl z-50 py-1 overflow-hidden'
                  }
                >
                  {accountsDropdownItems.map(({ tab, label }) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setAccountsDropdownOpen(false);
                      }}
                      className={theme === 'dark'
                        ? `w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === tab
                              ? 'bg-slate-700 text-blue-400'
                              : 'text-slate-300 hover:bg-slate-700/60 hover:text-slate-100'
                          }`
                        : `w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === tab
                              ? 'bg-gray-100 text-blue-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions dropdown tab */}
            <div
              className="relative"
              onMouseEnter={handleTransactionsMouseEnter}
              onMouseLeave={handleTransactionsMouseLeave}
            >
              <button
                className={theme === 'dark'
                  ? `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-1.5 text-slate-400 border-b-transparent hover:text-slate-300`
                  : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-1.5 text-gray-600 border-b-transparent hover:text-gray-900`
                }
              >
                Transactions
                <svg
                  className={`w-4 h-4 transition-transform ${transactionsDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {transactionsDropdownOpen && (
                <div
                  className={theme === 'dark'
                    ? 'absolute top-full left-0 mt-1 w-52 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-50 py-1 overflow-hidden'
                    : 'absolute top-full left-0 mt-1 w-52 rounded-lg bg-white border border-gray-200 shadow-xl z-50 py-1 overflow-hidden'
                  }
                >
                  <button
                    onClick={() => {
                      router.push('/transactions?tab=recent');
                      setTransactionsDropdownOpen(false);
                    }}
                    className={theme === 'dark'
                      ? 'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors text-slate-300 hover:bg-slate-700/60 hover:text-slate-100'
                      : 'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  >
                    Recent Transactions
                  </button>
                  <button
                    onClick={() => {
                      router.push('/transactions?tab=trends');
                      setTransactionsDropdownOpen(false);
                    }}
                    className={theme === 'dark'
                      ? 'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors text-slate-300 hover:bg-slate-700/60 hover:text-slate-100'
                      : 'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  >
                    Spending Trends
                  </button>
                  <button
                    onClick={() => {
                      router.push('/transactions?tab=corrections');
                      setTransactionsDropdownOpen(false);
                    }}
                    className={theme === 'dark'
                      ? 'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors text-slate-300 hover:bg-slate-700/60 hover:text-slate-100'
                      : 'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  >
                    Corrections
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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
