import { setAuthSession } from './auth';
import { apiFetch } from './fetch';

type SwitchResponse = {
  tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  user: { id: string; email: string; displayName: string | null; role: string };
  tenant: { id: string; name: string; slug: string };
};

/**
 * Switch this browser's session to another authorized company through
 * POST /auth/companies/switch. The server checks the membership and rotates
 * the session; only this user's session changes. Returns the role in the
 * target company.
 */
export async function switchCompanySession(tenantId: string): Promise<string> {
  const data = await apiFetch<SwitchResponse>('/auth/companies/switch', {
    method: 'POST',
    body: JSON.stringify({ tenantId }),
  });
  setAuthSession({
    accessToken: data.tokens.accessToken,
    refreshToken: data.tokens.refreshToken,
    user: { ...data.user, displayName: data.user.displayName ?? '' },
    tenant: data.tenant,
  });
  return data.user.role;
}

/**
 * Open a record that lives in `tenantId`. In the active company this is a
 * normal navigation; in another company the session is switched first and the
 * page is fully reloaded so no state or cached data of the previous company
 * survives.
 */
export async function openInCompany(
  tenantId: string,
  currentTenantId: string,
  href: string,
  navigate: (href: string) => void,
): Promise<void> {
  if (tenantId === currentTenantId) {
    navigate(href);
    return;
  }
  const role = await switchCompanySession(tenantId);
  window.location.assign(role === 'CLIENT' ? '/client' : href);
}
