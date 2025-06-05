import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus } from '../domain/ticket';

export class BatchUpdateTicketDto {
  @ApiProperty({
    description: 'Ticket ID to update',
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'New status for the ticket',
    enum: TicketStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({
    description: 'User ID to assign ticket to',
    example: '60a5d5d0e95b0b2d6c5c5e5b',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignedToId?: string | null;

  @ApiProperty({
    description: 'Closing notes for resolved/closed tickets',
    required: false,
  })
  @IsOptional()
  @IsString()
  closingNotes?: string;
}

export class BatchUpdateTicketsDto {
  @ApiProperty({
    description: 'Array of ticket updates to perform',
    type: [BatchUpdateTicketDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateTicketDto)
  updates: BatchUpdateTicketDto[];
}
