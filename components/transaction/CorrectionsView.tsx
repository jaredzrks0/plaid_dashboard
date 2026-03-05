'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useCorrections } from '@/hooks/useCorrections';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface CorrectionsViewProps {
  onCorrectionDeleted: () => void;
}

export function CorrectionsView({ onCorrectionDeleted }: CorrectionsViewProps) {
  const { theme } = useTheme();
  const { corrections, loading, error, deleteCorrection } = useCorrections();

  const handleDelete = async (correctionId: string) => {
    const success = await deleteCorrection(correctionId);
    if (success) onCorrectionDeleted();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });

  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className={theme === 'dark' ? 'h-48 bg-slate-800/50 rounded-xl' : 'h-48 bg-gray-200 rounded-xl'} />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Group corrections by correction_id (splits share the same correction_id)
  const grouped = new Map<string, typeof corrections>();
  corrections.forEach(c => {
    const existing = grouped.get(c.correction_id) || [];
    existing.push(c);
    grouped.set(c.correction_id, existing);
  });

  if (grouped.size === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <svg className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className={theme === 'dark' ? 'text-slate-400 text-lg font-medium' : 'text-gray-500 text-lg font-medium'}>
            No corrections yet
          </p>
          <p className={theme === 'dark' ? 'text-slate-500 text-sm mt-1' : 'text-gray-400 text-sm mt-1'}>
            Use the Edit button on any transaction to correct its details or split it.
          </p>
        </CardContent>
      </Card>
    );
  }

  const rowClass = theme === 'dark' ? 'text-sm text-slate-300' : 'text-sm text-gray-700';
  const arrowClass = theme === 'dark' ? 'text-slate-500 mx-1' : 'text-gray-400 mx-1';
  const fromClass = theme === 'dark' ? 'text-slate-500 line-through' : 'text-gray-400 line-through';
  const toClass = theme === 'dark' ? 'text-slate-200 font-medium' : 'text-gray-900 font-medium';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={theme === 'dark' ? 'text-sm text-slate-400' : 'text-sm text-gray-600'}>
          {grouped.size} correction{grouped.size !== 1 ? 's' : ''} applied
        </p>
      </div>

      {[...grouped.entries()].map(([correctionId, items]) => {
        const first = items[0];
        const isSplit = first.correction_type === 'split';
        const isHide = first.correction_type === 'hide';

        return (
          <Card key={correctionId}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={isSplit ? 'default' : isHide ? 'warning' : 'warning'}>
                      {isSplit ? 'Split' : isHide ? 'Hidden' : 'Edit'}
                    </Badge>
                    <span className={theme === 'dark' ? 'text-xs text-slate-500' : 'text-xs text-gray-400'}>
                      {formatDate(first.created_at)}
                    </span>
                  </div>
                  <p className={theme === 'dark' ? 'text-sm text-slate-400 mb-2' : 'text-sm text-gray-600 mb-2'}>
                    Transaction: <span className="font-mono text-xs">{first.transaction_id}</span>
                  </p>

                  {isSplit ? (
                    <div className="mt-2 space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className={rowClass}>{item.corrected_category}</span>
                          <span className={theme === 'dark' ? 'text-sm font-medium text-slate-200' : 'text-sm font-medium text-gray-900'}>
                            {item.corrected_amount != null ? formatCurrency(item.corrected_amount) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : isHide ? (
                    <div className="mt-2 space-y-1">
                      <p className={rowClass}>
                        Hidden from spending:{' '}
                        <span className={toClass}>
                          {first.hidden_from_spending ? 'Yes' : 'No'}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {(first.corrected_category || first.original_category) && (
                        <div className="flex items-center gap-1">
                          <span className={rowClass}>Category:</span>
                          {first.original_category && (
                            <span className={fromClass}>{first.original_category}</span>
                          )}
                          {first.original_category && first.corrected_category && (
                            <span className={arrowClass}>→</span>
                          )}
                          {first.corrected_category && (
                            <span className={toClass}>{first.corrected_category}</span>
                          )}
                        </div>
                      )}
                      {(first.corrected_merchant_name || first.original_merchant_name) && (
                        <div className="flex items-center gap-1">
                          <span className={rowClass}>Merchant:</span>
                          {first.original_merchant_name && (
                            <span className={fromClass}>{first.original_merchant_name}</span>
                          )}
                          {first.original_merchant_name && first.corrected_merchant_name && (
                            <span className={arrowClass}>→</span>
                          )}
                          {first.corrected_merchant_name && (
                            <span className={toClass}>{first.corrected_merchant_name}</span>
                          )}
                        </div>
                      )}
                      {first.corrected_amount != null && (
                        <div className="flex items-center gap-1">
                          <span className={rowClass}>Amount:</span>
                          {first.original_amount != null && (
                            <span className={fromClass}>{formatCurrency(first.original_amount)}</span>
                          )}
                          {first.original_amount != null && (
                            <span className={arrowClass}>→</span>
                          )}
                          <span className={toClass}>{formatCurrency(first.corrected_amount)}</span>
                        </div>
                      )}
                      {first.corrected_date && (
                        <div className="flex items-center gap-1">
                          <span className={rowClass}>Date:</span>
                          {first.original_date && (
                            <span className={fromClass}>{formatShortDate(first.original_date)}</span>
                          )}
                          {first.original_date && (
                            <span className={arrowClass}>→</span>
                          )}
                          <span className={toClass}>{formatShortDate(first.corrected_date)}</span>
                        </div>
                      )}
                      {first.hidden_from_spending != null && (
                        <div className="flex items-center gap-1">
                          <span className={rowClass}>Hidden from spending:</span>
                          <span className={toClass}>{first.hidden_from_spending ? 'Yes' : 'No'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(correctionId)}
                  className={theme === 'dark'
                    ? 'text-sm text-red-400 hover:text-red-300 font-medium ml-4'
                    : 'text-sm text-red-600 hover:text-red-500 font-medium ml-4'
                  }
                >
                  Remove
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
