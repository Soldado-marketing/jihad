import 'server-only';

import { createLog } from '@/lib/repositories/logs';
import type { LogLevel, LogScope } from '@/lib/types';
import { createId } from '@/lib/utils';

export async function logEvent(input: {
  postId?: string | null;
  scope: LogScope;
  level?: LogLevel;
  message: string;
  details?: Record<string, unknown>;
}) {
  const level = input.level ?? 'info';

  createLog({
    id: createId('log'),
    postId: input.postId ?? null,
    scope: input.scope,
    level,
    message: input.message,
    details: input.details,
  });

  const method = level === 'error' ? console.error : console.info;
  method(`[${input.scope}] ${input.message}`, input.details ?? {});
}
