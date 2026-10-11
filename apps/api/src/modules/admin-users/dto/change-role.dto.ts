import { IsEnum, IsOptional, Matches } from 'class-validator';
import { CLIENT_SCOPE_KEY_PATTERN } from '../../permissions/client-scope-assignment';
import { ApprovalRole } from './approve-request.dto';

export class ChangeRoleDto {
  @IsEnum(ApprovalRole, {
    message: 'role must be one of: MANAGER, EMPLOYEE, CONTRACTOR, CLIENT',
  })
  role!: ApprovalRole;

  /**
   * Required for the CLIENT role, refused for every other role (F-1): the key
   * that ties the client membership to its client's projects, files and
   * invoices.
   */
  @IsOptional()
  @Matches(CLIENT_SCOPE_KEY_PATTERN, {
    message: 'clientScopeKey: 1-120 letters, digits, dot, underscore or hyphen',
  })
  clientScopeKey?: string;
}
