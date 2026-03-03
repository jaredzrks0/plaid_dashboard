'use client';

import { useState } from 'react';
import { NetWorthData, AccountTypeBalance } from '@/types/finance';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useTheme } from '@/contexts/ThemeContext';

interface NetWorthSummaryProps {
  data: NetWorthData;
}

export function NetWorthSummary({ data }: NetWorthSummaryProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatAccountType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const toggleTypeExpanded = (type: string) => {
    const newExpandedTypes = new Set(expandedTypes);
    if (newExpandedTypes.has(type)) {
      newExpandedTypes.delete(type);
    } else {
      newExpandedTypes.add(type);
    }
    setExpandedTypes(newExpandedTypes);
  };

  const netWorthChange = data.netWorth >= 0;

  const AccountTypeBreakdown = ({ title, types, isAssets }: { 
    title: string; 
    types: AccountTypeBalance[];
    isAssets: boolean;
  }) => {
    const sortedTypes = [...types].sort((a, b) => b.balance - a.balance);
    
    return (
    <div className="space-y-3">
      <h4 className={theme === 'dark' ? 'font-semibold text-slate-300 text-sm' : 'font-semibold text-gray-700 text-sm'}>
        {title}
      </h4>
      <div className="space-y-2">
        {sortedTypes.map((typeData) => {
          const isTypeExpanded = expandedTypes.has(typeData.type);
          return (
            <div key={typeData.type}>
              <button
                onClick={() => toggleTypeExpanded(typeData.type)}
                className={theme === 'dark'
                  ? 'w-full flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-all border border-slate-600/20'
                  : 'w-full flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all border border-gray-200'
                }
              >
                <div className="flex items-center gap-2 flex-1">
                  <svg
                    className={theme === 'dark'
                      ? `w-4 h-4 text-slate-400 transition-transform ${isTypeExpanded ? 'rotate-180' : ''}`
                      : `w-4 h-4 text-gray-600 transition-transform ${isTypeExpanded ? 'rotate-180' : ''}`
                    }
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <span className={theme === 'dark' ? 'text-sm font-medium text-slate-200' : 'text-sm font-medium text-gray-900'}>
                    {formatAccountType(typeData.type)}
                  </span>
                  <span className={theme === 'dark' ? 'text-xs text-slate-500 ml-1' : 'text-xs text-gray-500 ml-1'}>
                    ({typeData.accounts.length})
                  </span>
                </div>
                <span className={`text-sm font-bold ${
                  isAssets
                    ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                    : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                }`}>
                  {formatCurrency(typeData.balance)}
                </span>
              </button>
              
              {isTypeExpanded && (
                <div className={theme === 'dark' 
                  ? 'mt-2 ml-4 space-y-2 border-l-2 border-slate-600/30 pl-4'
                  : 'mt-2 ml-4 space-y-2 border-l-2 border-gray-300 pl-4'
                }>
                  {typeData.accounts
                    .sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0))
                    .map((account) => (
                    <div
                      key={account.account_id}
                      className={theme === 'dark'
                        ? 'flex items-center justify-between py-1.5 px-3 text-sm rounded bg-slate-700/20 border border-slate-600/10'
                        : 'flex items-center justify-between py-1.5 px-3 text-sm rounded bg-white border border-gray-200'
                      }
                    >
                      <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
                        {account.display_name.replace(/ \(.*\d+.*\)$/, '').trim()}
                      </span>
                      <span className={`font-medium ${
                        isAssets
                          ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                          : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                      }`}>
                        {formatCurrency(account.current_balance || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    );
  };

  return (
    <Card className={theme === 'dark' 
      ? 'bg-gradient-to-br from-slate-800 to-slate-800/80 border-slate-700/50'
      : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
    }>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className={theme === 'dark' ? 'text-2xl font-bold text-slate-50' : 'text-2xl font-bold text-gray-900'}>
            Net Worth
          </h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={theme === 'dark'
              ? 'flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors'
              : 'flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors'
            }
          >
            {isExpanded ? 'Collapse' : 'Expand'}
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <p className={theme === 'dark' ? 'text-sm font-medium text-slate-400 mb-2' : 'text-sm font-medium text-gray-600 mb-2'}>
              Total Assets
            </p>
            <p className={theme === 'dark' ? 'text-3xl font-bold text-emerald-400' : 'text-3xl font-bold text-emerald-600'}>
              {formatCurrency(data.assets)}
            </p>
          </div>
          
          <div className="text-center">
            <p className={theme === 'dark' ? 'text-sm font-medium text-slate-400 mb-2' : 'text-sm font-medium text-gray-600 mb-2'}>
              Total Liabilities
            </p>
            <p className={theme === 'dark' ? 'text-3xl font-bold text-red-400' : 'text-2xl font-bold text-red-600'}>
              {formatCurrency(data.liabilities)}
            </p>
          </div>
          
          <div className="text-center">
            <p className={theme === 'dark' ? 'text-sm font-medium text-slate-400 mb-2' : 'text-sm font-medium text-gray-600 mb-2'}>
              Net Worth
            </p>
            <p className={`text-3xl font-bold ${
              netWorthChange 
                ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
            }`}>
              {formatCurrency(data.netWorth)}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className={theme === 'dark' ? 'border-t border-slate-700/50 pt-6' : 'border-t border-gray-200 pt-6'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {data.assetsByType.length > 0 && (
                <AccountTypeBreakdown 
                  title="Assets by Type" 
                  types={data.assetsByType} 
                  isAssets={true}
                />
              )}
              
              {data.liabilitiesByType.length > 0 && (
                <AccountTypeBreakdown 
                  title="Liabilities by Type" 
                  types={data.liabilitiesByType} 
                  isAssets={false}
                />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}