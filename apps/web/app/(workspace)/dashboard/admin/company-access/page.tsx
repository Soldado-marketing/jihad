import { redirect } from 'next/navigation';

/** Company Access moved into Team & Access (MAOS E01); old links keep working. */
export default function CompanyAccessPage() {
  redirect('/team/members');
}
