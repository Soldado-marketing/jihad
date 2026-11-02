import { redirect } from 'next/navigation';

/** Client Portal V2 (owner decision 2026-11-02): this view is part of My Work now. */
export default function ClientRedirectPage() {
  redirect('/client/deliveries');
}
