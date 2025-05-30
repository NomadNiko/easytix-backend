// src/queues/infrastructure/persistence/queue.repository.ts
import { NullableType } from '../../../utils/types/nullable.type';
import { Queue } from '../../domain/queue';
import { IPaginationOptions } from '../../../utils/types/pagination-options';

export abstract class QueueRepository {
  abstract create(
    data: Omit<Queue, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Queue>;
  abstract findById(id: Queue['id']): Promise<NullableType<Queue>>;
  abstract findAll(
    paginationOptions: IPaginationOptions,
    search?: string,
  ): Promise<Queue[]>;
  abstract update(
    id: Queue['id'],
    payload: Partial<Omit<Queue, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Queue | null>;
  abstract remove(id: Queue['id']): Promise<void>;
  abstract findByUserId(
    userId: string,
    paginationOptions: IPaginationOptions,
  ): Promise<Queue[]>;
  abstract addUser(id: Queue['id'], userId: string): Promise<Queue | null>;
  abstract removeUser(id: Queue['id'], userId: string): Promise<Queue | null>;
  abstract findByName(name: string): Promise<NullableType<Queue>>;
}
