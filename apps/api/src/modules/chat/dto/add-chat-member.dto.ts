import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddChatMemberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userId!: string;
}
