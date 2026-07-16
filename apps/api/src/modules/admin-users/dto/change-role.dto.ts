import { IsEnum } from 'class-validator';
import { ApprovalRole } from './approve-request.dto';

export class ChangeRoleDto {
  @IsEnum(ApprovalRole, {
    message: 'role must be one of: MANAGER, EMPLOYEE, CONTRACTOR, CLIENT',
  })
  role!: ApprovalRole;
}
