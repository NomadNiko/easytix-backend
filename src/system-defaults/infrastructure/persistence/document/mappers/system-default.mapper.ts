// src/system-defaults/infrastructure/persistence/document/mappers/system-default.mapper.ts
import { SystemDefault } from '../../../../domain/system-default';
import { SystemDefaultSchemaClass } from '../entities/system-default.schema';

export class SystemDefaultMapper {
  static toDomain(raw: SystemDefaultSchemaClass): SystemDefault {
    const domainEntity = new SystemDefault();
    domainEntity.id = raw._id.toString();
    domainEntity.key = raw.key;
    domainEntity.value = raw.value;
    domainEntity.description = raw.description;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Partial<SystemDefault>): any {
    const persistenceEntity: any = {};
    if (domainEntity.key !== undefined) {
      persistenceEntity.key = domainEntity.key;
    }
    if (domainEntity.value !== undefined) {
      persistenceEntity.value = domainEntity.value;
    }
    if (domainEntity.description !== undefined) {
      persistenceEntity.description = domainEntity.description;
    }
    if (domainEntity.createdAt !== undefined) {
      persistenceEntity.createdAt = domainEntity.createdAt;
    }
    if (domainEntity.updatedAt !== undefined) {
      persistenceEntity.updatedAt = domainEntity.updatedAt;
    }
    return persistenceEntity;
  }
}