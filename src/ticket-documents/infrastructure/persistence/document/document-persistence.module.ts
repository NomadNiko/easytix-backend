// src/ticket-documents/infrastructure/persistence/document/document-persistence.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TicketDocumentSchema,
  TicketDocumentSchemaClass,
} from './entities/ticket-document.schema';
import { TicketDocumentRepository } from '../ticket-document.repository';
import { TicketDocumentDocumentRepository } from './repositories/ticket-document.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TicketDocumentSchemaClass.name, schema: TicketDocumentSchema },
    ]),
  ],
  providers: [
    {
      provide: TicketDocumentRepository,
      useClass: TicketDocumentDocumentRepository,
    },
  ],
  exports: [TicketDocumentRepository],
})
export class DocumentTicketDocumentPersistenceModule {}
