import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Project numbers: short, readable, unique per tenant (T56). */
export const PROJECT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
/** Upper bound for a budget in cents (10 billion in the currency unit). */
export const MAX_BUDGET_CENTS = 1_000_000_000_000;

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceType?: string;

  /** Finance data: only the OWNER may set it (checked in the service). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_BUDGET_CENTS)
  budgetCents?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ownerUserId?: string;

  /** Assigned automatically (P-0001, ...) when left out. */
  @IsOptional()
  @Matches(PROJECT_NUMBER_PATTERN, { message: 'projectNumber: 1-40 letters, digits, dot, underscore or hyphen' })
  projectNumber?: string;

  /** The Customer this project belongs to; sets the project's client key too (ADR-017). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerId?: string;
}
