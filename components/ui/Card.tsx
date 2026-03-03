'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  const { theme } = useTheme();
  
  return (
    <div className={theme === 'dark' 
      ? `bg-slate-800 rounded-xl shadow-xl border border-slate-700/50 ${className}`
      : `bg-white rounded-xl shadow-lg border border-gray-200 ${className}`
    }>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  const { theme } = useTheme();
  
  return (
    <div className={theme === 'dark'
      ? `px-6 py-5 border-b border-slate-700/50 ${className}`
      : `px-6 py-5 border-b border-gray-200 ${className}`
    }>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return (
    <div className={`px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}