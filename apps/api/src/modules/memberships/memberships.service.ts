import { Injectable } from '@nestjs/common';
import { MembershipRole } from '../../common/identity/membership-role';

@Injectable()
export class MembershipsService {
  getSprint1ARoles(): MembershipRole[] {
    return [
      MembershipRole.OWNER,
      MembershipRole.MANAGER,
      MembershipRole.EMPLOYEE,
      MembershipRole.CLIENT,
    ];
  }
}
