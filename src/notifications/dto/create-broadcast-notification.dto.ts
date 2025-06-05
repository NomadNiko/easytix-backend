// src/notifications/dto/create-broadcast-notification.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateBroadcastNotificationDto {
  @ApiProperty({
    type: String,
    example: 'System Maintenance',
  })
  @IsNotEmpty()
  @IsString()
  title: string;
  @ApiProperty({
    type: String,
    example: 'The system will be down for maintenance on Saturday from 2-4 AM.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
  @ApiPropertyOptional({
    type: String,
    example: '/announcements/maintenance',
  })
  @IsOptional()
  @IsString()
  link?: string;
  @ApiPropertyOptional({
    type: String,
    example: 'View Announcement',
  })
  @IsOptional()
  @IsString()
  linkLabel?: string;
}
