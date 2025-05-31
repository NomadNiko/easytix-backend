// src/system-defaults/dto/query-system-default.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FilterSystemDefaultDto {
  @ApiProperty({
    type: String,
    description: 'Filter by key',
    required: false,
  })
  @IsOptional()
  @IsString()
  key?: string;
}

export class SortSystemDefaultDto {
  @ApiProperty()
  orderBy: keyof SystemDefault;

  @ApiProperty()
  order: string;
}

class SystemDefault {
  id: string;
  key: string;
  value: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}