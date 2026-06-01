import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApprovalRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  fileAssetId?: string;

  @IsOptional()
  @IsString()
  fileVersionId?: string;

  @IsOptional()
  @IsString()
  clientScopeKey?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
