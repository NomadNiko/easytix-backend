// src/user-documents/user-documents.module.ts
import { Module } from '@nestjs/common';
import { UserDocumentsController } from './user-documents.controller';
import { UserDocumentsService } from './user-documents.service';
import { DocumentUserDocumentPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { FilesModule } from '../files/files.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DocumentUserDocumentPersistenceModule,
    FilesModule,
    UsersModule,
    ConfigModule,
  ],
  controllers: [UserDocumentsController],
  providers: [UserDocumentsService],
  exports: [UserDocumentsService],
})
export class UserDocumentsModule {}
