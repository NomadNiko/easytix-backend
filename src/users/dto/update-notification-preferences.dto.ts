import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferenceDto {
  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Whether to send email notifications',
  })
  @IsBoolean()
  email: boolean;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Whether to send in-app notifications',
  })
  @IsBoolean()
  notification: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Ticket created notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  ticketCreated?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Ticket assigned notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  ticketAssigned?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Ticket status changed notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  ticketStatusChanged?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Ticket closed notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  ticketClosed?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Ticket resolved notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  ticketResolved?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Ticket reopened notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  ticketReopened?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Ticket deleted notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  ticketDeleted?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'New comment notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  newComment?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Document added notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  documentAdded?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Document removed notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  documentRemoved?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Priority changed notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  priorityChanged?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Category changed notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  categoryChanged?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Queue assignment notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  queueAssignment?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Password changed notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  passwordChanged?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'Email changed notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  emailChanged?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'High priority alert notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  highPriorityAlert?: NotificationPreferenceDto;

  @ApiProperty({
    type: NotificationPreferenceDto,
    description: 'System maintenance notifications',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferenceDto)
  systemMaintenance?: NotificationPreferenceDto;
}
