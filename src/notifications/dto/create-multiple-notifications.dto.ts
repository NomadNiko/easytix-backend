// src/notifications/dto/create-multiple-notifications.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { User } from '../../users/domain/user';
export class CreateMultipleNotificationsDto {
  @ApiProperty({
    type: [String],
    example: ['60a5d5d0e95b0b2d6c5c5e5a', '60a5d5d0e95b0b2d6c5c5e5b'],
  })
  @IsArray()
  @IsNotEmpty()
  userIds: User['id'][];
  @ApiProperty({
    type: String,
    example: 'New Assignment',
  })
  @IsNotEmpty()
  @IsString()
  title: string;
  @ApiProperty({
    type: String,
    example: 'You have been assigned to a new project.',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
  @ApiPropertyOptional({
    type: String,
    example: '/projects/123',
  })
  @IsOptional()
  @IsString()
  link?: string;
  @ApiPropertyOptional({
    type: String,
    example: 'View Project',
  })
  @IsOptional()
  @IsString()
  linkLabel?: string;
}
