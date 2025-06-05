// src/system-defaults/domain/system-default.ts
import { ApiProperty } from '@nestjs/swagger';

export class SystemDefault {
  @ApiProperty({
    type: String,
    description: 'Unique identifier',
  })
  id: string;

  @ApiProperty({
    type: String,
    description:
      'Configuration key (e.g., DEFAULT_QUEUE_ID, DEFAULT_CATEGORY_ID)',
    example: 'DEFAULT_QUEUE_ID',
  })
  key: string;

  @ApiProperty({
    type: String,
    description: 'Configuration value (e.g., queue ID, category ID)',
    example: 'tq-0001',
  })
  value: string;

  @ApiProperty({
    type: String,
    description: 'Human-readable description of this setting',
    example: 'Default queue for public ticket submissions',
  })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export enum SystemDefaultKey {
  DEFAULT_QUEUE_ID = 'DEFAULT_QUEUE_ID',
  DEFAULT_CATEGORY_ID = 'DEFAULT_CATEGORY_ID',
}
