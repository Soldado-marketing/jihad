import { redirect } from 'next/navigation';

/** Client Portal V2: a project's work is My Work filtered to that project. */
export default async function ClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/client/deliveries?project=${encodeURIComponent(id)}`);
}
