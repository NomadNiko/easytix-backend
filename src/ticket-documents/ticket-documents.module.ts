// src/ticket-documents/ticket-documents.module.ts
import { Module } from '@nestjs/common';
import { TicketDocumentsController } from './ticket-documents.controller';
import { TicketDocumentsService } from './ticket-documents.service';
import { DocumentTicketDocumentPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { FilesModule } from '../files/files.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TicketFileUploaderService } from './infrastructure/uploader/file-uploader.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    DocumentTicketDocumentPersistenceModule,
    FilesModule,
    TicketsModule,
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(), // Use memory storage for all file uploads
    }),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [TicketDocumentsController],
  providers: [TicketDocumentsService, TicketFileUploaderService],
  exports: [TicketDocumentsService],
})
export class TicketDocumentsModule {}
