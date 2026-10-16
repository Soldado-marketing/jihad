import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

/**
 * The highest hourly rate whose cost for a full day (1440 minutes) still fits
 * TimeEntry.costCents (integer): floor((2^31 - 1) x 60 / 1440) = 89 478 485 cents/h.
 */
export const MAX_RATE_CENTS = 89_478_485;

/** An hourly rate in integer cents, effective from validFrom (ADR-018). scopeKey is derived, never sent. */
export class CreateRateDto {
  @IsIn(['MEMBER', 'ROLE', 'TENANT'])
  scope!: 'MEMBER' | 'ROLE' | 'TENANT';

  @ValidateIf((o: CreateRateDto) => o.scope === 'MEMBER')
  @IsString()
  @MaxLength(64)
  userId?: string;

  @ValidateIf((o: CreateRateDto) => o.scope === 'ROLE')
  @IsIn(['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'])
  role?: 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CONTRACTOR';

  @IsInt()
  @Min(0)
  @Max(MAX_RATE_CENTS)
  rateCents!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validFrom must be YYYY-MM-DD' })
  validFrom!: string;

  /** One tenant currency in the first step (ADR-018 §7). */
  @IsOptional()
  @IsIn(['EUR'])
  currency?: 'EUR';
}

/** Changing an amount never touches entries already frozen with the old one. */
export class UpdateRateDto {
  @IsInt()
  @Min(0)
  @Max(MAX_RATE_CENTS)
  rateCents!: number;
}

export class RerateDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD' })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD' })
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}
