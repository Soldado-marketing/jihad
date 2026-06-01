import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatChannelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsIn(['INTERNAL', 'CLIENT'])
  type?: 'INTERNAL' | 'CLIENT';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  clientScopeKey?: string;
}
