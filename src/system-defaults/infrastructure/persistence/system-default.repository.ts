// src/system-defaults/infrastructure/persistence/system-default.repository.ts
import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { SystemDefault } from '../../domain/system-default';
import { FilterSystemDefaultDto, SortSystemDefaultDto } from '../../dto/query-system-default.dto';

export abstract class SystemDefaultRepository {
  abstract create(
    data: Omit<SystemDefault, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SystemDefault>;

  abstract findByKey(key: string): Promise<NullableType<SystemDefault>>;

  abstract findById(id: SystemDefault['id']): Promise<NullableType<SystemDefault>>;

  abstract findAll(
    filterOptions?: FilterSystemDefaultDto | null,
    sortOptions?: SortSystemDefaultDto[] | null,
  ): Promise<SystemDefault[]>;

  abstract update(
    id: SystemDefault['id'],
    payload: DeepPartial<SystemDefault>,
  ): Promise<SystemDefault | null>;

  abstract remove(id: SystemDefault['id']): Promise<void>;
}