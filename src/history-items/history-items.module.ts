// src/history-items/history-items.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryItemsController } from './history-items.controller';
import { HistoryItemsService } from './history-items.service';
import {
  HistoryItemSchema,
  HistoryItemSchemaClass,
} from './infrastructure/persistence/document/entities/history-item.schema';
import { HistoryItemRepository } from './infrastructure/persistence/history-item.repository';
import { HistoryItemDocumentRepository } from './infrastructure/persistence/document/repositories/history-item.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistoryItemSchemaClass.name, schema: HistoryItemSchema },
    ]),
    NotificationsModule,
    forwardRef(() => TicketsModule),
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
