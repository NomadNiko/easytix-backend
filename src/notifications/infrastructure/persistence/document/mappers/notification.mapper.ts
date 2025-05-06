// src/notifications/infrastructure/persistence/document/mappers/notification.mapper.ts
import { Notification } from '../../../../domain/notification';
import { NotificationSchemaClass } from '../entities/notification.schema';

export class NotificationMapper {
  static toDomain(raw: NotificationSchemaClass): Notification {
    const domainEntity = new Notification();
    domainEntity.id = raw._id.toString();
    domainEntity.userId = raw.user._id.toString();
    domainEntity.title = raw.title;
    domainEntity.message = raw.message;
    domainEntity.isRead = raw.isRead;
    domainEntity.link = raw.link;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Notification): NotificationSchemaClass {
    const persistenceSchema = new NotificationSchemaClass();
    if (domainEntity.id) {
      persistenceSchema._id = domainEntity.id;
    }
    persistenceSchema.user = {
      _id: domainEntity.userId.toString(),
    } as any;
    persistenceSchema.title = domainEntity.title;
    persistenceSchema.message = domainEntity.message;
    persistenceSchema.isRead = domainEntity.isRead;
    persistenceSchema.link = domainEntity.link;
    persistenceSchema.createdAt = domainEntity.createdAt;
    persistenceSchema.updatedAt = domainEntity.updatedAt;
    return persistenceSchema;
  }
}
