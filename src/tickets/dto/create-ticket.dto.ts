// src/tickets/dto/create-ticket.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TicketPriority } from '../domain/ticket';

export class CreateTicketDto {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  @IsString()
  @IsNotEmpty()
  queueId: string;

  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5b',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    type: String,
    example: 'Printer not working',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({
    type: String,
    example:
      'The printer on the 3rd floor is not responding to print requests.',
  })
  @IsString()
  @IsNotEmpty()
  details: string;

  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
  })
  @IsEnum(TicketPriority)
  @IsNotEmpty()
  priority: TicketPriority;

  @ApiPropertyOptional({
    type: [String],
    example: ['60a5d5d0e95b0b2d6c5c5e5f', '60a5d5d0e95b0b2d6c5c5e5g'],
  })
  @IsArray()
  @IsOptional()
  documentIds?: string[];
}
