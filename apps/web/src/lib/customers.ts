/**
 * Customer list view model (MAOS-T53, ADR-017). Pure helpers so the rules
 * the page follows are tested without a browser. The API enforces every one
 * of them again; the UI only avoids offering what would be refused.
 */

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface CustomerRow {
  id: string;
  clientScopeKey: string;
  name: string;
  status: CustomerStatus;
  industry: string | null;
  website: string | null;
  notes: string | null;
  responsibleUser: { id: string; displayName: string | null } | null;
  _count: { projects: number; invoices: number; fileAssets: number };
  createdAt: string;
  updatedAt: string;
}

export const CUSTOMER_STATUSES: readonly CustomerStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ARCHIVED: 'Archived',
};

/** Same format the API accepts for a client key (ADR-017; F-1). */
export const CLIENT_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

/** OWNER and MANAGER maintain customers; EMPLOYEE reads (API resource CUSTOMER). */
export function canWriteCustomers(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

/** Archiving or restoring a customer is OWNER only. */
export function canArchive(role: string | undefined): boolean {
  return role === 'OWNER';
}

/** Statuses a role may choose for a customer that is currently `current`. */
export function statusChoices(role: string | undefined, current: CustomerStatus): CustomerStatus[] {
  if (canArchive(role)) return [...CUSTOMER_STATUSES];
  // Others cannot move into or out of ARCHIVED.
  return current === 'ARCHIVED' ? ['ARCHIVED'] : ['ACTIVE', 'INACTIVE'];
}

/** Industry filter options from the loaded rows, sorted, without blanks. */
export function industryOptions(rows: readonly CustomerRow[]): string[] {
  return [...new Set(rows.map((r) => r.industry?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

export interface CustomerForm {
  name: string;
  clientScopeKey: string;
  industry: string;
  website: string;
  notes: string;
}

/** The create request body, or an error message. Empty optional fields are left out. */
export function createPayload(form: CustomerForm): { ok: true; body: Record<string, string> } | { ok: false; error: string } {
  const name = form.name.trim();
  if (name.length < 1 || name.length > 200) return { ok: false, error: 'Enter a name (up to 200 characters).' };
  const key = form.clientScopeKey.trim();
  if (!CLIENT_KEY_PATTERN.test(key)) {
    return { ok: false, error: 'The client key is 1 to 120 letters, digits, dots, underscores or hyphens, starting with a letter or digit.' };
  }
  const website = form.website.trim();
  if (website && !/^https?:\/\/\S+$/.test(website)) return { ok: false, error: 'The website must start with http:// or https://.' };
  const body: Record<string, string> = { name, clientScopeKey: key };
  if (form.industry.trim()) body.industry = form.industry.trim();
  if (website) body.website = website;
  if (form.notes.trim()) body.notes = form.notes.trim();
  return { ok: true, body };
}

/**
 * The edit request body: only changed fields; a cleared optional field is
 * sent as null. The client key is never sent - it cannot change.
 */
export function updatePayload(
  before: CustomerRow,
  form: Omit<CustomerForm, 'clientScopeKey'> & { status: CustomerStatus },
): { ok: true; body: Record<string, string | null> } | { ok: false; error: string } {
  const name = form.name.trim();
  if (name.length < 1 || name.length > 200) return { ok: false, error: 'Enter a name (up to 200 characters).' };
  const website = form.website.trim();
  if (website && !/^https?:\/\/\S+$/.test(website)) return { ok: false, error: 'The website must start with http:// or https://.' };
  const body: Record<string, string | null> = {};
  if (name !== before.name) body.name = name;
  if (form.status !== before.status) body.status = form.status;
  for (const k of ['industry', 'notes'] as const) {
    const v = form[k].trim();
    if (v !== (before[k] ?? '')) body[k] = v || null;
  }
  if (website !== (before.website ?? '')) body.website = website || null;
  return { ok: true, body };
}
