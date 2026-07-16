'use client';

/**
 * <Toast> + <ToastContainer>
 * Animated toast notifications — success / error / info.
 * Slides in from bottom-end, auto-dismisses after `duration` ms.
 *
 * Usage:
 *   const { toasts, addToast } = useToast();
 *
 *   addToast({ message: 'Saved!', variant: 'success' });
 *
 *   return (
 *     <>
 *       ...your page...
 *       <ToastContainer toasts={toasts} onDismiss={removeToast} />
 *     </>
 *   );
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (item: Omit<ToastItem, 'id'>, autoDismissMs = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { ...item, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, autoDismissMs);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { addToast, removeToast, toasts };
}

// ── Styles per variant ────────────────────────────────────────────────────────
const variantStyles: Record<ToastVariant, string> = {
  error:
    'bg-danger text-white border-red-700',
  info:
    'bg-ocean text-white border-blue-700',
  success:
    'bg-accent text-white border-teal-700',
  warning:
    'bg-warning text-white border-amber-700',
};

const variantIcons: Record<ToastVariant, string> = {
  error: '✕',
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
};

// ── Toast component ───────────────────────────────────────────────────────────
type ToastProps = {
  toast: ToastItem;
  onDismiss: (id: string) => void;
};

function Toast({ onDismiss, toast }: ToastProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.34, 1.2, 0.64, 1] }}
      role="alert"
      aria-live="assertive"
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lift ${variantStyles[toast.variant]}`}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-black"
        aria-hidden="true"
      >
        {variantIcons[toast.variant]}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ms-2 shrink-0 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
        type="button"
      >
        ✕
      </button>
    </motion.div>
  );
}

// ── Container (place once near the root) ─────────────────────────────────────
type ToastContainerProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ onDismiss, toasts }: ToastContainerProps) {
  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 end-4 z-[200] flex w-full max-w-sm flex-col gap-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <Toast key={t.id} onDismiss={onDismiss} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
