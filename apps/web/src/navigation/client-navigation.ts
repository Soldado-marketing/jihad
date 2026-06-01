export type ClientNavigationItem = {
  id: string;
  label: string;
  href: string;
};

export const clientNavigation: ClientNavigationItem[] = [
  {
    id: 'client-dashboard',
    label: 'Home',
    href: '/client',
  },
  {
    id: 'client-projects',
    label: 'Projects',
    href: '/client/projects',
  },
  {
    id: 'client-tasks',
    label: 'Tasks',
    href: '/client/tasks',
  },
  {
    id: 'client-invoices',
    label: 'Invoices',
    href: '/client/invoices',
  },
  {
    id: 'client-payments',
    label: 'Payments',
    href: '/client/payments',
  },
];
