// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DocumentNotificationPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { AdminNotificationsController } from './admin-notifications.controller';

@Module({
  imports: [
    DocumentNotificationPersistenceModule,
    UsersModule, // Add UsersModule to the imports array
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
