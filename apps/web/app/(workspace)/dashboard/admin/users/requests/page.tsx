import { redirect } from 'next/navigation';

/**
 * User requests moved into Team & Access (MAOS E01). The review link in the
 * registration e-mail (API mail.service) still points here, so this redirect stays.
 */
export default function UserRequestsPage() {
  redirect('/team/requests');
}
