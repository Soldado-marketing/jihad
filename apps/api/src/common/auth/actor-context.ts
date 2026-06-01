import { MembershipRole } from '../identity/membership-role';

export interface ActorContext {
  actorId: string;
  role: MembershipRole;
  tenantId: string;
  membershipId?: string;
  sessionId?: string;
  deviceId?: string;
}
