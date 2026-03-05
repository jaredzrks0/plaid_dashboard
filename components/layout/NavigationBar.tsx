'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

const mainItems = [
  { href: '/', label: 'Balances' },
];

const transactionSubItems = [
  { href: '/transactions?tab=recent', label: 'Recent Transactions' },
  { href: '/transactions?tab=trends', label: 'Spending Trends' },
  { href: '/transactions?tab=corrections', label: 'Corrections' },
];

export function NavigationBar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [showTransactionsMenu, setShowTransactionsMenu] = useState(false);

  const isTransactionsActive = pathname.startsWith('/transactions');

  return (
    <nav className={theme === 'dark'
      ? 'flex gap-6 mb-8 border-b border-slate-700/50 pb-0'
      : 'flex gap-6 mb-8 border-b border-gray-200 pb-0'
    }>
      {mainItems.map(({ href, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={theme === 'dark'
              ? `px-1 py-3 text-lg font-semibold transition-colors border-b-2 ${
                  isActive
                    ? 'text-blue-400 border-b-blue-400'
                    : 'text-slate-400 border-b-transparent hover:text-slate-300'
                }`
              : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 ${
                  isActive
                    ? 'text-blue-600 border-b-blue-600'
                    : 'text-gray-600 border-b-transparent hover:text-gray-900'
                }`
            }
          >
            {label}
          </Link>
        );
      })}

      {/* Transactions dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowTransactionsMenu(!showTransactionsMenu)}
          className={theme === 'dark'
            ? `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                isTransactionsActive
                  ? 'text-blue-400 border-b-blue-400'
                  : 'text-slate-400 border-b-transparent hover:text-slate-300'
              }`
            : `px-1 py-3 text-lg font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                isTransactionsActive
                  ? 'text-blue-600 border-b-blue-600'
                  : 'text-gray-600 border-b-transparent hover:text-gray-900'
              }`
          }
        >
          Transactions
          <svg
            className={`w-4 h-4 transition-transform ${showTransactionsMenu ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {showTransactionsMenu && (
          <div className={`absolute top-full left-0 mt-0 rounded-lg shadow-lg z-10 ${
            theme === 'dark'
              ? 'bg-slate-800 border border-slate-700'
              : 'bg-white border border-gray-200'
          }`}>
            {transactionSubItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setShowTransactionsMenu(false)}
                className={`block px-4 py-3 text-sm font-medium transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  theme === 'dark'
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
