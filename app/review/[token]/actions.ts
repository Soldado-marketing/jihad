'use server';

import { redirect } from 'next/navigation';

import { requestPostChanges } from '@/lib/services/review';

export async function requestChangesAction(token: string, formData: FormData) {
  const comment = String(formData.get('comment') ?? '').trim();

  if (!comment) {
    throw new Error('A short change request comment is required.');
  }

  await requestPostChanges(token, comment);

  redirect(`/review/${token}?submitted=changes`);
}
