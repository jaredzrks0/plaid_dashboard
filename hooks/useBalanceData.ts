import { useState, useEffect } from 'react';
import { BalanceSummary, Account, AccountTypeBalance } from '@/types/finance';

const API_BASE_URL = 'http://localhost:8000';

export function useBalanceData() {
  const [data, setData] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch current account balances from the API
        const response = await fetch(`${API_BASE_URL}/accounts/current-balances`);
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const accounts: Account[] = await response.json();
        
        // Calculate balances by account type
        const accountsByType = accounts.reduce((acc, account) => {
          const balance = account.current_balance || 0;
          const type = account.account_type;
          
          if (!acc[type]) {
            acc[type] = { accounts: [], balance: 0 };
          }
          
          acc[type].accounts.push(account);
          // Credit cards and loans are liabilities (negative contribution to net worth)
          const adjustedBalance = ['credit_card', 'loan', 'mortgage'].includes(type) ? -balance : balance;
          acc[type].balance += adjustedBalance;
          
          return acc;
        }, {} as Record<string, { accounts: Account[]; balance: number }>);
        
        // Separate assets and liabilities
        const assetsByType: AccountTypeBalance[] = [];
        const liabilitiesByType: AccountTypeBalance[] = [];
        
        Object.entries(accountsByType).forEach(([type, data]) => {
          const typeBalance: AccountTypeBalance = {
            type,
            balance: Math.abs(data.balance),
            accounts: data.accounts
          };
          
          if (['credit_card', 'loan', 'mortgage'].includes(type)) {
            liabilitiesByType.push(typeBalance);
          } else {
            assetsByType.push(typeBalance);
          }
        });
        
        const totalAssets = assetsByType.reduce((sum, type) => sum + type.balance, 0);
        const totalLiabilities = liabilitiesByType.reduce((sum, type) => sum + type.balance, 0);

        setData({
          totalAssets,
          totalLiabilities,
          netWorth: totalAssets - totalLiabilities,
          accounts,
          assetsByType,
          liabilitiesByType
        });
      } catch (err) {
        console.error('Error fetching balance data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load balance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/accounts/current-balances`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const accounts: Account[] = await response.json();
      
      const accountsByType = accounts.reduce((acc, account) => {
        const balance = account.current_balance || 0;
        const type = account.account_type;
        
        if (!acc[type]) {
          acc[type] = { accounts: [], balance: 0 };
        }
        
        acc[type].accounts.push(account);
        const adjustedBalance = ['credit_card', 'loan', 'mortgage'].includes(type) ? -balance : balance;
        acc[type].balance += adjustedBalance;
        
        return acc;
      }, {} as Record<string, { accounts: Account[]; balance: number }>);
      
      const assetsByType: AccountTypeBalance[] = [];
      const liabilitiesByType: AccountTypeBalance[] = [];
      
      Object.entries(accountsByType).forEach(([type, data]) => {
        const typeBalance: AccountTypeBalance = {
          type,
          balance: Math.abs(data.balance),
          accounts: data.accounts
        };
        
        if (['credit_card', 'loan', 'mortgage'].includes(type)) {
          liabilitiesByType.push(typeBalance);
        } else {
          assetsByType.push(typeBalance);
        }
      });
      
      const totalAssets = assetsByType.reduce((sum, type) => sum + type.balance, 0);
      const totalLiabilities = liabilitiesByType.reduce((sum, type) => sum + type.balance, 0);

      setData({
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        accounts,
        assetsByType,
        liabilitiesByType
      });
    } catch (err) {
      console.error('Error fetching balance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}