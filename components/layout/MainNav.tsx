'use client';

import { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

interface MainNavProps {
  activeTab?: 'networth' | 'account_cards' | 'historical_balances';
  onTabChange?: (tab: 'networth' | 'account_cards' | 'historical_balances') => void;
}

export function MainNav({ activeTab = 'networth', onTabChange }: MainNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [accountsDropdownOpen, setAccountsDropdownOpen] = useState(false);
  const [transactionsDropdownOpen, setTransactionsDropdownOpen] = useState(false);
  const accountsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transactionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAccountsTab = activeTab === 'account_cards' || activeTab === 'historical_balances';
  const isTransactionsPage = pathname.startsWith('/transactions');

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

  const accountsDropdownItems = [
    { tab: 'account_cards' as const, label: 'Account Cards' },
    { tab: 'historical_balances' as const, label: 'Historical Balances' },
  ];

  return (
    <div className={theme === 'dark'
      ? 'border-b border-slate-700/50'
      : 'border-b border-gray-200'
    }>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Net Worth tab */}
          <button
            onClick={() => {
              onTabChange?.('networth');
              if (isTransactionsPage) router.push('/');
            }}
            className={theme === 'dark'
              ? `px-1 py-3 text-lg font-semibold transition-colors border-b-2 ${
                  activeTab === 'networth' && !isTransactionsPage
                    ? 'text-blue-400 border-b-blue-400'
                    : 'text-slate-400 border-b-transparent hover:text-slate-300'
                }`
              : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 ${
                  activeTab === 'networth' && !isTransactionsPage
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
                    isAccountsTab && !isTransactionsPage
                      ? 'text-blue-400 border-b-blue-400'
                      : 'text-slate-400 border-b-transparent hover:text-slate-300'
                  }`
                : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                    isAccountsTab && !isTransactionsPage
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
                      if (isTransactionsPage) {
                        router.push(`/?tab=${tab}`);
                      } else {
                        onTabChange?.(tab);
                      }
                      setAccountsDropdownOpen(false);
                    }}
                    className={theme === 'dark'
                      ? `w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          activeTab === tab && !isTransactionsPage
                            ? 'bg-slate-700 text-blue-400'
                            : 'text-slate-300 hover:bg-slate-700/60 hover:text-slate-100'
                        }`
                      : `w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          activeTab === tab && !isTransactionsPage
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
                ? `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                    isTransactionsPage
                      ? 'text-blue-400 border-b-blue-400'
                      : 'text-slate-400 border-b-transparent hover:text-slate-300'
                  }`
                : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                    isTransactionsPage
                      ? 'text-blue-600 border-b-blue-600'
                      : 'text-gray-600 border-b-transparent hover:text-gray-900'
                  }`
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
    </div>
  );
}
