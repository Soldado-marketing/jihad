'use client';

import { AgencyCalendar } from '@/components/calendar/agency-calendar';

const TASK_TYPES = ['task'];

/** Tasks page calendar (MAOS-T104): the shared calendar, tasks only. */
export function CalendarView() {
  return <AgencyCalendar types={TASK_TYPES} />;
}
