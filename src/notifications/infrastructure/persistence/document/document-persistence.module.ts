// src/notifications/infrastructure/persistence/document/document-persistence.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NotificationSchema,
  NotificationSchemaClass,
} from './entities/notification.schema';
import { NotificationRepository } from '../notification.repository';
import { NotificationDocumentRepository } from './repositories/notification.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationSchemaClass.name, schema: NotificationSchema },
    ]),
  ],
  providers: [
    {
      provide: NotificationRepository,
      useClass: NotificationDocumentRepository,
    },
  ],
  exports: [NotificationRepository],
})
export class DocumentNotificationPersistenceModule {}
