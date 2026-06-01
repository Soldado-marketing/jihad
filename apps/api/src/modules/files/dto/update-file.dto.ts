import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsIn(['INTERNAL', 'CLIENT_VISIBLE'])
  visibility?: 'INTERNAL' | 'CLIENT_VISIBLE';

  @IsOptional()
  @IsString()
  clientScopeKey?: string;
}
