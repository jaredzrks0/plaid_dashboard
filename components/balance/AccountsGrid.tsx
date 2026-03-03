'use client';

import { Account } from '@/types/finance';
import { AccountCard } from './AccountCard';
import { useTheme } from '@/contexts/ThemeContext';

interface AccountsGridProps {
  accounts: Account[];
  groupBy: 'account_type' | 'institution';
}

export function AccountsGrid({ accounts, groupBy }: AccountsGridProps) {
  const { theme } = useTheme();
  const groupedAccounts = accounts.reduce((groups, account) => {
    const groupKey = groupBy === 'account_type' ? account.account_type : account.institution_name;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  const formatAccountType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Order account types logically, but keep alphabetical for institutions
  const accountTypeOrder = ['checking', 'savings', 'investment', 'credit_card', 'loan', 'mortgage'];
  
  const getSortedGroupKeys = () => {
    const groupKeys = Object.keys(groupedAccounts);
    
    if (groupBy === 'account_type') {
      return groupKeys.sort((a, b) => {
        const aIndex = accountTypeOrder.indexOf(a);
        const bIndex = accountTypeOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    } else {
      // Sort institutions alphabetically
      return groupKeys.sort((a, b) => a.localeCompare(b));
    }
  };

  const sortedGroupKeys = getSortedGroupKeys();

  return (
    <div className="space-y-8">
      {sortedGroupKeys.map((groupKey) => {
        const groupAccounts = groupedAccounts[groupKey];
        if (!groupAccounts?.length) return null;

        const displayName = groupBy === 'account_type' 
          ? formatAccountType(groupKey)
          : groupKey;

        return (
          <div key={groupKey}>
            <h3 className={theme === 'dark' ? 'text-lg font-semibold text-slate-50 mb-4' : 'text-lg font-semibold text-gray-900 mb-4'}>
              {displayName} ({groupAccounts.length} account{groupAccounts.length !== 1 ? 's' : ''})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupAccounts
                .sort((a, b) => {
                  if (groupBy === 'institution') {
                    // Custom order for bank mode: Savings, Checking, Credit Card, then others
                    const typeOrder = ['savings', 'checking', 'credit_card'];
                    const aIndex = typeOrder.indexOf(a.account_type);
                    const bIndex = typeOrder.indexOf(b.account_type);
                    
                    if (aIndex !== -1 && bIndex !== -1) {
                      // Both are in priority list - check if same type, then sort by balance
                      if (aIndex === bIndex) {
                        return (b.current_balance || 0) - (a.current_balance || 0);
                      }
                      return aIndex - bIndex;
                    } else if (aIndex !== -1) {
                      return -1; // a comes first
                    } else if (bIndex !== -1) {
                      return 1; // b comes first
                    } else {
                      // Both are not in priority list, sort by balance
                      return (b.current_balance || 0) - (a.current_balance || 0);
                    }
                  } else {
                    // Account type mode: sort by balance within each group
                    return (b.current_balance || 0) - (a.current_balance || 0);
                  }
                })
                .map((account) => (
                  <AccountCard key={account.account_id} account={account} />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}