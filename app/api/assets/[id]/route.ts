import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, isAuthenticatedValue } from '@/lib/auth';
import { getAssetById } from '@/lib/repositories/assets';
import { readAssetBuffer } from '@/lib/services/assets';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const isAuthenticated = isAuthenticatedValue(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );

  if (!isAuthenticated) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await context.params;
  const asset = getAssetById(id);

  if (!asset) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buffer = await readAssetBuffer(id);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'private, max-age=60',
    },
  });
}
