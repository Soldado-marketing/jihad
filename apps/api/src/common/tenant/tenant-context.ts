export type TenantContextSource =
  | 'request-header'
  | 'session'
  | 'job'
  | 'realtime'
  | 'test';

export interface TenantContext {
  tenantId: string;
  source: TenantContextSource;
  actorId?: string;
  membershipId?: string;
}
