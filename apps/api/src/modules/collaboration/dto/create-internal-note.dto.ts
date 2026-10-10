import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LINKABLE_RESOURCE_TYPES } from '../../../common/tenant/tenant-references';

export class CreateInternalNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  threadKey?: string;

  @IsOptional()
  @IsIn(LINKABLE_RESOURCE_TYPES)
  resourceType?: (typeof LINKABLE_RESOURCE_TYPES)[number];

  @IsOptional()
  @IsString()
  resourceId?: string;
}

export class UpdateInternalNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body!: string;
}
