import { NextResponse } from 'next/server';

import { approvePost } from '@/lib/services/review';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  await approvePost(token);

  return NextResponse.redirect(new URL(`/review/${token}?submitted=approved`, _request.url));
}
