'use client';

import { useState, useMemo } from 'react';
import { Account } from '@/types/finance';
import { useTheme } from '@/contexts/ThemeContext';

interface AccountFilterPanelProps {
  accounts: Account[];
  selectedAccountNames: string[];
  onSelectionChange: (names: string[]) => void;
}

export function AccountFilterPanel({ accounts, selectedAccountNames, onSelectionChange }: AccountFilterPanelProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const { accountNames, institutions, accountTypes } = useMemo(() => {
    const names = [...new Set(accounts.map(a => a.display_name))].sort();
    const insts = [...new Set(accounts.map(a => a.institution_name))].sort();
    const types = [...new Set(accounts.map(a => a.account_type))].sort();
    return { accountNames: names, institutions: insts, accountTypes: types };
  }, [accounts]);

  const selectedSet = new Set(selectedAccountNames);
  const allSelected = accountNames.length === selectedAccountNames.length;

  const toggleAll = () => {
    onSelectionChange(allSelected ? [] : [...accountNames]);
  };

  const toggleAccount = (name: string) => {
    if (selectedSet.has(name)) {
      onSelectionChange(selectedAccountNames.filter(n => n !== name));
    } else {
      onSelectionChange([...selectedAccountNames, name]);
    }
  };

  const toggleInstitution = (institution: string) => {
    const instAccounts = accounts.filter(a => a.institution_name === institution).map(a => a.display_name);
    const allInstSelected = instAccounts.every(n => selectedSet.has(n));

    if (allInstSelected) {
      onSelectionChange(selectedAccountNames.filter(n => !instAccounts.includes(n)));
    } else {
      const newSet = new Set(selectedAccountNames);
      instAccounts.forEach(n => newSet.add(n));
      onSelectionChange([...newSet]);
    }
  };

  const toggleAccountType = (type: string) => {
    const typeAccounts = accounts.filter(a => a.account_type === type).map(a => a.display_name);
    const allTypeSelected = typeAccounts.every(n => selectedSet.has(n));

    if (allTypeSelected) {
      onSelectionChange(selectedAccountNames.filter(n => !typeAccounts.includes(n)));
    } else {
      const newSet = new Set(selectedAccountNames);
      typeAccounts.forEach(n => newSet.add(n));
      onSelectionChange([...newSet]);
    }
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const checkboxClass = theme === 'dark'
    ? 'rounded border-slate-600 bg-slate-800 accent-blue-500'
    : 'rounded border-gray-300 bg-white accent-blue-500';

  const labelClass = theme === 'dark' ? 'text-sm text-slate-300' : 'text-sm text-gray-700';
  const groupLabelClass = theme === 'dark' ? 'text-xs font-semibold text-slate-400 uppercase tracking-wider' : 'text-xs font-semibold text-gray-500 uppercase tracking-wider';

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className={theme === 'dark'
            ? 'text-base font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1'
            : 'text-base font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1'
          }
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Filter Accounts
        </button>
        <span className={theme === 'dark' ? 'text-xs text-slate-500' : 'text-xs text-gray-400'}>
          {selectedAccountNames.length} of {accountNames.length} selected
        </span>
      </div>

      {expanded && (
        <div className={theme === 'dark'
          ? 'mt-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-4'
          : 'mt-3 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4'
        }>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className={theme === 'dark'
                ? 'text-xs font-medium px-3 py-1 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors'
                : 'text-xs font-medium px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors'
              }
            >
              {allSelected ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className={groupLabelClass}>By Institution</p>
              <div className="space-y-1.5">
                {institutions.map(inst => {
                  const instAccounts = accounts.filter(a => a.institution_name === inst).map(a => a.display_name);
                  const allChecked = instAccounts.every(n => selectedSet.has(n));
                  const someChecked = instAccounts.some(n => selectedSet.has(n));
                  return (
                    <label key={inst} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleInstitution(inst)}
                        className={checkboxClass}
                      />
                      <span className={labelClass}>{inst}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className={groupLabelClass}>By Account Type</p>
              <div className="space-y-1.5">
                {accountTypes.map(type => {
                  const typeAccounts = accounts.filter(a => a.account_type === type).map(a => a.display_name);
                  const allChecked = typeAccounts.every(n => selectedSet.has(n));
                  const someChecked = typeAccounts.some(n => selectedSet.has(n));
                  return (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleAccountType(type)}
                        className={checkboxClass}
                      />
                      <span className={labelClass}>{formatType(type)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className={groupLabelClass}>By Account</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {accountNames.map(name => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(name)}
                      onChange={() => toggleAccount(name)}
                      className={checkboxClass}
                    />
                    <span className={labelClass}>{name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
