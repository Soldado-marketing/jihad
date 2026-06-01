import { NextResponse } from 'next/server';

import { getEnv } from '@/lib/env';
import { syncInboxTopics } from '@/lib/services/email-intake';

export async function POST(request: Request) {
  const secret = request.headers.get('x-scheduler-secret');
  const env = getEnv();

  if (!env.SCHEDULER_SECRET || secret !== env.SCHEDULER_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Invalid scheduler secret.',
      },
      { status: 401 },
    );
  }

  try {
    const result = await syncInboxTopics();

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Inbox sync failed.',
      },
      { status: 500 },
    );
  }
}
