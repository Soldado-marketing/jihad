import { IsEmail, IsIn, MaxLength } from 'class-validator';

/**
 * Roles an invite may grant. OWNER is never invitable; CLIENT needs a client
 * scope key on the invite, which waits for a gated migration - clients keep
 * the register-and-approve path until then.
 */
export const INVITABLE_ROLES = ['MANAGER', 'EMPLOYEE', 'CONTRACTOR'] as const;

export class CreateInviteDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsIn(INVITABLE_ROLES, { message: 'role must be one of: MANAGER, EMPLOYEE, CONTRACTOR' })
  role!: (typeof INVITABLE_ROLES)[number];
}
