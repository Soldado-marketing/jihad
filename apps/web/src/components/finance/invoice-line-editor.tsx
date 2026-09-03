'use client';

import { useMemo } from 'react';
import { formatCents, toCents } from '@/lib/money';

export interface InvoiceLineDraft {
  description: string;
  quantity: string;
  /** Major units as typed by the user, e.g. "750.50". Converted on submit. */
  unitAmount: string;
}

export const EMPTY_LINE: InvoiceLineDraft = { description: '', quantity: '1', unitAmount: '' };

// toCents and formatCents live in lib/money so the CRM and client-portal pages
// can share the same integer-cent conversion without importing a finance
// component. Re-exported here because this module's callers already use them.
export { formatCents, toCents };

export interface LineTotals {
  lineTotals: number[];
  subtotalCents: number;
  valid: boolean;
}

/** Mirrors the server's arithmetic so the preview cannot disagree with it. */
export function computeTotals(lines: InvoiceLineDraft[]): LineTotals {
  let valid = lines.length > 0;
  const lineTotals = lines.map((line) => {
    const unit = toCents(line.unitAmount);
    const qty = Number(line.quantity);
    if (unit === null || !Number.isInteger(qty) || qty < 1 || line.description.trim().length < 2) {
      valid = false;
      return 0;
    }
    return unit * qty;
  });

  return {
    lineTotals,
    subtotalCents: lineTotals.reduce((sum, n) => sum + n, 0),
    valid,
  };
}

export function InvoiceLineEditor({
  lines,
  currency,
  onChange,
}: {
  lines: InvoiceLineDraft[];
  currency: string;
  onChange: (lines: InvoiceLineDraft[]) => void;
}) {
  const totals = useMemo(() => computeTotals(lines), [lines]);

  const update = (index: number, patch: Partial<InvoiceLineDraft>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Line items</h3>
        <button
          type="button"
          onClick={() => onChange([...lines, { ...EMPTY_LINE }])}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50"
        >
          + Add line
        </button>
      </div>

      {lines.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
          An invoice needs at least one line item.
        </p>
      )}

      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-12">
          <input
            aria-label={`Line ${index + 1} description`}
            value={line.description}
            onChange={(e) => update(index, { description: e.target.value })}
            placeholder="Description"
            className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-6"
          />
          <input
            aria-label={`Line ${index + 1} quantity`}
            value={line.quantity}
            onChange={(e) => update(index, { quantity: e.target.value.replace(/[^0-9]/g, '') })}
            inputMode="numeric"
            placeholder="Qty"
            className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            aria-label={`Line ${index + 1} unit amount`}
            value={line.unitAmount}
            onChange={(e) => update(index, { unitAmount: e.target.value.replace(/[^0-9.]/g, '') })}
            inputMode="decimal"
            placeholder="Unit"
            className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2"
          />
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <span className="text-sm tabular-nums text-slate-700">
              {formatCents(totals.lineTotals[index] ?? 0, currency)}
            </span>
            <button
              type="button"
              aria-label={`Remove line ${index + 1}`}
              onClick={() => onChange(lines.filter((_, i) => i !== index))}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="flex justify-end border-t border-line pt-3">
        <span className="text-sm font-semibold text-ink">
          Total: {formatCents(totals.subtotalCents, currency)}
        </span>
      </div>

      {!totals.valid && lines.length > 0 && (
        <p className="text-xs text-amber-700">
          Every line needs a description of at least 2 characters, a whole quantity of 1 or more,
          and an amount with at most 2 decimals.
        </p>
      )}
    </div>
  );
}
