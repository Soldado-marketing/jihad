import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ReorderItemDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'ARCHIVED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';

  @IsNumber()
  sortOrder!: number;

  /** Board list to put the card in: an active list of the card's own project. */
  @IsOptional()
  @IsString()
  listId?: string;
}

export class ReorderTasksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
