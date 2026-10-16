import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/** A calendar day; real-date validity is checked in the service (no 2026-02-30 roll-over). */
export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_MINUTES = 1440;

/**
 * ADR-018 (T72). The member is always the caller; customer, rate and cost are
 * never taken from a request (whitelisting rejects them): the customer comes
 * from the project, rate and cost are frozen by rate resolution (T73).
 */
export class CreateTimeEntryDto {
  @Matches(DAY_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_MINUTES)
  minutes!: number;

  @IsString()
  @MaxLength(64)
  projectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  taskId?: string;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
