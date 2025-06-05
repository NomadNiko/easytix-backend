// src/ticket-documents/infrastructure/persistence/document/repositories/ticket-document.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { TicketDocumentRepository } from '../../ticket-document.repository';
import { TicketDocument } from '../../../../domain/ticket-document';
import { TicketDocumentSchemaClass } from '../entities/ticket-document.schema';
import { TicketDocumentMapper } from '../mappers/ticket-document.mapper';

@Injectable()
export class TicketDocumentDocumentRepository
  implements TicketDocumentRepository
{
  constructor(
    @InjectModel(TicketDocumentSchemaClass.name)
    private ticketDocumentModel: Model<TicketDocumentSchemaClass>,
  ) {}

  async create(
    data: Omit<TicketDocument, 'id' | 'uploadedAt' | 'updatedAt'>,
  ): Promise<TicketDocument> {
    const persistenceModel = TicketDocumentMapper.toPersistence(
      data as TicketDocument,
    );
    const createdTicketDocument = new this.ticketDocumentModel(
      persistenceModel,
    );
    const ticketDocumentObject = await createdTicketDocument.save();
    return TicketDocumentMapper.toDomain(ticketDocumentObject);
  }

  async findById(
    id: TicketDocument['id'],
  ): Promise<NullableType<TicketDocument>> {
    const ticketDocumentObject = await this.ticketDocumentModel
      .findById(id)
      .populate('file');
    if (!ticketDocumentObject) {
      return null;
    }
    return TicketDocumentMapper.toDomain(ticketDocumentObject);
  }

  async findAllByTicketId(ticketId: string): Promise<TicketDocument[]> {
    const ticketDocumentObjects = await this.ticketDocumentModel
      .find({ ticketId })
      .populate('file')
      .sort({ uploadedAt: -1 });
    return ticketDocumentObjects.map((ticketDocumentObject) =>
      TicketDocumentMapper.toDomain(ticketDocumentObject),
    );
  }

  async delete(id: TicketDocument['id']): Promise<void> {
    await this.ticketDocumentModel.deleteOne({ _id: id.toString() });
  }
}
