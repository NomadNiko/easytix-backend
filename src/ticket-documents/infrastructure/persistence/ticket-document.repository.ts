// src/ticket-documents/infrastructure/persistence/ticket-document.repository.ts
import { NullableType } from '../../../utils/types/nullable.type';
import { TicketDocument } from '../../domain/ticket-document';

export abstract class TicketDocumentRepository {
  abstract create(
    data: Omit<TicketDocument, 'id' | 'uploadedAt' | 'updatedAt'>,
  ): Promise<TicketDocument>;
  abstract findById(
    id: TicketDocument['id'],
  ): Promise<NullableType<TicketDocument>>;
  abstract findAllByTicketId(ticketId: string): Promise<TicketDocument[]>;
  abstract delete(id: TicketDocument['id']): Promise<void>;
}
