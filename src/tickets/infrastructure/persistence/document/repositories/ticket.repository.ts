// src/tickets/infrastructure/persistence/document/repositories/ticket.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
} from '../../../../domain/ticket';
import { TicketRepository } from '../../ticket.repository';
import { TicketSchemaClass } from '../entities/ticket.schema';
import { TicketMapper } from '../mappers/ticket.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class TicketDocumentRepository implements TicketRepository {
  constructor(
    @InjectModel(TicketSchemaClass.name)
    private ticketModel: Model<TicketSchemaClass>,
  ) {}

  async create(
    data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'closedAt'>,
  ): Promise<Ticket> {
    const persistenceModel = TicketMapper.toPersistence(data as Ticket);
    const createdTicket = new this.ticketModel(persistenceModel);
    const ticketObject = await createdTicket.save();
    return TicketMapper.toDomain(ticketObject);
  }

  async findById(id: Ticket['id']): Promise<NullableType<Ticket>> {
    const ticketObject = await this.ticketModel.findById(id);
    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  async findAll(
    paginationOptions: IPaginationOptions,
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      search?: string;
      serviceDeskFilter?: {
        queueIds: string[];
        userId: string;
      };
    },
  ): Promise<Ticket[]> {
    const query: FilterQuery<TicketSchemaClass> = {};

    if (filters?.queueId) {
      query.queueId = filters.queueId;
    }

    if (filters?.categoryId) {
      query.categoryId = filters.categoryId;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.priority) {
      query.priority = filters.priority;
    }

    if (filters?.assignedToId) {
      query.assignedToId = filters.assignedToId;
    } else if (filters?.assignedToId === null) {
      query.assignedToId = null;
    }

    if (filters?.createdById) {
      query.createdById = filters.createdById;
    }

    // Handle service desk filter (tickets in assigned queues OR created by user)
    if (filters?.serviceDeskFilter) {
      if (filters?.search) {
        // Combine service desk filter with search using $and
        query.$and = [
          {
            $or: [
              { queueId: { $in: filters.serviceDeskFilter.queueIds } },
              { createdById: filters.serviceDeskFilter.userId },
            ],
          },
          {
            $or: [
              { title: { $regex: filters.search, $options: 'i' } },
              { details: { $regex: filters.search, $options: 'i' } },
            ],
          },
        ];
      } else {
        query.$or = [
          { queueId: { $in: filters.serviceDeskFilter.queueIds } },
          { createdById: filters.serviceDeskFilter.userId },
        ];
      }
    } else if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { details: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const ticketObjects = await this.ticketModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    return ticketObjects.map((ticketObject) =>
      TicketMapper.toDomain(ticketObject),
    );
  }

  async update(
    id: Ticket['id'],
    payload: Partial<
      Omit<Ticket, 'id' | 'queueId' | 'createdById' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<Ticket | null> {
    const filter = { _id: id.toString() };
    const ticket = await this.ticketModel.findOne(filter);

    if (!ticket) {
      return null;
    }

    // If we're closing the ticket, set the closedAt timestamp
    if (
      payload.status === TicketStatus.CLOSED &&
      ticket.status !== TicketStatus.CLOSED
    ) {
      payload.closedAt = new Date();
    }

    // If we're reopening the ticket, clear the closedAt timestamp
    if (
      payload.status === TicketStatus.OPENED &&
      ticket.status === TicketStatus.CLOSED
    ) {
      payload.closedAt = null;
    }

    const ticketObject = await this.ticketModel.findOneAndUpdate(
      filter,
      { $set: payload },
      { new: true },
    );

    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  async addDocument(
    id: Ticket['id'],
    documentId: string,
  ): Promise<Ticket | null> {
    const ticketObject = await this.ticketModel.findOneAndUpdate(
      { _id: id.toString() },
      { $addToSet: { documentIds: documentId } },
      { new: true },
    );

    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  async removeDocument(
    id: Ticket['id'],
    documentId: string,
  ): Promise<Ticket | null> {
    const ticketObject = await this.ticketModel.findOneAndUpdate(
      { _id: id.toString() },
      { $pull: { documentIds: documentId } },
      { new: true },
    );

    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  async remove(id: Ticket['id']): Promise<void> {
    await this.ticketModel.deleteOne({ _id: id.toString() });
  }
}
