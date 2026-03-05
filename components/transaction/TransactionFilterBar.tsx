'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { TransactionFilters, PeriodOption } from '@/types/finance';

const PERIOD_LABELS: Record<PeriodOption, string> = {
  current: 'Current Month',
  prior: 'Prior Month',
  specific: 'Specific Month',
  l3: 'Last 3 Months',
  l6: 'Last 6 Months',
  ytd: 'Year to Date',
};

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  availableCategories: string[];
  availableAccounts: string[];
  selectedPeriod: PeriodOption;
  onPeriodChange: (p: PeriodOption) => void;
  viewMonth: Date;
  onViewMonthChange: (d: Date) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  isSingleMonth: boolean;
  periodLabel: string;
}

export function TransactionFilterBar({
  filters,
  onFiltersChange,
  availableCategories,
  selectedPeriod,
  onPeriodChange,
  viewMonth,
  onViewMonthChange,
  prevMonth,
  nextMonth,
  isSingleMonth,
  periodLabel,
}: TransactionFilterBarProps) {
  const { theme } = useTheme();
  const [searchInput, setSearchInput] = useState(filters.search);
  const [expanded, setExpanded] = useState(false);
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const inputClass = theme === 'dark'
    ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20';

  const labelClass = theme === 'dark' ? 'text-sm font-medium text-slate-400' : 'text-sm font-medium text-gray-600';

  const chipClass = (active: boolean) => theme === 'dark'
    ? `px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
        active ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/30 hover:bg-slate-700'
      }`
    : `px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
        active ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
      }`;

  const toggleCategory = (cat: string) => {
    const updated = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    onFiltersChange({ ...filters, categories: updated });
  };

  const togglePaymentChannel = (ch: string) => {
    const updated = filters.paymentChannels.includes(ch)
      ? filters.paymentChannels.filter(c => c !== ch)
      : [...filters.paymentChannels, ch];
    onFiltersChange({ ...filters, paymentChannels: updated });
  };

  const clearFilters = () => {
    setSearchInput('');
    onFiltersChange({
      search: '',
      categories: [],
      accountIds: [],
      paymentChannels: [],
      sortBy: 'transaction_date',
      sortDesc: true,
    });
  };

  const hasActiveFilters = filters.search || filters.categories.length > 0 || filters.paymentChannels.length > 0;

  // Specific month picker value (YYYY-MM)
  const specificMonthValue = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;

  const handleSpecificMonthChange = (val: string) => {
    const [year, month] = val.split('-').map(Number);
    if (year && month) {
      onViewMonthChange(new Date(year, month - 1, 1));
    }
  };

  const navBtnClass = theme === 'dark'
    ? 'p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
    : 'p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className={theme === 'dark'
      ? 'bg-slate-800 rounded-xl border border-slate-700/50 p-4 mb-4'
      : 'bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm'
    }>
      {/* Search + period row */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className={labelClass}>Search</label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search merchant, description..."
            className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
          />
        </div>

        {/* Period dropdown */}
        <div className="w-44">
          <label className={labelClass}>Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value as PeriodOption)}
            className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
          >
            {(Object.keys(PERIOD_LABELS) as PeriodOption[]).map(p => (
              <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
            ))}
          </select>
        </div>

        {/* Specific month picker with calendar */}
        {selectedPeriod === 'specific' && (
          <div className="relative w-48">
            <label className={labelClass}>Month</label>
            <button
              onClick={() => setShowMonthCalendar(!showMonthCalendar)}
              className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm transition-colors ${inputClass}`}
            >
              {viewMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </button>
            {showMonthCalendar && (
              <div className={`absolute top-full mt-1 left-0 p-3 rounded-lg shadow-lg z-20 w-56 ${
                theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <button
                    onClick={() => onViewMonthChange(new Date(viewMonth.getFullYear() - 1, viewMonth.getMonth(), 1))}
                    className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className={`text-xs font-semibold flex-1 text-center ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    {viewMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => onViewMonthChange(new Date(viewMonth.getFullYear() + 1, viewMonth.getMonth(), 1))}
                    className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                    <button
                      key={month}
                      onClick={() => {
                        onViewMonthChange(new Date(viewMonth.getFullYear(), idx, 1));
                        setShowMonthCalendar(false);
                      }}
                      className={`py-1.5 px-2 text-xs rounded font-medium transition-all ${
                        idx === viewMonth.getMonth()
                          ? theme === 'dark'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500 text-white'
                          : theme === 'dark'
                            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
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

        <div>
          <div className={labelClass} style={{ visibility: 'hidden' }}>.</div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {expanded ? 'Less Filters' : 'More Filters'}
          </button>
        </div>
        {hasActiveFilters && (
          <div>
            <div className={labelClass} style={{ visibility: 'hidden' }}>.</div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium rounded-lg text-red-500 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Categories */}
          {availableCategories.length > 0 && (
            <div>
              <label className={labelClass}>Categories</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={chipClass(filters.categories.includes(cat))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment channels */}
          <div>
            <label className={labelClass}>Payment Channel</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['online', 'in store', 'other'].map(ch => (
                <button
                  key={ch}
                  onClick={() => togglePaymentChannel(ch)}
                  className={chipClass(filters.paymentChannels.includes(ch))}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
