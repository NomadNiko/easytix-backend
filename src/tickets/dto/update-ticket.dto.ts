// src/tickets/dto/update-ticket.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { TicketPriority, TicketStatus } from '../domain/ticket';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5b',
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Printer not working - Updated',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Updated description of the issue.',
  })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiPropertyOptional({
    enum: TicketStatus,
    example: TicketStatus.CLOSED,
  })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional({
    enum: TicketPriority,
    example: TicketPriority.HIGH,
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5c',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  assignedToId?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Issue resolved by replacing toner cartridge',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  closingNotes?: string | null;

  @ApiPropertyOptional({
    type: Date,
    example: '2023-12-01T10:30:00Z',
    nullable: true,
  })
  @IsOptional()
  closedAt?: Date | null;
}
