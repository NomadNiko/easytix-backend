// src/user-documents/infrastructure/persistence/document/document-persistence.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserDocumentSchema,
  UserDocumentSchemaClass,
} from './entities/user-document.schema';
import { UserDocumentRepository } from '../user-document.repository';
import { UserDocumentDocumentRepository } from './repositories/user-document.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocumentSchemaClass.name, schema: UserDocumentSchema },
    ]),
  ],
  providers: [
    {
      provide: UserDocumentRepository,
      useClass: UserDocumentDocumentRepository,
    },
  ],
  exports: [UserDocumentRepository],
})
export class DocumentUserDocumentPersistenceModule {}
