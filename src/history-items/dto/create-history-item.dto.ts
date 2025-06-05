// src/history-items/dto/create-history-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { HistoryItemType } from '../domain/history-item';

export class CreateHistoryItemDto {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({
    enum: HistoryItemType,
    example: HistoryItemType.COMMENT,
    default: HistoryItemType.COMMENT,
  })
  @IsEnum(HistoryItemType)
  @IsNotEmpty()
  type: HistoryItemType;

  @ApiProperty({
    type: String,
    example: 'This is a comment on the ticket.',
  })
  @IsString()
  @IsNotEmpty()
  details: string;
}
