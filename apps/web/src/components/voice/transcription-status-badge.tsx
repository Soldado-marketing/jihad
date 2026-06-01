export type TranscriptionStatus = 'PENDING' | 'COMPLETED' | 'LOW_CONFIDENCE' | 'FAILED';

const statusLabel: Record<TranscriptionStatus, string> = {
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  LOW_CONFIDENCE: 'Low confidence',
  PENDING: 'Pending',
};

export function TranscriptionStatusBadge({ status }: { status: TranscriptionStatus }) {
  return (
    <span className="inline-flex rounded-md border border-line bg-panel px-2 py-1 text-xs font-medium text-slate-700">
      {statusLabel[status]}
    </span>
  );
}
