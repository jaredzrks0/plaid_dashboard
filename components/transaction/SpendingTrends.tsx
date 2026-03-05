'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSpendingTrends } from '@/hooks/useSpendingTrends';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CorrectionModal } from './CorrectionModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts';
import { MonthlyCategorySpend, CorrectionCreate, SplitCreate } from '@/types/finance';

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48',
];

type TrendsPeriod = '3m' | '6m' | '1y' | 'all' | 'month';

function isTransfer(category: string | null | undefined): boolean {
  return (category ?? '').toLowerCase().includes('transfer');
}

interface PieDetailOverlayProps {
  category: string;
  items: any[];
  onBack: () => void;
  theme: string;
  formatCurrency: (v: number) => string;
  loading?: boolean;
  onEdit?: (transaction: any) => void;
}

function PieDetailOverlay({ category, items, onBack, theme, formatCurrency, loading, onEdit }: PieDetailOverlayProps) {
  const totalSpent = items.reduce((sum, item) => sum + (item.transaction_amount || 0), 0);

  return (
    <div className={theme === 'dark' ? 'bg-slate-900/50 rounded-xl p-6' : 'bg-gray-50 rounded-xl p-6'}>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className={theme === 'dark'
            ? 'text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1'
            : 'text-sm text-blue-600 hover:text-blue-500 font-medium flex items-center gap-1'
          }
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
            {category}
          </h4>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            {items.length} transaction{items.length !== 1 ? 's' : ''} • {formatCurrency(totalSpent)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} text-center py-4`}>
            Loading transactions...
          </div>
        ) : items.length === 0 ? (
          <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} text-center py-4`}>
            No transactions found
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} className={`py-3 px-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-slate-800/30 hover:bg-slate-800/50 border-slate-700/50 hover:border-slate-700'
                : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
            } transition-all`}>
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="flex-1">
                  <p className={theme === 'dark' ? 'text-sm font-medium text-slate-200' : 'text-sm font-medium text-gray-900'}>
                    {item.merchant_name || 'Unknown Merchant'}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {item.detailed_financial_category || item.primary_financial_category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={theme === 'dark' ? 'text-sm font-semibold text-slate-200' : 'text-sm font-semibold text-gray-900'}>
                    {formatCurrency(item.transaction_amount)}
                  </span>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className={theme === 'dark'
                        ? 'text-xs font-medium text-blue-400 hover:text-blue-300'
                        : 'text-xs font-medium text-blue-600 hover:text-blue-500'
                      }
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                {new Date(item.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SpendingTrends() {
  const { theme } = useTheme();
  const now = new Date();
  const [period, setPeriod] = useState<TrendsPeriod>('month');
  const [viewMonth, setViewMonth] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedPieSlice, setSelectedPieSlice] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [transactionsForCategory, setTransactionsForCategory] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [incomeTransactions, setIncomeTransactions] = useState<any[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [merchantsSortCol, setMerchantsSortCol] = useState<'total' | 'count'>('count');
  const [merchantsSortDesc, setMerchantsSortDesc] = useState(false);

  const prevMonth = useCallback(() => {
    setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const handleCorrectionSubmit = async (correction: CorrectionCreate): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/transactions/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction),
      });
      if (!response.ok) throw new Error('Failed to submit correction');
      setEditingTransaction(null);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleSplitSubmit = async (split: SplitCreate): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/transactions/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(split),
      });
      if (!response.ok) throw new Error('Failed to submit split');
      setEditingTransaction(null);
      return true;
    } catch (error) {
      return false;
    }
  };

  const dateRange = useMemo(() => {
    const maxDate = now.toISOString().split('T')[0];

    if (period === 'month') {
      // Single month view
      const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
      const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
      return {
        minDate: first.toISOString().split('T')[0],
        maxDate: last.toISOString().split('T')[0],
      };
    }

    // For multi-month periods, start from the first day of the month N months ago (not including current month)
    let monthsBack = 0;
    switch (period) {
      case '3m': monthsBack = 2; break;  // Current month + 2 previous = 3 total
      case '6m': monthsBack = 5; break;  // Current month + 5 previous = 6 total
      case '1y': monthsBack = 11; break; // Current month + 11 previous = 12 total
      case 'all': monthsBack = 1000; break; // Far in the past
    }

    const minDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    return { minDate: minDate.toISOString().split('T')[0], maxDate };
  }, [period, viewMonth]);

  const { data, loading, error } = useSpendingTrends({
    minDate: dateRange.minDate,
    maxDate: dateRange.maxDate,
  });

  // Fetch income transactions for the date range
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('min_date', dateRange.minDate);
    params.set('max_date', dateRange.maxDate);
    params.set('categories', 'Income');
    params.set('limit', '1000');
    params.set('sort_by', 'transaction_date');
    params.set('sort_desc', 'true');

    fetch(`http://localhost:8000/transactions/?${params.toString()}`)
      .then(res => res.json())
      .then(result => {
        setIncomeTransactions(result.transactions || []);
      })
      .catch(err => {
      });
  }, [dateRange]);

  // Fetch transactions when a category is selected
  useEffect(() => {
    if (selectedPieSlice) {
      setLoadingTransactions(true);
      const params = new URLSearchParams();
      params.set('min_date', dateRange.minDate);
      params.set('max_date', dateRange.maxDate);
      params.set('categories', selectedPieSlice);
      params.set('limit', '1000');
      params.set('sort_by', 'transaction_date');
      params.set('sort_desc', 'true');

      fetch(`http://localhost:8000/transactions/?${params.toString()}`)
        .then(res => res.json())
        .then(result => {
          setTransactionsForCategory(result.transactions || []);
          setLoadingTransactions(false);
        })
        .catch(err => {
          setLoadingTransactions(false);
        });
    }
  }, [selectedPieSlice, dateRange]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };


  // Filter out transfers for spending data (hidden_from_spending already filtered by backend)
  const spendingCategoryData = useMemo((): MonthlyCategorySpend[] => {
    if (!data) return [];
    return data.monthly_by_category.filter(d => !isTransfer(d.category));
  }, [data]);

  // Income vs Spending bar chart data
  const incomeSpendingData = useMemo(() => {
    if (!data) return [];

    return data.monthly_totals.map(d => ({
      month: formatMonth(d.month),
      total_income: d.total_income,
      total_spending: d.total_spending,
    }));
  }, [data]);

  // Calculate max value for y-axis domain
  const maxChartValue = useMemo(() => {
    if (!incomeSpendingData.length) return 100;
    const values = incomeSpendingData.flatMap(d => [d.total_income || 0, d.total_spending || 0]);
    const max = Math.max(...values);
    return max === 0 ? 100 : max * 1.1; // 10% padding, minimum 100
  }, [incomeSpendingData]);

  // Pie chart: aggregate categories across the period
  const pieData = useMemo(() => {
    if (!spendingCategoryData.length) return [];
    const totals = new Map<string, number>();
    spendingCategoryData.forEach(d => {
      totals.set(d.category, (totals.get(d.category) || 0) + d.total);
    });
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [spendingCategoryData]);

  // Merchant breakdown for selected pie slice
  const sliceDetail = useMemo(() => {
    if (!selectedPieSlice || !data) return [];
    const merchantTotals = new Map<string, number>();
    data.top_merchants.forEach(m => {
      // We can't easily filter by category from top_merchants,
      // so we approximate by listing all merchants with their totals
      merchantTotals.set(m.merchant_name, m.total);
    });
    // Filter category transactions and aggregate by merchant
    const catItems = new Map<string, number>();
    spendingCategoryData
      .filter(d => d.category === selectedPieSlice)
      .forEach(d => {
        // We only have monthly totals per category, not per merchant
        // Show the category total per month instead
        catItems.set(d.month, (catItems.get(d.month) || 0) + d.total);
      });
    return [...catItems.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([month, total]) => ({ merchant: formatMonth(month), total }));
  }, [selectedPieSlice, data, spendingCategoryData]);

  // Handle merchant column header clicks
  const handleMerchantSort = useCallback((col: 'total' | 'count') => {
    if (merchantsSortCol === col) {
      // Same column clicked, reverse sort direction
      setMerchantsSortDesc(!merchantsSortDesc);
    } else {
      // New column clicked, default to descending
      setMerchantsSortCol(col);
      setMerchantsSortDesc(true);
    }
  }, [merchantsSortCol, merchantsSortDesc]);

  // Top merchants (sorted by selected column and direction)
  const topMerchants = useMemo(() => {
    if (!data) return [];
    const merchants = [...data.top_merchants];
    const multiplier = merchantsSortDesc ? -1 : 1;

    if (merchantsSortCol === 'count') {
      merchants.sort((a, b) => (b.count - a.count) * multiplier);
    } else {
      merchants.sort((a, b) => (b.total - a.total) * multiplier);
    }
    return merchants;
  }, [data, merchantsSortCol, merchantsSortDesc]);

  const btnClass = (active: boolean) => theme === 'dark'
    ? `px-3 py-1.5 text-sm font-medium rounded-md transition-all ${active ? 'bg-slate-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'}`
    : `px-3 py-1.5 text-sm font-medium rounded-md transition-all ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`;

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className={theme === 'dark' ? 'h-64 bg-slate-800/50 rounded-xl' : 'h-64 bg-gray-200 rounded-xl'} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const gridColor = theme === 'dark' ? '#334155' : '#e5e7eb';
  const textColor = theme === 'dark' ? '#94a3b8' : '#6b7280';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    border: `none`,
    borderRadius: '12px',
    color: theme === 'dark' ? '#f1f5f9' : '#1f2937',
    padding: '12px 16px',
    boxShadow: theme === 'dark'
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    fontWeight: '500',
    fontSize: '14px',
  };

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = viewMonth.getFullYear();
  const currentMonth = viewMonth.getMonth();

  // Custom tooltip for better styling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const monthStr = payload[0].payload?.month || '';
      // Filter income transactions for this month (exclude hidden from spending)
      const monthTransactions = incomeTransactions.filter(txn => {
        const txnDate = new Date(txn.transaction_date);
        const txnMonth = formatMonth(`${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`);
        return txnMonth === monthStr && !txn.hidden_from_spending;
      });

      return (
        <div className={`rounded-lg px-4 py-3 max-w-sm ${
          theme === 'dark'
            ? 'bg-slate-900 text-slate-50 shadow-xl'
            : 'bg-white text-gray-900 shadow-xl'
        }`}>
          <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
            {monthStr}
          </p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className={`text-sm font-medium ${
              entry.name === 'Income'
                ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
            }`}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {monthTransactions.length > 0 && (
            <div className={`mt-2 pt-2 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
              <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Income Transactions:
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {monthTransactions.map((txn, idx) => (
                  <div key={idx} className="text-xs">
                    <p className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
                      {txn.merchant_name || 'Unknown'} - {formatCurrency(Math.abs(txn.transaction_amount))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-end gap-6">
        {/* Month navigation - takes up fixed space */}
        <div className={`w-96 ${period === 'month' ? 'visible' : 'invisible'}`}>
          {period === 'month' && (
            <div className="relative flex items-center justify-between gap-2">
              <button
                onClick={prevMonth}
                className={theme === 'dark'
                  ? 'p-2 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-700/30'
                  : 'p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-200'
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className={theme === 'dark'
                  ? 'flex-1 px-4 py-2 text-base font-semibold text-slate-200 rounded-md bg-slate-700/50 hover:bg-slate-700 transition-all'
                  : 'flex-1 px-4 py-2 text-base font-semibold text-gray-900 rounded-md bg-gray-100 hover:bg-gray-200 transition-all'
                }
              >
                {monthLabel}
              </button>
              <button
                onClick={nextMonth}
                className={theme === 'dark'
                  ? 'p-2 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-700/30'
                  : 'p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-200'
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Month picker popup */}
              {showMonthPicker && (
                <div className={`absolute top-full mt-2 left-0 right-0 p-4 rounded-lg shadow-lg z-20 ${
                  theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
                }`}>
                  {/* Year selector */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setViewMonth(new Date(currentYear - 1, currentMonth, 1))}
                      className={theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {currentYear}
                    </span>
                    <button
                      onClick={() => setViewMonth(new Date(currentYear + 1, currentMonth, 1))}
                      className={theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Month grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, idx) => (
                      <button
                        key={month}
                        onClick={() => {
                          setViewMonth(new Date(currentYear, idx, 1));
                          setShowMonthPicker(false);
                        }}
                        className={`py-2 px-3 text-sm rounded font-medium transition-all ${
                          idx === currentMonth
                            ? theme === 'dark'
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-500 text-white'
                            : theme === 'dark'
                              ? 'text-slate-300 hover:bg-slate-700'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={theme === 'dark' ? 'flex gap-1 bg-slate-800/30 rounded-lg p-1' : 'flex gap-1 bg-gray-100 rounded-lg p-1'}>
          {(['month', '3m', '6m', '1y', 'all'] as TrendsPeriod[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); setShowMonthPicker(false); }} className={btnClass(period === p)}>
              {p === 'month' ? 'Month' : p === 'all' ? 'All' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Income vs Spending — grouped BarChart */}
      <Card>
        <CardHeader>
          <h3 className={theme === 'dark' ? 'text-lg font-semibold text-slate-50' : 'text-lg font-semibold text-gray-900'}>
            Income vs Spending
          </h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeSpendingData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
              <YAxis
                tick={{ fill: textColor, fontSize: 12 }}
                tickFormatter={(v) => {
                  if (v === 0) return '$0';
                  if (v < 1000) return `$${v.toFixed(0)}`;
                  return `$${(v / 1000).toFixed(1)}k`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="total_income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="total_spending" name="Spending" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Spending by Category — PieChart */}
      <Card>
        <CardHeader>
          <h3 className={theme === 'dark' ? 'text-lg font-semibold text-slate-50' : 'text-lg font-semibold text-gray-900'}>
            Spending by Category
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6" style={{ height: 360 }}>
            {/* Pie Chart - always visible, takes less width when detail is shown */}
            <div style={{ width: selectedPieSlice ? '50%' : '100%', transition: 'width 0.3s ease' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    innerRadius={60}
                    paddingAngle={2}
                    onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                    onClick={(entry: { name: string }) => setSelectedPieSlice(entry.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.6}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: textColor, fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detail Panel - shows when a slice is selected */}
            {selectedPieSlice && (
              <div style={{ width: '50%', overflowY: 'auto' }}>
                <PieDetailOverlay
                  category={selectedPieSlice}
                  items={transactionsForCategory}
                  onBack={() => setSelectedPieSlice(null)}
                  theme={theme}
                  formatCurrency={formatCurrency}
                  loading={loadingTransactions}
                  onEdit={setEditingTransaction}
                />
              </div>
            )}
          </div>
          {!selectedPieSlice && (
            <p className={`text-center text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
              Click a slice to see monthly breakdown
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top merchants */}
      <Card>
        <CardHeader>
          <h3 className={theme === 'dark' ? 'text-lg font-semibold text-slate-50' : 'text-lg font-semibold text-gray-900'}>
            Top Merchants
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'}>
              <tr>
                <th className={theme === 'dark'
                  ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase'
                  : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'
                }>Rank</th>
                <th className={theme === 'dark'
                  ? 'px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase'
                  : 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'
                }>Merchant</th>
                <th
                  onClick={() => handleMerchantSort('total')}
                  className={`px-6 py-3 text-right text-xs font-medium uppercase cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-300'
                      : 'text-gray-500 hover:text-gray-700'
                  } ${merchantsSortCol === 'total' && (theme === 'dark' ? 'text-slate-200' : 'text-gray-900')}`}
                >
                  Total Spent {merchantsSortCol === 'total' && (merchantsSortDesc ? '▼' : '▲')}
                </th>
                <th
                  onClick={() => handleMerchantSort('count')}
                  className={`px-6 py-3 text-right text-xs font-medium uppercase cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-300'
                      : 'text-gray-500 hover:text-gray-700'
                  } ${merchantsSortCol === 'count' && (theme === 'dark' ? 'text-slate-200' : 'text-gray-900')}`}
                >
                  Transactions {merchantsSortCol === 'count' && (merchantsSortDesc ? '▼' : '▲')}
                </th>
              </tr>
            </thead>
            <tbody>
              {topMerchants.map((m, i) => (
                <tr key={m.merchant_name} className={theme === 'dark'
                  ? 'border-t border-slate-700/30 hover:bg-slate-700/30'
                  : 'border-t border-gray-100 hover:bg-gray-50'
                }>
                  <td className={theme === 'dark' ? 'px-6 py-3 text-sm text-slate-500' : 'px-6 py-3 text-sm text-gray-400'}>
                    {i + 1}
                  </td>
                  <td className={theme === 'dark' ? 'px-6 py-3 text-sm font-medium text-slate-200' : 'px-6 py-3 text-sm font-medium text-gray-900'}>
                    {m.merchant_name}
                  </td>
                  <td className={theme === 'dark'
                    ? 'px-6 py-3 text-sm text-right text-slate-300'
                    : 'px-6 py-3 text-sm text-right text-gray-700'
                  }>
                    {formatCurrency(m.total)}
                  </td>
                  <td className={theme === 'dark'
                    ? 'px-6 py-3 text-sm text-right text-slate-400'
                    : 'px-6 py-3 text-sm text-right text-gray-500'
                  }>
                    {m.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Correction Modal for editing transactions */}
      {editingTransaction && (
        <CorrectionModal
          transaction={editingTransaction}
          categories={[]}
          detailedCategories={[]}
          onSubmitCorrection={handleCorrectionSubmit}
          onSubmitSplit={handleSplitSubmit}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
}
