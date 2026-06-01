export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

const statusLabel: Record<NotificationStatus, string> = {
  ARCHIVED: 'Archived',
  READ: 'Read',
  UNREAD: 'Unread',
};

export function NotificationBadge({ status }: { status: NotificationStatus }) {
  return (
    <span className="inline-flex rounded-md border border-line bg-panel px-2 py-1 text-xs font-medium text-slate-700">
      {statusLabel[status]}
    </span>
  );
}
