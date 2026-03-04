'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

const navItems = [
  { href: '/', label: 'Balances' },
  { href: '/transactions', label: 'Transactions' },
];

export function NavigationBar() {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <nav className={theme === 'dark'
      ? 'flex gap-6 mb-8 border-b border-slate-700/50 pb-0'
      : 'flex gap-6 mb-8 border-b border-gray-200 pb-0'
    }>
      {navItems.map(({ href, label }) => {
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
    </nav>
  );
}
