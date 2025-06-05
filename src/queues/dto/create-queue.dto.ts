// src/queues/dto/create-queue.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateQueueDto {
  @ApiProperty({
    type: String,
    example: 'IT Support',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    type: String,
    example: 'Technical support for hardware and software issues',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: [String],
    example: ['60a5d5d0e95b0b2d6c5c5e5a', '60a5d5d0e95b0b2d6c5c5e5b'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  assignedUserIds?: string[];
}
