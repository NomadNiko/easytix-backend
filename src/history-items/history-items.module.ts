// src/history-items/history-items.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryItemsController } from './history-items.controller';
import { HistoryItemsService } from './history-items.service';
import {
  HistoryItemSchema,
  HistoryItemSchemaClass,
} from './infrastructure/persistence/document/entities/history-item.schema';
import { HistoryItemRepository } from './infrastructure/persistence/history-item.repository';
import { HistoryItemDocumentRepository } from './infrastructure/persistence/document/repositories/history-item.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistoryItemSchemaClass.name, schema: HistoryItemSchema },
    ]),
  ],
  controllers: [HistoryItemsController],
  providers: [
    HistoryItemsService,
    {
      provide: HistoryItemRepository,
      useClass: HistoryItemDocumentRepository,
    },
  ],
  exports: [HistoryItemsService, HistoryItemRepository],
})
export class HistoryItemsModule {}
