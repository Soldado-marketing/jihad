import { cn } from '@/lib/class-names';
import { statusLabel, statusTone, TONE_CLASSES } from '@/lib/status';

/** The one status badge (MAOS-T61): tone and label come from lib/status. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        TONE_CLASSES[statusTone(status)],
      )}
    >
      {label ?? statusLabel(status)}
    </span>
  );
}
