'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  getConfiguredCredentials,
} from '@/lib/auth';

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return {
      error: 'Enter both username and password.',
    };
  }

  const credentials = getConfiguredCredentials();

  if (username !== credentials.username || password !== credentials.password) {
    return {
      error: 'Invalid credentials.',
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  redirect('/topics');
}
