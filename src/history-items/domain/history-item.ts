// src/history-items/domain/history-item.ts
import { ApiProperty } from '@nestjs/swagger';

export enum HistoryItemType {
  COMMENT = 'COMMENT',
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  DOCUMENT_ADDED = 'DOCUMENT_ADDED',
  DOCUMENT_REMOVED = 'DOCUMENT_REMOVED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  CATEGORY_CHANGED = 'CATEGORY_CHANGED',
}

export class HistoryItem {
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
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5b',
  })
  userId: string;

  @ApiProperty({
    enum: HistoryItemType,
    example: HistoryItemType.COMMENT,
  })
  type: HistoryItemType;

  @ApiProperty({
    type: String,
    example: 'This is a comment on the ticket.',
  })
  details: string;

  @ApiProperty()
  createdAt: Date;
}
