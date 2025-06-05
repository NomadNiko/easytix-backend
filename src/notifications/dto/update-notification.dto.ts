// src/notifications/dto/update-notification.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    type: String,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    type: String,
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    type: String,
  })
  @IsOptional()
  @IsString()
  link?: string;
}
