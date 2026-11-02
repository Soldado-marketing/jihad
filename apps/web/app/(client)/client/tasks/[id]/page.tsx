import { redirect } from 'next/navigation';

/** Tasks are internal; an old link lands on the client's deliveries (see ../page.tsx). */
export default function ClientTaskPage() {
  redirect('/client/deliveries');
}
