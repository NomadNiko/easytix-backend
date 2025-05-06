// src/notifications/dto/create-notification.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { User } from '../../users/domain/user';

export class CreateNotificationDto {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  @IsNotEmpty()
  @IsString()
  userId: User['id'];

  @ApiProperty({
    type: String,
    example: 'Ticket Assigned',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    type: String,
    example: 'You have been assigned ticket #12345',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    type: Boolean,
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    type: String,
    example: '/tickets/12345',
  })
  @IsOptional()
  @IsString()
  link?: string;
}
