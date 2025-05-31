// src/system-defaults/dto/create-system-default.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { SystemDefaultKey } from '../domain/system-default';

export class CreateSystemDefaultDto {
  @ApiProperty({
    enum: SystemDefaultKey,
    description: 'Configuration key',
    example: SystemDefaultKey.DEFAULT_QUEUE_ID,
  })
  @IsEnum(SystemDefaultKey)
  @IsNotEmpty()
  key: SystemDefaultKey;

  @ApiProperty({
    type: String,
    description: 'Configuration value',
    example: 'tq-0001',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({
    type: String,
    description: 'Human-readable description',
    example: 'Default queue for public ticket submissions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}