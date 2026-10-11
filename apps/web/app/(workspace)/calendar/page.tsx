'use client';

import { AgencyCalendar } from '@/components/calendar/agency-calendar';
import { PageHeader } from '@/components/ui/page-header';

/** Workspace calendar (MAOS-T104): every dated item the caller may see. */
export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Calendar"
        description="Task due dates, meetings, follow-ups, approval deadlines and invoice due dates."
      />
      <AgencyCalendar />
    </div>
  );
}
