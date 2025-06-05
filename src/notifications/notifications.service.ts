// src/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationRepository } from './infrastructure/persistence/notification.repository';
import { Notification } from './domain/notification';
import { User } from '../users/domain/user';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { UsersService } from 'src/users/users.service';
import { CreateMultipleNotificationsDto } from './dto/create-multiple-notifications.dto';
import { CreateBroadcastNotificationDto } from './dto/create-broadcast-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly usersService: UsersService,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationRepository.create({
      userId: createNotificationDto.userId,
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      isRead: createNotificationDto.isRead || false,
      link: createNotificationDto.link,
    });
  }

  async findAllForUser(
    userJwtPayload: JwtPayloadType,
    queryDto: QueryNotificationDto,
  ): Promise<Notification[]> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 10;

    return this.notificationRepository.findByUserId(
      userJwtPayload.id,
      { page, limit },
      {
        isRead: queryDto.isRead,
        search: queryDto.search,
      },
    );
  }

  async countUnread(userId: User['id']): Promise<number> {
    return this.notificationRepository.countUnreadByUserId(userId);
  }

  async findOne(
    userJwtPayload: JwtPayloadType,
    id: Notification['id'],
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Ensure the user can only access their own notifications
    if (notification.userId.toString() !== userJwtPayload.id.toString()) {
      throw new UnauthorizedException(
        'You can only access your own notifications',
      );
    }

    return notification;
  }

  async markAsRead(
    userJwtPayload: JwtPayloadType,
    id: Notification['id'],
  ): Promise<Notification> {
    const notification = await this.findOne(userJwtPayload, id);
    if (notification.isRead) {
      return notification; // Already read, no need to update
    }

    const updated = await this.notificationRepository.update(id, {
      isRead: true,
    });
    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    return updated;
  }

  async markAllAsRead(userJwtPayload: JwtPayloadType): Promise<void> {
    await this.notificationRepository.markAllAsRead(userJwtPayload.id);
  }

  async update(
    userJwtPayload: JwtPayloadType,
    id: Notification['id'],
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    // Verify user has access to this notification
    await this.findOne(userJwtPayload, id);

    const updated = await this.notificationRepository.update(
      id,
      updateNotificationDto,
    );
    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    return updated;
  }

  async delete(
    userJwtPayload: JwtPayloadType,
    id: Notification['id'],
  ): Promise<void> {
    // Verify user has access to this notification
    await this.findOne(userJwtPayload, id);

    await this.notificationRepository.delete(id);
  }

  async broadcastToAllUsers(
    createBroadcastDto: CreateBroadcastNotificationDto,
  ): Promise<void> {
    // Get all users (use pagination for large datasets)
    const allUsers = await this.usersService.findManyWithPagination({
      paginationOptions: { page: 1, limit: 1000 },
    });
    // Create notifications in batches (to avoid memory issues)
    const batchSize = 100;
    for (let i = 0; i < allUsers.length; i += batchSize) {
      const userBatch = allUsers.slice(i, i + batchSize);
      const notificationPromises = userBatch.map((user) =>
        this.notificationRepository.create({
          userId: user.id,
          title: createBroadcastDto.title,
          message: createBroadcastDto.message,
          isRead: false,
          link: createBroadcastDto.link,
          linkLabel: createBroadcastDto.linkLabel,
        }),
      );
      await Promise.all(notificationPromises);
    }
  }

  async sendToMultipleUsers(
    createMultipleDto: CreateMultipleNotificationsDto,
  ): Promise<void> {
    // Create notifications for specified users
    const notificationPromises = createMultipleDto.userIds.map((userId) =>
      this.notificationRepository.create({
        userId,
        title: createMultipleDto.title,
        message: createMultipleDto.message,
        isRead: false,
        link: createMultipleDto.link,
        linkLabel: createMultipleDto.linkLabel,
      }),
    );
    await Promise.all(notificationPromises);
  }
}
