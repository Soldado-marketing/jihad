import { redirect } from 'next/navigation';

/**
 * Tasks are internal working items and are not part of the client workflow
 * (owner decision 2026-11-02): clients review deliveries instead.
 */
export default function ClientTasksPage() {
  redirect('/client/deliveries');
}
