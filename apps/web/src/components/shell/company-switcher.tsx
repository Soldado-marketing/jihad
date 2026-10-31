'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/fetch';
import { getStoredTenant, setAuthSession } from '@/lib/auth';

type Company = { id: string; name: string; slug: string; role: string };
type CompanyList = {
  currentTenantId: string;
  canSwitch: boolean;
  companies: Company[];
};
type SwitchResponse = {
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  user: { id: string; email: string; displayName: string | null; role: string };
  tenant: { id: string; name: string; slug: string };
};

/**
 * Current company is visible to every user; switching is exposed ONLY when
 * the API confirms permission and returns at least two authorized companies.
 * A complete page reload purges old tenant-specific client state and caches.
 */
export function CompanySwitcher() {
  const [currentName, setCurrentName] = useState('Workspace');
  const [available, setAvailable] = useState<CompanyList | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const active = getStoredTenant();
    if (active) setCurrentName(active.name);
    void apiFetch<CompanyList>('/auth/companies').then((list) => {
      if (!mounted) return;
      setAvailable(list);
      const current = list.companies.find((c) => c.id === list.currentTenantId);
      if (current) setCurrentName(current.name);
    }).catch(() => {
      // Do not reveal tenant names from an unverified client-side cache.
      if (mounted) setAvailable(null);
    });
    return () => { mounted = false; };
  }, []);

  async function switchTo(targetId: string) {
    if (!available?.canSwitch || targetId === available.currentTenantId || switching) return;
    setError('');
    setSwitching(true);
    try {
      const data = await apiFetch<SwitchResponse>('/auth/companies/switch', {
        method: 'POST',
        body: JSON.stringify({ tenantId: targetId }),
      });
      setAuthSession({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        user: { ...data.user, displayName: data.user.displayName ?? '' },
        tenant: data.tenant,
      });
      // Clear entire React state and cached tenant data before rendering the target.
      window.location.replace(data.user.role === 'CLIENT' ? '/client' : '/dashboard');
    } catch {
      setError('Unable to switch company. Check your access permissions.');
      setSwitching(false);
    }
  }

  const options = available?.canSwitch ? available.companies : [];
  return (
    <div className="min-w-0" aria-label="Company workspace">
      <p className="hidden text-xs font-bold uppercase tracking-[0.2em] text-accent sm:block">Company</p>
      {options.length > 1 ? (
        <>
          <label htmlFor="maos-company-picker" className="sr-only">Switch company</label>
          <select
            id="maos-company-picker"
            className="max-w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-semibold text-ink sm:max-w-[18rem]"
            value={available?.currentTenantId ?? ''}
            disabled={switching}
            onChange={(event) => void switchTo(event.target.value)}
          >
            {options.map((company) => (
              <option value={company.id} key={company.id}>{company.name}</option>
            ))}
          </select>
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </>
      ) : (
        // Not a heading: each page owns its single <h1> (UX-0 R1).
        <p className="truncate text-base font-semibold sm:text-xl tracking-tight text-ink">{currentName}</p>
      )}
    </div>
  );
}
