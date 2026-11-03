import { redirect } from 'next/navigation';

/** Invitations moved into Team & Access (MAOS E01); old links keep working. */
export default function InvitesPage() {
  redirect('/team/invitations');
}
