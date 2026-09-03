import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
