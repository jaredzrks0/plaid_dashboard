'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function Badge({ children, variant = 'default', className = "" }: BadgeProps) {
  const { theme } = useTheme();
  
  const darkVariants = {
    default: 'bg-slate-700/50 text-slate-300 border border-slate-600/30',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border border-red-500/20'
  };
  
  const lightVariants = {
    default: 'bg-gray-100 text-gray-700 border border-gray-300',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    error: 'bg-red-50 text-red-700 border border-red-200'
  };
  
  const variants = theme === 'dark' ? darkVariants : lightVariants;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}