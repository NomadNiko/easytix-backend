// src/system-defaults/dto/update-system-default.dto.ts
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateSystemDefaultDto {
  @ApiProperty({
    type: String,
    description: 'Configuration value',
    example: 'tq-0002',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({
    type: String,
    description: 'Human-readable description',
    example: 'Updated default queue for public ticket submissions',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}