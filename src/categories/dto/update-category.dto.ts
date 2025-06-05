// src/categories/dto/update-category.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    type: String,
    example: 'Hardware Issues',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  name?: string;
}
