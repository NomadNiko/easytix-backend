// src/notifications/admin-notifications.controller.ts
import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { NotificationsService } from './notifications.service';
import { CreateBroadcastNotificationDto } from './dto/create-broadcast-notification.dto';
import { CreateMultipleNotificationsDto } from './dto/create-multiple-notifications.dto';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'admin/notifications',
  version: '1',
})
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  @HttpCode(HttpStatus.NO_CONTENT)
  async broadcastToAllUsers(
    @Body() createBroadcastDto: CreateBroadcastNotificationDto,
  ): Promise<void> {
    return this.notificationsService.broadcastToAllUsers(createBroadcastDto);
  }

  @Post('send-to-users')
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendToMultipleUsers(
    @Body() createMultipleDto: CreateMultipleNotificationsDto,
  ): Promise<void> {
    return this.notificationsService.sendToMultipleUsers(createMultipleDto);
  }
}
