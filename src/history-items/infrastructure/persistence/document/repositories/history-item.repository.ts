// src/history-items/infrastructure/persistence/document/repositories/history-item.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { HistoryItem } from '../../../../domain/history-item';
import { HistoryItemRepository } from '../../history-item.repository';
import { HistoryItemSchemaClass } from '../entities/history-item.schema';
import { HistoryItemMapper } from '../mappers/history-item.mapper';

@Injectable()
export class HistoryItemDocumentRepository implements HistoryItemRepository {
  constructor(
    @InjectModel(HistoryItemSchemaClass.name)
    private historyItemModel: Model<HistoryItemSchemaClass>,
  ) {}

  async create(
    data: Omit<HistoryItem, 'id' | 'createdAt'>,
  ): Promise<HistoryItem> {
    const persistenceModel = HistoryItemMapper.toPersistence(
      data as HistoryItem,
    );
    const createdHistoryItem = new this.historyItemModel(persistenceModel);
    const historyItemObject = await createdHistoryItem.save();
    return HistoryItemMapper.toDomain(historyItemObject);
  }

  async findById(id: HistoryItem['id']): Promise<NullableType<HistoryItem>> {
    const historyItemObject = await this.historyItemModel.findById(id);
    return historyItemObject
      ? HistoryItemMapper.toDomain(historyItemObject)
      : null;
  }

  async findByTicketId(ticketId: string): Promise<HistoryItem[]> {
    const historyItemObjects = await this.historyItemModel
      .find({ ticketId })
      .sort({ createdAt: -1 });

    return historyItemObjects.map((historyItemObject) =>
      HistoryItemMapper.toDomain(historyItemObject),
    );
  }

  async findByTicketIds(ticketIds: string[]): Promise<HistoryItem[]> {
    const historyItemObjects = await this.historyItemModel
      .find({ ticketId: { $in: ticketIds } })
      .sort({ createdAt: -1 });

    return historyItemObjects.map((historyItemObject) =>
      HistoryItemMapper.toDomain(historyItemObject),
    );
  }

  async remove(id: HistoryItem['id']): Promise<void> {
    await this.historyItemModel.deleteOne({ _id: id.toString() });
  }
}
