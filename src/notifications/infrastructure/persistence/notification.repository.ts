// src/notifications/infrastructure/persistence/notification.repository.ts
import { NullableType } from '../../../utils/types/nullable.type';
import { Notification } from '../../domain/notification';
import { User } from '../../../users/domain/user';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QueryNotificationDto } from '../../dto/query-notification.dto';

export abstract class NotificationRepository {
  abstract create(
    data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Notification>;

  abstract findById(
    id: Notification['id'],
  ): Promise<NullableType<Notification>>;

  abstract findByUserId(
    userId: User['id'],
    paginationOptions: IPaginationOptions,
    filters?: Pick<QueryNotificationDto, 'isRead' | 'search'>,
  ): Promise<Notification[]>;

  abstract countUnreadByUserId(userId: User['id']): Promise<number>;

  abstract update(
    id: Notification['id'],
    payload: Partial<Notification>,
  ): Promise<Notification | null>;

  abstract markAllAsRead(userId: User['id']): Promise<void>;

  abstract delete(id: Notification['id']): Promise<void>;
}
