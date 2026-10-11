import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/** PATCH /meetings/:id. Lead and opportunity links are set at creation only. */
export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  /** An ISO date, or null to clear it. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsIn(['SCHEDULED', 'COMPLETED', 'CANCELED'])
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
}
