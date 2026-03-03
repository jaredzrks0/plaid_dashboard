'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Account, TimePeriod, DateRange } from '@/types/finance';
import { useHistoricalData } from '@/hooks/useHistoricalData';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/Card';
import { TimePeriodSelector } from './TimePeriodSelector';
import { AccountFilterPanel } from './AccountFilterPanel';

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

interface HistoricalBalanceChartProps {
  accounts: Account[];
}

export function HistoricalBalanceChart({ accounts }: HistoricalBalanceChartProps) {
  const { theme } = useTheme();

  const CustomTooltip = ({ active, label, payload }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));

    return (
      <div className={theme === 'dark'
        ? 'bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg'
        : 'bg-white border border-gray-200 rounded-lg p-3 shadow-lg'
      }>
        <p className={theme === 'dark' ? 'text-slate-300 text-sm font-semibold mb-2' : 'text-gray-900 text-sm font-semibold mb-2'}>
          {label}
        </p>
        <div className="space-y-1.5">
          {sorted.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className={theme === 'dark' ? 'text-slate-300 text-sm' : 'text-gray-800 text-sm'}>
                {entry.name}
              </span>
              <span className={theme === 'dark' ? 'text-slate-200 text-sm font-medium ml-auto' : 'text-gray-900 text-sm font-medium ml-auto'}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  entry.value || 0
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('3m');
  const [customRange, setCustomRange] = useState<DateRange>({ minDate: '', maxDate: '' });

  const allAccountNames = useMemo(
    () => [...new Set(accounts.map(a => a.display_name))].sort(),
    [accounts]
  );

  const [selectedAccountNames, setSelectedAccountNames] = useState<string[]>(allAccountNames);

  const { data, accountNames, loading, error } = useHistoricalData({
    timePeriod,
    customRange,
    selectedAccounts: selectedAccountNames,
  });

  const gridColor = theme === 'dark' ? '#334155' : '#e5e7eb';
  const tickColor = theme === 'dark' ? '#94a3b8' : '#6b7280';
  const tooltipStyle = theme === 'dark'
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' };
  const tooltipLabelColor = theme === 'dark' ? '#e2e8f0' : '#111827';
  const tooltipItemColor = theme === 'dark' ? '#cbd5e1' : '#374151';

  return (
    <div className="space-y-4">
      <h2 className={theme === 'dark' ? 'text-2xl font-bold text-slate-50' : 'text-2xl font-bold text-gray-900'}>
        Historical Balances
      </h2>

      <Card>
        <CardContent className="p-6 space-y-5">
          <TimePeriodSelector
            selected={timePeriod}
            onSelect={setTimePeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />

          <AccountFilterPanel
            accounts={accounts}
            selectedAccountNames={selectedAccountNames}
            onSelectionChange={setSelectedAccountNames}
          />

          {loading ? (
            <div className="animate-pulse">
              <div className={theme === 'dark' ? 'h-[400px] bg-slate-800/50 rounded-xl' : 'h-[400px] bg-gray-200 rounded-xl'} />
            </div>
          ) : error ? (
            <div className={theme === 'dark' ? 'text-red-400 text-center py-12' : 'text-red-600 text-center py-12'}>
              <p className="font-semibold">Error loading historical data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className={theme === 'dark' ? 'text-slate-400 text-center py-12' : 'text-gray-500 text-center py-12'}>
              <p>No historical data available for the selected period and accounts.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: tickColor, fontSize: 12 }}
                  tickLine={{ stroke: gridColor }}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis
                  tickFormatter={(v) => currencyFormatter.format(v)}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  tickLine={{ stroke: gridColor }}
                  axisLine={{ stroke: gridColor }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: tickColor, fontSize: 12, paddingTop: 12 }}
                />
                {accountNames
                  .filter(name => selectedAccountNames.includes(name))
                  .map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
