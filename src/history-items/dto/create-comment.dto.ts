// src/history-items/dto/create-comment.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    type: String,
    example: 'This is a comment on the ticket.',
  })
  @IsString()
  @IsNotEmpty()
  details: string;
}
