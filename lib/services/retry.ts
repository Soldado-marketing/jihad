import 'server-only';

import { sleep } from '@/lib/utils';

export async function retryAsync<T>(
  fn: (attempt: number) => Promise<T>,
  options?: {
    retries?: number;
    baseDelayMs?: number;
  },
) {
  const retries = options?.retries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 350;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Operation failed after retries.');
}
