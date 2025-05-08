// src/history-items/history-items.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHistoryItemDto } from './dto/create-history-item.dto';
import { HistoryItem } from './domain/history-item';
import { HistoryItemRepository } from './infrastructure/persistence/history-item.repository';

@Injectable()
export class HistoryItemsService {
  constructor(private readonly historyItemRepository: HistoryItemRepository) {}

  async create(
    createHistoryItemDto: CreateHistoryItemDto & { userId: string },
  ): Promise<HistoryItem> {
    return this.historyItemRepository.create({
      ticketId: createHistoryItemDto.ticketId,
      userId: createHistoryItemDto.userId,
      type: createHistoryItemDto.type,
      details: createHistoryItemDto.details,
    });
  }

  async findById(id: string): Promise<HistoryItem> {
    const historyItem = await this.historyItemRepository.findById(id);
    if (!historyItem) {
      throw new NotFoundException('History item not found');
    }
    return historyItem;
  }

  async findByTicketId(ticketId: string): Promise<HistoryItem[]> {
    return this.historyItemRepository.findByTicketId(ticketId);
  }
}
