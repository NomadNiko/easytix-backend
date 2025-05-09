// src/ticket-documents/infrastructure/persistence/document/mappers/ticket-document.mapper.ts
import { TicketDocument } from '../../../../domain/ticket-document';
import { TicketDocumentSchemaClass } from '../entities/ticket-document.schema';
import { FileMapper } from '../../../../../files/infrastructure/persistence/document/mappers/file.mapper';

export class TicketDocumentMapper {
  static toDomain(raw: TicketDocumentSchemaClass): TicketDocument {
    const domainEntity = new TicketDocument();
    domainEntity.id = raw._id.toString();
    domainEntity.ticketId = raw.ticketId;
    domainEntity.file = FileMapper.toDomain(raw.file);
    domainEntity.name = raw.name;
    domainEntity.uploadedAt = raw.uploadedAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(
    domainEntity: TicketDocument,
  ): TicketDocumentSchemaClass {
    const persistenceSchema = new TicketDocumentSchemaClass();
    if (domainEntity.id) {
      persistenceSchema._id = domainEntity.id;
    }

    persistenceSchema.ticketId = domainEntity.ticketId;

    // Set file reference
    persistenceSchema.file = {
      _id: domainEntity.file.id,
      path: domainEntity.file.path,
    } as any;

    persistenceSchema.name = domainEntity.name;
    persistenceSchema.uploadedAt = domainEntity.uploadedAt;
    persistenceSchema.updatedAt = domainEntity.updatedAt;
    return persistenceSchema;
  }
}
