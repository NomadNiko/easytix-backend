// src/categories/dto/create-category.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  @IsString()
  @IsNotEmpty()
  queueId: string;

  @ApiProperty({
    type: String,
    example: 'Hardware',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;
}
