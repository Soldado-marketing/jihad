/** What a client reads for a delivery's status (the stored values are approval statuses). */
export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Ready for your review',
  CHANGES_REQUESTED: 'Changes in progress',
  APPROVED: 'Approved',
};

/** One line of a delivery conversation as the client sees it. */
export function threadLine(kind: string, from: 'client' | 'company', company: string): string {
  const who = from === 'client' ? 'You' : company;
  switch (kind) {
    case 'DELIVERED': return `${company} delivered`;
    case 'APPROVE': return `${who} approved`;
    case 'REQUEST_CHANGES': return `${who} requested changes`;
    case 'REVISION_SENT': return `${company} sent a revision`;
    default: return who;
  }
}
