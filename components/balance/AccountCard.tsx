'use client';

import { Account } from '@/types/finance';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/contexts/ThemeContext';

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const { theme } = useTheme();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.currency_type || 'USD',
    }).format(amount);
  };

  const formatAccountType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getAccountTypeColor = (type: string) => {
    if (['checking', 'savings'].includes(type)) {
      return 'success';
    } else if (['credit_card', 'loan', 'mortgage'].includes(type)) {
      return 'error';
    } else if (type === 'investment') {
      return 'default';
    }
    return 'default';
  };

  const balance = account.current_balance || 0;
  const isLiability = ['credit_card', 'loan', 'mortgage'].includes(account.account_type);

  // Clean up display name by removing account number suffix if present
  const cleanDisplayName = account.display_name.replace(/ \(.*\d+.*\)$/, '').trim();

  return (
    <Card className={theme === 'dark' 
      ? "hover:shadow-2xl hover:border-slate-600/50 transition-all duration-200"
      : "hover:shadow-xl hover:border-gray-300 transition-all duration-200"
    }>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className={theme === 'dark' ? 'font-semibold text-slate-50' : 'font-semibold text-gray-900'}>
              {cleanDisplayName}
            </h3>
            <p className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
              {account.institution_name}
            </p>
          </div>
          <Badge variant={getAccountTypeColor(account.account_type)}>
            {formatAccountType(account.account_type)}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
              Current Balance
            </span>
            <span className={`text-lg font-bold ${
              isLiability
                ? (balance > 0 
                    ? (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                    : (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'))
                : (balance >= 0 
                    ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                    : (theme === 'dark' ? 'text-red-400' : 'text-red-600'))
            }`}>
              {formatCurrency(balance)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className={theme === 'dark' ? 'text-xs font-medium text-slate-500' : 'text-xs font-medium text-gray-500'}>
              Account Name
            </span>
            <span className={theme === 'dark' ? 'text-xs text-slate-400 font-mono' : 'text-xs text-gray-600 font-mono'}>
              {account.account_name}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className={theme === 'dark' ? 'text-xs font-medium text-slate-500' : 'text-xs font-medium text-gray-500'}>
              Updated
            </span>
            <span className={theme === 'dark' ? 'text-xs text-slate-400' : 'text-xs text-gray-600'}>
              {new Date(account.last_pulled).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}