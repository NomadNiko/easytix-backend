// src/user-documents/infrastructure/persistence/document/mappers/user-document.mapper.ts
import { UserDocument } from '../../../../domain/user-document';
import { UserDocumentSchemaClass } from '../entities/user-document.schema';
import { FileMapper } from '../../../../../files/infrastructure/persistence/document/mappers/file.mapper';

export class UserDocumentMapper {
  static toDomain(raw: UserDocumentSchemaClass): UserDocument {
    const domainEntity = new UserDocument();
    domainEntity.id = raw._id.toString();
    domainEntity.userId = raw.user._id.toString();
    domainEntity.file = FileMapper.toDomain(raw.file);
    domainEntity.name = raw.name;
    domainEntity.uploadedAt = raw.uploadedAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: UserDocument): UserDocumentSchemaClass {
    const persistenceSchema = new UserDocumentSchemaClass();

    if (domainEntity.id) {
      persistenceSchema._id = domainEntity.id;
    }

    // Set user reference
    persistenceSchema.user = {
      _id: domainEntity.userId.toString(),
    } as any;

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
