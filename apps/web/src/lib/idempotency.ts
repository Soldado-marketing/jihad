/**
 * Idempotency keys for submits that must not happen twice (D16).
 *
 * The API records a payment once per Idempotency-Key and returns the same
 * payment to every repeat. A key is tied to one exact payload: retrying the
 * same submit (after a timeout or a double click) reuses it, while a changed
 * payload gets a new key - reusing a key for different data is refused.
 */

function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Non-secure contexts lack randomUUID; uniqueness per submit is all we need.
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export interface IdempotencyKeys {
  /** The key for this payload: the previous one if the payload is unchanged. */
  keyFor(payload: string): string;
  /** Forget the last key, after the submit succeeded. */
  reset(): void;
}

export function createIdempotencyKeys(): IdempotencyKeys {
  let last: { payload: string; key: string } | null = null;
  return {
    keyFor(payload) {
      if (!last || last.payload !== payload) last = { payload, key: newKey() };
      return last.key;
    },
    reset() {
      last = null;
    },
  };
}
