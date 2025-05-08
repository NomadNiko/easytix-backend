// src/history-items/infrastructure/persistence/history-item.repository.ts
import { NullableType } from '../../../utils/types/nullable.type';
import { HistoryItem } from '../../domain/history-item';

export abstract class HistoryItemRepository {
  abstract create(
    data: Omit<HistoryItem, 'id' | 'createdAt'>,
  ): Promise<HistoryItem>;
  abstract findById(id: HistoryItem['id']): Promise<NullableType<HistoryItem>>;
  abstract findByTicketId(ticketId: string): Promise<HistoryItem[]>;
  abstract remove(id: HistoryItem['id']): Promise<void>;
}
