import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME } from '@/lib/auth';

function clearSessionAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}

export function POST(request: NextRequest) {
  return clearSessionAndRedirect(request);
}

export function GET(request: NextRequest) {
  return clearSessionAndRedirect(request);
}
