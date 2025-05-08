// src/categories/infrastructure/persistence/document/mappers/category.mapper.ts
import { Category } from '../../../../domain/category';
import { CategorySchemaClass } from '../entities/category.schema';

export class CategoryMapper {
  static toDomain(raw: CategorySchemaClass): Category {
    const domainEntity = new Category();
    domainEntity.id = raw._id.toString();
    domainEntity.queueId = raw.queueId;
    domainEntity.name = raw.name;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: Category): CategorySchemaClass {
    const persistenceEntity = new CategorySchemaClass();
    if (domainEntity.id) {
      persistenceEntity._id = domainEntity.id;
    }
    persistenceEntity.queueId = domainEntity.queueId;
    persistenceEntity.name = domainEntity.name;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    return persistenceEntity;
  }
}
