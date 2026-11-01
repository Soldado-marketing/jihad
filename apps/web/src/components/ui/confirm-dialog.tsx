'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** Red confirm button for actions that take access away. */
  danger?: boolean;
  busy?: boolean;
  error?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Asks before a change that takes effect at once (role change, removal,
 * revoking an invitation). Cancel has focus first, Escape and the backdrop
 * cancel; nothing happens until the confirm button is pressed.
 */
export function ConfirmDialog({
  title, children, confirmLabel, danger, busy, error, confirmDisabled, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => { if (!busy) onCancel(); }} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <h2 id={titleId} className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
        <div className="space-y-3 text-sm text-muted">{children}</div>
        {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy}
            className="rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy || confirmDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${danger ? 'bg-destructive' : 'bg-accent'}`}>
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
