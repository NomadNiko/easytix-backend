// src/queues/infrastructure/persistence/document/mappers/queue.mapper.ts
import { Queue } from '../../../../domain/queue';
import { QueueSchemaClass } from '../entities/queue.schema';

export class QueueMapper {
  static toDomain(raw: QueueSchemaClass): Queue {
    const domainEntity = new Queue();
    domainEntity.id = raw._id.toString();
    domainEntity.customId = raw.customId;
    domainEntity.name = raw.name;
    domainEntity.description = raw.description;
    domainEntity.assignedUserIds = raw.assignedUserIds || [];
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Queue): QueueSchemaClass {
    const persistenceEntity = new QueueSchemaClass();
    if (domainEntity.id) {
      persistenceEntity._id = domainEntity.id;
    }
    persistenceEntity.customId = domainEntity.customId;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.description = domainEntity.description;
    persistenceEntity.assignedUserIds = domainEntity.assignedUserIds || [];
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    return persistenceEntity;
  }
}
