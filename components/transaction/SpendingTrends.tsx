'use client';

import { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSpendingTrends } from '@/hooks/useSpendingTrends';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48',
];

type TrendsPeriod = '3m' | '6m' | '1y' | 'all';

export function SpendingTrends() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<TrendsPeriod>('6m');

  const dateRange = useMemo(() => {
    const now = new Date();
    const maxDate = now.toISOString().split('T')[0];
    const min = new Date(now);
    switch (period) {
      case '3m': min.setMonth(min.getMonth() - 3); break;
      case '6m': min.setMonth(min.getMonth() - 6); break;
      case '1y': min.setFullYear(min.getFullYear() - 1); break;
      case 'all': min.setFullYear(2020); break;
    }
    return { minDate: min.toISOString().split('T')[0], maxDate };
  }, [period]);

  const { data, loading, error } = useSpendingTrends({
    minDate: dateRange.minDate,
    maxDate: dateRange.maxDate,
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Build stacked bar chart data
  const barChartData = useMemo(() => {
    if (!data) return [];
    const months = [...new Set(data.monthly_by_category.map(d => d.month))].sort();
    const allCategories = [...new Set(data.monthly_by_category.map(d => d.category))];

    // Take top 8 categories by total, group rest as "Other"
    const catTotals = new Map<string, number>();
    data.monthly_by_category.forEach(d => {
      catTotals.set(d.category, (catTotals.get(d.category) || 0) + d.total);
    });
    const topCats = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat]) => cat);

    return months.map(month => {
      const point: Record<string, string | number> = { month: formatMonth(month) };
      const monthData = data.monthly_by_category.filter(d => d.month === month);
      let other = 0;
      monthData.forEach(d => {
        if (topCats.includes(d.category)) {
          point[d.category] = d.total;
        } else {
          other += d.total;
        }
      });
      if (other > 0) point['Other'] = other;
      return { point, categories: other > 0 ? [...topCats, 'Other'] : topCats };
    });
  }, [data]);

  const stackedCategories = useMemo(() => {
    if (barChartData.length === 0) return [];
    const cats = new Set<string>();
    barChartData.forEach(({ point }) => {
      Object.keys(point).forEach(k => { if (k !== 'month') cats.add(k); });
    });
    return [...cats];
  }, [barChartData]);

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

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-end">
        <div className={theme === 'dark' ? 'flex gap-1 bg-slate-800/30 rounded-lg p-1' : 'flex gap-1 bg-gray-100 rounded-lg p-1'}>
          {(['3m', '6m', '1y', 'all'] as TrendsPeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={btnClass(period === p)}>
              {p === 'all' ? 'All' : p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly spending by category */}
      <Card>
        <CardHeader>
          <h3 className={theme === 'dark' ? 'text-lg font-semibold text-slate-50' : 'text-lg font-semibold text-gray-900'}>
            Monthly Spending by Category
          </h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barChartData.map(d => d.point)}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
              <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: theme === 'dark' ? '#e2e8f0' : '#111827',
                }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend />
              {stackedCategories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Income vs Spending over time */}
      <Card>
        <CardHeader>
          <h3 className={theme === 'dark' ? 'text-lg font-semibold text-slate-50' : 'text-lg font-semibold text-gray-900'}>
            Income vs Spending
          </h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthly_totals.map(d => ({ ...d, month: formatMonth(d.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} />
              <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                  border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: theme === 'dark' ? '#e2e8f0' : '#111827',
                }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend />
              <Line type="monotone" dataKey="total_income" name="Income" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="total_spending" name="Spending" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
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
                <th className={theme === 'dark'
                  ? 'px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase'
                  : 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'
                }>Total Spent</th>
                <th className={theme === 'dark'
                  ? 'px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase'
                  : 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'
                }>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {data.top_merchants.map((m, i) => (
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
    </div>
  );
}
