// src/ticket-documents/domain/ticket-document.ts
import { ApiProperty } from '@nestjs/swagger';
import { FileType } from '../../files/domain/file';

export class TicketDocument {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5d',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  ticketId: string;

  @ApiProperty({
    type: () => FileType,
  })
  file: FileType;

  @ApiProperty({
    type: String,
    example: 'document.pdf',
  })
  name: string;

  @ApiProperty()
  uploadedAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
