import { redirect } from 'next/navigation';

/** Team & Access opens on the members section. */
export default function TeamPage() {
  redirect('/team/members');
}
