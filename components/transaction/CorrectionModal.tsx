'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Transaction, CorrectionCreate, SplitCreate, SplitItem } from '@/types/finance';
import { FINANCIAL_CATEGORIES_SCHEMA, CATEGORY_KEYS } from '@/lib/categories';

interface CorrectionModalProps {
  transaction: Transaction;
  onSubmitCorrection: (correction: CorrectionCreate) => Promise<boolean>;
  onSubmitSplit: (split: SplitCreate) => Promise<boolean>;
  onClose: () => void;
}

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

export function CorrectionModal({
  transaction,
  onSubmitCorrection,
  onSubmitSplit,
  onClose,
}: CorrectionModalProps) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'edit' | 'split'>('edit');
  const [submitting, setSubmitting] = useState(false);

  // Edit mode state
  const [editCategory, setEditCategory] = useState(transaction.primary_financial_category || '');
  const [editDetail, setEditDetail] = useState(transaction.detailed_financial_category || '');

  const availableSubcategories = editCategory ? (FINANCIAL_CATEGORIES_SCHEMA[editCategory] ?? []) : [];

  const handleCategoryChange = (cat: string) => {
    setEditCategory(cat);
    const subs = FINANCIAL_CATEGORIES_SCHEMA[cat] ?? [];
    if (!subs.includes(editDetail)) setEditDetail('');
  };
  const [editMerchant, setEditMerchant] = useState(transaction.merchant_name || '');
  const [editAmount, setEditAmount] = useState(String(transaction.transaction_amount));
  const [editDate, setEditDate] = useState(toDateInputValue(transaction.transaction_date));

  // Hidden from spending: default true if category contains 'transfer', else use existing value
  const defaultHidden = transaction.primary_financial_category?.toLowerCase().includes('transfer')
    ? true
    : (transaction.hidden_from_spending ?? false);
  const [hiddenFromSpending, setHiddenFromSpending] = useState(defaultHidden);

  // Split mode state
  const [splits, setSplits] = useState<SplitItem[]>([
    { category: transaction.primary_financial_category || '', amount: transaction.transaction_amount, description: '' },
  ]);

  const inputClass = theme === 'dark'
    ? 'bg-slate-700 border-slate-600 text-slate-50 placeholder-slate-400 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500';

  const labelClass = theme === 'dark' ? 'text-sm font-medium text-slate-300' : 'text-sm font-medium text-gray-700';

  const splitTotal = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
  const splitDiff = Math.abs(splitTotal - transaction.transaction_amount);
  const splitValid = splitDiff < 0.01;

  const addSplitRow = () => {
    setSplits([...splits, { category: '', amount: 0, description: '' }]);
  };

  const removeSplitRow = (index: number) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: keyof SplitItem, value: string | number) => {
    const updated = [...splits];
    if (field === 'amount') {
      updated[index] = { ...updated[index], [field]: Number(value) || 0 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSplits(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'edit') {
        const correction: CorrectionCreate = {
          transaction_id: transaction.transaction_id,
          original_category: transaction.primary_financial_category ?? undefined,
          original_detail: transaction.detailed_financial_category ?? undefined,
          original_merchant_name: transaction.merchant_name ?? undefined,
          original_amount: transaction.transaction_amount,
          original_date: transaction.transaction_date ?? undefined,
        };
        if (editCategory !== transaction.primary_financial_category) {
          correction.corrected_category = editCategory || undefined;
        }
        if (editDetail !== transaction.detailed_financial_category) {
          correction.corrected_detail = editDetail || undefined;
        }
        if (editMerchant !== (transaction.merchant_name ?? '')) {
          correction.corrected_merchant_name = editMerchant || undefined;
        }
        if (Number(editAmount) !== transaction.transaction_amount) {
          correction.corrected_amount = Number(editAmount);
        }
        if (editDate && editDate !== toDateInputValue(transaction.transaction_date)) {
          correction.corrected_date = editDate;
        }
        if (hiddenFromSpending !== (transaction.hidden_from_spending ?? false)) {
          correction.hidden_from_spending = hiddenFromSpending;
        }
        const success = await onSubmitCorrection(correction);
        if (success) onClose();
      } else {
        if (!splitValid) return;
        const splitCreate: SplitCreate = {
          transaction_id: transaction.transaction_id,
          original_amount: transaction.transaction_amount,
          splits: splits.filter(s => s.amount !== 0),
        };
        const success = await onSubmitSplit(splitCreate);
        if (success) onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={theme === 'dark'
        ? 'relative bg-slate-800 rounded-xl border border-slate-700/50 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'
        : 'relative bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'
      }>
        {/* Header */}
        <div className={theme === 'dark'
          ? 'px-6 py-4 border-b border-slate-700/50 flex items-center justify-between'
          : 'px-6 py-4 border-b border-gray-200 flex items-center justify-between'
        }>
          <h3 className={theme === 'dark' ? 'text-lg font-semibold text-slate-50' : 'text-lg font-semibold text-gray-900'}>
            Edit Transaction
          </h3>
          <button
            onClick={onClose}
            className={theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction info */}
        <div className={theme === 'dark' ? 'px-6 py-3 bg-slate-900/50' : 'px-6 py-3 bg-gray-50'}>
          <div className="flex justify-between items-center">
            <div>
              <p className={theme === 'dark' ? 'text-sm font-medium text-slate-300' : 'text-sm font-medium text-gray-700'}>
                {transaction.merchant_name || transaction.description || 'Unknown'}
              </p>
              <p className={theme === 'dark' ? 'text-xs text-slate-500' : 'text-xs text-gray-500'}>
                {transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString() : 'No date'}
              </p>
            </div>
            <p className={`text-lg font-bold ${transaction.transaction_amount < 0
              ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
              : (theme === 'dark' ? 'text-slate-50' : 'text-gray-900')
            }`}>
              {formatCurrency(transaction.transaction_amount)}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-4">
          <div className={theme === 'dark'
            ? 'flex gap-2 bg-slate-900/50 rounded-lg p-1'
            : 'flex gap-2 bg-gray-100 rounded-lg p-1'
          }>
            <button
              onClick={() => setMode('edit')}
              className={theme === 'dark'
                ? `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'edit' ? 'bg-slate-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'}`
                : `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`
              }
            >
              Edit Fields
            </button>
            <button
              onClick={() => setMode('split')}
              className={theme === 'dark'
                ? `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'split' ? 'bg-slate-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'}`
                : `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'split' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`
              }
            >
              Split Transaction
            </button>
          </div>
        </div>

        {/* Form content */}
        <div className="px-6 py-4 space-y-4">
          {mode === 'edit' ? (
            <>
              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                >
                  <option value="">Select category</option>
                  {CATEGORY_KEYS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Sub-category</label>
                <select
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value)}
                  disabled={availableSubcategories.length === 0}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass} disabled:opacity-50`}
                >
                  <option value="">Select detail (optional)</option>
                  {availableSubcategories.map(detail => (
                    <option key={detail} value={detail}>{detail}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Merchant Name</label>
                <input
                  type="text"
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                />
              </div>
              <div>
                <label className={labelClass}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                />
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className={labelClass}>Hidden from Spending</p>
                  <p className={theme === 'dark' ? 'text-xs text-slate-500 mt-0.5' : 'text-xs text-gray-400 mt-0.5'}>
                    Excludes this transaction from spending summaries
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHiddenFromSpending(!hiddenFromSpending)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    hiddenFromSpending ? 'bg-blue-600' : (theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300')
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hiddenFromSpending ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
                Split {formatCurrency(transaction.transaction_amount)} across multiple categories. The total must match the original amount.
              </p>
              {splits.map((split, i) => (
                <div key={i} className={theme === 'dark'
                  ? 'flex gap-3 items-end bg-slate-900/30 rounded-lg p-3'
                  : 'flex gap-3 items-end bg-gray-50 rounded-lg p-3'
                }>
                  <div className="flex-1">
                    <label className={labelClass}>Category</label>
                    <select
                      value={split.category}
                      onChange={(e) => updateSplit(i, 'category', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                    >
                      <option value="">Select</option>
                      {CATEGORY_KEYS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className={labelClass}>Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={split.amount || ''}
                      onChange={(e) => updateSplit(i, 'amount', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${inputClass}`}
                    />
                  </div>
                  <button
                    onClick={() => removeSplitRow(i)}
                    disabled={splits.length <= 1}
                    className={`pb-2 ${splits.length <= 1 ? 'text-slate-600 cursor-not-allowed' : 'text-red-500 hover:text-red-400'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={addSplitRow}
                className={theme === 'dark'
                  ? 'text-sm text-blue-400 hover:text-blue-300 font-medium'
                  : 'text-sm text-blue-600 hover:text-blue-500 font-medium'
                }
              >
                + Add Split
              </button>
              {/* Running total */}
              <div className={theme === 'dark'
                ? 'flex justify-between items-center px-3 py-2 bg-slate-900/50 rounded-lg'
                : 'flex justify-between items-center px-3 py-2 bg-gray-100 rounded-lg'
              }>
                <span className={labelClass}>Total Allocated</span>
                <span className={`text-sm font-bold ${splitValid
                  ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                  : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                }`}>
                  {formatCurrency(splitTotal)} / {formatCurrency(transaction.transaction_amount)}
                  {!splitValid && ` (${formatCurrency(splitDiff)} remaining)`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={theme === 'dark'
          ? 'px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3'
          : 'px-6 py-4 border-t border-gray-200 flex justify-end gap-3'
        }>
          <button
            onClick={onClose}
            className={theme === 'dark'
              ? 'px-4 py-2 text-sm font-medium rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (mode === 'split' && !splitValid)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              submitting || (mode === 'split' && !splitValid)
                ? 'bg-blue-500/50 text-white/50 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
