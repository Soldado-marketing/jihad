import { EmptyState } from '../states/empty-state';
import { NotificationBadge, type NotificationStatus } from './notification-badge';

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  resource: string;
};

export function NotificationList({ notifications }: { notifications: NotificationListItem[] }) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        title="No notifications"
        description="Workspace notifications will appear here when there is activity to review."
      />
    );
  }

  return (
    <section aria-label="Notifications" className="grid gap-3">
      {notifications.map((notification) => (
        <article className="rounded-md border border-line bg-panel p-4" key={notification.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">{notification.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
            </div>
            <NotificationBadge status={notification.status} />
          </div>
          <p className="mt-3 text-xs text-slate-500">{notification.resource}</p>
        </article>
      ))}
    </section>
  );
}
