import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/** PATCH /follow-ups/:id. Lead and opportunity links are set at creation only. */
export class UpdateFollowUpDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  /** An ISO date, or null to clear it. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsIn(['OPEN', 'COMPLETED', 'OVERDUE'])
  status?: 'OPEN' | 'COMPLETED' | 'OVERDUE';
}
