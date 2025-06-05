// src/notifications/infrastructure/persistence/document/repositories/notification.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Notification } from '../../../../domain/notification';
import { NotificationRepository } from '../../notification.repository';
import { NotificationSchemaClass } from '../entities/notification.schema';
import { NotificationMapper } from '../mappers/notification.mapper';
import { User } from '../../../../../users/domain/user';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { QueryNotificationDto } from '../../../../dto/query-notification.dto';

@Injectable()
export class NotificationDocumentRepository implements NotificationRepository {
  constructor(
    @InjectModel(NotificationSchemaClass.name)
    private notificationModel: Model<NotificationSchemaClass>,
  ) {}

  async create(
    data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Notification> {
    const persistenceModel = NotificationMapper.toPersistence(
      data as Notification,
    );
    const createdNotification = new this.notificationModel(persistenceModel);
    const notificationObject = await createdNotification.save();
    return NotificationMapper.toDomain(notificationObject);
  }

  async findById(id: Notification['id']): Promise<NullableType<Notification>> {
    const notificationObject = await this.notificationModel.findById(id);
    return notificationObject
      ? NotificationMapper.toDomain(notificationObject)
      : null;
  }

  async findByUserId(
    userId: User['id'],
    paginationOptions: IPaginationOptions,
    filters?: Pick<QueryNotificationDto, 'isRead' | 'search'>,
  ): Promise<Notification[]> {
    const query: FilterQuery<NotificationSchemaClass> = {
      user: userId.toString(),
    };

    if (filters?.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { message: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const notificationObjects = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    return notificationObjects.map((notificationObject) =>
      NotificationMapper.toDomain(notificationObject),
    );
  }

  async countUnreadByUserId(userId: User['id']): Promise<number> {
    return this.notificationModel.countDocuments({
      user: userId.toString(),
      isRead: false,
    });
  }

  async update(
    id: Notification['id'],
    payload: Partial<Notification>,
  ): Promise<Notification | null> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;
    delete clonedPayload.userId;
    delete clonedPayload.createdAt;
    delete clonedPayload.updatedAt;

    const filter = { _id: id.toString() };
    const notification = await this.notificationModel.findOne(filter);
    if (!notification) {
      return null;
    }

    const notificationObject = await this.notificationModel.findOneAndUpdate(
      filter,
      { $set: clonedPayload },
      { new: true },
    );

    return notificationObject
      ? NotificationMapper.toDomain(notificationObject)
      : null;
  }

  async markAllAsRead(userId: User['id']): Promise<void> {
    await this.notificationModel.updateMany(
      { user: userId.toString(), isRead: false },
      { $set: { isRead: true } },
    );
  }

  async delete(id: Notification['id']): Promise<void> {
    await this.notificationModel.deleteOne({ _id: id.toString() });
  }
}
