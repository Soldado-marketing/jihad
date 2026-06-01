import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUTH_COOKIE_NAME, isAuthenticatedValue } from '@/lib/auth';

const publicPaths = ['/login', '/review', '/api/system/email-intake'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicPath = publicPaths.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );
  const isAuthenticated = isAuthenticatedValue(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );

  if (isPublicPath && pathname.startsWith('/login') && isAuthenticated) {
    return NextResponse.redirect(new URL('/topics', request.url));
  }

  if (isApiRoute) {
    return NextResponse.next();
  }

  if (!isPublicPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
