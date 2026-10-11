'use client';

import { useRef, useState } from 'react';
import { formatCents } from '@/lib/money';
import { groupByStage, isPipelineStage, PIPELINE_STAGES, type PipelineItem, type PipelineStage } from '@/lib/pipeline';

export interface BoardOpportunity extends PipelineItem {
  title: string;
  lead?: { name: string } | null;
}

/**
 * Seven-stage CRM pipeline (MAOS-T62), following the task Kanban's pattern:
 * drag a card to another column, or use the stage selector on the card (the
 * keyboard-accessible way). Each column shows its count and per-currency value.
 */
export function PipelineBoard({
  items,
  onMove,
}: {
  items: BoardOpportunity[];
  onMove: (id: string, status: PipelineStage) => Promise<void>;
}) {
  const [over, setOver] = useState<PipelineStage | null>(null);
  const dragged = useRef<string | null>(null);
  const columns = groupByStage(items);

  async function drop(status: PipelineStage) {
    setOver(null);
    const id = dragged.current;
    dragged.current = null;
    const item = items.find((i) => i.id === id);
    if (item && item.status !== status) await onMove(item.id, status);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Sales pipeline">
      {columns.map((col) => (
        <section
          key={col.status}
          aria-label={`${col.label}: ${col.count}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(col.status);
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            void drop(col.status);
          }}
          className={`flex w-64 shrink-0 flex-col rounded-xl border bg-slate-50 ${over === col.status ? 'border-brand' : 'border-line'}`}
        >
          <header className="border-b border-line px-3 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">{col.label}</h3>
              <span className="rounded-full bg-white px-2 text-xs font-semibold text-slate-600">{col.count}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {col.totals.length === 0 ? 'No value' : col.totals.map(([cur, cents]) => formatCents(cents, cur)).join(' · ')}
            </p>
          </header>
          <ul className="flex min-h-24 flex-col gap-2 p-2">
            {col.items.map((o) => (
              <li
                key={o.id}
                draggable
                onDragStart={() => {
                  dragged.current = o.id;
                }}
                className="cursor-grab rounded-lg border border-line bg-white p-3 shadow-sm active:cursor-grabbing"
              >
                <p className="text-sm font-medium text-ink">{o.title}</p>
                {o.lead?.name && <p className="text-xs text-muted">{o.lead.name}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {typeof o.valueCents === 'number' && o.valueCents > 0 ? formatCents(o.valueCents, o.currency || 'EUR') : '—'}
                  </span>
                  <select
                    aria-label={`Stage of ${o.title}`}
                    value={o.status}
                    onChange={(e) => isPipelineStage(e.target.value) && void onMove(o.id, e.target.value)}
                    className="rounded-md border border-line bg-white px-1 py-0.5 text-xs"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.status} value={s.status}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
