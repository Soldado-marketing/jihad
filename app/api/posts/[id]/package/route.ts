import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, isAuthenticatedValue } from '@/lib/auth';
import { getLatestAssetForPost } from '@/lib/repositories/assets';
import { getPostById } from '@/lib/repositories/posts';
import { readAssetBuffer } from '@/lib/services/assets';
import { createManualPublishingPackage } from '@/lib/services/package';

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
  const post = getPostById(id);

  if (!post) {
    return new NextResponse('Not found', { status: 404 });
  }

  let packageAsset = getLatestAssetForPost(post.id, 'package');

  if (!packageAsset) {
    packageAsset = await createManualPublishingPackage(post.id);
  }

  if (!packageAsset) {
    return new NextResponse('Package could not be created.', { status: 500 });
  }

  const buffer = await readAssetBuffer(packageAsset.id);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${packageAsset.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
