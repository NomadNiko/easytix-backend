// src/history-items/infrastructure/persistence/document/mappers/history-item.mapper.ts
import { HistoryItem } from '../../../../domain/history-item';
import { HistoryItemSchemaClass } from '../entities/history-item.schema';

export class HistoryItemMapper {
  static toDomain(raw: HistoryItemSchemaClass): HistoryItem {
    const domainEntity = new HistoryItem();
    domainEntity.id = raw._id.toString();
    domainEntity.ticketId = raw.ticketId;
    domainEntity.userId = raw.userId;
    domainEntity.type = raw.type;
    domainEntity.details = raw.details;
    domainEntity.createdAt = raw.createdAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: HistoryItem): HistoryItemSchemaClass {
    const persistenceEntity = new HistoryItemSchemaClass();
    if (domainEntity.id) {
      persistenceEntity._id = domainEntity.id;
    }
    persistenceEntity.ticketId = domainEntity.ticketId;
    persistenceEntity.userId = domainEntity.userId;
    persistenceEntity.type = domainEntity.type;
    persistenceEntity.details = domainEntity.details;
    persistenceEntity.createdAt = domainEntity.createdAt;
    return persistenceEntity;
  }
}
