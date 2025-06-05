// src/queues/dto/update-queue.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateQueueDto {
  @ApiPropertyOptional({
    type: String,
    example: 'IT Support',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Technical support for hardware and software issues',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['60a5d5d0e95b0b2d6c5c5e5a', '60a5d5d0e95b0b2d6c5c5e5b'],
  })
  @IsArray()
  @IsOptional()
  assignedUserIds?: string[];
}
