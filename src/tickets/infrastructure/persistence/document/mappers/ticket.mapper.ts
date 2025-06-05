// src/tickets/infrastructure/persistence/document/mappers/ticket.mapper.ts
import { Ticket } from '../../../../domain/ticket';
import { TicketSchemaClass } from '../entities/ticket.schema';

export class TicketMapper {
  static toDomain(raw: TicketSchemaClass): Ticket {
    const domainEntity = new Ticket();
    domainEntity.id = raw._id.toString();
    domainEntity.queueId = raw.queueId;
    domainEntity.categoryId = raw.categoryId;
    domainEntity.title = raw.title;
    domainEntity.details = raw.details;
    domainEntity.status = raw.status;
    domainEntity.priority = raw.priority;
    domainEntity.assignedToId = raw.assignedToId;
    domainEntity.createdById = raw.createdById;
    domainEntity.documentIds = raw.documentIds || [];
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.closedAt = raw.closedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Ticket): TicketSchemaClass {
    const persistenceEntity = new TicketSchemaClass();
    if (domainEntity.id) {
      persistenceEntity._id = domainEntity.id;
    }
    persistenceEntity.queueId = domainEntity.queueId;
    persistenceEntity.categoryId = domainEntity.categoryId;
    persistenceEntity.title = domainEntity.title;
    persistenceEntity.details = domainEntity.details;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.priority = domainEntity.priority;
    persistenceEntity.assignedToId = domainEntity.assignedToId;
    persistenceEntity.createdById = domainEntity.createdById;
    persistenceEntity.documentIds = domainEntity.documentIds || [];
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.closedAt = domainEntity.closedAt;
    return persistenceEntity;
  }
}
