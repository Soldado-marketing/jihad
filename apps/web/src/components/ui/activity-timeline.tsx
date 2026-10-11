'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { activityLabel, relativeTime } from '@/lib/activity';

type ActivityEvent = {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
  actor: { id: string; displayName: string | null } | null;
};

/**
 * History of one record (MAOS-T66), from GET /activity/:type/:id. The API
 * decides who may see it; when the caller may not (403/404), the timeline
 * renders nothing rather than an error.
 */
export function ActivityTimeline({
  resourceType,
  resourceId,
}: {
  resourceType: 'project' | 'task' | 'file' | 'invoice' | 'approval';
  resourceId: string;
}) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ items: ActivityEvent[] }>(`/activity/${resourceType}/${resourceId}`)
      .then((res) => !cancelled && setEvents(res.items ?? []))
      .catch(() => !cancelled && setHidden(true));
    return () => {
      cancelled = true;
    };
  }, [resourceType, resourceId]);

  if (hidden) return null;

  return (
    <section aria-labelledby="activity-heading" className="rounded-xl border border-line bg-white p-4">
      <h2 id="activity-heading" className="text-sm font-semibold text-ink">
        Activity
      </h2>
      {events === null && <p className="mt-2 text-sm text-muted">Loading…</p>}
      {events?.length === 0 && <p className="mt-2 text-sm text-muted">No activity recorded yet.</p>}
      {events && events.length > 0 && (
        <ol className="mt-3 space-y-3 border-l border-line pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span
                aria-hidden="true"
                className={`absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full ${e.outcome === 'SUCCESS' ? 'bg-accent' : 'bg-danger'}`}
              />
              <p className="text-sm text-ink">
                {activityLabel(e.action)}
                {e.outcome !== 'SUCCESS' && <span className="ml-1 text-xs text-danger">(not completed)</span>}
              </p>
              <p className="text-xs text-muted">
                {e.actor?.displayName ?? 'System'} · <time dateTime={e.createdAt}>{relativeTime(e.createdAt)}</time>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
