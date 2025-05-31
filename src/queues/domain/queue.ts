// src/queues/domain/queue.ts
import { ApiProperty } from '@nestjs/swagger';

export class Queue {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5d',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'tq-0001',
    description: 'Unique queue identifier',
  })
  customId: string;

  @ApiProperty({
    type: String,
    example: 'IT Support',
  })
  name: string;

  @ApiProperty({
    type: String,
    example: 'Technical support for hardware and software issues',
  })
  description: string;

  @ApiProperty({
    type: [String],
    example: ['60a5d5d0e95b0b2d6c5c5e5a', '60a5d5d0e95b0b2d6c5c5e5b'],
  })
  assignedUserIds: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
