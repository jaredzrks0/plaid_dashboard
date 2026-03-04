'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { TransactionFilters } from '@/types/finance';

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  availableCategories: string[];
  availableAccounts: string[];
}

export function TransactionFilterBar({
  filters,
  onFiltersChange,
  availableCategories,
  availableAccounts,
}: TransactionFilterBarProps) {
  const { theme } = useTheme();
  const [searchInput, setSearchInput] = useState(filters.search);
  const [expanded, setExpanded] = useState(false);
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
      minDate: '',
      maxDate: '',
      sortBy: 'transaction_date',
      sortDesc: true,
    });
  };

  const hasActiveFilters = filters.search || filters.categories.length > 0 ||
    filters.paymentChannels.length > 0 || filters.minDate || filters.maxDate;

  return (
    <div className={theme === 'dark'
      ? 'bg-slate-800 rounded-xl border border-slate-700/50 p-4 mb-4'
      : 'bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm'
    }>
      {/* Search + date range row */}
      <div className="flex flex-wrap gap-4 items-end">
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
        <div className="w-40">
          <label className={labelClass}>From</label>
          <input
            type="date"
            value={filters.minDate}
            onChange={(e) => onFiltersChange({ ...filters, minDate: e.target.value })}
            className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
          />
        </div>
        <div className="w-40">
          <label className={labelClass}>To</label>
          <input
            type="date"
            value={filters.maxDate}
            onChange={(e) => onFiltersChange({ ...filters, maxDate: e.target.value })}
            className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
          />
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={theme === 'dark'
            ? 'px-4 py-2 text-sm font-medium rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors'
            : 'px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors'
          }
        >
          {expanded ? 'Less Filters' : 'More Filters'}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium rounded-lg text-red-500 hover:text-red-400 transition-colors"
          >
            Clear All
          </button>
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
