import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReportDefinitionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['INTERNAL', 'OWNER_ONLY', 'CLIENT_SAFE'])
  visibility?: 'INTERNAL' | 'OWNER_ONLY' | 'CLIENT_SAFE';
}
