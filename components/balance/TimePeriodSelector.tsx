'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { TimePeriod, DateRange } from '@/types/finance';

interface TimePeriodSelectorProps {
  selected: TimePeriod;
  onSelect: (period: TimePeriod) => void;
  customRange: DateRange;
  onCustomRangeChange: (range: DateRange) => void;
}

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'custom', label: 'Custom' },
];

export function TimePeriodSelector({ selected, onSelect, customRange, onCustomRangeChange }: TimePeriodSelectorProps) {
  const { theme } = useTheme();

  return (
    <div className="space-y-3">
      <div className={theme === 'dark'
        ? 'flex flex-wrap rounded-lg bg-slate-800/50 p-1 border border-slate-700/50 w-fit'
        : 'flex flex-wrap rounded-lg bg-white p-1 border border-gray-200 shadow-sm w-fit'
      }>
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={theme === 'dark'
              ? `px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selected === value
                    ? 'bg-slate-700 text-slate-50 shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`
              : `px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selected === value
                    ? 'bg-gray-100 text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`
            }
          >
            {label}
          </button>
        ))}
      </div>

      {selected === 'custom' && (
        <div className="flex items-center gap-3">
          <label className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
            From
          </label>
          <input
            type="date"
            value={customRange.minDate}
            onChange={(e) => onCustomRangeChange({ ...customRange, minDate: e.target.value })}
            className={theme === 'dark'
              ? 'rounded-lg px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-600'
              : 'rounded-lg px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300'
            }
          />
          <label className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
            To
          </label>
          <input
            type="date"
            value={customRange.maxDate}
            onChange={(e) => onCustomRangeChange({ ...customRange, maxDate: e.target.value })}
            className={theme === 'dark'
              ? 'rounded-lg px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-600'
              : 'rounded-lg px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300'
            }
          />
        </div>
      )}
    </div>
  );
}
