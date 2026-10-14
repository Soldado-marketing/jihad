import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { MAX_BUDGET_CENTS, PROJECT_NUMBER_PATTERN } from './create-project.dto';

/** null clears an optional field. */
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED', 'ARCHIVED'])
  status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

  /**
   * Whether the client portal may see this project.
   *
   * ClientPortalService filters on Project.clientVisible, but nothing could set
   * it, so /client/projects was empty for every tenant. Defaults to false on
   * create, so a project stays internal until someone says otherwise.
   */
  @IsOptional()
  @IsBoolean()
  clientVisible?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(80)
  serviceType?: string | null;

  /** Finance data: only the OWNER may change it (checked in the service). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(MAX_BUDGET_CENTS)
  budgetCents?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(64)
  ownerUserId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(PROJECT_NUMBER_PATTERN, { message: 'projectNumber: 1-40 letters, digits, dot, underscore or hyphen' })
  projectNumber?: string | null;

  /** null detaches the project from its customer and clears its client key. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(64)
  customerId?: string | null;
}
