import {
  NotificationList,
  type NotificationListItem,
} from '@/components/notifications/notification-list';

const sprint7Notifications: NotificationListItem[] = [
  {
    body: 'A new internal channel message is ready for review.',
    id: 'sprint-7-notification',
    resource: 'Resource: chat-message',
    status: 'UNREAD',
    title: 'New internal message',
  },
];

export default function NotificationsPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="notifications-title">
        <p className="text-sm font-medium text-slate-600">Sprint 7</p>
        <h2 id="notifications-title" className="mt-2 text-3xl font-semibold text-ink">
          Notifications
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Workspace notification placeholders with no email, push, or mobile delivery.
        </p>
      </section>
      <NotificationList notifications={sprint7Notifications} />
    </div>
  );
}
