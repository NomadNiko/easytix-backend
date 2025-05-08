// src/tickets/domain/ticket.ts
import { ApiProperty } from '@nestjs/swagger';

export enum TicketStatus {
  OPENED = 'Opened',
  CLOSED = 'Closed',
}

export enum TicketPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export class Ticket {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5d',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  queueId: string;

  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5b',
  })
  categoryId: string;

  @ApiProperty({
    type: String,
    example: 'Printer not working',
  })
  title: string;

  @ApiProperty({
    type: String,
    example:
      'The printer on the 3rd floor is not responding to print requests.',
  })
  details: string;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.OPENED,
  })
  status: TicketStatus;

  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5c',
    nullable: true,
  })
  assignedToId: string | null;

  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5e',
  })
  createdById: string;

  @ApiProperty({
    type: [String],
    example: ['60a5d5d0e95b0b2d6c5c5e5f', '60a5d5d0e95b0b2d6c5c5e5g'],
  })
  documentIds: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  closedAt: Date | null;
}
