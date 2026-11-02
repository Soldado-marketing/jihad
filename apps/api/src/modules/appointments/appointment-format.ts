/**
 * A shooting appointment is a canonical Task (owner decision 2026-11-02, no
 * new model): dueAt is the start, the "Shooting" label marks it, and the
 * description holds the client-facing location and preparation in this fixed
 * form, so the crew also sees it on the task board and in the calendar.
 */
export const SHOOTING_LABEL = 'Shooting appointment';

export function appointmentDescription(location: string, preparation?: string | null): string {
  const prep = preparation?.trim();
  return `Location: ${location.trim().replace(/\s+/g, ' ')}${prep ? `\n\nPreparation:\n${prep}` : ''}`;
}

export function parseAppointmentDescription(description: string | null | undefined): { location: string; preparation: string } {
  const text = description ?? '';
  const location = /^Location:[ \t]*(.*)$/m.exec(text)?.[1]?.trim() ?? '';
  const at = text.indexOf('Preparation:\n');
  return { location, preparation: at >= 0 ? text.slice(at + 'Preparation:\n'.length).trim() : '' };
}

/** A short, human date for notification text (the agency works in Germany). */
export function appointmentWhen(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(at);
}
