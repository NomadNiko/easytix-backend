// src/tickets/dto/ticket-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Ticket } from '../domain/ticket';

export class TicketResponseDto extends Ticket {
  @ApiProperty({
    type: Object,
    example: { id: '60a5d5d0e95b0b2d6c5c5e5a', name: 'IT Support' },
    required: false,
  })
  queue?: { id: string; name: string };

  @ApiProperty({
    type: Object,
    example: { id: '60a5d5d0e95b0b2d6c5c5e5b', name: 'Hardware' },
    required: false,
  })
  category?: { id: string; name: string };
}