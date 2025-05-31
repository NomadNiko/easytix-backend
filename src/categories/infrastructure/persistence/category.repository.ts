// src/categories/infrastructure/persistence/category.repository.ts
import { NullableType } from '../../../utils/types/nullable.type';
import { Category } from '../../domain/category';

export abstract class CategoryRepository {
  abstract create(
    data: Omit<Category, 'id' | 'customId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Category>;
  abstract findById(id: Category['id']): Promise<NullableType<Category>>;
  abstract findByQueueId(queueId: string): Promise<Category[]>;
  abstract update(
    id: Category['id'],
    payload: Partial<
      Omit<Category, 'id' | 'queueId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<Category | null>;
  abstract remove(id: Category['id']): Promise<void>;
  abstract findByNameAndQueue(
    name: string,
    queueId: string,
  ): Promise<NullableType<Category>>;
  abstract findByCustomId(customId: string): Promise<NullableType<Category>>;
}
