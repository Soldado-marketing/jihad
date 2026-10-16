import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { DAY_PATTERN, MAX_MINUTES } from './create-time-entry.dto';

/** Only DRAFT or REJECTED entries change (ADR-018 §1); null clears taskId or note. */
export class UpdateTimeEntryDto {
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_MINUTES)
  minutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  projectId?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(64)
  taskId?: string | null;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export class RejectTimeEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
