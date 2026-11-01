import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderTaskListsDto {
  /** The project's active list ids in their new order, left to right. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];
}
