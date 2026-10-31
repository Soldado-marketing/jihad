'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from './fetch';

/** Explicit grants the OWNER gave this user in the active company (key → on). */
export type MyGrants = Record<string, boolean>;

/**
 * Loads GET /auth/my-grants once per page. For showing the right navigation
 * and buttons only: the API checks every request itself. Empty until loaded
 * and on any error, so nothing extra is shown by mistake.
 */
export function useMyGrants(enabled = true): MyGrants {
  const [grants, setGrants] = useState<MyGrants>({});
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    apiFetch<{ grants: MyGrants }>('/auth/my-grants')
      .then((r) => live && setGrants(r.grants ?? {}))
      .catch(() => live && setGrants({}));
    return () => { live = false; };
  }, [enabled]);
  return grants;
}
