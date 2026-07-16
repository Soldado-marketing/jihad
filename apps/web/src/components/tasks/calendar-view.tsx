'use client';

export function CalendarView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-line bg-soft/50">
      <div className="w-14 h-14 rounded-2xl bg-canvas border border-line flex items-center justify-center mb-4">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="17" rx="3" stroke="#94a3b8" strokeWidth="1.5"/>
          <path d="M3 9h18M8 2v4M16 2v4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="7" y="12" width="3" height="3" rx="0.5" fill="#94a3b8"/>
          <rect x="14" y="12" width="3" height="3" rx="0.5" fill="#94a3b8"/>
        </svg>
      </div>
      <p className="text-sm font-semibold text-ink">Calendar View</p>
      <p className="text-xs text-muted mt-1 max-w-[220px]">
        Coming in a future sprint. Tasks with due dates will appear here as calendar events.
      </p>
    </div>
  );
}
