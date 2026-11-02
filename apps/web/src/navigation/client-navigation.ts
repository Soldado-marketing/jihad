export type ClientNavigationItem = {
  id: string;
  label: string;
  href: string;
};

/**
 * The client portal (owner decision 2026-11-02, Client Portal V2): an
 * overview of what waits for the client, and three areas: their work, their
 * invoices and their shooting appointments. Updates live in the bell.
 */
export const clientNavigation: ClientNavigationItem[] = [
  { id: 'client-dashboard', label: 'Overview', href: '/client' },
  { id: 'client-work', label: 'My Work', href: '/client/deliveries' },
  { id: 'client-invoices', label: 'Invoices', href: '/client/invoices' },
  { id: 'client-appointments', label: 'Appointments', href: '/client/appointments' },
];
