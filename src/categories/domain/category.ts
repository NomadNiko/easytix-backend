// src/categories/domain/category.ts
import { ApiProperty } from '@nestjs/swagger';

export class Category {
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
    example: 'Hardware',
  })
  name: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
