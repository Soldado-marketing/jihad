import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;

/**
 * clientScopeKey is deliberately absent: with forbidNonWhitelisted, sending it
 * is a 400. Changing who a client is stays a membership change (ADR-017 §4).
 * null clears an optional field.
 */
export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsIn(CUSTOMER_STATUSES)
  status?: (typeof CUSTOMER_STATUSES)[number];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(120)
  industry?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(300)
  website?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(64)
  responsibleUserId?: string | null;
}
