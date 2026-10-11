/**
 * Meeting decisions → tasks (MAOS-T109).
 *
 * A decision is an internal note on the meeting (thread "decision"). Turning
 * one into a task copies its text into a canonical Task and points back to
 * the meeting in the description, within the task API's limits.
 */

export const DECISION_THREAD = 'decision';
const TITLE_MAX = 180;
const DESCRIPTION_MAX = 2000;

export function taskFromDecision(meetingTitle: string, decision: string): { title: string; description: string } {
  const text = decision.trim().replace(/\s+/g, ' ');
  const title = text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
  const description = `Decision from the meeting "${meetingTitle.trim()}":\n\n${decision.trim()}`.slice(0, DESCRIPTION_MAX);
  return { title, description };
}

export function isDecision(note: { threadKey?: string | null }): boolean {
  return note.threadKey === DECISION_THREAD;
}
